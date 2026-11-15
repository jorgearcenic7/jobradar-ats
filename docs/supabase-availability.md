# Disponibilidad de Supabase Free

Implementación en `chore/supabase-availability`, basada en la propuesta de la preparación pública. Los archivos están listos para revisión; **la migración no se ha aplicado a Supabase, no se han configurado secretos ni ejecutado el workflow remoto**. No hay cambios en funciones de la aplicación, autenticación, CV, RLS existentes o diseño.

## Qué comprueba

El workflow [.github/workflows/supabase-availability.yml](../.github/workflows/supabase-availability.yml) ejecuta una petición **GET** a `/rest/v1/rpc/availability_probe` cada día a las **07:17 UTC** (`17 7 * * *`). También admite `workflow_dispatch` manual. Su objetivo es comprobar disponibilidad y generar una pequeña actividad real de base de datos; no garantiza impedir las pausas.

La RPC de [20261115120000_availability_probe.sql](../supabase/migrations/20261115120000_availability_probe.sql) ejecuta únicamente `SELECT 1`, sin parámetros, tablas ni datos personales. Devuelve un entero, no una lista. Es SQL `STABLE`, `SECURITY INVOKER`, con `search_path` vacío: PostgREST ejecuta la llamada GET en una transacción de solo lectura. Se revoca `EXECUTE` de `PUBLIC`, `anon` y `authenticated`, y se concede de nuevo únicamente a `anon`. No se conceden permisos sobre tablas ni se alteran políticas de CV o Storage.

La clave publicable se envía solo en la cabecera `apikey`; no es un token Bearer ni permite omitir RLS. El workflow rechaza claves que no empiecen por `sb_publishable_` y URLs distintas del origen HTTPS de un proyecto `*.supabase.co`. No admite dominios personalizados, rutas, parámetros, credenciales en la URL o redirecciones. No usa `service_role`, claves secretas, contraseñas, sesiones de usuarios ni tokens administrativos.

## Configuración manual del propietario

1. **Revisar y aplicar la migración.** En el Dashboard del proyecto correcto de Supabase, abrir **SQL Editor**, revisar y ejecutar únicamente el archivo de migración indicado. Puede aplicarse también mediante el procedimiento de migraciones habitual del propietario, revisando antes qué archivos estarían pendientes. No hace falta modificar RLS, tablas ni Storage. Si ya existe una función con ese nombre, detenerse y revisar su origen; no borrarla a ciegas. La migración usa `CREATE FUNCTION` para no sustituir una función existente de forma silenciosa.
2. **Configurar los secretos de GitHub.** En el repositorio, **Settings → Secrets and variables → Actions → New repository secret**, crear:
   - `SUPABASE_URL`: solo el origen del proyecto, con formato `https://<project-ref>.supabase.co`.
   - `SUPABASE_PUBLISHABLE_KEY`: la clave **publicable** de ese proyecto, desde **Supabase → Settings → API Keys**. No copiar ninguna clave secreta o administrativa.
