import type { NormalizationChanges } from './types';

const LIGATURES: Record<string, string> = {
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\uFB05': 'st',
  '\uFB06': 'st',
};

// Zero-width characters and the byte order mark split words without being visible.
const INVISIBLE = /[\u200B\u200C\u200D\u2060\uFEFF]/g;
const SOFT_HYPHEN = /\u00AD/g;
// No-break, narrow, em, en and other fixed-width spaces.
const SPECIAL_SPACES = /[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g;

function replaceCounting(text: string, pattern: RegExp, replacement: (match: string) => string) {
  let count = 0;
  const result = text.replace(pattern, (match) => {
    count += 1;
    return replacement(match);
  });
  return { result, count };
}

/**
 * Cleans text extracted from a document so the analysis can match its words. It only
 * changes how characters are encoded and how blank lines are spaced: it never drops
 * words, joins hyphenated lines or truncates. Every change is counted.
 */
export function normalizeExtractedText(raw: string): {
  text: string;
  changes: NormalizationChanges;
} {
  const lineEndings = replaceCounting(raw, /\r\n?/g, () => '\n');
  const invisible = replaceCounting(lineEndings.result, INVISIBLE, () => '');
  const softHyphens = replaceCounting(invisible.result, SOFT_HYPHEN, () => '');
  const ligatures = replaceCounting(
    softHyphens.result,
    /[\uFB00-\uFB06]/g,
    (char) => LIGATURES[char],
  );
  const spaces = replaceCounting(ligatures.result, SPECIAL_SPACES, () => ' ');

  let trailingSpaces = 0;
  const trimmedLines = spaces.result.split('\n').map((line) => {
    const trimmed = line.replace(/[ \t]+$/, '');
    if (trimmed !== line && trimmed !== '') trailingSpaces += 1;
    return trimmed;
  });

  // Blank lines before the first and after the last line of text are dropped. Between
  // blocks a single blank line is kept, and the extra ones are counted.
  const first = trimmedLines.findIndex((line) => line !== '');
  const last = trimmedLines.findLastIndex((line) => line !== '');
  let blankLines = 0;
  const lines: string[] = [];
  for (const line of first === -1 ? [] : trimmedLines.slice(first, last + 1)) {
    if (line === '' && lines[lines.length - 1] === '') {
      blankLines += 1;
      continue;
    }
    lines.push(line);
  }

  return {
    text: lines.join('\n'),
    changes: {
      lineEndings: lineEndings.count,
      ligatures: ligatures.count,
      softHyphens: softHyphens.count,
      invisibleCharacters: invisible.count,
      specialSpaces: spaces.count,
      trailingSpaces,
      blankLines,
    },
  };
}
