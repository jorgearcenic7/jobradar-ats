# Mis CV (v1.3)

«Mis CV» (`/mis-cv`) permite a un usuario con sesión guardar voluntariamente varios CV en su cuenta y reutilizarlos en otros dispositivos. El análisis sigue siendo local y el analizador funciona igual sin cuenta.

## Qué se guarda y dónde

- **`public.cvs`**: nombre, nombre del archivo, formato, tamaño, páginas, fecha y el texto que se analiza (el extraído o el corregido por el usuario).
- **Bucket privado `cvs`**: el archivo original, en `<user_id>/<id>.<pdf|docx>`. La ruta la calcula la base de datos y no contiene el nombre del archivo.
- **En el dispositivo**: nada. La lista se pide al servidor en cada visita. Para analizar, el texto pasa al analizador en memoria, sin URL ni almacenamiento del navegador. Los errores se muestran sin el mensaje del servidor y no se registra nada en consola.

Guardar exige dos pasos: «Guardar en Mis CV» abre una confirmación que nombra el archivo y la cuenta, y solo «Sí, guardar» lo sube. Justo antes de guardar se comprueba que la sesión sigue siendo de la cuenta confirmada; si ha cambiado, no se guarda nada. Al cambiar de cuenta, la pantalla se monta de nuevo y descarta el documento y la lista anteriores.

Límites, impuestos también por la base de datos: 20 CV por cuenta, 10 MB por archivo (también en el bucket), solo PDF o DOCX, nombre de 1 a 120 caracteres y texto de hasta 300.000 caracteres.

## Seguridad

La migración [`supabase/migrations/20261111120000_my_cvs.sql`](../supabase/migrations/20261111120000_my_cvs.sql) crea la tabla, los índices, el trigger del límite, los permisos y las políticas:

- **Tabla.** RLS activado y cuatro políticas `to authenticated` con `(select auth.uid()) = user_id`; la de UPDATE lleva `USING` y `WITH CHECK`. `anon` no tiene ningún permiso. `authenticated` solo puede insertar las columnas que aporta el usuario y modificar únicamente `title`: el texto, el archivo y el propietario no cambian.
- **Storage.** Bucket privado con tamaño y tipos limitados. Hay políticas de lectura, subida y borrado, todas limitadas a la carpeta `auth.uid()`. La subida exige además que exista la fila del CV con esa ruta. No hay política de UPDATE, así que un archivo guardado no se sobrescribe.
- **Cliente.** Solo usa la clave publicable. No hay `service_role` ni secretos.

## Aplicar la migración

1. En Supabase, abre el proyecto y entra en **SQL Editor → New query**.
2. Pega el contenido completo de la migración y pulsa **Run**. Solo hay que hacerlo una vez: si se repite, falla porque la tabla ya existe.
3. Comprueba el resultado con estas consultas de solo lectura:

```sql
-- RLS activado: relrowsecurity = true.
select relname, relrowsecurity from pg_class where oid = 'public.cvs'::regclass;
-- 7 políticas: cvs_select_own, cvs_insert_own, cvs_update_own, cvs_delete_own y cvs_objects_*.
select schemaname, tablename, policyname, cmd, roles from pg_policies
where policyname like 'cvs\_%' order by policyname;
-- Permisos de tabla: solo authenticated, con SELECT y DELETE (INSERT y UPDATE son por columnas).
select grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'cvs' and grantee in ('anon', 'authenticated');
-- Bucket: public = false, 10485760 y los dos tipos MIME.
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'cvs';
```

4. En **Integrations → Data API**, el esquema `public` debe seguir expuesto. La migración concede los permisos de forma explícita, porque los proyectos nuevos ya no exponen las tablas por defecto.
5. Ejecuta [`supabase/tests/my_cvs_isolation.sql`](../supabase/tests/my_cvs_isolation.sql) en el SQL Editor. Antes, sustituye los dos UUID del principio por los id de los usuarios de prueba A y B (**Authentication → Users**). El script simula las peticiones de A y B dentro de una transacción que se deshace, así que no deja datos. Termina sin errores si todo es correcto; si algo falla, se detiene con «FALLO: …».

