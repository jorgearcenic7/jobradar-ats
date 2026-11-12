# Despliegue web

La web es estática (`web.output: "static"` en `app.json`): `expo export` genera un HTML por ruta y los recursos en `dist/`. No hay servidor ni funciones en el hosting. El backend es Supabase y no cambia con el hosting.

| Hosting                 | Estado                                                                                                                                                                  | URL                              |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Cloudflare Pages**    | Hosting definitivo y único de la web; publica la v1.3                                                                                                                   | <https://jobradar-ats.pages.dev> |
| Vercel                  | Proveedor anterior, retirado del repositorio; no consta su retirada en remoto                                                                                           | —                                |
| `jobradar-ats.is-a.dev` | Solicitado en el [PR #61106 de is-a-dev/register](https://github.com/is-a-dev/register/pull/61106), **pendiente de aprobación**; no está activo ni integrado con Resend | —                                |

## Compilación

```bash
npm run build:web
```

Ejecuta `expo export --platform web` y después [`scripts/move-vendor-assets.cjs`](../scripts/move-vendor-assets.cjs). Ese script mueve `dist/assets/node_modules/` a `dist/assets/vendor/` y actualiza sus referencias en los archivos de la exportación. Si queda algo sin mover, termina con error.

**Por qué.** Metro publica los recursos de las dependencias en `dist/assets/node_modules/`: la fuente Material Symbols de los iconos (unos 950 KB) y las imágenes de expo-router. Cloudflare Pages no publica esa carpeta: en el despliegue real esas rutas devolvían el HTML de la portada y los iconos no aparecían. La documentación de Expo y de Cloudflare no lo menciona.

Variables públicas necesarias en la compilación. Nunca se usan claves `sb_secret_`, la `service_role` ni contraseñas:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<clave-publica>
```

## Cloudflare Pages

Configuración en el repositorio, dentro de `public/`, que Expo copia a `dist/`:

- [`public/_headers`](../public/_headers):
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y `X-Frame-Options: DENY` en todas las rutas;
  - caché de un año e inmutable para `/_expo/static/*` y `/assets/*`, cuyos nombres llevan hash.
- [`public/404.html`](../public/404.html): página estática «Página no encontrada», sin JavaScript. Sin un `404.html` en la raíz, Pages trata la web como una SPA y responde con la portada (estado 200) a cualquier ruta. Con él, una ruta inexistente responde 404.

Comportamiento de Pages con las rutas, comprobado en <https://jobradar-ats.pages.dev>:

- `/acceso`, `/registro`, `/recuperar`, `/mi-cuenta` y `/auth/callback` (con o sin `?flow=recovery`) responden 200 al cargarlas o recargarlas directamente.
- `/analisis` redirige (308) a `/analisis/` porque es una carpeta con `index.html`, y la app funciona igual en esa URL.
- `/acceso.html` redirige (308) a `/acceso`.
- La ruta del analizador es `/analisis`. `/analizar` no existe: responde 404.

### Configuración en el panel (manual)

En **Workers & Pages → jobradar-ats → Settings**:

1. **Variables and Secrets.** Solo `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, sin ninguna clave secreta.
2. **Build:** build command `npm run build:web`, build output directory `dist`. Comprobado en el despliegue de `main`: la fuente de iconos se sirve desde `assets/vendor/`.
3. **Build → Branch control:** rama de producción `main`. Las demás ramas generan previsualizaciones públicas en `<rama>.jobradar-ats.pages.dev`, conectadas al mismo Supabase. Recomendado: desactivarlas o limitarlas a ramas concretas, sobre todo cuando el repositorio sea público. El login no funciona en ellas, porque sus orígenes no están en las Redirect URLs de Supabase, y no deben añadirse con comodines.
4. **Deployments:** permite volver a un despliegue anterior si uno sale mal (rollback).

### Seguridad de la cuenta de Cloudflare

- 2FA activado en la cuenta y solo los miembros esperados.
- En <https://github.com/settings/installations>, la app de Cloudflare con acceso solo a este repositorio.

## Supabase: origen de autenticación (manual)

La app calcula la URL de retorno a partir del dominio que se esté usando, así que cada dominio necesita sus callbacks en Supabase.

**Estado:** la v1.3 está publicada en `jobradar-ats.pages.dev` y el responsable ha completado las pruebas reales. Quedan pendientes los pasos 4 y 5: no consta que se hayan quitado los callbacks de Vercel, y el subdominio sigue sin aprobar.

En **Authentication → URL Configuration**:

1. **Redirect URLs**, sin comodines: `https://jobradar-ats.pages.dev/auth/callback`, `https://jobradar-ats.pages.dev/auth/callback?flow=recovery` y las de `localhost` para desarrollo.
2. **Prueba real en Cloudflare:** registro con confirmación, acceso, recarga con la sesión iniciada, cierre de sesión, recuperación de contraseña, Mis CV y baja de cuenta.
3. **Site URL:** `https://jobradar-ats.pages.dev`. Supabase la usa:
   - como destino por defecto si un enlace no trae una dirección de retorno válida;
   - para aceptar cualquier dirección de su mismo dominio;
   - en las plantillas de correo que usen `{{ .SiteURL }}`.
4. **Quita los callbacks de Vercel** (`https://jobradar-ats.vercel.app/...`) cuando se complete la retirada de Vercel.
5. **Si se aprueba `jobradar-ats.is-a.dev`** (PR #61106): conéctalo a Cloudflare Pages como dominio personalizado, añade sus dos callbacks, prueba como en el paso 2 y después cambia la Site URL a ese dominio.

## Retirada de Vercel (proveedor anterior)

Vercel alojó la web desde la v1.0 hasta la migración a Cloudflare Pages (PR #9). El repositorio ya no tiene su configuración: `vercel.json` y `.vercelignore` se han eliminado. Estos pasos no se hacen desde el repositorio y no consta que se hayan completado; hasta entonces, el proyecto remoto sigue existiendo:

1. **Parar los despliegues:** Vercel → proyecto → Settings → Git → **Disconnect**. Sin `vercel.json`, los despliegues automáticos de `main` ya no aplicarían las cabeceras ni el comando de compilación del proyecto.
2. **Eliminar el proyecto:** Settings → General → Delete Project. La URL `jobradar-ats.vercel.app` dejará de funcionar, incluidos los enlaces antiguos y los correos ya enviados que apunten a ella.
3. **Supabase:** quita los callbacks de Vercel de Redirect URLs.
4. **GitHub:** quita la app de Vercel en <https://github.com/settings/installations>.

Comprobación final: <https://jobradar-ats.vercel.app> ya no sirve la app, y la página de privacidad solo nombra a Cloudflare como alojamiento actual.

## Privacidad y proveedores

El hosting trata datos técnicos de las visitas (IP, navegador, URL). El CV y la oferta no salen del dispositivo, y Supabase sigue siendo el backend. Pendiente, sin que nada de esto esté verificado: revisar los términos de Cloudflare para el plan gratuito y su acuerdo de tratamiento de datos (DPA), si se aplica, en qué condiciones y con qué garantías para las transferencias internacionales. Usar Cloudflare no garantiza por sí solo el cumplimiento del RGPD.
