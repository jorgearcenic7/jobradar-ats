/*
Prueba de aislamiento de «Mis CV» para el SQL Editor de Supabase.

Simula, dentro de una transacción que se deshace al final, las peticiones de dos usuarios de
prueba A y B con el rol `authenticated`, igual que las haría la Data API con sus tokens. No deja
datos: todo termina en ROLLBACK. Los textos son ficticios.

Uso: sustituye los dos UUID de la primera consulta por los id de A y B (Authentication → Users) y
ejecuta el script completo. Si alguna comprobación falla, se detiene con un error «FALLO: …».
Si termina sin errores, todas han pasado.
*/
begin;

select
  set_config('test.a', '00000000-0000-0000-0000-00000000000a', true),
  set_config('test.b', '00000000-0000-0000-0000-00000000000b', true);

-- Se comprueba con el rol del editor: `authenticated` no puede leer `storage.buckets`.
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'cvs' and not public) then
    raise exception 'FALLO: falta el bucket cvs o es público';
  end if;
end;
$$;

-- Sin sesión (rol anon) no hay ningún acceso a la tabla.
set local role anon;
do $$
begin
  perform 1 from public.cvs;
  raise exception 'FALLO: anon puede leer public.cvs';
exception
  when insufficient_privilege then null;
end;
$$;
reset role;

-- A guarda un CV.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.a'), 'role', 'authenticated')::text,
  true
);
do $$
declare
  saved public.cvs;
begin
  insert into public.cvs (title, file_name, format, byte_size, page_count, cv_text)
  values ('CV de prueba A', 'cv-ficticio.pdf', 'pdf', 1000, 1, 'Texto ficticio de prueba.')
  returning * into saved;
  if saved.user_id <> current_setting('test.a')::uuid then
    raise exception 'FALLO: el CV no pertenece a A';
  end if;
  if saved.file_path <> current_setting('test.a') || '/' || saved.id || '.pdf' then
    raise exception 'FALLO: ruta de archivo inesperada';
  end if;
  perform set_config('test.cv', saved.id::text, true);
  perform set_config('test.path', saved.file_path, true);
end;
$$;

-- B no puede ver, renombrar, borrar ni apropiarse del CV de A.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.b'), 'role', 'authenticated')::text,
  true
);
do $$
declare
  affected integer;
begin
  select count(*) into affected from public.cvs where id = current_setting('test.cv')::uuid;
  if affected <> 0 then raise exception 'FALLO: B ve el CV de A'; end if;

  update public.cvs set title = 'Cambiado por B' where id = current_setting('test.cv')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALLO: B ha renombrado el CV de A'; end if;

  delete from public.cvs where id = current_setting('test.cv')::uuid;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FALLO: B ha borrado el CV de A'; end if;

  begin
    insert into public.cvs (user_id, title, file_name, format, byte_size, cv_text)
    values (current_setting('test.a')::uuid, 'Intruso', 'x.pdf', 'pdf', 1, 'x');
    raise exception 'FALLO: B ha creado un CV en la cuenta de A';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.cvs set cv_text = 'x' where id = current_setting('test.cv')::uuid;
    raise exception 'FALLO: se puede modificar el texto guardado';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

-- A sigue viendo su CV intacto.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.a'), 'role', 'authenticated')::text,
  true
);
do $$
begin
  if not exists (
    select 1 from public.cvs
    where id = current_setting('test.cv')::uuid and title = 'CV de prueba A'
  ) then
    raise exception 'FALLO: el CV de A ha cambiado o desaparecido';
  end if;
end;
$$;

-- Límite de 20 CV por usuario.
do $$
begin
  for i in 2..20 loop
    insert into public.cvs (title, file_name, format, byte_size, cv_text)
    values ('CV ' || i, 'cv.pdf', 'pdf', 1, 'Texto ficticio.');
  end loop;
  begin
    insert into public.cvs (title, file_name, format, byte_size, cv_text)
    values ('CV 21', 'cv.pdf', 'pdf', 1, 'Texto ficticio.');
    raise exception 'FALLO: se ha superado el límite de 20 CV';
  exception
    when raise_exception then
      if sqlerrm <> 'cv_limit_reached' then raise; end if;
  end;
end;
$$;

-- Storage: nadie sube a la carpeta de otro ni archivos sin su CV.
do $$
begin
  begin
    insert into storage.objects (bucket_id, name)
    values ('cvs', current_setting('test.b') || '/intruso.pdf');
    raise exception 'FALLO: A ha subido un archivo a la carpeta de B';
  exception
    when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('cvs', current_setting('test.a') || '/sin-cv.pdf');
    raise exception 'FALLO: A ha subido un archivo sin CV asociado';
  exception
    when insufficient_privilege then null;
  end;
  insert into storage.objects (bucket_id, name) values ('cvs', current_setting('test.path'));
end;
$$;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', current_setting('test.b'), 'role', 'authenticated')::text,
  true
);
do $$
begin
  if exists (select 1 from storage.objects where name = current_setting('test.path')) then
    raise exception 'FALLO: B ve el archivo de A';
  end if;
end;
$$;

rollback;
