import type {
  CvSectionKind,
  EvidenceRole,
  Importance,
  RequirementStatus,
} from '@/features/cv-match/domain/types';

export const statusLabels: Record<RequirementStatus, string> = {
  supported: 'Respaldado',
  mentioned: 'Sin evidencia suficiente',
  missing: 'No acreditado',
  'not-evaluable': 'No evaluable',
};

export const statusGroupTitles: Record<RequirementStatus, string> = {
  supported: 'Respaldados por tu CV',
  mentioned: 'Sin evidencia suficiente',
  missing: 'No acreditados',
  'not-evaluable': 'No evaluables, fuera del porcentaje',
};

export const statusGroupDescriptions: Record<RequirementStatus, string> = {
  supported: 'Tu CV describe dónde los has aplicado.',
  mentioned: 'Aparecen en tu CV, pero sin describir dónde los usaste.',
  missing: 'No aparecen en tu CV, el CV los niega o el nivel que indica es inferior al pedido.',
  'not-evaluable':
    'JobRadar no sabe interpretar estos requisitos. Revísalos tú: no cuentan en el porcentaje.',
};

export const importanceLabels: Record<Importance, string> = {
  required: 'Obligatorio',
  preferred: 'Deseable',
  unclassified: 'Sin clasificar',
  ambiguous: 'Importancia ambigua',
};

export const sectionLabels: Record<CvSectionKind, string> = {
  header: 'Cabecera',
  profile: 'Perfil',
  experience: 'Experiencia',
  education: 'Formación',
  skills: 'Habilidades',
  languages: 'Idiomas',
  projects: 'Proyectos',
  certifications: 'Certificaciones',
  other: 'Otra sección',
};

export const roleLabels: Record<EvidenceRole, string> = {
  support: 'Describe el uso',
  mention: 'Solo lo menciona',
  hedged: 'Conocimiento teórico o indirecto',
  learning: 'En aprendizaje',
  negation: 'Lo niega',
};

/** A requirement name as a heading: capital first letter, no final period. */
export function displayLabel(label: string): string {
  const trimmed = label.replace(/\.$/, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Spanish decimals: 7.5 → "7,5". */
export function formatNumber(value: number): string {
  return String(value).replace('.', ',');
}

/** "50 %", with a non-breaking space so the sign never wraps alone. */
export function formatPercent(value: number): string {
  return `${value} %`;
}
