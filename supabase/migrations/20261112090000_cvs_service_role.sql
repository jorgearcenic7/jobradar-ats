/*
Permisos de servidor sobre `public.cvs` para la Edge Function `delete-account`.

La clave secreta actúa con el rol `service_role`, que se salta RLS pero necesita permisos sobre la
tabla. Supabase ya no los concede automáticamente a las tablas nuevas, y la migración anterior solo
los dio a `authenticated`. La baja solo necesita contar y borrar las filas del usuario. Si el
proyecto aún concedía permisos automáticos, esta migración no cambia nada.
*/
grant select, delete on table public.cvs to service_role;
