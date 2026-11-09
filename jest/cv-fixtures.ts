// Builders of fictional PDF and DOCX files for the cv-import tests. They write the
// formats by hand so the tests need no extra dependency and no binary fixtures.

const latin1 = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0) & 0xff);
const utf8 = (text: string) => new TextEncoder().encode(text);

function concat(parts: Uint8Array[]) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

// ---------------------------------------------------------------- PDF

/** A line of text at a position, in points from the bottom-left corner of an A4 page. */
export type PdfLine = [x: number, y: number, text: string];

function pdfString(text: string) {
  return text.replace(/[\\()]/g, (char) => `\\${char}`);
}

function pdfStream(content: string) {
  return `<< /Length ${latin1(content).length} >>\nstream\n${content}\nendstream`;
}

function buildPdfObjects(objects: string[]) {
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((content, index) => {
    offsets.push(latin1(body).length);
    body += `${index + 1} 0 obj\n${content}\nendobj\n`;
  });
  const xref = latin1(body).length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return latin1(body);
}

/**
 * A text PDF with one Helvetica font in WinAnsi encoding, so accented Latin letters work.
 * Each page is a list of lines.
 */
export function buildTextPdf(pages: PdfLine[][]): Uint8Array {
  const pageCount = pages.length;
  // Objects: 1 catalog, 2 pages, 3 font, then a page and its content per page.
  const kids = pages.map((_, index) => `${4 + index * 2} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  pages.forEach((lines, index) => {
    const content = [
      'BT',
      '/F1 11 Tf',
      ...lines.map(([x, y, text]) => `1 0 0 1 ${x} ${y} Tm (${pdfString(text)}) Tj`),
      'ET',
    ].join('\n');
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + index * 2} 0 R >>`,
      pdfStream(content),
    );
  });
  return buildPdfObjects(objects);
}

/** A PDF whose only page is an image: what a scanned document looks like to text extraction. */
export function buildImageOnlyPdf(): Uint8Array {
  return buildPdfObjects([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im1 5 0 R >> >> /Contents 4 0 R >>',
    pdfStream('q 495 0 0 742 50 50 cm /Im1 Do Q'),
    '<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length 1 >>\nstream\n\x80\nendstream',
  ]);
}

// ---------------------------------------------------------------- DOCX (ZIP)

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function littleEndian(values: [value: number, bytes: 2 | 4][]) {
  const result = new Uint8Array(values.reduce((total, [, size]) => total + size, 0));
  const view = new DataView(result.buffer);
  let offset = 0;
  for (const [value, size] of values) {
    if (size === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
    offset += size;
  }
  return result;
}

/** A ZIP archive with uncompressed ("stored") entries. */
function buildZip(entries: Record<string, string>): Uint8Array {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = utf8(name);
    const data = utf8(content);
    const crc = crc32(data);
    const local = concat([
      littleEndian([
        [0x04034b50, 4],
        [20, 2],
        [0x0800, 2],
        [0, 2],
        [0, 2],
        [0, 2],
        [crc, 4],
        [data.length, 4],
        [data.length, 4],
        [nameBytes.length, 2],
        [0, 2],
      ]),
      nameBytes,
      data,
    ]);
    centrals.push(
      concat([
        littleEndian([
          [0x02014b50, 4],
          [20, 2],
          [20, 2],
          [0x0800, 2],
          [0, 2],
          [0, 2],
          [0, 2],
          [crc, 4],
          [data.length, 4],
          [data.length, 4],
          [nameBytes.length, 2],
          [0, 2],
          [0, 2],
          [0, 2],
          [0, 2],
          [0, 4],
          [offset, 4],
        ]),
        nameBytes,
      ]),
    );
    locals.push(local);
    offset += local.length;
  }
  const central = concat(centrals);
  const end = littleEndian([
    [0x06054b50, 4],
    [0, 2],
    [0, 2],
    [centrals.length, 2],
    [centrals.length, 2],
    [central.length, 4],
    [offset, 4],
    [0, 2],
  ]);
  return concat([...locals, central, end]);
}

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

const escapeXml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const docx = {
  paragraph: (text: string) =>
    `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`,
  heading: (text: string) =>
    `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`,
  bullet: (text: string) =>
    `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${escapeXml(text)}</w:t></w:r></w:p>`,
  /** Text runs separated by a tab and a line break, as in "Empresa<tab>Fechas<break>Ciudad". */
  tabAndBreak: (first: string, second: string, third: string) =>
    `<w:p><w:r><w:t>${escapeXml(first)}</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>${escapeXml(second)}</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>${escapeXml(third)}</w:t></w:r></w:p>`,
  table: (rows: string[][]) =>
    `<w:tbl>${rows
      .map(
        (row) =>
          `<w:tr>${row.map((cell) => `<w:tc>${docx.paragraph(cell)}</w:tc>`).join('')}</w:tr>`,
      )
      .join('')}</w:tbl>`,
};

/** A minimal DOCX package with a "Heading 1" style and a bullet list definition. */
export function buildDocx(bodyXml: string): Uint8Array {
  return buildZip({
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`,
    'word/styles.xml': `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="${W}"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style></w:styles>`,
    'word/numbering.xml': `<?xml version="1.0" encoding="UTF-8"?><w:numbering xmlns:w="${W}"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`,
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W}"><w:body>${bodyXml}</w:body></w:document>`,
  });
}

/** The Compound File signature of Word 97-2003 and of password-protected Office files. */
export function buildCompoundFile(): Uint8Array {
  const bytes = new Uint8Array(1024);
  bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  return bytes;
}
