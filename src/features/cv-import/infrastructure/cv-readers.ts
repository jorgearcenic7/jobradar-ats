import type { CvReaders } from '../domain/readers';
import { createDocxReader } from './docx-reader';
import { createPdfReader } from './pdf-reader';

/** Readers of the current platform: the real ones on web, "not available" on native. */
export const cvReaders: CvReaders = {
  ...createPdfReader(),
  ...createDocxReader(),
};
