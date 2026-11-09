# JobRadar ATS

Aplicación móvil gratuita de ayuda para **candidatos que buscan empleo**. Su objetivo es ayudar a preparar mejor cada candidatura: comparar un currículum con los requisitos de una oferta, revisar su legibilidad y compatibilidad técnica con criterios habituales de los sistemas ATS (_Applicant Tracking Systems_) y proponer mejoras explicables.

> **Estado actual:** la base técnica está preparada, pero **todavía no hay ninguna funcionalidad de producto implementada**. La app muestra una única pantalla provisional. Consulta [docs/roadmap.md](docs/roadmap.md).

## Objetivos del producto

Funcionalidades previstas (ninguna está implementada todavía):

- Guardar uno o varios currículums.
- Introducir ofertas laborales mediante texto y, más adelante, mediante enlaces.
- Comparar un CV con los requisitos de una oferta.
- Evaluar la legibilidad y la compatibilidad técnica del CV con criterios habituales de los ATS.
- Detectar requisitos y habilidades presentes, ausentes o no verificables.
- Ofrecer recomendaciones explicables y fundamentadas.
- Editar y exportar versiones del CV adaptadas a cada oferta.
- Guardar candidaturas y hacer su seguimiento.

La herramienta se inspira en funcionalidades generales de Jobscan y alternativas similares, con una implementación independiente.

### Principios

- **No predice decisiones de ATS reales.** La puntuación propia será explicable y estará respaldada por criterios y evidencias visibles.
- **No inventa datos.** Nunca añadirá experiencia, titulaciones ni habilidades que el usuario no tenga.
- **Prioridad iPhone**, con compatibilidad Android y una PWA gratuita.
- **Presupuesto de 0 €** en herramientas y servicios.

## Tecnologías

| Área              | Tecnología                                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| Plataforma        | Expo SDK 58, React Native 0.88, React 19.3                                     |
| Lenguaje          | TypeScript 6 (modo `strict`)                                                   |
| Navegación        | Expo Router (rutas basadas en archivos en `src/app/`, rutas tipadas)           |
| Web               | React Native Web                                                               |
| Calidad de código | ESLint 9 (`eslint-config-expo`) y Prettier 3                                   |
| Pruebas           | Jest 30, `jest-expo` y React Native Testing Library 14                         |
| Compilación       | React Compiler (experimental) y EAS para compilaciones en la nube              |
| Tipografía        | Sora (SemiBold y Bold) para títulos y cifras; fuente del sistema para el resto |

## Requisitos

- Node.js compatible con Expo SDK 58 (`^22.13.0`, `^24.3.0` o superior; el desarrollo usa Node 24) y npm.
- Git.
- Para probar en un iPhone: Safari, con el iPhone y el PC en la misma red Wi-Fi (consulta los detalles más abajo).

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run web    # servidor de desarrollo con la versión web (Expo Web)
npm start      # servidor de desarrollo de Expo
```

### Pruebas en iPhone desde Windows

El proyecto se desarrolla en **Windows** y con un presupuesto de 0 €. Esto condiciona cómo se prueba en iPhone:

- **Vía actual: Expo Web en Safari.** Ejecuta `npm run web` en el PC y abre en Safari del iPhone la dirección de red del PC (por ejemplo, `http://<IP-del-PC>:8081`), con ambos dispositivos en la misma red Wi-Fi. Puede ser necesario permitir el puerto en el firewall de Windows. Así se prueba la interfaz, no el comportamiento nativo.
- **Vía para la v1.0: app web en Vercel.** Se abre en Safari y se añade con «Compartir → Añadir a pantalla de inicio». No funciona sin conexión (ver [Publicación en Vercel](#publicación-en-vercel)).
- **Expo Go no es una opción con el SDK actual:** la versión de Expo Go disponible en la App Store no es compatible directamente con Expo SDK 58.
- `npm run ios` intenta abrir el simulador de iOS, que **solo existe en macOS**. No funciona en Windows.
- **Compilaciones nativas para iPhone:** Apple permite instalar apps de desarrollo en dispositivos propios con una cuenta gratuita, pero desde Xcode, que solo existe en Mac. Desde nuestro entorno Windows no usaremos ese procedimiento por ahora. TestFlight y la distribución por App Store requieren una membresía de pago de Apple Developer, que no vamos a contratar: el presupuesto sigue siendo de 0 €.

En Android, las pruebas nativas (dispositivo físico o emulador de Android Studio) están pendientes de comprobar con el SDK 58.

## Scripts

| Script                 | Descripción                                  |
| ---------------------- | -------------------------------------------- |
| `npm start`            | Inicia el servidor de desarrollo de Expo.    |
| `npm run web`          | Inicia el servidor y abre la versión web.    |
| `npm run android`      | Inicia el servidor y abre la app en Android. |
| `npm run ios`          | Abre el simulador de iOS (solo macOS).       |
| `npm test`             | Ejecuta las pruebas con Jest.                |
| `npm run test:watch`   | Ejecuta las pruebas en modo observación.     |
| `npm run lint`         | Analiza el código con ESLint.                |
| `npm run typecheck`    | Comprueba los tipos con TypeScript.          |
| `npm run format`       | Formatea el proyecto con Prettier.           |
| `npm run format:check` | Comprueba el formato sin modificar archivos. |

Compilación web de comprobación: `npx expo export --platform web` (genera `dist/`, ignorado por Git).

## Publicación en Vercel

La web es estática (`web.output: "static"`) y Vercel la compila con la configuración de `vercel.json`. La primera vez, la CLI pide iniciar sesión y vincular el proyecto.

```bash
npx vercel@latest deploy          # versión preliminar (preview) con URL propia
npx vercel@latest deploy --prod   # versión definitiva
```

El CV, la oferta y los resultados se procesan en el navegador y no se envían a Vercel ni a ningún otro servicio.

## Pruebas

Las pruebas viven en `__tests__/`, fuera de `src/app/`, porque Expo Router trata todos los archivos de ese directorio como rutas. Actualmente hay un test de humo de la pantalla de inicio.

## Documentación

- [docs/architecture.md](docs/architecture.md): arquitectura, decisiones técnicas y riesgos conocidos.
- [docs/roadmap.md](docs/roadmap.md): fases completadas y próximas.
- [CLAUDE.md](CLAUDE.md) y [AGENTS.md](AGENTS.md): reglas de trabajo para asistentes de IA.

## Atribuciones de terceros

- **Sora**, de Jonathan Barnbrook y Julián Moncada. Copyright 2019 The Sora Project Authors. Licencia [SIL Open Font License 1.1](assets/fonts/OFL.txt). Archivos OTF estáticos (SemiBold y Bold) sin modificar, obtenidos de [sora-xor/sora-font](https://github.com/sora-xor/sora-font) en el commit `7f9a9c5d0ccd1c099cfac420aa27133df1c5fdc4`.
- **Material Symbols**, de Google. Licencia Apache 2.0. Fuente de iconos que `expo-symbols` utiliza en Android y web, distribuida sin modificar mediante la dependencia `@expo-google-fonts/material-symbols` (su licencia está en `node_modules/@expo-google-fonts/material-symbols/LICENSE_FONT`). En iOS se usan los SF Symbols del sistema.

## Licencia

La licencia propia de JobRadar ATS está **pendiente de decisión** y el repositorio es privado. El archivo `LICENSE` actual procede de la plantilla de Expo y se conserva sin cambios. Ver [docs/architecture.md](docs/architecture.md#cuestiones-pendientes-no-técnicas).
