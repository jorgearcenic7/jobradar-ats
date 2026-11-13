import { namesAnyTerm, type CatalogIndex } from './skill-catalog';
import {
  countWords,
  findTerms,
  normalize,
  splitLines,
  splitSentences,
  type TermMatch,
} from './text';
import type { CvChecks, CvSectionKind } from './types';

/** One sentence of the CV. `text` is a literal slice of the CV. */
export type CvUnit = {
  text: string;
  /** Línea literal: evita separar una fecha de una negación o formación en su contexto. */
  sourceLine?: string;
  normalized: string;
  section: CvSectionKind;
  // Términos del catálogo que aparecen en la frase. Se buscan una sola vez (ver `once`).
  conceptMatches: () => readonly TermMatch[];
  languageMatches: () => readonly TermMatch[];
};

/*
 * Cada requisito de la oferta recorre todas las frases del CV en busca de sus términos, y
 * antes cada recorrido volvía a pasar el catálogo completo por las mismas frases. Ahora la
 * búsqueda se hace la primera vez que un requisito la pide y el resto reutiliza el resultado.
 *
 * Es equivalente porque `findTerms` solo depende del texto normalizado de la frase y de la
 * lista de términos, y ninguno de los dos cambia durante el análisis: se obtienen las mismas
 * coincidencias, en el mismo orden y con la misma prioridad de los alias más largos. Para que
 * siga siéndolo, nadie debe modificar las listas devueltas (por eso son de solo lectura).
 *
 * El resultado se guarda en la propia frase, así que desaparece con el análisis y no hay
 * estado global. Se calcula a demanda, y no al leer el CV, para no buscar en vano cuando la
 * oferta no pide ningún concepto o idioma.
 */
function once<T>(compute: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= compute());
}

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
      'employment',
      'work history',
      'career history',
      'professional background',
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
      'licencias y certificaciones',
      'licenses and certifications',
      'licenses & certifications',
      'training',
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
      'education and training',
      'academic qualifications',
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
      'key skills',
      'core skills',
      'soft skills',
      'competencies',
      'core competencies',
      'technologies',
      'tech stack',
      'tools',
    ],
  ],
  ['languages', ['idiomas', 'lenguas', 'languages', 'language skills']],
  [
    'projects',
    [
      'proyectos',
      'proyectos personales',
      'portfolio',
      'portafolio',
      'projects',
      'personal projects',
      'side projects',
    ],
  ],
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
      'professional summary',
      'personal profile',
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

/*
Las plantillas de diseño escriben a veces los encabezados con letras separadas
(«E X P E R I E N C I A»), y los PDF así generados se extraen igual. Solo se juntan las letras de
una línea formada únicamente por letras sueltas, con dos espacios o más entre palabras.
*/
function joinSpacedLetters(text: string): string {
  if (!/^\p{L}(?: {1,3}\p{L})+$/u.test(text) || !/\p{L} \p{L} \p{L}/u.test(text)) return text;
  return text
    .split(/ {2,}/)
    .map((word) => word.replace(/ /g, ''))
    .join(' ');
}

function sectionHeading(
  line: { text: string; bulleted: boolean },
  index: CatalogIndex,
): CvSectionKind | null {
  const normalized = normalize(joinSpacedLetters(line.text.trim()));
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
      const normalized = normalize(sentence);
      units.push({
        text: sentence,
        sourceLine: line.text,
        normalized,
        section,
        conceptMatches: once(() => findTerms(normalized, index.conceptTerms)),
        languageMatches: once(() => findTerms(normalized, index.languageTerms)),
      });
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
