// Public API of the CV import feature: the only entry point other features may use.
// It is also where the feature is assembled: the presentation receives the picker and the
// readers of the current platform from here and never imports the infrastructure itself.
import { cvReaders } from './infrastructure/cv-readers';
import { canPickCvFile, pickCvFile } from './infrastructure/pick-cv-file';
import { useCvImportWith, type CvImport } from './presentation/use-cv-import';

export { CvFileField } from './presentation/cv-file-field';
export type { CvImport };

const platform = { canPickFile: canPickCvFile, pickFile: pickCvFile, readers: cvReaders };

/** CV import with the file picker and the readers of the current platform. */
export function useCvImport(): CvImport {
  return useCvImportWith(platform);
}
