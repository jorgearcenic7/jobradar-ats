// CV readers backed by the real libraries, for tests: mammoth runs inside Jest and PDF.js
// (legacy build) in a Node process, with the same options and item mapping as the web adapter.
import type { CvReaders, PickedFile } from '@/features/cv-import/domain/readers';
import { createDocxReader } from '@/features/cv-import/infrastructure/docx-reader.web';
import {
  pdfDocumentOptions,
  toCvReadError,
  toPdfTextItems,
} from '@/features/cv-import/infrastructure/pdf-reader.web';

type NodePdfResult =
  | { pageCount: number; pages: { pageNumber: number; items: unknown[] }[]; error?: undefined }
  | { error: { name: string; message: string } };

const { extractPdfTextItems } = jest.requireActual<{
  extractPdfTextItems(bytes: Uint8Array, options: object): NodePdfResult;
}>('./pdfjs-node.cjs');

// Jest cannot run the reader's lazy `import('mammoth')` (Metro splits it into its own chunk
// on web), so the same real library is passed in.
export const docxReader = createDocxReader(async () => jest.requireActual('mammoth'));

export const realCvReaders: CvReaders = {
  async openPdf(bytes) {
    const result = extractPdfTextItems(bytes, pdfDocumentOptions);
    if (result.error) {
      throw toCvReadError(
        Object.assign(new Error(result.error.message), { name: result.error.name }),
      );
    }
    return {
      pageCount: result.pageCount,
      readPages: async () =>
        result.pages.map((page) => ({
          pageNumber: page.pageNumber,
          items: toPdfTextItems(page.items),
        })),
      close: async () => {},
    };
  },
  readDocx: docxReader.readDocx,
};

/** A picked file over fictional bytes. `size` can differ from the bytes to test limits. */
export function pickedFile(name: string, bytes: Uint8Array, size = bytes.length): PickedFile {
  return { name, size, mimeType: null, readBytes: async () => bytes };
}
