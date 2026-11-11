# Autenticación v1.2

La autenticación usa exclusivamente Supabase Auth. El analizador sigue siendo público y local. Desde la v1.3, «Mis CV» añade una tabla y un bucket privados, y «Mi cuenta» permite eliminar la cuenta mediante la Edge Function `delete-account`: ver [mis-cv.md](mis-cv.md).

## Configuración

Guardar en `.env.local` (ignorado por Git):

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<clave-publica>
```

Ambos valores son públicos y se incorporan al bundle al exportar. Nunca usar `sb_secret_`, `service_role` ni contraseñas de base de datos. Sin configuración válida, el acceso queda deshabilitado y el analizador funciona.

En Supabase, activar Email/password y Confirm email. Mantener las plantillas estándar de confirmación y recuperación que usan `ConfirmationURL`. Los enlaces generados terminan en:

- Web: `<origen>/auth/callback` y `<origen>/auth/callback?flow=recovery`.
- Nativo: `jobradarats://auth/callback` y su variante `?flow=recovery`.

Incluir los orígenes locales de prueba y producción en las URLs permitidas. No se modifica la configuración remota desde este proyecto. El origen web se obtiene de la página actual, sin aceptar redirecciones arbitrarias de la URL.

## Sesión y callbacks

El proveedor en el layout raíz restaura y escucha la sesión sin bloquear el analizador. Web usa `localStorage` (app estática, sin servidor para cookies HttpOnly); nativo usa SecureStore con fragmentos pequeños y cambio de manifest al completar cada escritura. Los errores de almacenamiento se muestran sin registrar credenciales. El refresco nativo se pausa en segundo plano. Cerrar sesión usa alcance `local`: cierra este dispositivo, conserva los demás.

El flujo implícito de Supabase permite abrir el correo en otro navegador. El callback procesa el fragmento y establece la sesión; también admite intercambio de códigos PKCE si existe el verificador en ese dispositivo. Retira query y fragmento del historial web antes de hacer peticiones. Si ya hay una sesión abierta, consulta al servidor de quién son los tokens del enlace antes de sustituirla: un enlace de otra cuenta se rechaza con un aviso y la sesión actual no cambia, para que nadie pueda pasar al usuario a una cuenta ajena con un enlace propio. Los errores y enlaces incompletos/caducados ofrecen volver a solicitar el correo. La recuperación abre el formulario de nueva contraseña, que requiere sesión incluso después de recargar.

SecureStore requiere una compilación de desarrollo nueva en nativo. No se han generado carpetas iOS/Android.

## Validación local de producción

```powershell
npm.cmd test -- --runInBand __tests__/auth-callback.test.ts __tests__/auth-provider.test.tsx __tests__/auth-storage.test.ts __tests__/auth-screen.test.tsx __tests__/navigation.test.tsx __tests__/analysis-flow.test.tsx __tests__/home-screen.test.tsx __tests__/text-field.test.tsx
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npx.cmd expo export --platform web
```

`scripts/auth-smoke.cjs` sirve la exportación en `127.0.0.1:4173`, abre Chromium con un contexto aislado y controla las respuestas de Auth: no crea cuentas ni envía correos. Requiere Playwright como herramienta externa disponible; opcionalmente `PLAYWRIGHT_MODULE` apunta a su módulo instalado fuera del proyecto. No se añade al bundle ni a las dependencias de la app.

