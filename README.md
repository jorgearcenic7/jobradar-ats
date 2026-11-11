<div align="center">
  <img src="public/favicon.svg" alt="Logo de JobRadar ATS: una J violeta con ondas de radar" width="96" height="96" />

  <h1>JobRadar ATS</h1>

  <p>
    Compara tu CV con una oferta de empleo, requisito a requisito, y descubre qué puedes demostrar y qué te falta.<br />
    El análisis se hace en tu dispositivo.
  </p>

  <p>
    <a href="https://jobradar-ats.pages.dev"><strong>jobradar-ats.pages.dev</strong></a>
    ·
    <a href="docs/roadmap.md">Roadmap</a>
    ·
    <a href="docs/architecture.md">Arquitectura</a>
  </p>
</div>

> [!NOTE]
> **Estado.** En producción está publicada la **v1.2** (analizador, importación de CV y cuentas con Supabase Auth). La **v1.3 «Mis CV»** está en la rama `feat/v1.3-mis-cv`, **pendiente de fusionar y publicar**. Detalle en [Estado de las funcionalidades](#estado-de-las-funcionalidades).

## Índice

- [Qué es JobRadar ATS](#qué-es-jobradar-ats)
- [Estado de las funcionalidades](#estado-de-las-funcionalidades)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura)
- [Primeros pasos](#primeros-pasos)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Seguridad y privacidad](#seguridad-y-privacidad)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Roadmap](#roadmap)
- [Documentación](#documentación)
- [Atribuciones de terceros](#atribuciones-de-terceros)
- [Licencia](#licencia)

## Qué es JobRadar ATS

Una aplicación gratuita para **personas que buscan empleo**. Lee un CV en PDF o Word, lo compara con el texto de una oferta y muestra, para cada requisito, si el CV lo respalda con evidencias, solo lo menciona o no lo acredita, junto con recomendaciones para mejorarlo.

Principios del producto:

- **No predice decisiones de ATS reales.** La cobertura mide los requisitos detectados en la oferta. No es la decisión de ningún sistema ATS (_Applicant Tracking System_) ni una probabilidad de contratación.
- **Explicable.** Cada resultado muestra el motivo y las frases del CV en que se basa.
- **No inventa datos.** Las recomendaciones nunca sugieren añadir experiencia, titulaciones ni habilidades que el usuario no tenga.
- **Local y voluntario.** El análisis se hace en el dispositivo. Solo se guarda un CV en la cuenta si el usuario lo decide y lo confirma.
- **Presupuesto de 0 €.** Solo herramientas y planes gratuitos.

## Estado de las funcionalidades

«Probado en local» quiere decir que hay pruebas automáticas (Jest) o recorridos en Chromium sobre la compilación web. «En producción», que funciona en el sitio publicado: [jobradar-ats.pages.dev](https://jobradar-ats.pages.dev) (Cloudflare Pages, principal) y [jobradar-ats.vercel.app](https://jobradar-ats.vercel.app) (respaldo temporal).

| Funcionalidad                                                                                                           | Versión | Implementado | Probado en local | En producción          |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | ------------ | ---------------- | ---------------------- |
| Analizador CV–oferta: requisitos, evidencias, cobertura explicable y recomendaciones                                    | v1.0    | Sí           | Sí               | Sí                     |
| Análisis local y determinista: reglas fijas en TypeScript, sin IA ni servidor                                           | v1.0    | Sí           | Sí               | Sí                     |
| Importación de CV en PDF y DOCX (web), con avisos de lectura y revisión del texto                                       | v1.0    | Sí           | Sí               | Sí                     |
| Identidad visual, rediseño de la interfaz y temas claro y oscuro                                                        | v1.1    | Sí           | Sí               | Sí                     |
| Cuentas con Supabase Auth: registro con confirmación, acceso, sesión y recuperación de contraseña                       | v1.2    | Sí           | Sí               | Sí                     |
| **Mis CV**: guardar varios CV de forma voluntaria y analizarlos, renombrarlos o eliminarlos desde cualquier dispositivo | v1.3    | Sí           | Sí               | No (rama sin fusionar) |
| **Eliminación de cuenta** con sus archivos y datos, mediante una Edge Function                                          | v1.3    | Sí           | Sí               | No (rama sin fusionar) |
| **Página de privacidad** (`/privacidad`)                                                                                | v1.3    | Sí           | Sí               | No                     |
| Importación de archivos en la app nativa (iOS y Android)                                                                | —       | No           | —                | —                      |

Comprobaciones del responsable en el proyecto real de Supabase:

- **Mis CV:** las dos migraciones están aplicadas, se ha guardado, reutilizado y eliminado CV desde el entorno local, y el script de aislamiento entre cuentas no ha dado fallos.
- **Baja de cuenta:** la Edge Function `delete-account` está desplegada, y la baja de una cuenta de prueba eliminó el usuario de Auth, sus registros en PostgreSQL y sus archivos en Storage.
- **Recuperación de contraseña en producción:** llega el correo, se establece la nueva contraseña y el cambio queda confirmado.

La interfaz de la v1.3 no está en producción: la rama no se ha fusionado en `main`, que es lo que publica Cloudflare Pages.

## Tecnologías

Versiones tomadas de [`package.json`](package.json).

| Área              | Tecnología                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Plataforma        | Expo SDK 58 (`expo` ~58.0.22), React Native 0.88, React 19.3                                                               |
| Web               | React Native Web 0.21, exportación estática (`web.output: "static"`)                                                       |
| Navegación        | Expo Router 58, con rutas basadas en archivos en `src/app/`                                                                |
| Lenguaje          | TypeScript 6 en modo `strict`                                                                                              |
| Lectura de CV     | PDF.js (`pdfjs-dist` 6.4.299) para PDF y mammoth 1.13 para DOCX, en el navegador                                           |
| Backend           | Supabase: Auth, PostgreSQL con RLS, Storage privado y Edge Functions (Deno), con `@supabase/supabase-js` 2.119             |
| Sesión en nativo  | `expo-secure-store`                                                                                                        |
| Alojamiento web   | Cloudflare Pages como sitio estático (`public/_headers`, `public/404.html`); Vercel como respaldo temporal (`vercel.json`) |
| Pruebas           | Jest 30, `jest-expo` y React Native Testing Library 14                                                                     |
| Calidad de código | ESLint 9 (`eslint-config-expo`) y Prettier 3                                                                               |
| Interfaz          | Inter (fuente incluida con la app) e iconos con `expo-symbols`                                                             |

## Arquitectura

```mermaid
flowchart LR
  subgraph Dispositivo["Navegador o app (Expo + React Native Web)"]
    UI["Interfaz"]
    Lector["Lectura de CV<br/>PDF.js y mammoth"]
    Motor["Motor ATS<br/>TypeScript puro"]
    UI --> Lector --> Motor
  end
  Hosting["Cloudflare Pages<br/>web estática"] -. sirve la app .-> Dispositivo
  UI -- "sesión" --> Auth["Supabase Auth"]
  UI -- "Mis CV, tras confirmar" --> DB[("PostgreSQL<br/>con RLS")]
  UI -- "archivo original" --> Storage[("Storage<br/>bucket privado")]
  UI -- "baja de cuenta" --> Fn["Edge Function<br/>delete-account"]
  Fn --> Storage
  Fn --> DB
  Fn --> Auth
```

- **El motor ATS se ejecuta en el dispositivo.** Es TypeScript puro, sin dependencias de interfaz ni red. El CV y la oferta que se analizan nunca se envían a un servidor.
- **Supabase solo interviene con cuenta.** Gestiona la sesión y, si el usuario lo confirma, guarda el CV (texto en PostgreSQL y archivo en Storage). Cada operación está limitada a su propietario mediante RLS.
- **La clave secreta solo existe en Supabase.** La app usa la clave publicable; la baja de cuenta, que necesita privilegios, la ejecuta la Edge Function en el servidor.
- **Módulos por funcionalidad** en `src/features/`, con capas `domain`, `application`, `infrastructure` y `presentation` cuando hay contenido real para ellas. Ver [docs/architecture.md](docs/architecture.md).

## Primeros pasos

### Requisitos

- Node.js compatible con Expo SDK 58 (`^22.13.0` o `^24.3.0` y posteriores; el desarrollo usa Node 24) y npm.
- Git.

### Instalación

```bash
git clone <url-del-repositorio>
cd jobradar-ats
npm install
```

### Variables de entorno

Las cuentas necesitan un proyecto de Supabase. Crea `.env.local`, que Git ignora:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_<clave-publica>
```

Las dos son **públicas**: se incorporan al bundle web. Nunca uses aquí una clave `sb_secret_`, la `service_role` ni contraseñas de base de datos; la app rechaza cualquier clave que no sea publicable. Sin estas variables, el analizador funciona y el acceso con cuenta queda desactivado.

La configuración de Supabase (Auth, migraciones, Storage y la Edge Function) está en [docs/auth.md](docs/auth.md) y [docs/mis-cv.md](docs/mis-cv.md).

### Ejecución

```bash
npm run web   # servidor de desarrollo con la versión web
npm start     # servidor de desarrollo de Expo
```

### Pruebas y calidad

```bash
npm test                        # Jest + React Native Testing Library
npm run lint                    # ESLint
npm run typecheck               # TypeScript (tsc --noEmit)
npm run format:check            # Prettier, incluidos los .md
```

### Compilación web y despliegue

```bash
npm run build:web   # expo export y paso posterior para Cloudflare; genera dist/, ignorado por Git
```

`build:web` ejecuta `expo export --platform web` y después [`scripts/move-vendor-assets.cjs`](scripts/move-vendor-assets.cjs), que mueve los recursos de las dependencias de `dist/assets/node_modules/` a `dist/assets/vendor/`, porque Cloudflare Pages no publica esa carpeta.

**Cloudflare Pages** es el hosting principal (<https://jobradar-ats.pages.dev>) y despliega automáticamente `main`. Las cabeceras de seguridad y caché están en `public/_headers`, y la página 404 en `public/404.html`. **Vercel** (<https://jobradar-ats.vercel.app>) se mantiene como respaldo temporal con [`vercel.json`](vercel.json). En los dos, las variables `EXPO_PUBLIC_*` se definen en el panel del proyecto.

Configuración, cambio de origen en Supabase y cómo retirar Vercel: [docs/deploy.md](docs/deploy.md).

### Probar en iPhone desde Windows

El proyecto se desarrolla en Windows y con 0 € de presupuesto:

- **Web en Safari:** abre [jobradar-ats.pages.dev](https://jobradar-ats.pages.dev) y añádela con «Compartir → Añadir a pantalla de inicio». También puedes ejecutar `npm run web` en el PC y abrir en Safari la dirección de red del PC (`http://<IP-del-PC>:8081`), con los dos dispositivos en la misma red Wi-Fi.
- **No disponibles:** Expo Go de la App Store no es compatible con el SDK 58, el simulador de iOS (`npm run ios`) solo existe en macOS, y TestFlight requiere una membresía de pago.

## Estructura del repositorio

```text
src/
  app/                  Rutas de Expo Router (ligeras: solo montan pantallas)
  features/
    cv-match/           Motor ATS (domain) y pantallas del analizador
    cv-import/          Lectura de CV en PDF y DOCX
    auth/               Supabase Auth: acceso, sesión, callback y baja de cuenta
    my-cvs/             «Mis CV»: lista, guardado con confirmación y traspaso al analizador
    privacy/            Página de privacidad
    home/               Pantalla de inicio
  shared/               Sistema de diseño (tokens y componentes), navegación y utilidades
supabase/
  migrations/           Tablas, índices, RLS y políticas de Storage
  functions/            Edge Function delete-account
  tests/                Prueba de aislamiento entre cuentas para el SQL Editor
__tests__/              Pruebas de Jest
jest/                   Utilidades y documentos ficticios para las pruebas
docs/                   Documentación técnica
scripts/                Paso posterior a la exportación web y prueba de humo de Auth
assets/                Fuentes, logo e iconos
public/                Iconos, manifiesto, cabeceras (_headers) y página 404 del hosting
```

## Seguridad y privacidad

- **Análisis local.** El CV y la oferta se analizan en el dispositivo y no se envían a ningún servidor.
- **Guardado voluntario.** Un CV solo se guarda si el usuario pulsa «Guardar en Mis CV» y confirma la cuenta de destino. Se guardan el archivo original y el texto que se analiza.
- **RLS y permisos mínimos.** Cada operación sobre `public.cvs` se limita a su propietario con `auth.uid()`. El rol `anon` no tiene acceso, y el texto y el archivo guardados no se pueden modificar, solo renombrar o eliminar.
- **Bucket privado.** Los archivos están en `cvs/<id-de-usuario>/`, con un máximo de 10 MB y solo PDF o DOCX. No se puede subir un archivo sin su registro ni escribir en la carpeta de otro usuario.
- **Baja de cuenta.** Desde «Mi cuenta», con confirmación por email: se borran los archivos, después los registros y por último la cuenta. Si el proceso se detiene a mitad, se informa del paso y se puede repetir.
- **Sin secretos en el cliente.** Solo variables `EXPO_PUBLIC_*` con valores públicos; los archivos `.env*` no se versionan.
- **Información al usuario.** La página `/privacidad` explica qué datos se tratan, dónde y cómo eliminarlos. Hay aspectos pendientes de decisión del responsable; ver el [roadmap](docs/roadmap.md#cumplimiento-y-privacidad).

Estas medidas reducen riesgos, pero no constituyen una garantía de seguridad ni una revisión jurídica.

## Limitaciones conocidas

- **Motor heurístico en español.** Usa reglas y un catálogo cerrado de habilidades; lo que no reconoce se marca como no evaluable en lugar de adivinarse.
- **Sin OCR.** Los PDF escaneados no se leen; se puede pegar el texto.
- **Importación solo en la web.** En la app nativa se pega el texto del CV.
- **Sin modo sin conexión.** La web no tiene service worker.

## Roadmap

| Versión | Contenido                                                                  | Estado                         |
| ------- | -------------------------------------------------------------------------- | ------------------------------ |
| v1.0    | Analizador CV–oferta e importación PDF/DOCX en la web, publicado en Vercel | Publicada (PR #1)              |
| v1.1    | Identidad visual, rediseño y mejoras de lectura de PDF                     | Publicada (PR #2 a #5)         |
| v1.2    | Cuentas con Supabase Auth y refuerzo de seguridad de sesiones              | Publicada (PR #6 y #7)         |
| v1.3    | Mis CV, eliminación de cuenta y página de privacidad                       | En rama, pendiente de publicar |

Infraestructura: la migración a Cloudflare Pages está fusionada (PR #9); Vercel queda como respaldo hasta completar la [lista de retirada](docs/deploy.md#antes-de-retirar-vercel).

Próximos pasos: completar la información de privacidad pendiente y publicar la v1.3, dominio `jobradar-ats.is-a.dev` (solicitado, pendiente de aprobación) y correos de Auth personalizados. Detalle, cumplimiento y planes condicionados al crecimiento en [docs/roadmap.md](docs/roadmap.md).

## Documentación

- [docs/roadmap.md](docs/roadmap.md): versiones, próximos pasos, cumplimiento y dominio.
- [docs/architecture.md](docs/architecture.md): arquitectura, motor ATS, importación, decisiones y riesgos.
- [docs/auth.md](docs/auth.md): configuración de Supabase Auth y verificación.
- [docs/mis-cv.md](docs/mis-cv.md): «Mis CV», migraciones, aislamiento, baja de cuenta y privacidad.
- [docs/deploy.md](docs/deploy.md): publicación en Cloudflare Pages, respaldo en Vercel y cambio de origen en Supabase.
- [CLAUDE.md](CLAUDE.md) y [AGENTS.md](AGENTS.md): reglas de trabajo para asistentes de IA.

## Atribuciones de terceros

- **Inter**, de Rasmus Andersson. Copyright 2016 The Inter Project Authors. Licencia [SIL Open Font License 1.1](assets/fonts/OFL.txt). Archivos estáticos Regular, Medium, SemiBold y Bold sin modificar, de la versión 4.1 publicada en [rsms/inter](https://github.com/rsms/inter/releases/tag/v4.1): OTF para iOS y Android y WOFF2 para la web. Se distribuyen con la app; la web no los pide a ningún servicio externo.
- **Material Symbols**, de Google. Licencia Apache 2.0. Fuente de iconos que `expo-symbols` utiliza en Android y web, distribuida sin modificar mediante la dependencia `@expo-google-fonts/material-symbols` (su licencia está en `node_modules/@expo-google-fonts/material-symbols/LICENSE_FONT`). En iOS se usan los SF Symbols del sistema.
- **Otras dependencias incluidas en la web**, cada una con su licencia en `node_modules/`: PDF.js (`pdfjs-dist`, Apache 2.0), mammoth (BSD 2-Clause) y `@supabase/supabase-js` (MIT).

## Licencia

La licencia propia de JobRadar ATS está **pendiente de decisión**, y el repositorio es privado. El archivo [`LICENSE`](LICENSE) actual es la licencia MIT de la plantilla de Expo (copyright de 650 Industries, Inc.) y se conserva sin cambios; no es una licencia elegida para JobRadar. Ver [docs/architecture.md](docs/architecture.md#cuestiones-pendientes-no-técnicas).