El script cubre:

- `anon` no puede leer la tabla;
- B no ve, renombra, borra ni crea CV en la cuenta de A;
- el texto guardado no se puede modificar;
- el límite de 20 CV;
- nadie sube archivos a una carpeta ajena ni sin su CV;
- B no ve los archivos de A.

Se ha validado sobre Postgres 17 (PGlite) con stubs mínimos de `auth` y `storage`. También se probó que detecta tres fallos introducidos a propósito: lectura entre cuentas, subida a una carpeta ajena y `UPDATE` de todas las columnas. El responsable lo ha ejecutado en el proyecto real sin fallos.

## Prueba manual en producción

Usa dos buzones de prueba A y B y PDF/DOCX ficticios, en dos navegadores distintos (o uno normal y una ventana privada):

1. Sin sesión, `/mis-cv` lleva a `/acceso` y la cabecera no muestra «Mis CV».
2. Con A, «Mis CV» muestra «Sesión iniciada como <A>». Importa un PDF. La confirmación nombra el archivo y la cuenta A. Con «Cancelar» no se guarda nada; con «Sí, guardar», el CV aparece en la lista.
3. Recarga la página y entra con A desde otro navegador: aparece el mismo CV. En **Storage → cvs** hay un archivo en la carpeta con el id de A.
4. «Analizar» abre el analizador con el texto y el aviso «Texto de «…», de Mis CV». En DevTools → Network, al analizar no hay ninguna petición.
5. Renombra el CV y recarga: se conserva el nombre. Elimínalo: desaparecen de la lista la fila y, en Storage, el archivo.
6. Con B, la lista está vacía y B no ve nada de A.
7. Cambio de cuenta: con A en `/mis-cv`, importa un archivo y abre la confirmación. En otra pestaña, cierra sesión y entra como B, y vuelve a la primera pestaña:
   - Si muestra B, la confirmación debe haber desaparecido.
   - Si sigue mostrando A, pulsa «Sí, guardar»: debe aparecer «La sesión ha cambiado de cuenta».

   En ningún caso debe aparecer el CV en A ni en B (compruébalo en **Table Editor → cvs**).

8. Cierra sesión: `/mis-cv` vuelve a `/acceso`.
9. Al terminar, elimina A y B con «Eliminar cuenta» (ver la sección siguiente). Supabase no permite borrar desde **Authentication → Users** un usuario que tenga archivos en Storage. Si lo haces desde el panel, borra antes sus archivos, siempre con la Storage API o el panel de Storage y nunca por SQL, porque así el archivo quedaría en el bucket.

## Eliminar la cuenta

«Mi cuenta» → «Eliminar mi cuenta» abre un aviso y pide escribir el email de la cuenta. Solo entonces se puede pulsar «Eliminar definitivamente». La app llama a la Edge Function [`delete-account`](../supabase/functions/delete-account/index.ts) con el token de su sesión. La función:

1. Valida el token con Supabase Auth y toma de él el usuario. El cliente no puede elegir otra cuenta.
2. Borra todos los archivos de la carpeta del usuario en el bucket `cvs` con la Storage API, en lotes de hasta 1000. Después vuelve a listar la carpeta y se detiene si queda algo.
3. Borra las filas de `public.cvs` del usuario y comprueba que no queda ninguna.
4. Borra el usuario con `auth.admin.deleteUser`. Supabase rechaza este paso si aún tiene archivos, así que también actúa como última comprobación.

