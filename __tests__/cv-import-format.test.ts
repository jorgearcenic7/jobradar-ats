import { detectFormat } from '@/features/cv-import/domain/detect-format';

// All byte sequences are built here from fictional content; no real document is used.

const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));

function concat(...parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

const pdf = ascii('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF');
// A ZIP local file header followed by the entry names a DOCX package contains.
const docx = concat(
  ascii('PK\x03\x04'),
  new Uint8Array(26),
  ascii('[Content_Types].xml'),
  new Uint8Array(40),
  ascii('PK\x03\x04'),
  new Uint8Array(26),
  ascii('word/document.xml'),
  new Uint8Array(40),
);
const spreadsheet = concat(ascii('PK\x03\x04'), new Uint8Array(26), ascii('xl/workbook.xml'));
const compoundFile = concat(
  Uint8Array.of(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1),
  new Uint8Array(504),
);

describe('format detection', () => {
  it('detects a PDF by its header', () => {
    expect(detectFormat(pdf)).toEqual({ format: 'pdf', extensionMatches: null });
  });

  it('accepts a PDF header preceded by a few bytes, as the PDF format allows', () => {
    expect(detectFormat(concat(new Uint8Array(100), pdf)).format).toBe('pdf');
  });

  it('does not accept a PDF header found after the first kilobyte', () => {
    expect(detectFormat(concat(new Uint8Array(2000), pdf))).toEqual({
      format: 'unsupported',
      reason: 'unknown-signature',
      extensionMatches: null,
    });
  });

  it('detects a DOCX as a ZIP package with a Word document inside', () => {
    expect(detectFormat(docx).format).toBe('docx');
  });

  it('does not treat other ZIP packages as Word documents', () => {
    expect(detectFormat(spreadsheet)).toMatchObject({
      format: 'unsupported',
      reason: 'zip-without-word-document',
    });
  });

  it('reports the old Word format and protected Office files without promising to read them', () => {
    expect(detectFormat(compoundFile).format).toBe('legacy-or-protected-word');
  });

  it('reports an empty file', () => {
    expect(detectFormat(new Uint8Array(0))).toMatchObject({
      format: 'unsupported',
      reason: 'empty',
    });
  });

  it('reports RTF and plain text as unsupported', () => {
    expect(detectFormat(ascii('{\\rtf1\\ansi Texto ficticio}'))).toMatchObject({ reason: 'rtf' });
    expect(detectFormat(ascii('CV ficticio en texto plano'))).toMatchObject({
      reason: 'unknown-signature',
    });
  });

  it('trusts the content over the file extension and reports a mismatch', () => {
    expect(detectFormat(pdf, 'cv-ficticio.docx')).toEqual({
      format: 'pdf',
      extensionMatches: false,
    });
    expect(detectFormat(pdf, 'CV-FICTICIO.PDF').extensionMatches).toBe(true);
    expect(detectFormat(docx, 'cv.docx').extensionMatches).toBe(true);
    expect(detectFormat(compoundFile, 'cv.doc').extensionMatches).toBe(true);
    expect(detectFormat(pdf, 'sin-extension').extensionMatches).toBe(false);
  });
});
