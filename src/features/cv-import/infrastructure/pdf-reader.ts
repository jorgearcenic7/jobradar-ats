import { CvReadError, type CvReaders } from '../domain/readers';

/**
 * Native app: reading PDFs is not available yet (PDF.js does not run on Hermes). The web
 * version lives in `pdf-reader.web.ts`; this keeps PDF.js out of the native bundle.
 */
export function createPdfReader(): Pick<CvReaders, 'openPdf'> {
  return {
    openPdf: async () => {
      throw new CvReadError('read-error');
    },
  };
}
