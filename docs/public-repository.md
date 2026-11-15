# Preparación del repositorio público

Revisión del 15 de noviembre de 2026, sobre `origin/main` en `f242412` (PR #15, v1.7), en la rama `chore/public-repository`. No se cambia la visibilidad ni ningún ajuste remoto. No se crean commits, pull requests ni despliegues.

**Estado observado: la API de GitHub informa de que el repositorio ya es público. Esta preparación no ha cambiado su visibilidad. La política del contenido propio queda resuelta por decisión del propietario: código público para consulta, con derechos reservados y sin permisos generales de reutilización o comercialización. La portada definitiva está integrada. Los ajustes remotos de seguridad indicados abajo siguen a cargo del propietario. No se han encontrado secretos reales ni CV privados en la revisión de exposición conservada.**

## Revisión de exposición

### Alcance y método

- Árbol inicial limpio: 301 archivos versionados.
- Historial completo disponible, sin clon superficial: 92 commits, 1553 objetos y 865 versiones únicas de archivos (aproximadamente 20 MB). Se recorren todas las referencias locales y remotas, además de los reflogs; se inspeccionan también los metadatos y mensajes de commits. Las dos ramas publicadas por `origin` están presentes y no hay etiquetas remotas.
- Búsqueda local por patrones de claves privadas, tokens de proveedores, claves secretas de Supabase, JWT privilegiados, URLs con contraseña y asignaciones de credenciales. Revisión contextual de coincidencias y de rutas de archivos, direcciones de contacto, documentos, recursos binarios, migraciones y configuración del cliente. No se envían archivos a un servicio de análisis.
- Inventario complementario de archivos locales ignorados, incluidos `.env.local`, resultados de exportación y artefactos de navegador. Las dependencias instaladas y los pesos binarios de modelos no se tratan como documentos del proyecto. No se instala ningún escáner ni se añaden dependencias.

Este análisis por patrones y revisión contextual no acredita la ausencia de todo secreto concebible. La revisión remota complementaria se describe abajo; las credenciales administrativas, la configuración real de Supabase y los objetos o contenidos ya eliminados en GitHub quedan fuera de su alcance.

### Resultados

| Área                                 | Resultado                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Credenciales en archivos e historial | Sin claves privadas, tokens reales ni contraseñas encontradas. Las tres coincidencias de credenciales en archivos versionados son marcadores ficticios de pruebas de Auth. Otra coincidencia en compilaciones locales es un nombre de campo del esquema, no un token. No se publican valores de las coincidencias.                                                             |
| Variables de entorno                 | No hay archivos `.env` versionados ni versiones históricas de ellos. `.env.local` está ignorado y contiene únicamente la URL y la clave **publicable** de Supabase; no se copia a documentación ni se registra su valor.                                                                                                                                                       |
| CV y documentos                      | No hay PDF, DOCX, exportaciones de bases de datos, backups o archivos comprimidos versionados en el historial revisado. Los SQL son migraciones y una prueba con datos ficticios, no volcados. Los CV de fixtures están identificados como ficticios. Los documentos y snapshots locales de Playwright son ficticios y están ignorados.                                        |
| Datos personales                     | Los contactos de ejemplos son ficticios o de dominios de ejemplo. El nombre y correo del responsable aparecen intencionadamente en la información pública del producto; el historial contiene ese correo de autor y una dirección `noreply` de GitHub. Estos metadatos son visibles en el repositorio público: no se han anonimizado ni reescrito.                             |
| Recursos binarios                    | El historial contiene imágenes de identidad/plantilla y tipografías. No se han encontrado documentos de candidatos ni bases de datos entre estos recursos.                                                                                                                                                                                                                     |
| Experimentos                         | No hay carpeta experimental ni datos privados del experimento LLM en los archivos o historial de producto revisados. El worktree separado del experimento no se modifica ni forma parte de la publicación de esta rama.                                                                                                                                                        |
| GitHub Actions                       | No hay workflows `.github/workflows/` en las referencias o versiones históricas revisadas. La API devuelve cero ejecuciones y cero artefactos actuales; no hay logs disponibles que inspeccionar. No se afirma nada sobre material ya eliminado.                                                                                                                               |
| Cliente Supabase                     | El cliente solo lee las dos variables públicas y exige una clave `sb_publishable_`. No se encuentran secretos de servidor en `src/`. La clave privilegiada se obtiene del entorno de la Edge Function y no se devuelve al cliente.                                                                                                                                             |
| RLS y Storage                        | Las migraciones habilitan RLS en `public.cvs`, restringen las operaciones a `auth.uid()`, no conceden acceso a `anon` y configuran el bucket `cvs` como privado. Las políticas de Storage comprueban la carpeta del propietario y, para subir, la fila asociada. Son comprobaciones del código SQL; no se afirma una nueva ejecución ni inspección de la base de datos remota. |

Los archivos `.env*`, claves privadas, `.expo/`, `dist/`, `coverage/` y `.playwright-mcp/` permanecen ignorados. No se borran archivos locales. La regla de Git no protege datos añadidos por fuerza ni elimina versiones anteriores del historial.

### Revisión remota y ajustes pendientes

El conector de GitHub no ha podido iniciarse y la CLI `gh` devuelve un error de autenticación. Se ha usado como alternativa la credencial que Git ya tenía disponible para realizar consultas **GET** a la API oficial; no se muestra ni guarda esa credencial. La actualización y enumeración de referencias por Git también han funcionado.

La API devuelve `visibility: public`, cero ejecuciones de Actions, cero artefactos y cero releases. Se han revisado los textos de las 15 entradas de issues/PR y sus 15 comentarios, sin coincidencias de credenciales reales. Los enlaces a adjuntos corresponden a una única imagen pública: se ha descargado sin transmitirle credenciales y comprobado visualmente; es un icono de un bot, sin CV ni datos personales.

Las cabeceras de los 15 PR están presentes en el historial local revisado; no queda una cabecera de PR desconocida por inspeccionar. La API no devuelve comentarios de revisión en línea.

Secret scanning, push protection, Dependabot security updates y el formulario privado de vulnerabilidades aparecen **desactivados**. **Dependabot alerts está activado**. No se activa ni modifica ningún ajuste. El propietario debe revisar las funciones gratuitas descritas más abajo y confirmar los metadatos de contacto que ya son públicos. Los valores de Secrets/Environments no se recuperan ni necesitan hacerse visibles para esta revisión.

Si aparece una credencial real, **detener la preparación**: revocarla o rotarla en su proveedor bajo control del propietario, identificar todos los commits, copias, logs y artefactos afectados y acordar su saneamiento antes de continuar. Con un repositorio ya público debe tratarse como expuesta aunque después se retire. Borrar la última versión o añadirla a `.gitignore` no elimina la exposición histórica. Si aparecen CV o datos privados, retirar esos datos y resolver también su presencia histórica y en adjuntos. Cualquier reescritura de historial o cambio de visibilidad requiere autorización explícita; esta preparación no los realiza.

## Portada y vistas previas sociales

La portada definitiva elegida por el propietario está en `public/jobradar-cover.jpg`: JPEG de **1280 × 640 px y 157 265 bytes**, compatible con las dimensiones recomendadas y el límite de tamaño de Social Preview. Se integra sin modificaciones en la cabecera del README; no se genera otra imagen ni se rediseña el logo.

`src/app/+html.tsx` configura Open Graph y las tarjetas de X/Twitter con título, descripción, URL de cada página y la imagen absoluta `https://jobradar-ats.pages.dev/jobradar-cover.jpg`, tipo JPEG, dimensiones 1280 × 640 y tarjeta de imagen grande. Se retira la selección de imagen provisional y la comprobación de archivos en tiempo de exportación. No se modifica el diseño de las pantallas ni se incluyen datos de sesiones o CV en los metadatos.

Integración y configuración:

1. La cabecera del README usa la ruta relativa `public/jobradar-cover.jpg`; se elimina el comentario de portada pendiente y la imagen provisional.
2. La exportación estática debe incluir `dist/jobradar-cover.jpg`, idéntico al original, y los metadatos deben apuntar a la URL absoluta de la portada. Se verifica también su respuesta JPEG mediante un servidor local. Un despliegue posterior será necesario para que la URL pública sirva esa versión; no se afirma aquí su disponibilidad en producción.
3. En GitHub, **Settings → General → Social preview → Edit → Upload an image**, seleccionar el mismo JPEG y guardar. Esa subida es un ajuste independiente del README y del Open Graph de la web; no se realiza automáticamente. GitHub admite PNG/JPG/GIF de menos de 1 MB y recomienda 1280 × 640 px (mínimo 640 × 320). Si la portada no cumple, pedir al propietario una versión compatible, sin recortarla ni rediseñarla por iniciativa del asistente.

Referencias: [HTML estático de Expo](https://docs.expo.dev/router/web/static-rendering/) y [Social Preview de GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview).

## Política de licencias del código público

**Decisión del propietario:** mantener el código propio de JobRadar público para consulta, con derechos reservados y sin conceder por ahora permisos generales de reutilización, modificación, redistribución o comercialización. No se ha elegido una licencia open source para ese contenido. La decisión anterior pendiente queda resuelta con esta política.

El aviso raíz [LICENSE](../LICENSE) se aplica solo al contenido propio cuyos derechos correspondan a su titular. Respeta los derechos y excepciones legales y los derechos de visualización y fork derivados de los términos de GitHub. No pretende revocar permisos válidamente concedidos en versiones anteriores ni limitar los derechos que otras licencias ya otorguen sobre sus componentes.

La MIT heredada de la plantilla Expo, con su copyright de 650 Industries, Inc., se conserva íntegra y sin cambios en [LICENSES/Expo-MIT.txt](../LICENSES/Expo-MIT.txt). Deja de ocupar la raíz para evitar atribuir esa licencia al contenido original de JobRadar. [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) explica la separación y las obligaciones de las dependencias, fuentes y modelos; no se modifica ninguna licencia ajena.

Los metadatos del paquete propio en `package.json` y en la entrada raíz de `package-lock.json` indican `UNLICENSED`, manteniendo `private: true`. No se cambia ninguna versión, resolución o licencia de dependencias. `UNLICENSED` no es la licencia de dominio público «Unlicense».

Esta aclaración no borra el hecho de que el repositorio anterior contenía una MIT en la raíz: no se afirma una revocación retroactiva ni se reescribe el historial. Cualquier futura concesión sobre el contenido propio deberá decidirla su titular, conservando los derechos de terceros y los permisos que ya fueran aplicables.

Referencias: [licencias en GitHub](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository), [código público sin concesión general](https://choosealicense.com/no-permission/) y [metadatos npm](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#license).

## Propuesta para GitHub

No se aplican estos datos ni ajustes en esta tarea.

- **Descripción:** «Compara CV y ofertas con evidencias, cobertura explicable y recomendaciones. Análisis local con Expo, TypeScript y Supabase.»
- **Website:** `https://jobradar-ats.pages.dev`
- **Topics:** `expo`, `react-native`, `react-native-web`, `typescript`, `supabase`, `cloudflare-pages`, `ats`, `resume-analysis`, `job-search`, `privacy`.
- **Seguridad:** `SECURITY.md` ofrece un canal privado existente y, si se habilita, el formulario privado de GitHub. No promete un SLA ni recompensas.

## Funciones gratuitas de seguridad

Instrucciones para el propietario; no constituyen una activación. En un repositorio público, GitHub ofrece estas funciones gratuitas. No contratar GitHub Secret Protection o Code Security de pago para el repositorio privado ni aceptar opciones que exijan un plan de pago.

En **Settings → Security and quality → Advanced Security** (el nombre puede variar en la interfaz):

1. Activar o comprobar **Dependency graph**, después **Dependabot alerts** y, si se desea que proponga correcciones, **Dependabot security updates**. No habilitar fusiones automáticas de esos cambios.
2. Comprobar **Secret scanning / Secret Protection** y sus alertas. El escaneo de secretos es gratuito para repositorios públicos; habilitar también **Push protection** donde esté disponible para bloquear nuevos secretos reconocidos.
3. Configurar **Code scanning → CodeQL → Default setup** para JavaScript/TypeScript, con runners estándar de GitHub. Revisar los cambios que genere esta activación; no añadir runners de pago ni servicios externos.
4. Habilitar **Private vulnerability reporting** y comprobar que aparece **Security → Advisories → Report a vulnerability**. Mientras no esté activo, `SECURITY.md` conserva el contacto privado alternativo.
5. Revisar quién puede gestionar los avisos. Para futuras acciones de PR, mantener permisos mínimos de `GITHUB_TOKEN`, aprobación de contribuciones externas y secretos fuera de trabajos que ejecuten código no confiable. No usar `pull_request_target` para ejecutar el código de un fork con privilegios.

Estas funciones complementan la revisión previa; no hay que publicar primero para descubrir si el historial contiene secretos. Fuentes actuales: [ajustes de seguridad](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository), [secret scanning](https://docs.github.com/en/code-security/how-tos/secure-your-secrets/detect-secret-leaks/enable-secret-scanning), [avisos privados](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository), [CodeQL](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning) y [actualizaciones de Dependabot](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates).

## Verificación de la preparación inicial

| Comprobación                                     | Resultado                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------- |
| `npm test -- --runInBand`                        | 62 suites y 1094 pruebas correctas                                               |
| `npm run lint`                                   | Correcto                                                                         |
| `npm run typecheck`                              | Correcto                                                                         |
| `npm run format:check`                           | Correcto; también se comprueba el formato del informe final                      |
| `npx expo export --platform web`                 | Correcto, 12 rutas estáticas exportadas a `dist/`                                |
| Enlaces locales de Markdown y `git diff --check` | Sin destinos ausentes ni errores de espacios                                     |
| MIT heredada de Expo                             | Idéntica en la comprobación inicial; conservada ahora en `LICENSES/Expo-MIT.txt` |

Se modifican `README.md`, `docs/architecture.md`, `docs/roadmap.md` y `docs/v1.7-validation.md`; se añaden `SECURITY.md` y este informe. Los informes técnicos temporales y el adjunto descargado permanecen en `.expo/`, ignorado por Git; no contienen la credencial usada para las consultas.

No se modifica el motor ATS, el diseño, la autenticación, Supabase ni las dependencias. No se afirma un nuevo despliegue o una prueba remota de cuentas. La rama conserva `f242412` como commit inicial y no hay cambios preparados para commit.

### Cierre de la presentación pública

Se conservan todos los cambios anteriores en `chore/public-repository`. README y roadmap distinguen el motor determinista, el modelo semántico local experimental y los experimentos generativos Qwen independientes. La portada definitiva queda integrada en README y metadatos sociales. `SECURITY.md` está preparado; el aviso raíz `LICENSE` recoge la política decidida por el propietario y la MIT original de Expo se conserva íntegra en `LICENSES/Expo-MIT.txt`.

La [propuesta de disponibilidad de Supabase](supabase-availability.md), enlazada desde `auth.md`, queda para una rama posterior. No se crea ningún workflow ni se modifica la base de datos. No se repite la revisión de exposición ni se alteran sus conclusiones históricas.

Verificación del cierre: **62 suites y 1094 pruebas correctas**, lint, typecheck, Prettier y exportación estática correctos. La portada se exporta a `dist/jobradar-cover.jpg` sin cambiar un byte y responde HTTP 200 como `image/jpeg` en el servidor local. Se comprueban los metadatos de Inicio, Analizar, Resultados y callback: imagen absoluta definitiva, tarjeta grande, dimensiones 1280 × 640 y URL propia de cada ruta.

La copia `LICENSES/Expo-MIT.txt` coincide con el contenido original de `origin/main:LICENSE`. Se comprueba que los únicos cambios de `package.json` y `package-lock.json` son los metadatos de licencia del paquete propio; versiones, resoluciones y licencias de dependencias permanecen iguales. El motor ATS, Supabase, los recursos de diseño y las licencias de las fuentes permanecen sin cambios. No se realiza un despliegue ni se afirma la actualización de la imagen pública remota.

La preparación queda lista para revisión y PR en `chore/public-repository`, conservando los cambios anteriores y el informe de exposición. La elección de política del código propio y la integración de la portada ya no están pendientes. La subida como Social Preview y los ajustes remotos de seguridad siguen siendo acciones manuales del propietario. El workflow propuesto de Supabase continúa sin implementar.
