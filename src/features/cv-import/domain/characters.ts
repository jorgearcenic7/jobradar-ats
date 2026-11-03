// Character classes shared by the quality checks and the PDF line assembly.

// Unicode property escapes cover every script. If an engine lacks them, letters fall back
// to "has upper and lower case", which still covers Latin, Greek and Cyrillic.
const letterPattern = (() => {
  try {
    return new RegExp('\\p{L}', 'u');
  } catch {
    return null;
  }
})();

export function isLetter(char: string): boolean {
  return letterPattern ? letterPattern.test(char) : char.toLowerCase() !== char.toUpperCase();
}

/**
 * Characters that carry no readable text: the replacement character that decoders emit
 * for unknown glyphs, control characters, and the private use area that some fonts map
 * their glyphs to (icon fonts, or text whose font has no Unicode mapping).
 */
export function isUnreadable(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    code === 0xfffd ||
    (code < 0x20 && char !== '\n' && char !== '\t' && char !== '\r') ||
    (code >= 0x7f && code <= 0x9f) ||
    (code >= 0xe000 && code <= 0xf8ff)
  );
}

export function countLetters(text: string): number {
  let count = 0;
  for (const char of text) if (isLetter(char)) count += 1;
  return count;
}
