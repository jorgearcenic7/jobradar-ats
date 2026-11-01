@AGENTS.md

# Reglas permanentes de JobRadar ATS

`AGENTS.md` (importado arriba) contiene las reglas técnicas de Expo. Este archivo añade las reglas de trabajo del proyecto. Contexto del producto: [README.md](README.md). Arquitectura: [docs/architecture.md](docs/architecture.md). Fases: [docs/roadmap.md](docs/roadmap.md).

## Forma de trabajo

- Trabaja exclusivamente en la fase autorizada de forma explícita. No adelantes trabajo de fases posteriores.
- Al terminar una fase, detente y espera aprobación antes de continuar.
- Cuando se pida un plan, preséntalo sin modificar archivos hasta recibir la aprobación.
- Al cerrar una fase, informa de los archivos modificados, los resultados de las verificaciones y los problemas pendientes, sin omitir fallos.

## Git

- No hagas commits, push, merge, rebase ni pull requests. El usuario los realiza manualmente.
- No cambies de rama sin autorización.

## Presupuesto y dependencias

- Presupuesto máximo: 0 €. Solo herramientas, servicios y planes gratuitos.
- Consulta antes de instalar dependencias, conectar servicios externos o añadir plugins.
- Instala con `npx expo install`. En Windows, `npx expo install <paquetes> "--" --dev` puede dejar los paquetes en `dependencies`: revisa `package.json` después de instalar.

## Calidad, seguridad y arquitectura

- Mantén la arquitectura modular por funcionalidades descrita en [docs/architecture.md](docs/architecture.md), sin sobreingeniería ni carpetas vacías.
- Mantén las rutas de `src/app/` ligeras. Los tests van en `__tests__/` y los stubs de Jest en `jest/`.
- Sigue buenas prácticas de seguridad: no guardes secretos en el repositorio y trata los datos de los CV como datos personales.
- Producto: no afirmes que la app predice la decisión de un ATS real y no inventes experiencia, titulaciones ni habilidades del usuario.
- Usa las skills y los MCP disponibles cuando aporten valor (por ejemplo, las skills `expo:*`, de verificación o de revisión de código).

## Verificaciones obligatorias

Ejecuta las que correspondan al cambio antes de dar una fase por terminada:

```bash
npm test                        # Jest + React Native Testing Library
npm run lint                    # ESLint (expo lint)
npm run typecheck               # tsc --noEmit
npm run format:check            # Prettier, incluidos los .md
npx expo export --platform web  # compilación web en dist/
```

## Idioma

- Documentación, explicaciones y mensajes de commit: español.
- Código, identificadores y comentarios de código: inglés, salvo razón técnica.
