/** A non-empty line without its bullet marker. `text` is a literal slice of the input. */
export type Line = { text: string; bulleted: boolean };

/** A catalog entry compiled for matching. */
export type Term = { id: string; pattern: RegExp };

export type TermMatch = { id: string; start: number; end: number };

const ACCENTS: Record<string, string> = {
  á: 'a',
  à: 'a',
  ä: 'a',
  â: 'a',
  ã: 'a',
  é: 'e',
  è: 'e',
  ë: 'e',
  ê: 'e',
  í: 'i',
  ì: 'i',
  ï: 'i',
  î: 'i',
  ó: 'o',
  ò: 'o',
  ö: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
  ù: 'u',
  ü: 'u',
  û: 'u',
  ñ: 'n',
  ç: 'c',
};

/**
 * Lowercases and removes accents with a fixed table, so the result has the same length
 * as the input and does not depend on `String.prototype.normalize` support.
 */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[áàäâãéèëêíìïîóòöôõúùüûñç]/g, (char) => ACCENTS[char]);
}

const BULLET = /^(?:[-•*·–—▪◦‣]|\d{1,2}[.)])\s+/;

export function splitLines(text: string): Line[] {
  const lines: Line[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    const bullet = BULLET.exec(trimmed);
    const content = bullet ? trimmed.slice(bullet[0].length).trim() : trimmed;
    if (content) lines.push({ text: content, bulleted: Boolean(bullet) });
  }
  return lines;
}

/** Splits at `.`, `;`, `!` or `?` followed by a space, so "Node.js" or "20.000" stay whole. */
export function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  const boundary = /[.;!?]\s+/g;
  let start = 0;
  let match: RegExpExecArray | null;
  while ((match = boundary.exec(text))) {
    // «Experiencia mín. de 3 años» es un único criterio, no una frase sin tecnología
    // seguida de otra sin experiencia. Solo protegemos esta abreviatura ante años explícitos.
    if (
      /\bexperiencia\s+min\.$/.test(normalize(text.slice(start, match.index + 1))) &&
      /^(?:de\s+)?\d{1,2}\s*\+?\s*anos\b/.test(normalize(text.slice(boundary.lastIndex)))
    )
      continue;
    sentences.push(text.slice(start, match.index + 1).trim());
    start = match.index + match[0].length;
  }
  sentences.push(text.slice(start).trim());
  return sentences.filter(Boolean);
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A term is a whole word: no letter or digit right before it, and no letter, digit,
// "+" or "#" right after it ("java" must not match "javascript", nor "c" match "c++").
function termPattern(phrase: string, flags = '') {
  return new RegExp(`(^|[^a-z0-9])(${escapeRegExp(phrase)})(?=$|[^a-z0-9+#])`, flags);
}

const phrasePatterns = new Map<string, RegExp>();

/** Whether a normalized text contains a normalized phrase as whole words. */
export function containsPhrase(normalized: string, phrase: string): boolean {
  let pattern = phrasePatterns.get(phrase);
  if (!pattern) {
    pattern = termPattern(phrase);
    phrasePatterns.set(phrase, pattern);
  }
  return pattern.test(normalized);
}

export function containsAny(normalized: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => containsPhrase(normalized, phrase));
}

/** Replaces every occurrence of the phrases with spaces, keeping the length. */
export function removePhrases(normalized: string, phrases: readonly string[]): string {
  return phrases.reduce(
    (text, phrase) =>
      text.replace(termPattern(phrase, 'g'), (match, prefix: string) =>
        prefix.padEnd(match.length, ' '),
      ),
    normalized,
  );
}

/** Longest aliases first, so "react native" wins over "react". */
export function compileTerms(entries: readonly { id: string; aliases: string[] }[]): Term[] {
  return entries
    .flatMap((entry) => entry.aliases.map((alias) => ({ id: entry.id, alias: normalize(alias) })))
    .sort((a, b) => b.alias.length - a.alias.length)
    .map(({ id, alias }) => ({ id, pattern: termPattern(alias, 'g') }));
}

/** Non-overlapping matches in order of appearance. */
export function findTerms(normalized: string, terms: readonly Term[]): TermMatch[] {
  const matches: TermMatch[] = [];
  for (const term of terms) {
    term.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = term.pattern.exec(normalized))) {
      const start = match.index + match[1].length;
      const end = start + match[2].length;
      if (!matches.some((taken) => start < taken.end && end > taken.start)) {
        matches.push({ id: term.id, start, end });
      }
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}
