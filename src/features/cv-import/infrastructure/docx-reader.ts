import { CvReadError, type CvReaders } from '../domain/readers';

/**
 * Native app: reading DOCX files is not available yet (mammoth is untested on Hermes).
 * The web version lives in `docx-reader.web.ts`.
 */
export function createDocxReader(): Pick<CvReaders, 'readDocx'> {
  return {
    readDocx: async () => {
      throw new CvReadError('read-error');
    },
  };
}
