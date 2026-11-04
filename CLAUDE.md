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
- Mantén las rutas de `src/app/` ligeras. Los tests van en `__tests__/`; los stubs y las utilidades de prueba (fixtures, lectores reales), en `jest/`.
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
- Código e identificadores (variables, funciones, tipos, nombres de APIs y de pruebas): inglés, según las convenciones de TypeScript.
- Comentarios y documentación del código: español, según la convención de la sección siguiente.
- Textos de producto, cadenas de error y contratos que no son comentarios: se conservan literalmente.

## Comentarios y documentación del código

Los comentarios explican sobre todo **por qué** se hace algo, no repiten lo que el código ya dice. Deben ser profesionales, específicos y útiles para quien mantenga el código.

### Sintaxis

En TypeScript y TSX se usan los equivalentes válidos del estilo de Python (`#` y triples comillas).

Comentario breve:

```typescript
// Normalizamos el texto antes de buscar coincidencias.
```

Explicación de varios párrafos:

```typescript
/*
Este módulo interpreta los requisitos de una oferta laboral.

Separa las competencias exigidas de las menciones al
producto para evitar penalizaciones incorrectas.
*/
```

Documentación pública (JSDoc), cuando aporte valor:

```typescript
/**
 * Analiza las competencias acreditadas por el CV.
 *
 * Mantiene las evidencias originales para que el usuario
 * pueda comprobar de dónde procede cada conclusión.
 */
```

En Python: `#` para comentarios breves y docstrings con triples comillas cuando corresponda. No uses nunca una sintaxis de comentario que no sea válida en el lenguaje del archivo.

### Cuándo comentar

- Al principio de los archivos fuente relevantes, una introducción breve y específica sobre su responsabilidad, siempre que aporte información que el nombre del archivo no transmite.
- Explicaciones en algoritmos, heurísticas, validaciones relevantes, transformaciones complejas, decisiones arquitectónicas, casos especiales, gestión de errores, limitaciones técnicas, reglas de negocio y optimizaciones de rendimiento.
- JSDoc en las funciones públicas importantes cuando ayude a comprender su contrato.

### Qué evitar

- Comentarios en cada línea o que repiten instrucciones evidentes.
- Encabezados artificiales, texto genérico o explicaciones que parezcan generadas automáticamente.
- Comentarios desactualizados: al cambiar el código, actualiza o elimina el comentario que lo describe.
- Datos personales reales en comentarios y ejemplos: usa siempre datos ficticios.

### Excepciones

- Las directivas que leen las herramientas (`// eslint-disable-next-line`, `// @ts-expect-error`, `// prettier-ignore`…) conservan su sintaxis; la explicación que las acompañe va en español.
- Los archivos generados y el código o las licencias de terceros se dejan como están.

### Comentarios existentes

Los comentarios en inglés que ya existen se traducirán en una fase específica. Hasta entonces no los traduzcas de forma masiva: escribe en español los comentarios nuevos y los que tengas que reescribir.
