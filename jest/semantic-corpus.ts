/*
Corpus ficticio y bilingüe para medir el análisis semántico de la v1.4.

Cada caso es un requisito que el motor determinista no puede acreditar, con las frases del CV
que un revisor aceptaría como evidencia (`expected`) y las que no deben proponerse aunque se
parezcan (`traps`): tecnologías relacionadas pero distintas, negaciones, aprendizaje y
conocimiento teórico. Las demás frases del CV no guardan relación con el requisito.

Los casos se reparten en dos mitades: `dev` para calibrar los umbrales y `test` para medir con
casos que no se usaron al calibrar. Personas, empresas y datos son inventados.
*/

export type TrapKind = 'related' | 'negated' | 'learning' | 'hedged';

export type SemanticCase = {
  cv: keyof typeof semanticCvs;
  split: 'dev' | 'test';
  requirement: string;
  /** Fragmentos literales de las frases que cuentan como evidencia. */
  expected: string[];
  traps: { text: string; kind: TrapKind }[];
};

export const semanticCvs = {
  frontendEs: `Laura Ejemplo Ficticio
laura@example.com

Perfil
Desarrolladora web centrada en interfaces accesibles y rápidas.

Experiencia
Desarrollé interfaces web con React y TypeScript para una plataforma de reservas.
Escribí pruebas automatizadas con Jest y Testing Library para cada componente.
Coordiné a un equipo de cuatro desarrolladores y organicé las revisiones de código.
Reduje un 40 % el tiempo de carga inicial dividiendo el código y optimizando imágenes.
Publiqué una aplicación en App Store y Google Play con React Native.
Diseñé esquemas en PostgreSQL y optimicé consultas SQL lentas.
Atendí incidencias de usuarios y documenté las soluciones en la base de conocimiento.
Presenté los resultados de cada trimestre a la dirección y a los clientes.
Configuré la integración continua con GitHub Actions para cada rama.
Adapté los formularios a las pautas WCAG para lectores de pantalla.
No tengo experiencia con Kubernetes ni con despliegues en la nube.
Estoy aprendiendo Terraform en un curso en línea.

Formación
Grado en Ingeniería Informática, Universidad de Ejemplo.`,

  dataEn: `Alex Sample
alex@example.com

Summary
Data engineer who enjoys turning messy data into reliable reports.

Experience
Built ETL pipelines in Python that load sales data into a data warehouse.
Designed REST services in Java with Spring Boot for the billing team.
Mentored two junior engineers and led weekly planning sessions.
Created Power BI dashboards for the finance department.
Migrated on-premise servers to AWS using Terraform modules.
Negotiated contracts with external vendors and tracked their delivery.
Wrote technical documentation and onboarding guides for new hires.
Monitored production systems with Grafana and set up alerting rules.
Translated customer requirements into user stories with the product owner.
I have never worked on mobile development.
Familiar with Kafka from online tutorials, no practical experience.

Education
BSc in Computer Science, Example University.`,

  supportEs: `Marta Prueba
marta@example.com

Experiencia profesional
Resolví incidencias de clientes por teléfono, correo y chat en un servicio de atención.
Formé a cinco compañeros nuevos en los procedimientos del departamento.
Elaboré informes semanales de satisfacción con hojas de cálculo.
Gestioné el inventario de la tienda y los pedidos a proveedores.
Organicé turnos y vacaciones de un equipo de doce personas.
Atendí reclamaciones y propuse mejoras que redujeron las devoluciones.
Nunca he trabajado en contabilidad.
Tengo nociones de SAP, sin experiencia práctica.

Idiomas
Inglés B2.`,

  mobileEn: `Sam Placeholder
sam@example.com

Experience
Shipped three iOS apps written in Swift with offline storage.
Reduced app crashes by half after adding automated UI tests.
Collaborated with designers to build an accessible design system.
Published Android apps with Kotlin and Jetpack Compose.
Integrated payment providers and push notifications in mobile apps.
Presented the product roadmap to stakeholders every quarter.
Currently learning Flutter in my spare time.

Projects
Open-source library for date formatting used by other developers.`,
} as const;

