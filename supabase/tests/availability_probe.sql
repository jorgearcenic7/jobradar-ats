/*
Regresión sobre una base local con la migración aplicada. Solo inspecciona la definición y los
permisos de la sonda, y ejecuta SELECT 1. No consulta CV, usuarios ni Storage; no deja cambios.
*/
begin read only;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_proc as p
    join pg_catalog.pg_language as l on l.oid = p.prolang
    where p.oid = 'public.availability_probe()'::regprocedure
      and p.pronargs = 0
      and p.prorettype = 'integer'::regtype
      and p.provolatile = 's'
      and not p.prosecdef
      and l.lanname = 'sql'
      and p.proconfig = array['search_path=""']
      and regexp_replace(p.prosrc, '\s', '', 'g') = 'select1;'
  ) then
    raise exception 'FALLO: la definición de la sonda no cumple el contrato';
  end if;

  if not has_function_privilege('anon', 'public.availability_probe()', 'EXECUTE') then
    raise exception 'FALLO: anon no puede ejecutar la sonda';
  end if;
  if has_function_privilege('authenticated', 'public.availability_probe()', 'EXECUTE') then
    raise exception 'FALLO: authenticated ha recibido permisos sobre la sonda';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_proc as p,
      lateral pg_catalog.aclexplode(p.proacl) as acl
    where p.oid = 'public.availability_probe()'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'FALLO: PUBLIC puede ejecutar la sonda';
  end if;
end;
$$;

set local role anon;
do $$
begin
  if public.availability_probe() is distinct from 1 then
    raise exception 'FALLO: la sonda no devuelve el entero 1';
  end if;
end;
$$;
reset role;

set local role authenticated;
do $$
begin
  perform public.availability_probe();
  raise exception 'FALLO: authenticated puede ejecutar la sonda';
exception
  when insufficient_privilege then null;
end;
$$;
reset role;

rollback;
