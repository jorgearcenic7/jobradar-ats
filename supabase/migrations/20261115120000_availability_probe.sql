/*
Comprobación de disponibilidad sin leer tablas ni datos personales.
GET por PostgREST ejecuta esta función STABLE en una transacción de solo lectura.
El rol anon solo recibe EXECUTE sobre esta función; no se cambian tablas, RLS ni Storage.
*/
create function public.availability_probe()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select 1;
$$;

-- Las funciones reciben EXECUTE para PUBLIC por defecto: se elimina esa concesión.
revoke all on function public.availability_probe() from public, anon, authenticated;
grant execute on function public.availability_probe() to anon;

comment on function public.availability_probe() is
  'Devuelve únicamente 1 para comprobar la disponibilidad; no accede a tablas.';