export const semanticCases: SemanticCase[] = [
  // Laura (frontend, español)
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Experiencia en testing automatizado de interfaces',
    expected: ['Escribí pruebas automatizadas'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Capacidad para liderar equipos de desarrollo',
    expected: ['Coordiné a un equipo'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Optimización del rendimiento web',
    expected: ['Reduje un 40 %'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Desarrollo de aplicaciones móviles',
    expected: ['Publiqué una aplicación'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Diseño de bases de datos relacionales',
    expected: ['Diseñé esquemas en PostgreSQL'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Orquestación de contenedores en la nube',
    expected: [],
    traps: [{ text: 'No tengo experiencia con Kubernetes', kind: 'negated' }],
  },
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Infraestructura como código',
    expected: [],
    traps: [{ text: 'Estoy aprendiendo Terraform', kind: 'learning' }],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Soporte técnico a usuarios',
    expected: ['Atendí incidencias de usuarios'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Comunicación de resultados a clientes',
    expected: ['Presenté los resultados'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Experiencia con Svelte',
    expected: [],
    traps: [{ text: 'Desarrollé interfaces web con React', kind: 'related' }],
  },
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Experiencia con Cassandra',
    expected: [],
    traps: [{ text: 'Diseñé esquemas en PostgreSQL', kind: 'related' }],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Conocimientos de contabilidad financiera',
    expected: [],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Gestión de nóminas',
    expected: [],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Experience with continuous delivery pipelines',
    expected: ['Configuré la integración continua'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'dev',
    requirement: 'Knowledge of web accessibility guidelines',
    expected: ['Adapté los formularios a las pautas WCAG'],
    traps: [],
  },
  {
    cv: 'frontendEs',
    split: 'test',
    requirement: 'Posicionamiento SEO',
    expected: [],
    traps: [],
  },
  // Alex (datos, inglés)
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Experiencia en procesos de extracción, transformación y carga de datos',
    expected: ['Built ETL pipelines'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'test',
    requirement: 'Desarrollo de servicios backend',
    expected: ['Designed REST services'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Mentoring of junior developers',
    expected: ['Mentored two junior engineers'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'test',
    requirement: 'Visualización de datos en cuadros de mando',
    expected: ['Created Power BI dashboards'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Experiencia con Tableau',
    expected: [],
    traps: [{ text: 'Created Power BI dashboards', kind: 'related' }],
  },
  {
    cv: 'dataEn',
    split: 'test',
    requirement: 'Migración de sistemas a la nube',
    expected: ['Migrated on-premise servers'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Desarrollo de apps para móviles',
    expected: [],
    traps: [{ text: 'I have never worked on mobile development', kind: 'negated' }],
  },
  {
    cv: 'dataEn',
    split: 'test',
    requirement: 'Procesamiento de eventos en streaming',
    expected: [],
    traps: [{ text: 'Familiar with Kafka', kind: 'hedged' }],
  },
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Negociación con proveedores',
    expected: ['Negotiated contracts with external vendors'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'test',
    requirement: 'Redacción de documentación técnica',
    expected: ['Wrote technical documentation'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Monitorización de sistemas en producción',
    expected: ['Monitored production systems'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'test',
    requirement: 'Análisis de requisitos de negocio',
    expected: ['Translated customer requirements'],
    traps: [],
  },
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Experiencia con Rust',
    expected: [],
    traps: [{ text: 'Designed REST services in Java', kind: 'related' }],
  },
  {
    cv: 'dataEn',
    split: 'test',
    requirement: 'Experiencia con Google BigQuery',
    expected: [],
    traps: [{ text: 'into a data warehouse', kind: 'related' }],
  },
  {
    cv: 'dataEn',
    split: 'dev',
    requirement: 'Diseño gráfico de material publicitario',
    expected: [],
    traps: [],
  },
  // Marta (atención al cliente, español)
  {
    cv: 'supportEs',
    split: 'dev',
    requirement: 'Atención al cliente multicanal',
    expected: ['Resolví incidencias de clientes'],
    traps: [],
  },
  {
    cv: 'supportEs',
    split: 'test',
    requirement: 'Formación de nuevos empleados',
    expected: ['Formé a cinco compañeros'],
    traps: [],
  },
  {
    cv: 'supportEs',
    split: 'dev',
    requirement: 'Gestión de stock y aprovisionamiento',
    expected: ['Gestioné el inventario'],
    traps: [],
  },
  {
    cv: 'supportEs',
    split: 'test',
    requirement: 'Planificación de turnos de personal',
    expected: ['Organicé turnos y vacaciones'],
    traps: [],
  },
  {
    cv: 'supportEs',
    split: 'dev',
    requirement: 'Conocimientos de contabilidad',
    expected: [],
    traps: [{ text: 'Nunca he trabajado en contabilidad', kind: 'negated' }],
  },
  {
    cv: 'supportEs',
    split: 'test',
    requirement: 'Experiencia con SAP',
    expected: [],
    traps: [{ text: 'Tengo nociones de SAP', kind: 'hedged' }],
  },
  {
    cv: 'supportEs',
    split: 'dev',
    requirement: 'Gestión de reclamaciones',
    expected: ['Atendí reclamaciones'],
    traps: [],
  },
  {
    cv: 'supportEs',
    split: 'test',
    requirement: 'Programación de microcontroladores',
    expected: [],
    traps: [],
  },
  // Sam (móvil, inglés)
  {
    cv: 'mobileEn',
    split: 'dev',
    requirement: 'Desarrollo nativo para iOS',
    expected: ['Shipped three iOS apps'],
    traps: [],
  },
  {
    cv: 'mobileEn',
    split: 'test',
    requirement: 'Pruebas automatizadas de interfaz',
    expected: ['adding automated UI tests'],
    traps: [],
  },
  {
    cv: 'mobileEn',
    split: 'dev',
    requirement: 'Experiencia con Flutter',
    expected: [],
    traps: [{ text: 'Currently learning Flutter', kind: 'learning' }],
  },
  {
    cv: 'mobileEn',
    split: 'test',
    requirement: 'Experiencia con Xamarin',
    expected: [],
    traps: [{ text: 'Published Android apps with Kotlin', kind: 'related' }],
  },
  {
    cv: 'mobileEn',
    split: 'dev',
    requirement: 'Integración de pasarelas de pago',
    expected: ['Integrated payment providers'],
    traps: [],
  },
  {
    cv: 'mobileEn',
    split: 'test',
    requirement: 'Contribuciones a proyectos de código abierto',
    expected: ['Open-source library'],
    traps: [],
  },
  {
    cv: 'mobileEn',
    split: 'dev',
    requirement: 'Presentaciones ante la dirección',
    expected: ['Presented the product roadmap'],
    traps: [],
  },
  {
    cv: 'mobileEn',
    split: 'test',
    requirement: 'Gestión de almacenes logísticos',
    expected: [],
    traps: [],
  },
];
