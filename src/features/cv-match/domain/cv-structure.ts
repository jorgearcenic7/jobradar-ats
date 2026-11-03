import { namesAnyTerm, type CatalogIndex } from './skill-catalog';
import { countWords, normalize, splitLines, splitSentences } from './text';
import type { CvChecks, CvSectionKind } from './types';

/** One sentence of the CV. `text` is a literal slice of the CV. */
export type CvUnit = { text: string; normalized: string; section: CvSectionKind };

export type ParsedCv = { units: CvUnit[]; checks: CvChecks };

// Detection by headings with known names, as documented by OpenResume for PDFs,
// adapted to pasted text: no layout, only the words of the line.
const sectionHeadings: [CvSectionKind, string[]][] = [
  [
    'experience',
    [
      'experiencia',
      'experiencia profesional',
      'experiencia laboral',
      'trayectoria profesional',
      'historial laboral',
      'experience',
      'work experience',
      'professional experience',
      'employment history',
    ],
  ],
  [
    'certifications',
    [
      'formacion complementaria',
      'certificaciones',
      'certificados',
      'cursos',
      'certifications',
      'courses',
    ],
  ],
  [
    'education',
    [
      'formacion',
      'formacion academica',
      'educacion',
      'estudios',
      'titulacion',
      'titulaciones',
      'education',
      'academic background',
    ],
  ],
  [
    'skills',
    [
      'habilidades',
      'habilidades tecnicas',
      'competencias',
      'competencias tecnicas',
      'conocimientos',
      'conocimientos tecnicos',
      'aptitudes',
      'tecnologias',
      'herramientas',
      'stack',
      'skills',
      'technical skills',
    ],
  ],
  ['languages', ['idiomas', 'lenguas', 'languages']],
  ['projects', ['proyectos', 'proyectos personales', 'portfolio', 'portafolio', 'projects']],
  [
    'profile',
    [
      'perfil',
      'perfil profesional',
      'sobre mi',
      'resumen',
      'resumen profesional',
      'extracto',
      'objetivo',
      'objetivo profesional',
      'summary',
      'profile',
      'about me',
    ],
  ],
];

function headingKind(text: string): CvSectionKind | null {
  for (const [kind, names] of sectionHeadings) if (names.includes(text)) return kind;
  // "Formación académica y complementaria": the longest known name that starts the line.
  let best: { kind: CvSectionKind; length: number } | null = null;
  for (const [kind, names] of sectionHeadings) {
    for (const name of names) {
      if (text.startsWith(`${name} `) && (!best || name.length > best.length)) {
        best = { kind, length: name.length };
      }
    }
  }
  return best?.kind ?? null;
}

function sectionHeading(
  line: { text: string; bulleted: boolean },
  index: CatalogIndex,
): CvSectionKind | null {
  const normalized = normalize(line.text);
  if (line.bulleted || namesAnyTerm(normalized, index)) return null;
  const endsWithColon = /:\s*$/.test(normalized);
  const text = normalized
    .replace(/:\s*$/, '')
    .replace(/^#+\s*/, '')
    .trim();
  if (!text || text.includes(':') || text.endsWith('.') || countWords(text) > 5) return null;
  return headingKind(text) ?? (endsWithColon && countWords(text) <= 4 ? 'other' : null);
}

const email = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
const phoneCandidate = /\+?\d(?:[\s.-]?\d){7,}/g;

function hasPhone(text: string) {
  return (text.match(phoneCandidate) ?? []).some(
    (candidate) => candidate.replace(/\D/g, '').length >= 9,
  );
}

const datePatterns = [/\b\d{1,2}[/.-](?:19|20)\d{2}\b/g, /\b(?:19|20)\d{2}\b/g];

export function withoutDates(text: string): string {
  return datePatterns.reduce((result, pattern) => result.replace(pattern, ' '), text);
}

export function parseCv(cvText: string, index: CatalogIndex): ParsedCv {
  const units: CvUnit[] = [];
  const sections: CvSectionKind[] = [];
  let section: CvSectionKind = 'header';

  for (const line of splitLines(cvText)) {
    const heading = sectionHeading(line, index);
    if (heading) {
      section = heading;
      if (!sections.includes(heading)) sections.push(heading);
      continue;
    }
    if (!sections.includes(section)) sections.push(section);
    for (const sentence of splitSentences(line.text)) {
      units.push({ text: sentence, normalized: normalize(sentence), section });
    }
  }

  const experience = units.filter((unit) => unit.section === 'experience');
  return {
    units,
    checks: {
      hasEmail: email.test(cvText),
      hasPhone: hasPhone(cvText),
      sections,
      experienceHasFigures: experience.some((unit) => /\d/.test(withoutDates(unit.text))),
    },
  };
}
