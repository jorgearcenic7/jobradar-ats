/*
Contenido del prototipo inmersivo. Todo es un ejemplo ilustrativo y ficticio: no sale del motor ni
de ningún análisis del usuario, y la interfaz lo etiqueta siempre como ejemplo.

Repite el ejemplo de la tarjeta de Inicio (Desarrollador/a backend, cuatro requisitos) para que
la promesa sea la misma en la app y en el prototipo.
*/

export type ExampleStatus = 'supported' | 'mentioned' | 'missing';

export const statusLabels: Record<ExampleStatus, string> = {
  supported: 'Respaldado',
  mentioned: 'Sin evidencia suficiente',
  missing: 'No acreditado',
};

// Para la escena estrecha del móvil, donde la etiqueta completa no cabe junto al requisito.
export const shortStatusLabels: Record<ExampleStatus, string> = {
  supported: 'Respaldado',
  mentioned: 'Sin evidencia',
  missing: 'No aparece',
};

export type ExampleRequirement = {
  id: string;
  name: string;
  status: ExampleStatus;
  /** Línea del CV que lo respalda o lo menciona; sin ella, el requisito no aparece en el CV. */
  evidenceLine: number | null;
  /** Posición en el radar: ángulo en grados (0 a la derecha, sentido horario) y anillo. */
  angle: number;
  ring: number;
};

export const exampleRequirements: ExampleRequirement[] = [
  { id: 'python', name: 'Python', status: 'supported', evidenceLine: 2, angle: -38, ring: 2.6 },
  { id: 'scrum', name: 'Scrum', status: 'supported', evidenceLine: 4, angle: 152, ring: 3.4 },
  { id: 'english', name: 'Inglés C1', status: 'mentioned', evidenceLine: 6, angle: 62, ring: 3.1 },
  { id: 'aws', name: 'AWS', status: 'missing', evidenceLine: null, angle: -128, ring: 4.3 },
];

/*
CV ficticio, línea a línea. Las líneas con evidencia son las que citan los requisitos. Ninguna
pasa de 26 caracteres para que la escena del móvil siga siendo legible.
*/
export const exampleCvLines = [
  'Ana Ejemplo · Backend',
  'Experiencia',
  '3 años de APIs con Python',
  'CI con GitHub Actions',
  'Sprints de dos semanas',
  'Idiomas',
  'Inglés: C1',
];
