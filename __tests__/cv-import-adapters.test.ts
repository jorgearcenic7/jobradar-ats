import * as DocumentPicker from 'expo-document-picker';

import { createDocxReader } from '@/features/cv-import/infrastructure/docx-reader.web';
import { pickCvFile as pickCvFileNative } from '@/features/cv-import/infrastructure/pick-cv-file';
import { pickCvFile } from '@/features/cv-import/infrastructure/pick-cv-file.web';
import {
  createPdfReader,
  type PdfjsModule,
} from '@/features/cv-import/infrastructure/pdf-reader.web';
import { CvReadError } from '@/features/cv-import/domain/readers';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

const getDocumentAsync = jest.mocked(DocumentPicker.getDocumentAsync);

// ---------------------------------------------------------------- PDF.js adapter

function fakePdfjs({ error }: { error?: unknown } = {}) {
  const destroy = jest.fn(async () => {});
  const doc = {
    numPages: 2,
    getPage: jest.fn(async (pageNumber: number) => ({
      getTextContent: async () => ({
        items: [
          {
            str: `Texto ${pageNumber}`,
            transform: [1, 0, 0, 1, 50, 700],
            width: 40,
            height: 10,
            hasEOL: true,
          },
          // Marked content items carry no text and are skipped.
          { type: 'beginMarkedContent', id: 'x' },
        ],
      }),
    })),
  };
  const getDocument = jest.fn(() => ({
    promise: error ? Promise.reject(error) : Promise.resolve(doc),
    destroy,
  }));
  const pdfjs = { getDocument, VerbosityLevel: { ERRORS: 0 } } as unknown as PdfjsModule;
  return { pdfjs, getDocument, destroy };
}

