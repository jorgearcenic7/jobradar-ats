import { importCvFile, importLimits } from '@/features/cv-import/application/import-cv';
import type { PdfTextItem } from '@/features/cv-import/domain/assemble-pdf-text';
import { CvReadError, type CvReaders, type PickedFile } from '@/features/cv-import/domain/readers';

import { buildCompoundFile, buildDocx, buildTextPdf } from '../jest/cv-fixtures';

// Readers are simulated here; the real libraries are covered by cv-import-integration.

const ascii = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));

function picked(name: string, bytes: Uint8Array, size = bytes.length) {
  const readBytes = jest.fn(async () => bytes);
  const file: PickedFile = { name, size, mimeType: null, readBytes };
  return { file, readBytes };
}

const line = (str: string, y: number, x = 50): PdfTextItem => ({
  str,
  x,
  y,
  width: str.length * 5,
  height: 10,
  hasEOL: false,
});

const cvPage = [
  line('EXPERIENCIA', 780),
  line('Desarrollé el catálogo de una tienda ficticia con React y TypeScript para clientes.', 766),
  line('FORMACIÓN', 730),
  line('Grado en Ingeniería Informática por una universidad ficticia de ejemplo.', 716),
];

function fakeReaders({
  pages = [cvPage],
  pdfError,
  docxText = 'PERFIL\nTexto ficticio del perfil profesional con suficiente contenido.',
  docxError,
}: {
  pages?: PdfTextItem[][];
  pdfError?: unknown;
  docxText?: string;
  docxError?: unknown;
} = {}) {
  const readPages = jest.fn(async () =>
    pages.map((items, index) => ({ pageNumber: index + 1, items })),
  );
  const close = jest.fn(async () => {});
  const readers: CvReaders = {
    openPdf: jest.fn(async () => {
      if (pdfError) throw pdfError;
      return { pageCount: pages.length, readPages, close };
    }),
    readDocx: jest.fn(async () => {
      if (docxError) throw docxError;
      return docxText;
    }),
  };
  return { readers, readPages, close };
}

const pdfBytes = () => buildTextPdf([[[50, 780, 'Texto']]]);

