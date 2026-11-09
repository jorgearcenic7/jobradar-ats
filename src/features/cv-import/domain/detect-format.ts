import type { FormatDetection } from './types';

const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));

const PDF_HEADER = ascii('%PDF-');
// The PDF specification lets readers find the header within the first 1024 bytes.
const PDF_HEADER_WINDOW = 1024;
const ZIP_LOCAL_HEADER = ascii('PK\x03\x04');
// ZIP stores entry names uncompressed, so the main part of a DOCX can be found by name.
const DOCX_MAIN_PART = ascii('word/document.xml');
// Compound File Binary: Word 97-2003 documents, and Office files protected with a password.
const COMPOUND_FILE = Uint8Array.of(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
const RTF_HEADER = ascii('{\\rtf');

function indexOf(bytes: Uint8Array, pattern: Uint8Array, limit = bytes.length): number {
  const last = Math.min(limit, bytes.length) - pattern.length;
  outer: for (let start = 0; start <= last; start++) {
    for (let offset = 0; offset < pattern.length; offset++) {
      if (bytes[start + offset] !== pattern[offset]) continue outer;
    }
    return start;
  }
  return -1;
}

const startsWith = (bytes: Uint8Array, pattern: Uint8Array) =>
  indexOf(bytes, pattern, pattern.length) === 0;

const expectedExtensions = {
  pdf: ['pdf'],
  docx: ['docx'],
  'legacy-or-protected-word': ['doc', 'docx'],
} as const;

function extensionMatches(format: keyof typeof expectedExtensions, fileName?: string) {
  if (fileName === undefined) return null;
  const dot = fileName.lastIndexOf('.');
  const extension = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
  return (expectedExtensions[format] as readonly string[]).includes(extension);
}

/** Identifies a CV file by its content. The name only serves to report a mismatch. */
export function detectFormat(bytes: Uint8Array, fileName?: string): FormatDetection {
  if (bytes.length === 0) {
    return { format: 'unsupported', reason: 'empty', extensionMatches: null };
  }
  if (indexOf(bytes, PDF_HEADER, PDF_HEADER_WINDOW) >= 0) {
    return { format: 'pdf', extensionMatches: extensionMatches('pdf', fileName) };
  }
  if (startsWith(bytes, ZIP_LOCAL_HEADER)) {
    return indexOf(bytes, DOCX_MAIN_PART) >= 0
      ? { format: 'docx', extensionMatches: extensionMatches('docx', fileName) }
      : { format: 'unsupported', reason: 'zip-without-word-document', extensionMatches: null };
  }
  if (startsWith(bytes, COMPOUND_FILE)) {
    return {
      format: 'legacy-or-protected-word',
      extensionMatches: extensionMatches('legacy-or-protected-word', fileName),
    };
  }
  if (startsWith(bytes, RTF_HEADER)) {
    return { format: 'unsupported', reason: 'rtf', extensionMatches: null };
  }
  return { format: 'unsupported', reason: 'unknown-signature', extensionMatches: null };
}
