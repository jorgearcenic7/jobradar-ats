/*
Impide borrar un CV de `public.cvs` mientras su archivo siga en el bucket `cvs`.

Sin esta regla, un usuario podía crear la fila, subir el archivo y borrar después solo la fila
por la Data API. El archivo quedaba huérfano en su carpeta y, como el límite de 20 CV cuenta
filas, podía repetir el ciclo y llenar Storage sin límite.

Con el trigger, cada archivo necesita su fila para existir y para desaparecer, así que el límite
de 20 filas acota también los archivos. El orden correcto sigue funcionando: la app y la Edge
Function `delete-account` borran primero el archivo con la Storage API y después la fila. Una
fila sin archivo (subida fallida) se puede borrar sin problema, y reintentar una baja a medias
es seguro.

La función es SECURITY INVOKER: con `authenticated`, RLS solo deja ver los archivos del propio
usuario, que es donde está siempre `file_path`; con `service_role` ve todos.
*/
create function public.prevent_cv_delete_with_file()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'cvs'
      and name = old.file_path
  ) then
    raise exception 'cv_file_still_exists' using errcode = 'P0001';
  end if;
  return old;
end;
$$;

revoke all on function public.prevent_cv_delete_with_file() from public, anon, authenticated;

create trigger cvs_prevent_delete_with_file
before delete on public.cvs
for each row execute function public.prevent_cv_delete_with_file();