describe('PDF reader', () => {
  it('loads PDF.js only when a PDF is opened, and only once', async () => {
    const { pdfjs } = fakePdfjs();
    const load = jest.fn(async () => pdfjs);
    const reader = createPdfReader(load);
    expect(load).not.toHaveBeenCalled();
    await reader.openPdf(new Uint8Array([1]));
    await reader.openPdf(new Uint8Array([1]));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('opens documents without any resource URL, fetching or WebAssembly, and logs only errors', async () => {
    const { pdfjs, getDocument } = fakePdfjs();
    const bytes = new Uint8Array([1, 2, 3]);
    await createPdfReader(async () => pdfjs).openPdf(bytes);
    expect(getDocument).toHaveBeenCalledWith({
      data: bytes,
      disableAutoFetch: true,
      disableStream: true,
      disableRange: true,
      useWorkerFetch: false,
      useWasm: false,
      useSystemFonts: false,
      enableXfa: false,
      verbosity: 0,
    });
  });

  it('reports the page count, maps text items and skips items without text', async () => {
    const { pdfjs, destroy } = fakePdfjs();
    const document = await createPdfReader(async () => pdfjs).openPdf(new Uint8Array([1]));
    expect(document.pageCount).toBe(2);
    expect(await document.readPages()).toEqual([
      {
        pageNumber: 1,
        items: [{ str: 'Texto 1', x: 50, y: 700, width: 40, height: 10, hasEOL: true }],
      },
      {
        pageNumber: 2,
        items: [{ str: 'Texto 2', x: 50, y: 700, width: 40, height: 10, hasEOL: true }],
      },
    ]);
    await document.close();
    expect(destroy).toHaveBeenCalled();
  });

  it.each([
    ['PasswordException', 'password-protected'],
    ['InvalidPDFException', 'corrupt'],
    ['UnknownErrorException', 'read-error'],
  ])('turns %s into a %s read error', async (name, kind) => {
    const error = Object.assign(new Error('fallo'), { name });
    const { pdfjs, destroy } = fakePdfjs({ error });
    const opening = createPdfReader(async () => pdfjs).openPdf(new Uint8Array([1]));
    await expect(opening).rejects.toEqual(new CvReadError(kind as CvReadError['kind']));
    expect(destroy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------- mammoth adapter

describe('DOCX reader', () => {
  function fakeMammoth(html: string | Error) {
    const convertToHtml = jest.fn(async (_input: unknown, _options: unknown) => {
      if (html instanceof Error) throw html;
      return { value: html, messages: [] };
    });
    const imgElement = jest.fn((convert: unknown) => ({ convert }));
    return { mammoth: { convertToHtml, images: { imgElement } }, convertToHtml };
  }

  it('returns plain text converted from the HTML, never the HTML', async () => {
    const { mammoth } = fakeMammoth('<h1>PERFIL</h1><p>Uno<br />Dos</p>');
    const text = await createDocxReader(async () => mammoth as never).readDocx(new Uint8Array([1]));
    expect(text).toBe('PERFIL\nUno\nDos');
  });

  it('passes the document as an ArrayBuffer and never reads images', async () => {
    const { mammoth, convertToHtml } = fakeMammoth('<p>Texto</p>');
    const bytes = new Uint8Array([1, 2, 3]);
    await createDocxReader(async () => mammoth as never).readDocx(bytes);
    const [input, options] = convertToHtml.mock.calls[0] as [
      { arrayBuffer: ArrayBuffer },
      { convertImage: { convert: (image: { read: () => unknown }) => Promise<unknown> } },
    ];
    expect(new Uint8Array(input.arrayBuffer)).toEqual(bytes);

    const image = { read: jest.fn(), contentType: 'image/png' };
    await expect(options.convertImage.convert(image)).resolves.toEqual({ src: '' });
    expect(image.read).not.toHaveBeenCalled();
  });

  it('reports a document mammoth cannot open as damaged', async () => {
    const { mammoth } = fakeMammoth(new Error("Can't find end of central directory"));
    await expect(
      createDocxReader(async () => mammoth as never).readDocx(new Uint8Array([1])),
    ).rejects.toEqual(new CvReadError('corrupt'));
  });
});

// ---------------------------------------------------------------- document picker

describe('CV file picker', () => {
  beforeEach(() => getDocumentAsync.mockReset());

  it('asks for PDF or DOCX, keeps the browser File and avoids a base64 copy', async () => {
    getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
    await pickCvFile();
    expect(getDocumentAsync).toHaveBeenCalledWith({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.pdf',
        '.docx',
      ],
      base64: false,
      copyToCacheDirectory: false,
      multiple: false,
    });
  });

  it('reports a cancelled selection', async () => {
    getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
    expect(await pickCvFile()).toEqual({ kind: 'cancelled' });
  });

  it('returns the picked file and reads its bytes only on demand', async () => {
    const file = new File([new Uint8Array([37, 80, 68, 70])], 'cv-ficticio.pdf', {
      type: 'application/pdf',
    });
    const arrayBuffer = jest.spyOn(file, 'arrayBuffer');
    getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'blob:local',
          name: 'cv-ficticio.pdf',
          mimeType: 'application/pdf',
          size: 4,
          lastModified: 0,
          file,
        },
      ],
    });
    const result = await pickCvFile();
    if (result.kind !== 'picked') throw new Error('unexpected');
    expect(result.file).toMatchObject({
      name: 'cv-ficticio.pdf',
      size: 4,
      mimeType: 'application/pdf',
    });
    expect(arrayBuffer).not.toHaveBeenCalled();
    expect(await result.file.readBytes()).toEqual(new Uint8Array([37, 80, 68, 70]));
  });

  it('reports the import as unavailable where there is no browser File', async () => {
    getDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/cv.pdf', name: 'cv.pdf', size: 4, lastModified: 0 }],
    });
    expect(await pickCvFile()).toEqual({ kind: 'unavailable' });
  });

  it('is not yet available in the native app, without opening the picker', async () => {
    expect(await pickCvFileNative()).toEqual({ kind: 'unavailable' });
    expect(getDocumentAsync).not.toHaveBeenCalled();
  });
});