```powershell
$env:EXPO_PUBLIC_SUPABASE_URL='https://auth-fixture.supabase.co'
$env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture'
npx.cmd expo export --platform web --output-dir .expo/auth-smoke-dist
node scripts/auth-smoke.cjs
Remove-Item Env:EXPO_PUBLIC_SUPABASE_URL, Env:EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Para comprobar una exportación sin variables: `AUTH_SMOKE_DIST=dist` y `AUTH_SMOKE_UNCONFIGURED=1` como variables de entorno antes de ejecutar el script. Capturas de la prueba configurada en `.expo/auth-smoke-dist/auth-{desktop,mobile}.png`.

El smoke verifica el contrato y la interfaz con respuestas controladas. La entrega real del correo, las políticas de contraseña, las restricciones SMTP y el retorno desde un buzón real requieren una cuenta de prueba y el proyecto Supabase configurado. Los dispositivos nativos requieren prueba adicional en una compilación de desarrollo.

## Verificación real (manual)

Las pruebas anteriores usan respuestas simuladas. Antes de guardar CV hay que comprobar el proyecto real.

**Estado:** el responsable ha verificado en producción el registro, la confirmación, el acceso, la persistencia de la sesión, el cierre de sesión y la recuperación de contraseña. La prueba del enlace de otra cuenta (paso 7) no consta como realizada.

**Configuración de Supabase** (Dashboard del proyecto):

1. Authentication → Sign In / Providers → Email: Email activado, **Confirm email**, **Secure email change** y **Secure password change** activados; **Minimum password length** = 8 o más.
2. Authentication → URL Configuration: Site URL = dominio de producción. Redirect URLs solo con `https://<dominio>/auth/callback` y `https://<dominio>/auth/callback?flow=recovery`, sin comodines como `https://*.vercel.app/**` o `https://*.pages.dev/**`, que permitirían enviar los enlaces de recuperación a un dominio ajeno. Durante la migración a Cloudflare Pages conviven los callbacks de `jobradar-ats.pages.dev`, `jobradar-ats.vercel.app` y `localhost`; el orden de los cambios está en [deploy.md](deploy.md#supabase-cambio-de-origen-de-autenticación-manual).
3. SQL Editor, consultas de solo lectura:

```sql
-- Tablas fuera de los esquemas del sistema y si tienen RLS activado.
select n.nspname, c.relname, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p') and n.nspname not in ('pg_catalog', 'information_schema', 'auth',
  'storage', 'extensions', 'realtime', 'vault', 'graphql', 'graphql_public', 'pgsodium', 'net',
  'cron', 'supabase_functions', 'supabase_migrations');
-- Políticas existentes.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname in ('public', 'storage');
-- Permisos de los roles públicos sobre tablas.
select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated');
-- Buckets de Storage.
select id, public, file_size_limit, allowed_mime_types from storage.buckets;
```

Resultado esperado en v1.2: ninguna fila en las cuatro consultas. Cualquier tabla con `relrowsecurity = false` o un bucket público debe revisarse antes de v1.3. Tras aplicar la migración de la v1.3, solo deben aparecer la tabla `cvs`, sus políticas y el bucket `cvs`, tal como se describe en [mis-cv.md](mis-cv.md).

**Prueba real** en producción, con dos buzones de prueba A y B (datos ficticios):

1. `/registro` con A → aviso de revisar el correo. Entrar antes de confirmar → «Confirma tu correo…».
2. Abrir el enlace del correo, también desde otro navegador → «Mi cuenta» muestra A.
3. Recargar y abrir otra pestaña → la sesión se mantiene.
4. Cerrar sesión → `/acceso`; recargar → sigue sin sesión.
5. Contraseña incorrecta → «Email o contraseña incorrectos.»; correcta → «Mi cuenta».
6. `/recuperar` con A → enlace → «Nueva contraseña» → guardar → «Tu contraseña se ha actualizado.» Cerrar sesión: la contraseña nueva entra y la anterior falla.
7. Con A abierta, registrar B en una ventana privada y abrir el enlace de B en el navegador de A → «Este enlace es de otra cuenta…» y «Mi cuenta» sigue mostrando A.
8. Borrar A y B en Authentication → Users.

**GitHub:** <https://github.com/settings/security> debe indicar «Two-factor authentication: Enabled». En <https://github.com/settings/installations>, la app de Vercel debe tener acceso solo a este repositorio.

**Cloudflare Pages** (hosting principal): variables, cuenta y acceso de GitHub en [deploy.md](deploy.md#cloudflare-pages-principal).

**Vercel** (respaldo temporal, proyecto → Settings):

- Environment Variables: solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, en Production y, si se usan, en Preview; ningún `sb_secret_` ni `service_role`.
- Deployment Protection: Vercel Authentication activada para Preview.
- Git: conectado a este repositorio.
- En la cuenta (Account Settings → Authentication), 2FA activado; en el equipo, solo los miembros esperados.

Referencias: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [autenticación en Expo Router](https://docs.expo.dev/router/advanced/authentication/), [Supabase para React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native), [contraseñas](https://supabase.com/docs/guides/auth/passwords).
