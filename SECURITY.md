# Seguridad

## Comunicar una vulnerabilidad

No publiques vulnerabilidades, credenciales ni datos de CV en issues, pull requests o capturas.

- Si está habilitado, usa [Report a vulnerability](https://github.com/jorgearcenic7/jobradar-ats/security/advisories/new), en **Security → Advisories**.
- Si esa opción no está disponible, escribe en privado al contacto del proyecto: **jorgearcenic7@gmail.com**, con el asunto «JobRadar ATS — Seguridad». Envía primero una descripción sin datos sensibles.

Indica la versión o commit afectado, el impacto y los pasos mínimos para reproducirlo con datos ficticios. No envíes tokens, contraseñas, CV reales ni archivos de otras personas. No pruebes con cuentas ajenas ni extraigas datos de producción.

## Alcance y mantenimiento

Los informes se revisan sobre el código actual de `main`. No hay un plazo de respuesta garantizado ni un programa de recompensas. Las funciones experimentales se identifican como tales en la aplicación y la documentación.

El análisis del CV se ejecuta localmente. Las cuentas y el guardado voluntario dependen de Supabase; las variables `EXPO_PUBLIC_*` solo pueden contener configuración pública. Los secretos privilegiados pertenecen al entorno de servidor.

La presencia de este archivo no confirma que los avisos privados, secret scanning u otras funciones de GitHub estén activados. Su activación queda a cargo del propietario; consulta [la preparación del repositorio público](docs/public-repository.md).
