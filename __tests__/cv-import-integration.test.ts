import { importCvFile, importLimits } from '@/features/cv-import/application/import-cv';
import { analysisInput } from '@/features/cv-import/domain/imported-cv';
import { pdfDocumentOptions } from '@/features/cv-import/infrastructure/pdf-reader.web';
import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';

import {
  buildCompoundFile,
  buildDocx,
  buildImageOnlyPdf,
  buildTextPdf,
  docx,
  type PdfLine,
} from '../jest/cv-fixtures';
import {
  docxReader,
  pickedFile as picked,
  realCvReaders as readers,
} from '../jest/real-cv-readers';

// Real libraries on fictional documents: mammoth runs here, PDF.js (legacy build) runs in a
// Node process with the same options and the same item mapping as the web adapter.

jest.setTimeout(60_000);

async function importText(name: string, bytes: Uint8Array) {
  const outcome = await importCvFile(picked(name, bytes), readers);
  if (outcome.kind !== 'imported') throw new Error(`unexpected outcome ${outcome.kind}`);
  return outcome.cv;
}

const offer = `Requisitos
- Experiencia con React.
- Docker.
- Inglés B2.
- Grado en Ingeniería Informática.`;

const oneColumnCv: PdfLine[] = [
  [50, 780, 'Lucía Ficticia Ortega'],
  [50, 766, 'lucia.ficticia@example.com · 600 000 000'],
  [50, 730, 'EXPERIENCIA'],
  [50, 716, '- Desarrollé el catálogo de una tienda ficticia con React y TypeScript.'],
  [50, 702, '- Desplegué los servicios del equipo con Docker en un servidor de pruebas.'],
  [50, 666, 'FORMACIÓN'],
  [50, 652, 'Grado en Ingeniería Informática - Universidad Ficticia'],
  [50, 616, 'IDIOMAS'],
  [50, 602, 'Inglés: B2'],
];

describe('real PDF extraction', () => {
  it('reads a one-column PDF with enough structure for the CV analysis', async () => {
    const cv = await importText('cv-ficticio.pdf', buildTextPdf([oneColumnCv]));
    expect(cv.status).not.toBe('failed');
    if (cv.status === 'failed') return;
    expect(cv.extractedText).toBe(
      [
        'Lucía Ficticia Ortega',
        'lucia.ficticia@example.com · 600 000 000',
        '',
        'EXPERIENCIA',
        '- Desarrollé el catálogo de una tienda ficticia con React y TypeScript.',
        '- Desplegué los servicios del equipo con Docker en un servidor de pruebas.',
        '',
        'FORMACIÓN',
        'Grado en Ingeniería Informática - Universidad Ficticia',
        '',
        'IDIOMAS',
        'Inglés: B2',
      ].join('\n'),
    );

    const input = analysisInput(cv);
    if (!input.canAnalyze) throw new Error('unexpected');
    const statuses = Object.fromEntries(
      analyzeMatch(input.text, offer).requirements.map((item) => [
        item.requirement.id,
        item.status,
      ]),
    );
    expect(statuses).toEqual({
      'concept:react': 'supported',
      'concept:docker': 'supported',
      'language:en:B2': 'supported',
      'education:bachelor': 'supported',
    });
  });

  it('keeps each column of a two-column PDF together and asks to review the order', async () => {
    const cv = await importText(
      'dos-columnas.pdf',
      buildTextPdf([
        [
          [50, 780, 'EXPERIENCIA'],
          [50, 766, 'Puesto ficticio en una tienda online.'],
          [320, 780, 'IDIOMAS'],
          [320, 766, 'Inglés: B2'],
        ],
      ]),
    );
    if (cv.status === 'failed') throw new Error('unexpected');
    expect(cv.extractedText).toBe(
      'EXPERIENCIA\nPuesto ficticio en una tienda online.\n\nIDIOMAS\nInglés: B2',
    );
    expect(cv.issues).toContainEqual(
      expect.objectContaining({ code: 'reading-order', pages: [1] }),
    );
  });

  it('blocks a PDF made only of an image, pointing to a possible scan', async () => {
    const cv = await importText('escaneado.pdf', buildImageOnlyPdf());
    expect(cv).toMatchObject({
      status: 'blocked',
      issues: [{ code: 'no-text', level: 'error', possibleScan: true }],
    });
  });

  it('reports a damaged PDF', async () => {
    const cv = await importText('danado.pdf', buildTextPdf([oneColumnCv]).slice(0, 300));
    expect(cv).toMatchObject({ status: 'failed', failure: { kind: 'corrupt' } });
  });

  it('asks before reading a PDF of more than 20 pages and then keeps every page', async () => {
    const pages = Array.from({ length: 25 }, (_, index): PdfLine[] => [
      [50, 780, `Página ficticia ${index + 1}`],
      [50, 766, 'Texto de relleno ficticio para la prueba de documentos largos.'],
    ]);
    const outcome = await importCvFile(picked('largo.pdf', buildTextPdf(pages)), readers);
    if (outcome.kind !== 'needs-confirmation') throw new Error('unexpected');
    expect(outcome.pageCount).toBe(25);

    const cv = await outcome.confirm();
    if (cv.status === 'failed') throw new Error('unexpected');
    expect(cv.source.pageCount).toBe(25);
    for (let page = 1; page <= 25; page++) {
      expect(cv.extractedText).toContain(`Página ficticia ${page}\n`);
    }
  });
});

