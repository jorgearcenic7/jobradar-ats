import { assemblePdfText } from '../domain/assemble-pdf-text';
import { detectFormat } from '../domain/detect-format';
import { createImportedCv, failedImport } from '../domain/imported-cv';
import { CvReadError, type CvReaders, type PdfDocument, type PickedFile } from '../domain/readers';
import type { CvSource, ExtractionFailure, ImportedCv } from '../domain/types';

/** Provisional lab limits. Nothing over them is truncated: it is refused or confirmed first. */
export const importLimits = {
  /** Files over this size are refused before being read. */
  maxFileBytes: 10 * 1024 * 1024,
  /** PDFs with more pages ask for confirmation before their text is read. */
  pagesBeforeConfirmation: 20,
};

export type ImportLimits = typeof importLimits;

export type ImportOutcome =
  | { kind: 'imported'; cv: ImportedCv }
  | { kind: 'too-large'; fileName: string; byteSize: number; maxBytes: number }
  | {
      kind: 'needs-confirmation';
      fileName: string;
      pageCount: number;
      pageLimit: number;
      /** Reads every page; nothing is left out. */
      confirm(): Promise<ImportedCv>;
      /** Closes the document without reading it. */
      cancel(): Promise<void>;
    };

function failureOf(error: unknown): ExtractionFailure {
  return { kind: error instanceof CvReadError ? error.kind : 'read-error' };
}

async function readPdfDocument(
  source: CvSource & { format: 'pdf' },
  document: PdfDocument,
): Promise<ImportedCv> {
  const withPages = { ...source, pageCount: document.pageCount };
  try {
    return createImportedCv(withPages, assemblePdfText(await document.readPages()));
  } catch (error) {
    return failedImport(withPages, failureOf(error));
  } finally {
    await document.close();
  }
}

/**
 * Reads a picked CV file into an imported CV: checks the size, identifies the format from
 * its content and extracts the text with the given readers, entirely on the device.
 */
export async function importCvFile(
  file: PickedFile,
  readers: CvReaders,
  limits: ImportLimits = importLimits,
): Promise<ImportOutcome> {
  const tooLarge = (byteSize: number): ImportOutcome => ({
    kind: 'too-large',
    fileName: file.name,
    byteSize,
    maxBytes: limits.maxFileBytes,
  });
  if (file.size > limits.maxFileBytes) return tooLarge(file.size);

  let bytes: Uint8Array;
  try {
    bytes = await file.readBytes();
  } catch {
    return {
      kind: 'imported',
      cv: failedImport(
        { fileName: file.name, format: 'unsupported', byteSize: file.size, pageCount: null },
        { kind: 'read-error' },
      ),
    };
  }
  if (bytes.length > limits.maxFileBytes) return tooLarge(bytes.length);

  const detection = detectFormat(bytes, file.name);
  const source: CvSource = {
    fileName: file.name,
    format: detection.format,
    byteSize: bytes.length,
    pageCount: null,
  };
  const imported = (cv: ImportedCv): ImportOutcome => ({ kind: 'imported', cv });

  switch (detection.format) {
    case 'unsupported':
      return imported(
        failedImport(source, { kind: 'unsupported-format', reason: detection.reason }),
      );
    case 'legacy-or-protected-word':
      return imported(failedImport(source, { kind: 'legacy-or-protected-word' }));
    case 'docx':
      try {
        const text = await readers.readDocx(bytes);
        return imported(createImportedCv({ ...source, format: 'docx' }, { text }));
      } catch (error) {
        return imported(failedImport(source, failureOf(error)));
      }
    case 'pdf': {
      const pdfSource = { ...source, format: 'pdf' as const };
      let document: PdfDocument;
      try {
        document = await readers.openPdf(bytes);
      } catch (error) {
        return imported(failedImport(source, failureOf(error)));
      }
      if (document.pageCount > limits.pagesBeforeConfirmation) {
        return {
          kind: 'needs-confirmation',
          fileName: file.name,
          pageCount: document.pageCount,
          pageLimit: limits.pagesBeforeConfirmation,
          confirm: () => readPdfDocument(pdfSource, document),
          cancel: () => document.close(),
        };
      }
      return imported(await readPdfDocument(pdfSource, document));
    }
  }
}
