// Fictional job offers for the regression tests of the offer reading. Companies, products
// and addresses are invented; none of them comes from a real offer or CV.

/** An offer with headings that mixes requirements with product, culture and applying. */
export const structuredOffer = `Nubaria Labs construye una plataforma de automatización para equipos de producto.
Nuestra plataforma se integra con Figma, Slack y Jira para sincronizar el trabajo de diseño.
Desplegamos todos los servicios con Docker sobre infraestructura propia.

Sobre el puesto
Buscamos una persona para el equipo de agentes de IA.

Lo que harás
- Diseñar flujos con IA agéntica y servidores MCP.
- Construir automatizaciones entre herramientas internas.

Requisitos
- 3 años de experiencia con TypeScript.
- Experiencia con React o Vue.
- Conocimientos de IA agéntica y del protocolo MCP.

Conocimientos deseables
- Docker y Kubernetes.
- Experiencia con LangSmith o Langfuse.

Por qué unirte a Nubaria
- Trabajarás en un equipo apasionado que cambia la forma de trabajar.
- Formación continua en Python y cloud.
- Somos un equipo diverso que valora la comunicación.

Cómo aplicar
Envía tu CV en PDF y un enlace a tu portfolio. Valoraremos que nos cuentes un proyecto.`;

/** An offer whose last list has a heading JobRadar does not know. */
export const unknownHeadingOffer = `Requisitos
- Experiencia con React.

Lo que te hará destacar
- Docker.
- Experiencia con Kubernetes en producción.
- Se valorará experiencia con AWS.
- Formación continua en Python.`;

/** A requirements list split by topic subheadings. */
export const subheadingsOffer = `Requisitos imprescindibles
Frontend
- React y TypeScript.
Backend
- Node.js.
Idiomas:
- Inglés B2.`;

/** An offer written as a single paragraph, without headings or bullets. */
export const paragraphOffer =
  'Ejemplo Digital busca una persona desarrolladora frontend para su equipo de producto. ' +
  'Somos un equipo de veinte personas que construye herramientas de diseño. ' +
  'Nuestra plataforma se integra con Figma y Jira. ' +
  'Necesitamos experiencia con React y TypeScript. ' +
  'Se valorará conocimiento de Docker. ' +
  'Trabajamos con Kubernetes en todos los entornos. ' +
  'Ofrecemos teletrabajo y formación continua en AWS. ' +
  'Envía tu CV a empleo@ejemplo-digital.example.';

/** An offer without headings: a short introduction followed by a list. */
export const listWithoutHeadingsOffer = `Ejemplo Digital busca desarrolladora o desarrollador backend.
Buscamos a alguien con:
- Experiencia con Node.js.
- PostgreSQL.
- Inglés B2.
Ofrecemos horario flexible y seguro médico.`;