/*
Regresión: PDF.js 6 llama a `Promise.withResolvers()` al abrir cualquier documento y su build
«legacy» no la rellena. En los navegadores que no la tienen, todos los PDF fallaban.
*/
describe('real PDF extraction in a browser without Promise.withResolvers', () => {
  const { extractPdfTextItems } = jest.requireActual('../jest/pdfjs-node.cjs');
  const bytes = buildTextPdf([oneColumnCv]);

  it('cannot open any PDF without a polyfill', () => {
    expect(
      extractPdfTextItems(bytes, pdfDocumentOptions, { withoutPromiseWithResolvers: true }),
    ).toEqual({
      error: { name: 'TypeError', message: 'Promise.withResolvers is not a function' },
    });
  });

  it('reads it with the polyfill that the web reader installs', () => {
    const result = extractPdfTextItems(bytes, pdfDocumentOptions, {
      withoutPromiseWithResolvers: true,
      installPolyfill: true,
    });

    expect(result.error).toBeUndefined();
    expect(result.pageCount).toBe(1);
    expect(result.pages[0].items.map((item: { str: string }) => item.str)).toContain(
      'Lucía Ficticia Ortega',
    );
  });
});

describe('real DOCX extraction', () => {
  const cvDocx = buildDocx(
    [
      docx.heading('Lucía Ficticia Ortega'),
      docx.paragraph('lucia.ficticia@example.com · 600 000 000'),
      docx.paragraph('EXPERIENCIA'),
      docx.bullet('Desarrollé el catálogo de una tienda ficticia con React y TypeScript.'),
      docx.bullet('Desplegué los servicios del equipo con Docker en un servidor de pruebas.'),
      docx.tabAndBreak('Empresa Ficticia', '2021 – actualidad', 'Madrid'),
      docx.paragraph('HABILIDADES'),
      docx.table([['Docker', 'Kubernetes']]),
      docx.paragraph('FORMACIÓN'),
      docx.paragraph('Grado en Ingeniería Informática - Universidad Ficticia'),
      docx.paragraph('IDIOMAS'),
      docx.paragraph('Inglés: B2'),
    ].join(''),
  );

  it('reads the DOCX with the real mammoth', async () => {
    await expect(docxReader.readDocx(cvDocx)).resolves.toContain('Lucía Ficticia Ortega');
  });

  it('keeps headings, bullets, tabs, line breaks and table rows', async () => {
    const cv = await importText('cv-ficticio.docx', cvDocx);
    if (cv.status === 'failed') throw new Error('unexpected');
    expect(cv.extractedText).toBe(
      [
        'Lucía Ficticia Ortega',
        'lucia.ficticia@example.com · 600 000 000',
        'EXPERIENCIA',
        '- Desarrollé el catálogo de una tienda ficticia con React y TypeScript.',
        '- Desplegué los servicios del equipo con Docker en un servidor de pruebas.',
        'Empresa Ficticia\t2021 – actualidad',
        'Madrid',
        'HABILIDADES',
        'Docker | Kubernetes',
        'FORMACIÓN',
        'Grado en Ingeniería Informática - Universidad Ficticia',
        'IDIOMAS',
        'Inglés: B2',
      ].join('\n'),
    );
  });

  it('gives the CV analysis the same structure as the PDF', async () => {
    const cv = await importText('cv-ficticio.docx', cvDocx);
    const input = analysisInput(cv);
    if (!input.canAnalyze) throw new Error('unexpected');
    const result = analyzeMatch(input.text, offer);
    expect(result.requirements.map((item) => item.status)).toEqual([
      'supported',
      'supported',
      'supported',
      'supported',
    ]);
    expect(result.cvChecks.sections).toEqual(
      expect.arrayContaining(['experience', 'skills', 'education', 'languages']),
    );
  });

  it('reports a damaged DOCX', async () => {
    // Without its end the ZIP still names word/document.xml, but cannot be opened.
    const cv = await importText('danado.docx', cvDocx.slice(0, cvDocx.length - 100));
    expect(cv).toMatchObject({ status: 'failed', failure: { kind: 'corrupt' } });
  });
});

describe('files that are not read', () => {
  it('reports the old Word format', async () => {
    expect(await importText('cv.doc', buildCompoundFile())).toMatchObject({
      status: 'failed',
      failure: { kind: 'legacy-or-protected-word' },
    });
  });

  it('rejects a file over 10 MB without reading it', async () => {
    let read = false;
    const outcome = await importCvFile(
      {
        name: 'enorme.pdf',
        size: importLimits.maxFileBytes + 1,
        mimeType: 'application/pdf',
        readBytes: async () => {
          read = true;
          return new Uint8Array(0);
        },
      },
      readers,
    );
    expect(outcome.kind).toBe('too-large');
    expect(read).toBe(false);
  });
});
