# Autenticación v1.2

La autenticación usa exclusivamente Supabase Auth; no hay tablas, Storage ni historial. El analizador sigue siendo público y local.

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

El flujo implícito de Supabase permite abrir el correo en otro navegador. El callback procesa el fragmento y establece la sesión; también admite intercambio de códigos PKCE si existe el verificador en ese dispositivo. Retira query y fragmento del historial web antes de hacer peticiones. Los errores y enlaces incompletos/caducados ofrecen volver a solicitar el correo. La recuperación abre el formulario de nueva contraseña, que requiere sesión incluso después de recargar.

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

Referencias: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [autenticación en Expo Router](https://docs.expo.dev/router/advanced/authentication/), [Supabase para React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native), [contraseñas](https://supabase.com/docs/guides/auth/passwords).
