import { containsPhrase, removePhrases, type TermMatch } from './text';
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

/*
Niveles escritos con palabras y el intervalo del MCER que suelen abarcar. No hay una equivalencia
oficial: «intermedio» puede ser B1 o B2 y «fluido» o «alto», B2 o C1. Por eso se comparan como
intervalos y solo se decide cuando no se solapan (ver `compareLevelRanges`).
*/
const textualLevelRanges: [string, CefrLevel, CefrLevel][] = [
  ['upper intermediate', 'B2', 'B2'],
  ['upper-intermediate', 'B2', 'B2'],
  ['proficient', 'C1', 'C2'],
  ['proficiency', 'C1', 'C2'],
  ['excelente', 'C1', 'C2'],
  ['fluent', 'B2', 'C1'],
  ['fluency', 'B2', 'C1'],
  ['fluido', 'B2', 'C1'],
  ['fluida', 'B2', 'C1'],
  ['alto', 'B2', 'C1'],
  ['avanzado', 'B2', 'C1'],
  ['avanzada', 'B2', 'C1'],
  ['advanced', 'B2', 'C1'],
  ['intermedio', 'B1', 'B2'],
  ['intermedia', 'B1', 'B2'],
  ['medio', 'B1', 'B2'],
  ['intermediate', 'B1', 'B2'],
  ['basico', 'A1', 'A2'],
  ['basica', 'A1', 'A2'],
  ['elemental', 'A1', 'A2'],
  ['basic', 'A1', 'A2'],
];

const textualLevelWords = textualLevelRanges.map(([word]) => word);

export type CefrRange = { low: CefrLevel; high: CefrLevel };

/** Intervalo del MCER de un nivel: exacto si es un código, aproximado si es una palabra. */
export function levelRange(level: CefrLevel | null, levelText: string | null): CefrRange | null {
  if (level) return { low: level, high: level };
  const entry = textualLevelRanges.find(([word]) => word === levelText);
  return entry ? { low: entry[1], high: entry[2] } : null;
}

/**
 * Compara el nivel del CV con el pedido. `meets` si el más bajo posible del CV alcanza el más alto
 * posible de la oferta; `below` si el más alto posible del CV no llega al más bajo pedido;
 * `uncertain` si los intervalos se solapan y la respuesta depende de una equivalencia que el texto
 * no fija.
 */
export function compareLevelRanges(
  cv: CefrRange,
  asked: CefrRange,
): 'meets' | 'below' | 'uncertain' {
  if (compareCefr(cv.low, asked.high) >= 0) return 'meets';
  if (compareCefr(cv.high, asked.low) < 0) return 'below';
  return 'uncertain';
}

export type LanguageLevel = { level: CefrLevel | null; levelText: string | null };

const clauseMark = /[,;/|]/;

function clauseAround(text: string, position: number) {
  let start = position;
  while (start > 0 && !clauseMark.test(text[start - 1])) start--;
  let end = position;
  while (end < text.length && !clauseMark.test(text[end])) end++;
  return { start, end };
}

function readLanguageLevel(clause: string): LanguageLevel {
  const code = /(^|[^a-z0-9])(a1|a2|b1|b2|c1|c2)(?=$|[^a-z0-9])/.exec(clause);
  if (code) return { level: code[2].toUpperCase() as CefrLevel, levelText: null };
  if (nativeWords.some((word) => containsPhrase(clause, word)))
    return { level: 'C2', levelText: null };
  const word = textualLevelWords.find((candidate) => containsPhrase(clause, candidate));
  return { level: null, levelText: word ?? null };
}

/** Separa niveles propios de idiomas coordinados y conserva las demás lecturas existentes. */
export function languageLevelAt(
  normalized: string,
  position: number,
  languageMatches: readonly TermMatch[],
): LanguageLevel {
  const { start, end } = clauseAround(normalized, position);
  const mentions = languageMatches.filter((match) => match.start >= start && match.end <= end);
  const boundaries = [start];
  for (let i = 1; i < mentions.length; i++) {
    const between = normalized.slice(mentions[i - 1].end, mentions[i].start);
    const connectors = [...between.matchAll(/\s+(?:y|e|and)\s+/g)];
    if (connectors.length !== 1) return readLanguageLevel(normalized.slice(start, end));
    boundaries.push(mentions[i - 1].end + connectors[0].index + connectors[0][0].length);
  }
  boundaries.push(end);
  const levels = mentions.map((_, i) =>
    readLanguageLevel(normalized.slice(boundaries[i], boundaries[i + 1])),
  );
  // Solo separamos cuando cada idioma tiene un nivel propio explícito. «Inglés y
  // francés B2» conserva su lectura conjunta; «oral y escrito» no separa un solo idioma.
  if (levels.length > 1 && levels.every(({ level, levelText }) => level || levelText)) {
    return levels[mentions.findIndex((match) => match.start === position)];
  }
  return readLanguageLevel(normalized.slice(start, end));
}

/** Una cifra de años del texto y la posición de la cifra, para saber qué la rodea. */
export type YearMention = { years: number; start: number; end: number };

// Cifras escritas con letras hasta diez: «tres años», «one year».
const numberWords: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  one: 1,
  dos: 2,
  two: 2,
  tres: 3,
  three: 3,
  cuatro: 4,
  four: 4,
  cinco: 5,
  five: 5,
  seis: 6,
  six: 6,
  siete: 7,
  seven: 7,
  ocho: 8,
  eight: 8,
  nueve: 9,
  nine: 9,
  diez: 10,
  ten: 10,
};

/** Cifras de años de un texto normalizado, en orden de aparición, con su posición. */
export function findYearMentions(normalized: string): YearMention[] {
  // También en singular («1 año», «one year») y con letras; «years'» lleva el apóstrofo detrás.
  const pattern = new RegExp(
    `(^|[^0-9a-z])(\\d{1,2}|${Object.keys(numberWords).join('|')})\\s*\\+?\\s*(?:o mas\\s+|or more\\s+)?(?:anos?|years?)(?=$|[^a-z])`,
    'g',
  );
  const mentions: YearMention[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalized))) {
    const start = match.index + match[1].length;
    const value = match[2];
    mentions.push({
      years: /^\d/.test(value) ? Number(value) : numberWords[value],
      start,
      end: match.index + match[0].length,
    });
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
