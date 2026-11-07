import { containsPhrase, removePhrases } from './text';
import type { CefrLevel, EducationLevel } from './types';

// Rules shared by the offer and the CV: education levels, language levels and years.

export const educationLabels: Record<EducationLevel, string> = {
  vocational: 'formación profesional',
  bachelor: 'grado universitario',
  master: 'máster',
  doctorate: 'doctorado',
};

const educationRank: Record<EducationLevel, number> = {
  vocational: 1,
  bachelor: 2,
  master: 3,
  doctorate: 4,
};

export function compareEducation(a: EducationLevel, b: EducationLevel): number {
  return educationRank[a] - educationRank[b];
}

// Checked in this order, and each match is blanked before the next level, so
// "grado superior" counts as vocational training and not as a degree.
const educationPhrases: [EducationLevel, string[]][] = [
  ['doctorate', ['doctorado', 'doctor en', 'phd', 'doctorate']],
  ['master', ['master', 'masters', 'msc', 'postgrado', 'posgrado']],
  [
    'vocational',
    [
      'ciclo formativo',
      'formacion profesional',
      'fp',
      'tecnico superior',
      'grado superior',
      'grado medio',
    ],
  ],
  [
    'bachelor',
    [
      'grado en',
      'grado universitario',
      'licenciatura',
      'licenciado',
      'licenciada',
      'titulacion universitaria',
      'estudios universitarios',
      'carrera universitaria',
      'diplomatura',
      'degree',
      'bachelor',
    ],
  ],
];

// Inside the education section of a CV a bare "Ingeniería Informática" is a degree.
// Elsewhere ("equipo de ingeniería") it is not.
const educationSectionBachelor = ['grado', 'ingenieria', 'ingeniero', 'ingeniera'];

const notEducation = ['scrum master', 'master data'];

export function findEducationLevels(
  normalized: string,
  { inEducationSection = false } = {},
): EducationLevel[] {
  let text = removePhrases(normalized, notEducation);
  const levels: EducationLevel[] = [];
  for (const [level, phrases] of educationPhrases) {
    const candidates =
      level === 'bachelor' && inEducationSection
        ? [...phrases, ...educationSectionBachelor]
        : phrases;
    if (candidates.some((phrase) => containsPhrase(text, phrase))) {
      levels.push(level);
      text = removePhrases(text, candidates);
    }
  }
  return levels;
}

const cefrOrder: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export function compareCefr(a: CefrLevel, b: CefrLevel): number {
  return cefrOrder.indexOf(a) - cefrOrder.indexOf(b);
}

const nativeWords = ['nativo', 'nativa', 'bilingue', 'lengua materna', 'native', 'bilingual'];

const textualLevelWords = [
  'basico',
  'basica',
  'intermedio',
  'intermedia',
  'medio',
  'alto',
  'avanzado',
  'avanzada',
  'fluido',
  'fluida',
  'fluent',
  'advanced',
  'intermediate',
  'basic',
];

export type LanguageLevel = { level: CefrLevel | null; levelText: string | null };

const clauseMark = /[,;/|]/;

function clauseAround(text: string, position: number) {
  let start = position;
  while (start > 0 && !clauseMark.test(text[start - 1])) start--;
  let end = position;
  while (end < text.length && !clauseMark.test(text[end])) end++;
  return text.slice(start, end);
}

/**
 * Level stated next to a language mention: a CEFR code, a native-speaker word (read as C2)
 * or a level word outside the CEFR scale. Only the clause of the mention is read, so in
 * "inglés C1, francés básico" French does not take English's level.
 */
export function languageLevelAt(normalized: string, position: number): LanguageLevel {
  const clause = clauseAround(normalized, position);
  const code = /(^|[^a-z0-9])(a1|a2|b1|b2|c1|c2)(?=$|[^a-z0-9])/.exec(clause);
  if (code) return { level: code[2].toUpperCase() as CefrLevel, levelText: null };
  if (nativeWords.some((word) => containsPhrase(clause, word)))
    return { level: 'C2', levelText: null };
  const word = textualLevelWords.find((candidate) => containsPhrase(clause, candidate));
  return { level: null, levelText: word ?? null };
}

/** Una cifra de años del texto y la posición de la cifra, para saber qué la rodea. */
export type YearMention = { years: number; start: number; end: number };

/** Cifras de años de un texto normalizado, en orden de aparición, con su posición. */
export function findYearMentions(normalized: string): YearMention[] {
  const pattern = /(^|[^0-9])(\d{1,2})\s*\+?\s*(?:o mas\s+|or more\s+)?(?:anos|years)(?=$|[^a-z])/g;
  const mentions: YearMention[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalized))) {
    const start = match.index + match[1].length;
    mentions.push({ years: Number(match[2]), start, end: match.index + match[0].length });
  }
  return mentions;
}

/** Numbers of years stated in a text: "3 años", "+3 años", "5 years". */
export function findYears(normalized: string): number[] {
  return findYearMentions(normalized).map((mention) => mention.years);
}

export function mentionsExperience(normalized: string): boolean {
  return containsPhrase(normalized, 'experiencia') || containsPhrase(normalized, 'experience');
}