Cada paso solo empieza si el anterior ha terminado. La respuesta dice si se ha completado o en qué paso se ha detenido, sin datos del usuario ni mensajes internos. La app solo da la baja por hecha con la respuesta `deleted`: entonces cierra la sesión local y muestra «Tu cuenta y tus CV guardados se han eliminado» en `/acceso`. En cualquier otro caso explica qué se ha borrado y qué no, y deja reintentar. Repetir la baja es seguro, porque los pasos ya hechos no encuentran nada.

La clave secreta solo existe en el servidor de Supabase: la función usa `SUPABASE_SECRET_KEYS` o, en proyectos antiguos, `SUPABASE_SERVICE_ROLE_KEY`, que Supabase inyecta automáticamente. La app y Vercel no la tienen. La lógica de los pasos está en [`delete-account.ts`](../supabase/functions/delete-account/delete-account.ts), sin dependencias, y se prueba con Jest. `index.ts` es el punto de entrada de Deno y queda fuera del typecheck y del lint de la app.

Los tokens ya emitidos en otros dispositivos siguen siendo válidos hasta que caducan, aunque no dan acceso a nada: no quedan filas ni archivos, y no se pueden guardar CV nuevos porque el usuario ya no existe.

### Configuración en Supabase

**Estado:** la migración está aplicada y la función está desplegada en el proyecto real, según ha comprobado el responsable. Estos pasos sirven para repetir la configuración en otro proyecto.

1. **Permisos.** En SQL Editor, ejecuta una vez [`supabase/migrations/20261112090000_cvs_service_role.sql`](../supabase/migrations/20261112090000_cvs_service_role.sql). Da a `service_role` permiso para contar y borrar filas de `cvs`, porque Supabase ya no lo concede automáticamente en las tablas nuevas.
2. **Función**, por uno de estos dos caminos:
   - CLI, desde la raíz del repositorio: `npx supabase@latest login` y `npx supabase@latest functions deploy delete-account --project-ref <ref-del-proyecto>`. Sube los dos archivos.
   - Dashboard: **Edge Functions → Deploy a new function → Via Editor**, con el nombre `delete-account`. Pega `index.ts` y añade `delete-account.ts` con el mismo nombre. Si el editor no permite un segundo archivo, usa la CLI.
3. Deja activada la verificación de JWT de la función, que es el valor por defecto. La función, además, valida el token por su cuenta.
4. No hace falta crear secretos ni tocar Vercel. La app llama a `<SUPABASE_URL>/functions/v1/delete-account`, a partir de las variables `EXPO_PUBLIC_*` que ya tiene.

### Prueba real de la baja

**Estado:** realizada por el responsable con una cuenta de prueba. Se eliminaron el usuario de Auth, sus registros en PostgreSQL y sus archivos en Storage. La interfaz de la v1.3 sigue sin publicarse en Vercel.

Con un buzón de prueba C, que no sea tu cuenta real:

1. Guarda dos CV ficticios. En **Storage → cvs** aparece la carpeta con el id de C, con dos archivos.
2. En «Mi cuenta» → «Eliminar mi cuenta», «Eliminar definitivamente» sigue desactivado hasta escribir el email exacto de C.
3. Confirma. La app vuelve a `/acceso` con «Tu cuenta y tus CV guardados se han eliminado».
4. Comprueba en el panel:
   - la carpeta de C ha desaparecido de Storage;
   - en `cvs` no quedan filas con el `user_id` de C;
   - C ya no está en **Authentication → Users**.
5. Entrar con C da «Email o contraseña incorrectos».
6. En **Edge Functions → delete-account → Logs**, la llamada aparece con estado 200 y sin datos personales.

## Información de privacidad

La página `/privacidad` ([privacy-screen.tsx](../src/features/privacy/presentation/privacy-screen.tsx)) es el texto que ven los usuarios. Se enlaza desde el pie de Inicio, las pantallas de acceso y cuenta, «Mis CV» y el bloque de baja. Recoge:

