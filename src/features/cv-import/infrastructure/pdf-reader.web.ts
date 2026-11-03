import type { PdfTextItem } from '../domain/assemble-pdf-text';
import { CvReadError, type CvReaders, type PdfDocument } from '../domain/readers';

export type PdfjsModule = Pick<typeof import('pdfjs-dist/legacy/build/pdf.mjs'), 'getDocument'>;

/**
 * Options for opening a CV. No resource URL is given (character maps, standard fonts,
 * colour profiles, WebAssembly), so PDF.js never fetches anything. Scripts in PDFs are not
 * run: they only run in the viewer's annotation layer, which JobRadar does not use.
 */
export const pdfDocumentOptions = {
  disableAutoFetch: true,
  disableStream: true,
  disableRange: true,
  useWorkerFetch: false,
  useWasm: false,
  useSystemFonts: false,
  enableXfa: false,
  // VerbosityLevel.ERRORS: internal warnings stay quiet, errors are still logged and thrown.
  verbosity: 0,
};

/** The legacy build polyfills recent APIs (Math.sumPrecise, URL.parse) for older Safari. */
async function loadLegacyPdfjs(): Promise<PdfjsModule> {
  const [pdfjs, worker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ]);
  // PDF.js runs its worker code on the main thread when it finds it here: no worker file is
  // served and no workerSrc is set, so it is never loaded from another origin.
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  return pdfjs;
}

/** Text items of a page, as the line assembly needs them. Items without text are skipped. */
export function toPdfTextItems(items: unknown[]): PdfTextItem[] {
  return items.flatMap((item) => {
    if (typeof item !== 'object' || item === null || !('str' in item)) return [];
    const { str, transform, width, height, hasEOL } = item as {
      str: string;
      transform: number[];
      width: number;
      height: number;
      hasEOL: boolean;
    };
    return [{ str, x: transform[4], y: transform[5], width, height, hasEOL }];
  });
}

export function toCvReadError(error: unknown): CvReadError {
  const name = (error as { name?: string } | null)?.name;
  const kind =
    name === 'PasswordException'
      ? 'password-protected'
      : name === 'InvalidPDFException'
        ? 'corrupt'
        : 'read-error';
  return new CvReadError(kind, { cause: error });
}

export function createPdfReader(
  load: () => Promise<PdfjsModule> = loadLegacyPdfjs,
): Pick<CvReaders, 'openPdf'> {
  let pdfjs: Promise<PdfjsModule> | null = null;

  return {
    async openPdf(bytes: Uint8Array): Promise<PdfDocument> {
      pdfjs ??= load();
      const task = (await pdfjs).getDocument({ ...pdfDocumentOptions, data: bytes });
      let document: Awaited<typeof task.promise>;
      try {
        document = await task.promise;
      } catch (error) {
        await task.destroy();
        throw toCvReadError(error);
      }
      return {
        pageCount: document.numPages,
        async readPages() {
          const pages = [];
          for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
            try {
              const content = await (await document.getPage(pageNumber)).getTextContent();
              pages.push({ pageNumber, items: toPdfTextItems(content.items) });
            } catch (error) {
              throw toCvReadError(error);
            }
          }
          return pages;
        },
        close: () => task.destroy(),
      };
    },
  };
}
