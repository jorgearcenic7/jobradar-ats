# Propuesta de disponibilidad de Supabase Free

**Solo propuesta.** Se abordará en una rama independiente, por ejemplo `chore/supabase-availability`, después de cerrar `chore/public-repository`. No se crea ningún workflow, RPC, migración, secreto o ajuste remoto durante la preparación pública.

## Comprobación mínima

Un GitHub Actions diario comprobaría la ruta real de la Data API a PostgreSQL mediante una RPC dedicada, `availability_probe`, que devuelva únicamente el entero `1` (`SELECT 1`). No consultaría tablas, CV, perfiles, Auth ni Storage. Requiere preparar esa función en la futura rama: hoy no existe y no debe simularse la comprobación usando datos personales.

La función se definiría como SQL `STABLE`, `SECURITY INVOKER`, sin parámetros ni efectos laterales y con `search_path` restringido. Se revocaría la ejecución general y se concedería a `anon` solo la ejecución de esa función, sin nuevos permisos sobre tablas. La llamada sería **GET** a `/rest/v1/rpc/availability_probe`, que PostgREST ejecuta en una transacción de solo lectura. Es una propuesta basada en [RPC de Supabase](https://supabase.com/docs/reference/javascript/rpc) y [las transacciones de PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html).

## Workflow futuro

- **Ejecución:** `schedule` diario a las 07:17 UTC (`17 7 * * *`) y `workflow_dispatch` para comprobación manual; nunca desde PR de terceros. Runner estándar `ubuntu-latest`, `permissions: {}`, sin checkout, sin escritura en GitHub ni servicios adicionales. Los [runners estándar de repositorios públicos son gratuitos](https://docs.github.com/en/actions/concepts/billing-and-usage).
- **Acceso:** URL del proyecto y clave **publicable** en GitHub Actions Secrets, suministradas como variables de entorno. La clave iría solo en la cabecera `apikey`, no en la URL ni como token Bearer. No se usarían `service_role`, claves secretas, contraseñas, sesiones de usuarios ni tokens administrativos. La clave publicable no sustituye los permisos de la función. Ver [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
- **Resultado:** exigir HTTP 200 y JSON igual a `1`; timeout de petición de 15 segundos, un reintento acotado y un máximo de dos minutos por ejecución. Cualquier error de red, HTTP o contenido termina con código distinto de cero y ejecución roja. No basta con comprobar que responde una página web o que la API devuelve una lista vacía.
- **Logs y avisos:** registrar solo éxito o una categoría genérica de fallo; nunca cabeceras, variables, cuerpos de respuesta, volcados de entorno o trazas detalladas. Sin `set -x`, `curl -v`, artefactos ni cachés. El propietario puede activar notificaciones web/correo de Actions para ejecuciones fallidas; habría que verificar la recepción con un fallo controlado antes de darlo por operativo. No se envían correos desde el workflow ni se necesita un proveedor adicional.

## Límites operativos

Supabase puede pausar proyectos Free con actividad insuficiente durante siete días. Una consulta diaria **no garantiza evitar las pausas**, y una respuesta correcta solo confirma esa consulta en ese instante, no toda la aplicación. Si el proyecto se pausa, se avisa y se revisa/restaura manualmente desde el Dashboard; no se añade un token administrativo para reactivarlo. Ver [pausas de Supabase Free](https://supabase.com/docs/guides/platform/free-project-pausing).

GitHub ejecuta los cron sobre la rama por defecto y puede retrasarlos o descartarlos; además, **desactiva los workflows programados de repositorios públicos tras 60 días sin actividad**. Un workflow desactivado no produce un fallo que notificar: el propietario necesita un recordatorio independiente para revisar la última ejecución y reactivarlo cuando proceda. No se proponen commits artificiales para mantenerlo activo. Ver [eventos programados](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

La futura aceptación exige probar éxito, respuesta inesperada, fallo de red y aviso de fallo; confirmar que no se leen datos personales ni se amplían sus permisos; y mantener el proyecto y el runner dentro de los planes gratuitos, sin activar opciones de pago.