- el responsable, Jorge Arce Nicolás, y el email de contacto;
- qué datos se tratan y para qué;
- que el análisis es local;
- que en «Mis CV» solo se guarda lo que el usuario confirma, incluidos el archivo original y el texto extraído;
- los proveedores: Supabase para autenticación, base de datos y archivos, en eu-west-1 (Irlanda, UE), y Vercel para el alojamiento;
- la conservación;
- cómo consultar y eliminar los CV y la cuenta;
- cómo ejercer los derechos de protección de datos.

Describe solo lo que hace el código. Hay que actualizarla, junto con su fecha de «Última actualización», si cambia:

- qué se guarda o dónde;
- algún proveedor o la región;
- el contacto;
- el funcionamiento de la baja.

El texto no ha tenido revisión legal.

### Revisión frente al artículo 13 del RGPD

Comparación con la información que el artículo 13 pide facilitar. No es asesoramiento legal ni garantiza el cumplimiento.

| Información                                                   | Estado en `/privacidad`                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad y contacto del responsable                          | Incluida (confirmada).                                                                                                                                                                                                                                                                                     |
| Delegado de protección de datos                               | No incluida. El responsable debe decidir si tiene que designarlo; si lo designa, hay que añadir su contacto.                                                                                                                                                                                               |
| Fines del tratamiento                                         | Incluidos (cuenta, correos de acceso, «Mis CV»).                                                                                                                                                                                                                                                           |
| **Base jurídica de cada fin**                                 | **Requiere decisión del responsable.** La página la indica como pendiente. Opciones a valorar: ejecución del servicio que el usuario solicita o consentimiento.                                                                                                                                            |
| Interés legítimo, si se invoca                                | No aplica mientras no se elija esa base.                                                                                                                                                                                                                                                                   |
| Destinatarios o categorías                                    | Incluidos: Supabase y Vercel como proveedores. No se califica su papel jurídico (encargado del tratamiento) sin verificar los contratos.                                                                                                                                                                   |
| **Transferencias internacionales**                            | **Pendiente de verificar.** Los datos de Supabase están en eu-west-1, pero Supabase y Vercel son empresas de EE. UU. y no se ha comprobado dónde guarda Vercel sus registros ni qué garantías aplican. La página indica que esta información está pendiente, sin afirmar ni negar que haya transferencias. |
| Plazo de conservación                                         | Incluido.                                                                                                                                                                                                                                                                                                  |
| Derechos de acceso, rectificación, supresión y demás          | Incluidos, con el email de contacto.                                                                                                                                                                                                                                                                       |
| Retirar el consentimiento                                     | Solo hace falta si la base elegida es el consentimiento. Ya existen los medios: eliminar el CV o la cuenta.                                                                                                                                                                                                |
| Reclamación ante la autoridad de control                      | Incluida de forma genérica («autoridad de protección de datos competente»).                                                                                                                                                                                                                                |
| Si facilitar los datos es obligatorio y qué pasa si no se dan | Incluido: la cuenta exige email y contraseña; sin ellos se puede analizar sin cuenta.                                                                                                                                                                                                                      |
| Decisiones automatizadas                                      | Incluido como hecho del producto: el análisis se calcula en el dispositivo, solo lo ve el usuario y JobRadar no lo usa para decidir.                                                                                                                                                                       |

Antes de publicar, el responsable debe:

1. decidir y redactar la base jurídica de cada fin;
2. verificar las transferencias internacionales y sus garantías, por ejemplo los acuerdos de tratamiento de datos (DPA) de Supabase y de Vercel;
3. decidir si hace falta un delegado de protección de datos.

## Limitaciones conocidas

- En la app nativa no se pueden importar archivos todavía. Desde «Mis CV» se puede listar, analizar, renombrar y eliminar, pero no guardar.
- No hay descarga del archivo original ni edición del texto guardado.
- La baja no pide la contraseña: basta con tener la sesión abierta y escribir el email de la cuenta.