describe('CV import', () => {
  it('imports a DOCX through the DOCX reader', async () => {
    const { file } = picked('cv-ficticio.docx', buildDocx(''));
    const outcome = await importCvFile(file, fakeReaders().readers);
    expect(outcome).toMatchObject({
      kind: 'imported',
      cv: {
        status: expect.any(String),
        source: { fileName: 'cv-ficticio.docx', format: 'docx', pageCount: null },
        extractedText: 'PERFIL\nTexto ficticio del perfil profesional con suficiente contenido.',
      },
    });
  });

  it('imports a PDF, assembling its lines and keeping the page count', async () => {
    const { readers, close } = fakeReaders();
    const outcome = await importCvFile(picked('cv.pdf', pdfBytes()).file, readers);
    if (outcome.kind !== 'imported' || outcome.cv.status === 'failed')
      throw new Error('unexpected');
    expect(outcome.cv.source).toMatchObject({ format: 'pdf', pageCount: 1 });
    expect(outcome.cv.extractedText).toContain('EXPERIENCIA\nDesarrollé el catálogo');
    expect(close).toHaveBeenCalled();
  });

  it('reports a multi-column PDF for review', async () => {
    const twoColumns = [
      line('EXPERIENCIA', 780),
      line('Puesto ficticio', 766),
      line('IDIOMAS', 780, 320),
    ];
    const outcome = await importCvFile(
      picked('cv.pdf', pdfBytes()).file,
      fakeReaders({ pages: [twoColumns] }).readers,
    );
    if (outcome.kind !== 'imported' || outcome.cv.status === 'failed')
      throw new Error('unexpected');
    expect(outcome.cv.issues).toContainEqual(expect.objectContaining({ code: 'reading-order' }));
  });

  it('reads a PDF of exactly the page limit without asking', async () => {
    const pages = Array.from({ length: importLimits.pagesBeforeConfirmation }, () => cvPage);
    const outcome = await importCvFile(
      picked('cv.pdf', pdfBytes()).file,
      fakeReaders({ pages }).readers,
    );
    expect(outcome.kind).toBe('imported');
  });

  it('asks for confirmation before reading a PDF over the page limit, and then reads every page', async () => {
    const pages = Array.from({ length: 25 }, (_, index) => [
      line(`Página ficticia ${index + 1}`, 780),
    ]);
    const { readers, readPages, close } = fakeReaders({ pages });
    const outcome = await importCvFile(picked('largo.pdf', pdfBytes()).file, readers);
    if (outcome.kind !== 'needs-confirmation') throw new Error('unexpected');
    expect(outcome).toMatchObject({ fileName: 'largo.pdf', pageCount: 25, pageLimit: 20 });
    expect(readPages).not.toHaveBeenCalled();

    const cv = await outcome.confirm();
    if (cv.status === 'failed') throw new Error('unexpected');
    for (let page = 1; page <= 25; page++)
      expect(cv.extractedText).toContain(`Página ficticia ${page}`);
    expect(close).toHaveBeenCalled();
  });

  it('closes a long PDF without reading it when the user cancels', async () => {
    const pages = Array.from({ length: 21 }, () => cvPage);
    const { readers, readPages, close } = fakeReaders({ pages });
    const outcome = await importCvFile(picked('largo.pdf', pdfBytes()).file, readers);
    if (outcome.kind !== 'needs-confirmation') throw new Error('unexpected');
    await outcome.cancel();
    expect(readPages).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('rejects files over the size limit without reading them', async () => {
    const { file, readBytes } = picked('enorme.pdf', pdfBytes(), importLimits.maxFileBytes + 1);
    const outcome = await importCvFile(file, fakeReaders().readers);
    expect(outcome).toEqual({
      kind: 'too-large',
      fileName: 'enorme.pdf',
      byteSize: importLimits.maxFileBytes + 1,
      maxBytes: importLimits.maxFileBytes,
    });
    expect(readBytes).not.toHaveBeenCalled();
  });

  it('also rejects a file whose content is larger than its declared size', async () => {
    const bytes = new Uint8Array(11);
    const outcome = await importCvFile(picked('raro.pdf', bytes, 1).file, fakeReaders().readers, {
      ...importLimits,
      maxFileBytes: 10,
    });
    expect(outcome.kind).toBe('too-large');
  });

  it('reports unsupported formats and the old Word format without reading them', async () => {
    const { readers } = fakeReaders();
    expect(await importCvFile(picked('cv.txt', ascii('Texto plano')).file, readers)).toMatchObject({
      kind: 'imported',
      cv: {
        status: 'failed',
        failure: { kind: 'unsupported-format', reason: 'unknown-signature' },
      },
    });
    expect(await importCvFile(picked('cv.doc', buildCompoundFile()).file, readers)).toMatchObject({
      kind: 'imported',
      cv: { status: 'failed', failure: { kind: 'legacy-or-protected-word' } },
    });
    expect(readers.openPdf).not.toHaveBeenCalled();
    expect(readers.readDocx).not.toHaveBeenCalled();
  });

  it.each([
    ['password-protected', new CvReadError('password-protected')],
    ['corrupt', new CvReadError('corrupt')],
    ['read-error', new Error('fallo inesperado')],
  ])('reports a PDF that cannot be read as %s', async (kind, error) => {
    const outcome = await importCvFile(
      picked('cv.pdf', pdfBytes()).file,
      fakeReaders({ pdfError: error }).readers,
    );
    expect(outcome).toMatchObject({
      kind: 'imported',
      cv: { status: 'failed', failure: { kind } },
    });
  });

  it('reports a damaged DOCX', async () => {
    const outcome = await importCvFile(
      picked('cv.docx', buildDocx('')).file,
      fakeReaders({ docxError: new CvReadError('corrupt') }).readers,
    );
    expect(outcome).toMatchObject({ cv: { failure: { kind: 'corrupt' } } });
  });

  it('reports a file that cannot be read from the device', async () => {
    const file: PickedFile = {
      name: 'cv.pdf',
      size: 10,
      mimeType: null,
      readBytes: async () => {
        throw new Error('sin acceso');
      },
    };
    expect(await importCvFile(file, fakeReaders().readers)).toMatchObject({
      cv: { status: 'failed', failure: { kind: 'read-error' } },
    });
  });
});
