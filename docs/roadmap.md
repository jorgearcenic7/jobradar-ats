# Roadmap de JobRadar ATS

El desarrollo avanza por fases. Cada fase se autoriza de forma explícita y se cierra con verificación antes de pasar a la siguiente. Las fases no tienen fechas asignadas.

Estados: **Completada** y **Próxima** (acordada, sin empezar).

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
| 1c            | Documentación técnica y reglas permanentes           | Pendiente |

Los cambios de las fases 1a.1 a 1b.1-fix2 se registraron juntos en el commit `7740c94`. La Fase 1c (`CLAUDE.md`, `README.md`, [architecture.md](architecture.md) y este roadmap) está aprobada; su commit aún no se ha realizado.

## Próximas fases

La siguiente fase es la **Fase 2**, pendiente de autorización.

| Fase | Objetivo                                                                         | Estado  |
| ---- | -------------------------------------------------------------------------------- | ------- |
| 2    | Sistema de diseño: colores, tipografía, temas y componentes reutilizables        | Próxima |
| 3    | Navegación móvil y cinco secciones principales                                   | Próxima |
| 4    | Dashboard inicial de JobRadar ATS                                                | Próxima |
| 5    | Introducción manual y gestión básica de ofertas laborales                        | Próxima |
| 5b   | PWA instalable en iPhone, con alojamiento gratuito y HTTPS                       | Próxima |
| 6    | Validación y consolidación: arquitectura, pruebas, seguridad y experiencia móvil | Próxima |

### Fase 5b (PWA)

Se llama **5b** para situarla después de la Fase 5 sin renumerar las fases acordadas. Alcance previsto:

1. **Estudio previo.** Pasar de `web.output: "server"` a salida estática si el alojamiento lo requiere; manifiesto web, iconos y service worker; limitaciones de las PWA en Safari para iOS (instalación con «Añadir a pantalla de inicio», almacenamiento y notificaciones).
2. **Alojamiento.** Comparar opciones gratuitas con HTTPS compatibles con un repositorio privado. Las condiciones de los planes gratuitos deben comprobarse en el momento del estudio.
3. **Implementación y verificación** en un iPhone real.

Situarla después de la Fase 5 permite probar en iPhone una app con contenido real. Situarla antes de la Fase 6 permite que la consolidación revise también la experiencia de la PWA.

## Evolución posterior

Funcionalidades planificadas para después de la Fase 6. **Ninguna está implementada.** El orden y la agrupación en fases se decidirán más adelante.

- Importación de CV en PDF y DOCX.
- Gestión de varias versiones del CV.
- Motor ATS propio y explicable.
- Análisis de requisitos y habilidades: presentes, ausentes o no verificables.
- Recomendaciones de mejora fundamentadas.
- Integración opcional de IA local o gratuita.
- Edición y exportación de currículums.
- Historial y seguimiento de candidaturas.
- Integración con las funciones de compartir del dispositivo, cuando sea viable.

### Condiciones para esta evolución

- **Motor ATS:** cada puntuación debe mostrar los criterios y las evidencias en que se basa. No debe presentarse como predicción de la decisión de un ATS real.
- **Recomendaciones y edición:** nunca inventarán experiencia, titulaciones ni habilidades.
- **IA:** será opcional, local o gratuita, y requerirá una evaluación previa de privacidad, porque los CV contienen datos personales.
- **Nuevas librerías** (lectura de PDF/DOCX, exportación, IA): se consultará antes de instalarlas y se validará su compatibilidad con Expo SDK 58, iOS, Android y la web.
