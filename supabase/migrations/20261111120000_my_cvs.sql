/*
v1.3 «Mis CV»: CV que un usuario autenticado decide guardar en su cuenta.

Cada CV tiene una fila en `public.cvs` (nombre, metadatos y el texto que se analiza) y su archivo
original en el bucket privado `cvs`, en la ruta `<user_id>/<id>.<formato>`. La ruta la calcula la
base de datos y nunca incluye el nombre del archivo, que puede contener datos personales.

Todo el acceso pasa por RLS con `auth.uid()`: cada usuario solo puede leer, renombrar y borrar
sus propias filas y archivos. El rol `anon` no recibe ningún permiso. El cliente usa la clave
publicable; nada de esto requiere `service_role`.
*/

create table public.cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120 and title = btrim(title)),
  file_name text not null check (char_length(file_name) between 1 and 255),
  format text not null check (format in ('pdf', 'docx')),
  -- Mismo límite que el importador y que el bucket: 10 MB.
  byte_size integer not null check (byte_size between 1 and 10485760),
  page_count integer check (page_count > 0),
  cv_text text not null check (char_length(cv_text) between 1 and 300000),
  -- Derivada de la propia fila: el cliente no puede elegir dónde se guarda el archivo.
  file_path text generated always as (user_id::text || '/' || id::text || '.' || format) stored,
  created_at timestamptz not null default now()
);

comment on table public.cvs is 'CV guardados voluntariamente por cada usuario (v1.3 «Mis CV»).';

create index cvs_user_id_created_at_idx on public.cvs (user_id, created_at desc);
-- La política de subida de Storage busca la fila por la ruta del archivo.
create unique index cvs_file_path_idx on public.cvs (file_path);

/*
Límite de 20 CV por usuario, para que una sola cuenta no agote el almacenamiento del plan
gratuito. El bloqueo consultivo por usuario evita que dos inserciones simultáneas superen el
límite. La función es SECURITY INVOKER: el recuento respeta RLS y solo ve las filas del usuario.
*/
create function public.enforce_cv_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text));
  if (select count(*) from public.cvs where user_id = new.user_id) >= 20 then
    raise exception 'cv_limit_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_cv_limit() from public, anon, authenticated;

create trigger cvs_enforce_limit
before insert on public.cvs
for each row execute function public.enforce_cv_limit();

-- Permisos de la Data API: los proyectos nuevos ya no exponen las tablas por defecto.
alter table public.cvs enable row level security;
revoke all on table public.cvs from anon, authenticated;
grant select, delete on table public.cvs to authenticated;
-- Solo las columnas que aporta el usuario: id, user_id, file_path y created_at los fija la base.
grant insert (title, file_name, format, byte_size, page_count, cv_text)
  on table public.cvs to authenticated;
-- Renombrar es la única modificación: el texto y el archivo no cambian una vez guardados.
grant update (title) on table public.cvs to authenticated;

create policy cvs_select_own on public.cvs
for select to authenticated
using ((select auth.uid()) = user_id);

create policy cvs_insert_own on public.cvs
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy cvs_update_own on public.cvs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy cvs_delete_own on public.cvs
for delete to authenticated
using ((select auth.uid()) = user_id);

-- Bucket privado: sin URLs públicas, 10 MB como máximo y solo PDF o DOCX.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cvs',
  'cvs',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

/*
Archivos: cada usuario trabaja solo en la carpeta con su id. Además, una subida solo se acepta si
ya existe la fila de ese CV con esa misma ruta: así no quedan archivos sin CV y el límite de 20
también vale para Storage. No hay política de UPDATE: un archivo guardado no se sobrescribe.
*/
create policy cvs_objects_select_own on storage.objects
for select to authenticated
using (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy cvs_objects_insert_own on storage.objects
for insert to authenticated
with check (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.cvs as cv
    where cv.file_path = objects.name
      and cv.user_id = (select auth.uid())
  )
);

create policy cvs_objects_delete_own on storage.objects
for delete to authenticated
using (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
