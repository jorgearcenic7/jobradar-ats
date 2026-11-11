# Roadmap de JobRadar ATS

Este documento distingue lo **publicado**, lo **pendiente** y lo **condicionado** al crecimiento del proyecto. Desde la v1.0, el avance se sigue por versiones; el [historial de fases](#historial-de-desarrollo-fases-hasta-la-v10) conserva el detalle anterior.

## Versiones

| Versión | Contenido                                                                                        | Estado                                |
| ------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| v1.0    | Analizador CV–oferta, importación PDF/DOCX en la web y publicación estática en Vercel (anterior) | Publicada (PR #1)                     |
| v1.1    | Identidad visual, rediseño de la interfaz y compatibilidad de lectura de PDF                     | Publicada (PR #2, #3, #4 y #5)        |
| v1.2    | Supabase Auth (registro, confirmación, acceso, sesión, recuperación) y refuerzo de seguridad     | Publicada (PR #6 y #7)                |
| v1.3    | «Mis CV», eliminación de cuenta y página de privacidad                                           | Rama `feat/v1.3-mis-cv`, sin fusionar |

Infraestructura: el alojamiento web migró a Cloudflare Pages (PR #9). Vercel, el hosting anterior, se ha retirado del repositorio. Ver [deploy.md](deploy.md).

## Situación actual (v1.3)

- **Servicio gratuito y no comercial.**
- **Responsable:** Jorge Arce Nicolás. **Contacto:** jorgearcenic7@gmail.com.
- **Datos en Supabase**, región eu-west-1 (Irlanda, UE): cuentas, registros de «Mis CV» y archivos.
- **Análisis ATS local**, en el dispositivo, y **almacenamiento voluntario** de CV con confirmación explícita.
- **Seguridad:** Supabase Auth, RLS por propietario, bucket privado y eliminación de cuenta mediante la Edge Function `delete-account`. Detalle en [mis-cv.md](mis-cv.md).
- **Web:** <https://jobradar-ats.pages.dev> (Cloudflare Pages).

### Comprobado en Supabase real

Verificado por el responsable:

- Las migraciones `20261111120000_my_cvs.sql` y `20261112090000_cvs_service_role.sql` están aplicadas, y el script de aislamiento entre cuentas no da fallos.
- Guardar, reutilizar y eliminar CV funciona desde el entorno local.
- La Edge Function `delete-account` está desplegada. La baja de una cuenta de prueba eliminó el usuario de Auth, sus registros en PostgreSQL y sus archivos en Storage.
- La recuperación de contraseña funciona en producción: llega el correo, se establece la nueva contraseña y el cambio queda confirmado.

### Pendiente para publicar la v1.3

1. Aplicar en Supabase la migración `20261113090000_cvs_prevent_orphan_files.sql`, que impide dejar archivos huérfanos y saltarse el límite de 20 CV ([mis-cv.md](mis-cv.md#aplicar-la-migración)).
2. Comprobar el SMTP de Supabase Auth: el servidor integrado solo entrega correos a direcciones del equipo del proyecto.
3. Completar la información de privacidad aplicable ahora (ver [Cumplimiento y privacidad](#cumplimiento-y-privacidad)).
4. Añadir en Supabase los callbacks de `jobradar-ats.pages.dev` y repetir desde Cloudflare la prueba de Mis CV y de la baja de cuenta ([deploy.md](deploy.md#supabase-origen-de-autenticación-manual)).
5. Retirar Vercel en remoto **antes de fusionar**: sin `vercel.json`, sus despliegues de `main` ya no tendrían su configuración ([deploy.md](deploy.md#retirada-de-vercel-proveedor-anterior)).
6. Revisar y fusionar la rama `feat/v1.3-mis-cv`; Cloudflare Pages publica `main`. Hasta entonces, la v1.3 no está en producción.

## Cumplimiento y privacidad

Esta sección organiza tareas. No afirma que se cumpla el RGPD ni sustituye una revisión jurídica.

### Aplicable ahora (v1.3)

La página `/privacidad` ya informa del responsable, el contacto, los fines, el análisis local, el guardado voluntario, los proveedores y la región de Supabase, la conservación, cómo consultar y eliminar los datos y cómo ejercer los derechos. La comparación con el artículo 13 está en [mis-cv.md](mis-cv.md#revisión-frente-al-artículo-13-del-rgpd). Queda pendiente:

- [ ] **Bases jurídicas.** Las decide el responsable para cada fin: la cuenta y los correos de acceso, y «Mis CV». Opciones a valorar: la ejecución del servicio que el usuario solicita o su consentimiento. Mientras no se decidan, la página lo indica como pendiente.
- [ ] **Transferencias internacionales.** Los datos de Supabase están en la UE, pero Supabase y Cloudflare son proveedores estadounidenses. Hay que verificar dónde tratan los datos (incluidos los registros de Cloudflare), sus subencargados y las garantías aplicables, sin dar por hechas garantías contractuales que no se hayan comprobado.
- [ ] **Delegado de protección de datos:** decidir si corresponde.
- [ ] **Revisión jurídica** del texto antes de publicarlo.

### Si la aplicación crece o se comercializa

Revisiones condicionadas: se aplicarán solo si el crecimiento, el riesgo o un uso comercial las hacen exigibles o recomendables.

- **Datos:** revisar bases jurídicas, fines, minimización y plazos de conservación.
- **Proveedores:** revisar los contratos de encargo del tratamiento (DPA) de Supabase, Cloudflare y cualquier otro encargado.
- **Transferencias:** verificar transferencias internacionales, subencargados y garantías aplicables.
- **DPD:** evaluar si corresponde nombrar un delegado de protección de datos.
- **EIPD:** valorar una evaluación de impacto cuando el riesgo lo exija.
- **Registro de actividades de tratamiento**, cuando corresponda.
- **Derechos:** procedimientos de acceso, rectificación, supresión, portabilidad y oposición, y gestión y registro de solicitudes.
- **Incidentes:** procedimiento de gestión y, si procede, notificación de brechas de seguridad.
- **Cookies, analítica y consentimiento:** revisar políticas y consentimientos si se incorporan (hoy no hay analítica).
- **Condiciones:** términos de uso, licencia y condiciones comerciales antes de monetizar.
- **Operación:** control de costes y cuotas, prevención de abuso, monitorización y copias de seguridad cuando aumenten los usuarios.
- **IA externa:** antes de enviar CV a un modelo, revisar el proveedor, la retención, el uso para entrenamiento, las transferencias y el consentimiento.
- **Seguridad operativa:** reforzar el control de acceso, la gestión de secretos y la protección de las cuentas de GitHub, Cloudflare y Supabase conforme aumente el riesgo.

## Hosting, dominio y correo

| Elemento                    | Estado                                                                                                                                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare Pages            | Hosting de la web: <https://jobradar-ats.pages.dev>, despliega `main` con `npm run build:web`. Pasos pendientes en [deploy.md](deploy.md).                                                                              |
| Vercel                      | Hosting anterior. Retirado del repositorio; falta desconectar y eliminar el proyecto remoto ([pasos](deploy.md#retirada-de-vercel-proveedor-anterior)).                                                                 |
| Dominio gratuito solicitado | `jobradar-ats.is-a.dev`, en el [PR #60903 de is-a-dev/register](https://github.com/is-a-dev/register/pull/60903). **Pendiente de comprobar si se ha aprobado; no está activo.** Hay que confirmar a qué hosting apunta. |
| Correos de Supabase Auth    | Configuración actual sin cambios. **Resend no está integrado.**                                                                                                                                                         |

Pasos pendientes:

1. Comprobar la aprobación del PR y, si se aprueba, conectarlo a Cloudflare Pages como dominio personalizado. Después, actualizar la Site URL y las Redirect URLs de Supabase.
2. Comprobar si Resend permite verificar el subdominio y si is-a.dev permite crear los registros DNS necesarios (TXT y MX).
3. Si es posible, configurar esos registros y conectar Resend como SMTP de Supabase Auth.
4. Personalizar los correos de confirmación y recuperación con la identidad de JobRadar.
5. Si el subdominio no permite configurar bien el correo, buscar otra opción compatible sin salir del coste objetivo de 0 €.

Condiciones: is-a.dev se usa para un proyecto no comercial. Si JobRadar se monetiza, hay que migrar a un dominio propio y dejar de usar el subdominio si sus condiciones lo exigen.

## Historial de desarrollo (fases hasta la v1.0)

El desarrollo hasta la v1.0 avanzó por fases autorizadas una a una. Las tablas recogen el estado registrado al cerrar cada fase.

### Fases completadas

| Fase          | Contenido                                            | Commit    |
| ------------- | ---------------------------------------------------- | --------- |
| —             | Proyecto creado con `create-expo-app`                | `a5decbc` |
| 0             | Auditoría inicial                                    | —         |
| 1a.1          | Limpieza funcional de Expo                           | `7740c94` |
| 1a.2          | Eliminación de recursos de demostración              | `7740c94` |
| 1b.1          | ESLint, Prettier y normalización de finales de línea | `7740c94` |
| 1b.1-fix/fix2 | Correcciones de lint e hidratación                   | `7740c94` |
| 1b.2          | Pruebas automatizadas (Jest, `jest-expo`, RNTL)      | `90b1e29` |
| 1c            | Documentación técnica y reglas permanentes           | `25fd62c` |

Los cambios de las fases 1a.1 a 1b.1-fix2 se registraron juntos en el commit `7740c94`.

### Fases en curso

El orden entre las subfases pendientes de la Fase 2 y la Fase A se decide en cada autorización.

#### Fase 2 — Sistema de diseño

**En curso.** Los tokens, los componentes base, los componentes de estado, `Disclosure`, `CoverageBar` y `SegmentedControl` están terminados; todavía falta la consolidación.

| Subfase | Contenido                                                                                    | Estado     | Commit    |
| ------- | -------------------------------------------------------------------------------------------- | ---------- | --------- |
| 2a.1    | Colores, tipografía y temas claro y oscuro                                                   | Completada | `f1d702c` |
| 2a.2    | Tipografía Sora en títulos y cifras                                                          | Completada | `a3b9df3` |
| 2b.1a   | Componentes `Screen` y `Card`                                                                | Completada | `2022d3a` |
| 2b.1b   | Integración de `Screen` y `Card` y accesibilidad de la pantalla inicial                      | Completada | `7d66eac` |
| 2b.1c   | Corrección del salto visual durante la carga de estilos en web                               | Completada | `8dc2a98` |
| 2b.2a   | Componente `Icon`                                                                            | Completada | `8d9895b` |
| 2b.2b   | Componente `Button`                                                                          | Completada | `1b33c2b` |
| 2c.1a   | `TextField` de una línea                                                                     | Completada | `0b85f00` |
| 2c.1b   | `TextField` multilínea y contador opcional                                                   | Completada | `8db3fc3` |
| 2c.2a   | `Badge` y `Notice`                                                                           | Completada | `8f41942` |
| 2c.2b   | `EmptyState`                                                                                 | Completada | `23ef3c1` |
| 2c.3a   | `Disclosure`                                                                                 | Completada | `f3ec5b6` |
| 2c.3b   | `CoverageBar` e integración limitada en el resumen de cobertura                              | Completada | `e201262` |
| 2c.3    | `SegmentedControl`, creado en la Fase 3b.1 junto a su primer uso                             | Completada | `965614a` |
| 2d      | Consolidación: VoiceOver, Dynamic Type, capturas finales, revisión de código y documentación | Próxima    | —         |

También queda pendiente, sin subfase asignada, la migración a `src/shared/` de los hooks heredados de la plantilla. El `ThemedText` de la plantilla y el adaptador `constants/theme.ts` se retiraron en la Fase A, sustituidos por `src/shared/ui/themed-text.tsx` (ver [architecture.md](architecture.md)).

#### Fase A — Analizador CV–oferta web

**En curso.** Se adelanta respecto al roadmap inicial como funcionalidad web experimental: toma de la [evolución posterior](#evolución-posterior) el motor explicable, el análisis de requisitos, las recomendaciones y la importación de CV, y los lleva a la web antes de las Fases 3 a 6.

Se construyó primero en un laboratorio, una copia aislada del proyecto, y ahora se migra al proyecto original por bloques autorizados uno a uno. **No se dará por completada hasta terminar la migración y verificarla en el original.**

Alcance:

- Análisis explicable de los requisitos de una oferta frente a un CV: cada requisito muestra las evidencias del CV que lo respaldan o el motivo por el que no se acredita.
- Cobertura calculada con criterios y puntos visibles.
- Recomendaciones fundamentadas, sin inventar experiencia, titulaciones ni habilidades.
- Comparación con el análisis anterior de la misma oferta.
- Importación del CV en PDF y DOCX en la web, con avisos cuando la extracción puede estar incompleta.
- Rutas `/analisis` (Preparar) y `/analisis/resultados` (Resultados), con acceso desde «Analizar mi CV» en Inicio; la navegación principal Inicio / Analizar está disponible desde la Fase 4b.1.

Límites:

- **El motor es heurístico** (reglas y un catálogo de habilidades). No predice la decisión de ningún ATS ni la probabilidad de contratación.
- **Importación solo en la web.** La importación en iOS y Android queda pendiente.
- **Sin OCR.** Los PDF escaneados o en imagen no se leen: se pide pegar el texto.
- **Ejemplo ficticio.** «Cargar ejemplo ficticio» se conserva para desarrollo y pruebas, sin protagonismo en la app final.

| Parte                                                                              | Laboratorio               | Proyecto original                          |
| ---------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------ |
| Motor de análisis: requisitos, evidencias, cobertura, recomendaciones, comparación | Implementado, con pruebas | Incorporado, con pruebas                   |
| Importación PDF/DOCX en la web                                                     | Implementada, con pruebas | Incorporada, con pruebas                   |
| Pantalla `/analisis`                                                               | Implementada, con pruebas | Incorporada, con pruebas                   |
| Enlace provisional desde la pantalla de inicio                                     | No existe                 | Incorporado, con pruebas                   |
| Recorrido en Chrome de escritorio (390 y 1440 px, modo claro y oscuro)             | Hecho                     | Verificado                                 |
| Recorrido en Safari del iPhone                                                     | Sin hacer                 | **Pendiente**                              |
| Revisión en iOS y Android nativos, VoiceOver y TalkBack                            | Sin hacer                 | Pendiente (importación nativa sin empezar) |

Migración: los bloques 0 a 6 están hechos.

- **Bloque 0:** copia de seguridad verificada del laboratorio y rama `feature/analizador-cv-oferta`.
- **Bloques 1 a 5:** roadmap, motor, dominio de importación, dependencias y lectores, cada uno con su commit.
- **Bloque 6:** interfaz y `ThemedText` compartido, pendiente de tu revisión y commit.

Las skills de Replica y su documentación experimental no se trasladan.

Rediseño del analizador según el prototipo visual aprobado, por subfases pequeñas:

| Subfase | Contenido                                                                                                     | Estado     | Commit    |
| ------- | ------------------------------------------------------------------------------------------------------------- | ---------- | --------- |
| 3b.1    | Sección «Tu CV» de Preparar: selector Archivo / Pegar texto, `FileCard`, avisos y «Revisar el texto extraído» | Completada | `965614a` |
| 3b.2    | Sección «La oferta» de Preparar: título, campo, estado «Lista para analizar» y editor ampliable               | Completada | `9ea167f` |
| 3a.1    | Preparar (`/analisis`) y Resultados (`/analisis/resultados`) en rutas separadas, con la sesión en memoria     | Completada | `faadc7c` |
| 3c.1    | Resultados: resumen compacto y «Qué mejorar primero» con las tres recomendaciones principales                 | Completada | `d560694` |
| 3c.2a   | Resultados: requisitos desplegables con `Disclosure`                                                          | Completada | `b0ae88b` |
| 3c.2b   | Resultados: filtros visuales por estado con recuentos reales y no evaluables en su grupo                      | Completada | `1ea613c` |
| 3d.1    | Resultados responsive: dos columnas desde 1024 px en web, con más espacio para requisitos                     | Completada | `463aa50` |

La acción «Analizar», el diseño de Resultados y la navegación global mantienen su diseño actual hasta sus subfases.

**Pendiente para completar la Fase A:** el recorrido en Safari del iPhone y la revisión final. La importación nativa, el OCR y la revisión con lectores de pantalla nativos quedan fuera de esta fase.

#### Fase 4 — Inicio de JobRadar ATS

**En curso.** El Inicio explica el producto y da acceso inmediato al análisis, siguiendo el prototipo aprobado y el sistema visual existente.

| Subfase | Contenido                                                                                 | Estado     | Commit    |
| ------- | ----------------------------------------------------------------------------------------- | ---------- | --------- |
| 4a.1    | Inicio responsive: identidad, «Analizar mi CV», tres pasos, privacidad y metodología      | Completada | `9a2890c` |
| 4b.1    | Navegación principal compartida: Inicio y Analizar, con protección de salida de la sesión | Completada | `4b3764b` |
| 4c      | Pulido visual conjunto de Inicio, Preparar y Resultados; capturas reales y mosaicos       | Completada | `2a03556` |
| 4d      | Acabado visual: Inicio compacto, selector de archivo reducido y resumen sin repetición    | Completada | `e92e081` |
| 4e      | Inicio en escritorio, no evaluables plegados y diagnóstico del motor sin cambios          | Completada | `894a807` |

La navegación principal ofrece los dos destinos existentes, Inicio y Analizar; Resultados pertenece al flujo de Analizar. Salir con datos pide confirmación y descarta la sesión como antes. El Inicio no muestra estadísticas ni historial sin datos que los sustenten. La ampliación de destinos de la Fase 3 sigue pendiente.

#### Fase 5a — Fiabilidad del análisis CV–oferta

**Completada: `4e5951a`.** Base: 4e (`894a807`), 689 pruebas. Se corrigen únicamente fallos reproducidos con datos ficticios: duplicados evidentes no evaluables en el mismo contexto, segmentación de «experiencia mín. de 3 años» y préstamo de niveles entre idiomas coordinados con niveles propios explícitos. Quince regresiones nuevas, sin eliminar las anteriores. Comparación antes/después sobre veinte casos; se conservan fórmula, pesos y semántica de estados. El ejemplo largo sigue en 9 evaluados, 28 no evaluables y 44 %.

La ampliación del catálogo, la separación sistemática de responsabilidades y requisitos, los encabezados ambiguos y la política de niveles no MCER quedan como propuestas documentadas en arquitectura. No se modifica la interfaz ni se adelanta la gestión de ofertas de la Fase 5. La causa de los 28 elementos de la oferta real sigue sin determinarse sin disponer de ese texto.

#### Fase 5c — Negaciones e importancia por cláusula

**Completada: `e2ae056`.** Tras la auditoría 5b de solo lectura, sobre `4e5951a` (704 pruebas), se corrigen exigencias negadas y la importancia de cláusulas con marcadores explícitos. Se conserva la frase original mediante el mecanismo de revisión para las negaciones o alcances inseguros; «pero se valorará» y «pero sí Kubernetes» reciben su interpretación explícita sin propagar la negación. Fórmula, pesos, estados y evidencia del CV mantienen su significado. Quince regresiones nuevas y ninguna eliminada; comparación de once casos y controles de las ofertas técnicas de 5b.

No se adelantan alternativas, reconocimiento parcial, ampliaciones del catálogo ni cambios visuales. La política general de responsabilidades y los conflictos entre frases distintas siguen pendientes. El diagnóstico y sus límites quedan en arquitectura.

#### Fase 5d — Protecciones ante alternativas y reconocimiento parcial

**Completada: `204f239`.** Base: 5c (`e2ae056`), 719 pruebas. Las alternativas técnicas explícitas se conservan como grupos no evaluables con todas sus opciones y fuente, incluida la aclaración «basta con uno»; no se puntúan como dos obligaciones. Las listas seguras como «SQL y Databricks» mantienen SQL evaluable y añaden Databricks para revisión sin duplicados ni puntuación. Se reutilizan los componentes existentes, sin cambios visuales. Doce pruebas nuevas y ninguna eliminada; se adapta la expectativa incorrecta de React/Vue como dos obligaciones.

Se verifica con el extractor histórico la trazabilidad del 50 % → 67 % de 5c, que permanece intacta. La fórmula, los pesos, el catálogo, el tratamiento del CV y los contextos ajenos a las listas explícitas no cambian. La evaluación real de grupos alternativos y el reconocimiento parcial de prosa libre quedan pendientes; no se fuerza un rediseño del dominio.

#### Fase 6a — Comprobación DOCX y experiencia desde fechas

**Completada: `7da7ac4`.** Base: `204f239`, 731 pruebas. El usuario confirma que DOCX sí funciona en su iPhone; no se modifica el importador sin una causa reproducible. Chrome valida documentos ficticios válidos, vacíos y dañados, rechazo de Word antiguo, edición y PDF. WebKit no está instalado y no se afirma una prueba propia de Safari real.

El motor calcula la unión conservadora de periodos profesionales a resolución mensual, con límites para años sin meses y referencia controlable para «actualidad». Respalda solo experiencia general suficientemente acreditada, sin trasladar esos años a tecnologías o puestos ni sumar dos veces solapamientos. Conserva periodos, mínimos, referencia y fuentes; se actualizan los mensajes anteriores. Veinte regresiones nuevas, ninguna eliminada, y adaptación de dos mensajes existentes. El cálculo específico por tecnología/puesto y formatos no reconocidos quedan pendientes; se mantienen fórmula y pesos.

#### Fase 6b — Puestos explícitos y trazabilidad de fechas

**Completada: `18b4d07`.** Base: 6a (`7da7ac4`), 751 pruebas. Se asocian periodos a títulos literales explícitos, se une solo la duración relevante y se distinguen «más de» y «al menos». No se equiparan profesiones, traducciones o seniority ni se atribuyen fechas generales a tecnologías. Se evitan respaldos desde declaraciones generales o frases con cifras mezcladas.

El desplegable existente explica periodos incluidos/excluidos, mínimo relevante, referencia y cumplimiento del umbral. Veintitrés regresiones nuevas, ninguna eliminada; se adapta un mensaje anterior. Comparación con 6a y comprobación en Chrome a 390/1440 px. Las relaciones profesionales ambiguas, cabeceras no reconocidas y formatos no acotados quedan como decisiones pendientes, sin forzar puntuaciones positivas. Se conservan fórmula y pesos.

### Próximas fases

| Fase | Objetivo                                                                         | Estado  |
| ---- | -------------------------------------------------------------------------------- | ------- |
| 3    | Navegación móvil y cinco secciones principales                                   | Próxima |
| 5    | Introducción manual y gestión básica de ofertas laborales                        | Próxima |
| 5b   | PWA instalable en iPhone, con alojamiento gratuito y HTTPS                       | Próxima |
| 6    | Validación y consolidación: arquitectura, pruebas, seguridad y experiencia móvil | Próxima |

El analizador de la Fase A ya se abre desde Inicio. La Fase 4b.1 unifica los dos destinos existentes; la ampliación a más secciones sigue pendiente de autorización.

#### Fase 5b (PWA)

Se llama **5b** para situarla después de la Fase 5 sin renumerar las fases acordadas. La v1.0 cubrió parte de su alcance: salida estática en Vercel con HTTPS, manifiesto e icono para «Añadir a pantalla de inicio», sin service worker. Alcance previsto:

1. **Estudio previo.** Pasar de `web.output: "server"` a salida estática si el alojamiento lo requiere; manifiesto web, iconos y service worker; limitaciones de las PWA en Safari para iOS (instalación con «Añadir a pantalla de inicio», almacenamiento y notificaciones).
2. **Alojamiento.** Comparar opciones gratuitas con HTTPS compatibles con un repositorio privado. Las condiciones de los planes gratuitos deben comprobarse en el momento del estudio.
3. **Implementación y verificación** en un iPhone real.

Situarla después de la Fase 5 permite probar en iPhone una app con contenido real. Situarla antes de la Fase 6 permite que la consolidación revise también la experiencia de la PWA.

### Evolución posterior

Funcionalidades planificadas para después de la Fase 6. El orden y la agrupación en fases se decidirán más adelante. La Fase A adelanta una primera versión web de las dos primeras; **el resto no está implementado**.

- Motor ATS propio y explicable, con análisis de requisitos y habilidades (presentes, ausentes o no verificables) y recomendaciones de mejora fundamentadas: evolución de la Fase A.
- Importación de CV en PDF y DOCX en iOS y Android (la web forma parte de la Fase A).
- Reconocimiento de texto (OCR) en CV escaneados.
- Gestión de varias versiones del CV.
- Integración opcional de IA local o gratuita.
- Edición y exportación de currículums.
- Historial y seguimiento de candidaturas.
- Integración con las funciones de compartir del dispositivo, cuando sea viable.

#### Condiciones para esta evolución y para la Fase A

- **Motor ATS:** cada puntuación debe mostrar los criterios y las evidencias en que se basa. No debe presentarse como predicción de la decisión de un ATS real ni como probabilidad de contratación.
- **Recomendaciones y edición:** nunca inventarán experiencia, titulaciones ni habilidades.
- **IA:** será opcional, local o gratuita, y requerirá una evaluación previa de privacidad, porque los CV contienen datos personales.
- **Nuevas librerías** (lectura de PDF/DOCX, exportación, IA): se consultará antes de instalarlas y se validará su compatibilidad con Expo SDK 58, iOS, Android y la web.
