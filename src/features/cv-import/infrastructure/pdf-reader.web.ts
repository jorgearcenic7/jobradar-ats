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

/*
 * PDF.js se ejecuta aquí en el hilo principal (ver `loadLegacyPdfjs`) y, entre una página y
 * la siguiente, solo encadena promesas. Sin una pausa, el documento entero se lee en una única
 * tarea y la interfaz no puede pintar ni responder hasta el final: con la CPU ralentizada 4×,
 * un PDF de 200 páginas la deja congelada más de un segundo.
 *
 * Por eso se cede el turno al navegador antes de cada página, salvo la primera. Se usa un
 * mensaje de `MessageChannel` y no `setTimeout(0)`, que los navegadores retrasan al menos 4 ms
 * cuando se encadena. Entre dos páginas PDF.js no tiene trabajo pendiente, así que la pausa no
 * cambia el texto, el orden de las páginas ni los errores.
 */
function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
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
            if (pageNumber > 1) await yieldToBrowser();
            try {
              const content = await (await document.getPage(pageNumber)).getTextContent();
              pages.push({ pageNumber, items: toPdfTextItems(content.items) });
            } catch (error) {
              throw toCvReadError(error);
            }
          }
          return pages;
        },
        /*
         * `destroy()` libera todo lo que PDF.js guarda del documento: páginas, fuentes y cachés
         * del worker. No se llama a `page.cleanup()` ni a `cleanup()` tras cada página: el
         * primero solo vacía datos de dibujo, que aquí nunca se crean, y el segundo obliga a
         * analizar de nuevo las fuentes en cada página (de 2 a 4 veces más lento) sin bajar el
         * pico de memoria.
         */
        close: () => task.destroy(),
      };
    },
  };
}
