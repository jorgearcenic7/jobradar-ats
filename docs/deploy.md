# Despliegue web

La web es estática (`web.output: "static"` en `app.json`): `expo export` genera un HTML por ruta y los recursos en `dist/`. No hay servidor ni funciones en el hosting. El backend es Supabase y no cambia con el hosting.

| Hosting                 | Papel                                                                           | URL                               |
| ----------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| **Cloudflare Pages**    | Principal (migración en curso)                                                  | <https://jobradar-ats.pages.dev>  |
| Vercel                  | Respaldo temporal hasta retirarlo                                               | <https://jobradar-ats.vercel.app> |
| `jobradar-ats.is-a.dev` | Solicitado, **pendiente de aprobación**; no está activo ni integrado con Resend | —                                 |

## Compilación

```bash
npm run build:web
```

Ejecuta `expo export --platform web` y después [`scripts/move-vendor-assets.cjs`](../scripts/move-vendor-assets.cjs). Ese script mueve `dist/assets/node_modules/` a `dist/assets/vendor/` y actualiza sus referencias en los archivos de la exportación. Si queda algo sin mover, termina con error.

**Por qué.** Metro publica los recursos de las dependencias en `dist/assets/node_modules/`: la fuente Material Symbols de los iconos (unos 950 KB) y las imágenes de expo-router. Cloudflare Pages no publica esa carpeta: en el despliegue de `main` esas rutas devolvían el HTML de la portada y los iconos no aparecían. Vercel sí la sirve. La documentación de Expo y de Cloudflare no lo menciona; está comprobado sobre los dos despliegues reales.

Variables públicas necesarias en la compilación, iguales en todos los entornos. Nunca se usan claves `sb_secret_`, la `service_role` ni contraseñas:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<clave-publica>
```

## Cloudflare Pages (principal)

Configuración en el repositorio, dentro de `public/`, que Expo copia a `dist/`:

- [`public/_headers`](../public/_headers): las mismas cabeceras que `vercel.json`:
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` y `X-Frame-Options: DENY` en todas las rutas;
  - caché de un año e inmutable para `/_expo/static/*` y `/assets/*`, cuyos nombres llevan hash.
- [`public/404.html`](../public/404.html): página estática «Página no encontrada», sin JavaScript. Sin un `404.html` en la raíz, Pages trata la web como una SPA y responde con la portada (estado 200) a cualquier ruta. Con él, una ruta inexistente responde 404.

Comportamiento de Pages con las rutas, comprobado en <https://jobradar-ats.pages.dev>:

- `/acceso`, `/registro`, `/recuperar`, `/mi-cuenta` y `/auth/callback` (con o sin `?flow=recovery`) responden 200 al cargarlas o recargarlas directamente.
- `/analisis` redirige (308) a `/analisis/` porque es una carpeta con `index.html`, y la app funciona igual en esa URL.
- `/acceso.html` redirige (308) a `/acceso`.
- La ruta del analizador es `/analisis`. `/analizar` no existe: con `404.html` responde 404.

### Configuración en el panel (manual)

En **Workers & Pages → jobradar-ats → Settings**:

1. **Variables and Secrets.** Comprueba que `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` están en Production y en Preview, y que no hay ninguna clave secreta. El despliegue actual de `main` ya contiene la URL y la clave publicable del proyecto de Supabase.
2. **Build → Build command:** `npm run build:web`. **Build output directory:** `dist`. Cámbialo **después** de fusionar esta rama en `main`: las ramas que no tienen el script fallarían al compilar.
3. **Build → Branch control:** rama de producción `main`. Las demás ramas generan despliegues de previsualización en `<rama>.jobradar-ats.pages.dev`. Decide si quieres previsualizaciones de todas las ramas, de algunas o de ninguna. El login no funciona en ellas, porque sus orígenes no están en las Redirect URLs de Supabase, y no deben añadirse con comodines.
4. **Deployments:** permite volver a un despliegue anterior si uno sale mal (rollback).

### Seguridad de la cuenta de Cloudflare

- 2FA activado en la cuenta y solo los miembros esperados.
- En <https://github.com/settings/installations>, la app de Cloudflare con acceso solo a este repositorio.

## Supabase: cambio de origen de autenticación (manual)

La app calcula la URL de retorno a partir del dominio que se esté usando, así que cada dominio necesita sus callbacks en Supabase. En **Authentication → URL Configuration**:

1. **Ahora — Redirect URLs.** Añade, sin comodines:
   - `https://jobradar-ats.pages.dev/auth/callback`
   - `https://jobradar-ats.pages.dev/auth/callback?flow=recovery`

   Mantén las de Vercel (`https://jobradar-ats.vercel.app/...`) y las de `localhost` mientras Vercel siga de respaldo.

2. **Prueba real en Cloudflare:** registro con confirmación, acceso, recarga con la sesión iniciada, cierre de sesión y recuperación de contraseña, todo en `jobradar-ats.pages.dev`.
3. **Site URL → `https://jobradar-ats.pages.dev`**, cuando el paso 2 haya salido bien y Cloudflare pase a ser el enlace que compartes, antes de retirar Vercel. Supabase usa la Site URL:
   - como destino por defecto si un enlace no trae una dirección de retorno válida;
   - para aceptar cualquier dirección de su mismo dominio;
   - en las plantillas de correo que usen `{{ .SiteURL }}`.

   Mientras sigan en la lista, los callbacks de Vercel funcionan.

4. **Al retirar Vercel:** quita sus dos callbacks de Redirect URLs.
5. **Si se aprueba `jobradar-ats.is-a.dev`:** añade sus dos callbacks, prueba como en el paso 2 y después cambia la Site URL a ese dominio.

## Vercel (respaldo)

`vercel.json` y `.vercelignore` se conservan mientras Vercel sea respaldo. Vercel sigue compilando con `npx expo export --platform web`: sirve `assets/node_modules/` y no necesita el script. Sin `404.html`, Vercel muestra su propia página de error; con `public/404.html` en la exportación debería usar esa (sin comprobar).

### Retirar Vercel

Solo cuando se cumpla todo lo de la [lista previa](#antes-de-retirar-vercel):

1. **Parar los despliegues automáticos:** Vercel → proyecto → Settings → Git → **Disconnect**. El sitio sigue sirviendo el último despliegue.
2. **Periodo de observación:** mantén `jobradar-ats.vercel.app` unos días como respaldo sin despliegues nuevos.
3. **Eliminar el proyecto:** Settings → General → Delete Project. La URL `jobradar-ats.vercel.app` deja de funcionar, incluidos los enlaces antiguos y los correos ya enviados que apunten a ella.
4. Quita los callbacks de Vercel en Supabase.
5. Quita la app de Vercel en <https://github.com/settings/installations>.
6. En el repositorio, elimina `vercel.json` y `.vercelignore` y actualiza la documentación.

### Antes de retirar Vercel

- [ ] Esta rama está fusionada y el build command de Cloudflare es `npm run build:web`.
- [ ] En `jobradar-ats.pages.dev` se ven los iconos: la fuente `/assets/vendor/.../MaterialSymbols_*.ttf` responde 200 con `font/ttf`.
- [ ] Una ruta inexistente responde 404 y las cabeceras de `_headers` llegan, incluidas `X-Frame-Options: DENY` y `Referrer-Policy: no-referrer`.
- [ ] Los callbacks de Cloudflare están en Supabase y la prueba real de autenticación ha salido bien en Cloudflare.
- [ ] Tras fusionar la v1.3: guardar, analizar y eliminar un CV y la baja de cuenta funcionan desde Cloudflare.
- [ ] La Site URL de Supabase es el dominio de Cloudflare.
- [ ] La documentación y la página de privacidad nombran a Cloudflare como alojamiento, y se ha revisado lo indicado en [Privacidad y proveedores](#privacidad-y-proveedores).

## Privacidad y proveedores

Cambiar de hosting cambia quién trata los datos técnicos de las visitas (IP, navegador, URL). El CV y la oferta siguen sin salir del dispositivo, y Supabase sigue siendo el backend. Pendiente, sin que nada de esto esté verificado:

- Revisar los términos de Cloudflare para el plan gratuito y su acuerdo de tratamiento de datos (DPA): si se aplica, en qué condiciones y con qué garantías para las transferencias internacionales. Usar Cloudflare no garantiza por sí solo el cumplimiento del RGPD.
- Actualizar la página de privacidad de la v1.3, que nombra a Vercel como alojamiento, para incluir Cloudflare. Mientras Vercel siga activo, tiene que nombrar a los dos.
