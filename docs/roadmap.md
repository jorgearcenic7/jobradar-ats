# Roadmap de JobRadar ATS

El desarrollo avanza por fases. Cada fase se autoriza de forma explícita y se cierra con verificación antes de pasar a la siguiente. Las fases no tienen fechas asignadas.

Estados: **Completada**, **En curso** (empezada, con subfases o tareas pendientes) y **Próxima** (acordada, sin empezar).

## Fases completadas

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

## Fases en curso

El orden entre las subfases pendientes de la Fase 2 y la Fase A se decide en cada autorización.

### Fase 2 — Sistema de diseño

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

### Fase A — Analizador CV–oferta web

**En curso.** Se adelanta respecto al roadmap inicial como funcionalidad web experimental: toma de la [evolución posterior](#evolución-posterior) el motor explicable, el análisis de requisitos, las recomendaciones y la importación de CV, y los lleva a la web antes de las Fases 3 a 6.

Se construyó primero en un laboratorio, una copia aislada del proyecto, y ahora se migra al proyecto original por bloques autorizados uno a uno. **No se dará por completada hasta terminar la migración y verificarla en el original.**

Alcance:

- Análisis explicable de los requisitos de una oferta frente a un CV: cada requisito muestra las evidencias del CV que lo respaldan o el motivo por el que no se acredita.
- Cobertura calculada con criterios y puntos visibles.
- Recomendaciones fundamentadas, sin inventar experiencia, titulaciones ni habilidades.
- Comparación con el análisis anterior de la misma oferta.
- Importación del CV en PDF y DOCX en la web, con avisos cuando la extracción puede estar incompleta.
- Rutas `/analisis` (Preparar) y `/analisis/resultados` (Resultados), con un enlace provisional desde la pantalla de inicio hasta que existan las pestañas de navegación.

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

| Subfase | Contenido                                                                                                     | Estado                                       | Commit    |
| ------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------- |
| 3b.1    | Sección «Tu CV» de Preparar: selector Archivo / Pegar texto, `FileCard`, avisos y «Revisar el texto extraído» | Completada                                   | `965614a` |
| 3b.2    | Sección «La oferta» de Preparar: título, campo, estado «Lista para analizar» y editor ampliable               | Completada                                   | `9ea167f` |
| 3a.1    | Preparar (`/analisis`) y Resultados (`/analisis/resultados`) en rutas separadas, con la sesión en memoria     | Completada                                   | `faadc7c` |
| 3c.1    | Resultados: resumen compacto y «Qué mejorar primero» con las tres recomendaciones principales                 | Completada                                   | `d560694` |
| 3c.2a   | Resultados: requisitos desplegables con `Disclosure`                                                          | Completada                                   | `b0ae88b` |
| 3c.2b   | Resultados: filtros visuales por estado con recuentos reales y no evaluables en su grupo                      | Completada                                   | `1ea613c` |
| 3d.1    | Resultados responsive: dos columnas desde 1024 px en web, con más espacio para requisitos                     | Implementada, pendiente de revisión y commit | —         |

La acción «Analizar», el diseño de Resultados y la navegación global mantienen su diseño actual hasta sus subfases.

**Pendiente para completar la Fase A:** el recorrido en Safari del iPhone y la revisión final. La importación nativa, el OCR y la revisión con lectores de pantalla nativos quedan fuera de esta fase.

## Próximas fases

| Fase | Objetivo                                                                         | Estado  |
| ---- | -------------------------------------------------------------------------------- | ------- |
| 3    | Navegación móvil y cinco secciones principales                                   | Próxima |
| 4    | Dashboard inicial de JobRadar ATS                                                | Próxima |
| 5    | Introducción manual y gestión básica de ofertas laborales                        | Próxima |
| 5b   | PWA instalable en iPhone, con alojamiento gratuito y HTTPS                       | Próxima |
| 6    | Validación y consolidación: arquitectura, pruebas, seguridad y experiencia móvil | Próxima |

Estas fases mantienen sus objetivos. El analizador de la Fase A se integrará en la navegación cuando existan las pestañas, y entonces sustituirá al enlace provisional.

### Fase 5b (PWA)

Se llama **5b** para situarla después de la Fase 5 sin renumerar las fases acordadas. Alcance previsto:

1. **Estudio previo.** Pasar de `web.output: "server"` a salida estática si el alojamiento lo requiere; manifiesto web, iconos y service worker; limitaciones de las PWA en Safari para iOS (instalación con «Añadir a pantalla de inicio», almacenamiento y notificaciones).
2. **Alojamiento.** Comparar opciones gratuitas con HTTPS compatibles con un repositorio privado. Las condiciones de los planes gratuitos deben comprobarse en el momento del estudio.
3. **Implementación y verificación** en un iPhone real.

Situarla después de la Fase 5 permite probar en iPhone una app con contenido real. Situarla antes de la Fase 6 permite que la consolidación revise también la experiencia de la PWA.

## Evolución posterior

Funcionalidades planificadas para después de la Fase 6. El orden y la agrupación en fases se decidirán más adelante. La Fase A adelanta una primera versión web de las dos primeras; **el resto no está implementado**.

- Motor ATS propio y explicable, con análisis de requisitos y habilidades (presentes, ausentes o no verificables) y recomendaciones de mejora fundamentadas: evolución de la Fase A.
- Importación de CV en PDF y DOCX en iOS y Android (la web forma parte de la Fase A).
- Reconocimiento de texto (OCR) en CV escaneados.
- Gestión de varias versiones del CV.
- Integración opcional de IA local o gratuita.
- Edición y exportación de currículums.
- Historial y seguimiento de candidaturas.
- Integración con las funciones de compartir del dispositivo, cuando sea viable.

### Condiciones para esta evolución y para la Fase A

- **Motor ATS:** cada puntuación debe mostrar los criterios y las evidencias en que se basa. No debe presentarse como predicción de la decisión de un ATS real ni como probabilidad de contratación.
- **Recomendaciones y edición:** nunca inventarán experiencia, titulaciones ni habilidades.
- **IA:** será opcional, local o gratuita, y requerirá una evaluación previa de privacidad, porque los CV contienen datos personales.
- **Nuevas librerías** (lectura de PDF/DOCX, exportación, IA): se consultará antes de instalarlas y se validará su compatibilidad con Expo SDK 58, iOS, Android y la web.