3. **Incorporar el workflow a `main` mediante el PR revisado.** GitHub debe tener Actions habilitado. La programación solo se ejecuta desde la rama por defecto; la presencia del archivo en una rama de trabajo no activa el cron de `main`. Conviene preparar la RPC y los secretos antes de habilitar la programación para evitar fallos iniciales por configuración.
4. **Primera ejecución.** En **Actions → Supabase availability → Run workflow**, elegir `main` y ejecutar. Comprobar el estado verde y el mensaje `Supabase availability probe: OK.`. El éxito exige **HTTP 200, Content-Type `application/json` y JSON de tipo entero igual a `1`**. HTML, listas, cadenas, booleanos, `1.0`, respuestas largas o cualquier otro estado HTTP fallan.
5. **Avisos.** En [los ajustes personales de notificaciones](https://github.com/settings/notifications), activar las notificaciones de Actions por correo y/o web, preferentemente solo para fallos. Las notificaciones programadas corresponden al creador del workflow, al último usuario que modificó el cron o al que lo reactivó, según el caso: comprobar la cuenta receptora. El estado rojo también se ve en la pestaña Actions. No se añaden servicios de correo ni permisos para crear issues. La recepción real de avisos queda pendiente de comprobar por el propietario; no se afirma que esté configurada.

Un 401 suele indicar configuración de clave; un 404 puede indicar una RPC pendiente o no expuesta. Revisar desde los paneles sin copiar valores a issues o logs. No ampliar permisos de tablas para solucionar una sonda fallida. Para un fallo controlado de notificaciones, usar un entorno o copia de pruebas, sin sustituir los secretos del proyecto real.

## Seguridad y coste

- Runner estándar `ubuntu-latest` y Python de la biblioteca estándar: sin checkout, instalación de paquetes, cachés, artefactos ni acciones de terceros. `permissions: {}` elimina permisos de `GITHUB_TOKEN`; no se utiliza para llamar a Supabase. Solo hay triggers programado y manual, sin ejecución desde PR de terceros.
- Timeout HTTP de **15 segundos**, como máximo **dos intentos** separados por dos segundos y límite del job de **dos minutos**. El fallo final emite `::error::` con una categoría genérica y termina con código distinto de cero. No se silencian fallos con `continue-on-error`.
- La respuesta se limita a 65 bytes para comprobar el contrato; no se registra su cuerpo. Las salidas no muestran claves, URLs, cabeceras, variables, datos personales ni detalles de excepciones. Sin `set -x` ni `curl -v`. Los valores se suministran mediante Actions Secrets, con el enmascarado de GitHub.
- Los runners estándar son gratuitos para repositorios públicos. La sonda mínima está planteada para Supabase Free, sin contratar planes o servicios adicionales. Mantener el uso total del proyecto dentro de sus cuotas y no seleccionar runners de pago.

## Verificación local

Desde la raíz, con las herramientas del proyecto ya instaladas:

```bash
python __tests__/supabase-availability.test.py
npm run lint
npm run typecheck
npm run format:check
```

Las pruebas leen el YAML con el lector ya disponible en las herramientas npm y ejecutan **el Python exacto del workflow** con red y secretos ficticios: éxito, reintento, errores HTTP/red, respuestas incorrectas, configuración inválida y ausencia de datos sensibles en las salidas. No llaman a Supabase. No añaden dependencias a la aplicación ni al workflow.

La regresión [supabase/tests/availability_probe.sql](../supabase/tests/availability_probe.sql), para una base local con los roles `anon` y `authenticated` y la migración aplicada, comprueba la definición exacta de la función, sus permisos y su resultado dentro de una transacción de solo lectura que acaba en `ROLLBACK`. La validación de esta entrega utiliza PostgreSQL local mediante PGlite ya disponible, sin instalarlo en el proyecto. Comprueba además que los permisos y RLS de una tabla privada ficticia no cambian y que `anon` sigue sin poder leerla. No se ejecutan migraciones ni pruebas contra Supabase remoto.

La validación local no sustituye la primera ejecución real del workflow ni confirma el envío de correos de GitHub. No se repite la suite del motor ATS ni una exportación web porque sus archivos y comportamiento no cambian.

Resultado de esta entrega: **7 pruebas Python correctas con múltiples subcasos**, YAML leído sin errores y contrato de triggers/permisos comprobado, sintaxis Bash correcta, regresión SQL ejecutada en PostgreSQL local y lint, typecheck y Prettier correctos. Las migraciones y funcionalidades anteriores permanecen sin cambios. El workflow remoto y las notificaciones siguen pendientes de la configuración manual descrita arriba.

## Límites operativos

Supabase puede pausar proyectos Free con actividad insuficiente durante siete días. **Una consulta diaria no garantiza evitar las pausas**, y un éxito solo confirma esa consulta en ese momento, no toda la aplicación. Si el proyecto se pausa, el propietario debe revisar y restaurarlo manualmente desde el Dashboard; el workflow no usa la API administrativa para reactivarlo.

GitHub puede retrasar o descartar ejecuciones programadas y **desactiva los workflows de repositorios públicos tras 60 días sin actividad**. Una programación desactivada no genera un fallo nuevo que notificar. El propietario necesita un recordatorio independiente para revisar la última ejecución y reactivarla cuando proceda. No se generan commits artificiales para mantenerla activa.

Fuentes oficiales: [pausas de Supabase Free](https://supabase.com/docs/guides/platform/free-project-pausing), [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys), [transacciones de PostgREST](https://docs.postgrest.org/en/stable/references/transactions.html), [eventos programados](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [notificaciones de Actions](https://docs.github.com/en/actions/concepts/workflows-and-actions/notifications-for-workflow-runs) y [coste de runners públicos](https://docs.github.com/en/actions/concepts/billing-and-usage).
