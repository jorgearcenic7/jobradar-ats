import type { PdfPageItems } from './assemble-pdf-text';

/** A file the user picked, read only when its bytes are requested. */
export type PickedFile = {
  name: string;
  /** Size declared by the platform, checked before reading. */
  size: number;
  mimeType: string | null;
  readBytes(): Promise<Uint8Array>;
};

/**
 * A file dropped on the page (web): only the parts of the browser's `File` that the import uses,
 * so this type does not depend on the DOM.
 */
export type DroppedFile = {
  name: string;
  size: number;
  /** MIME type reported by the browser, or an empty string when it doesn't know it. */
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type PickResult =
  | { kind: 'picked'; file: PickedFile }
  | { kind: 'cancelled' }
  /** The platform cannot read picked files yet (the native app). */
  | { kind: 'unavailable' };

/** An open PDF: the page count is known before any page is read. */
export type PdfDocument = {
  pageCount: number;
  readPages(): Promise<PdfPageItems[]>;
  close(): Promise<void>;
};

/** Contract of the document readers; each platform provides its own implementation. */
export type CvReaders = {
  openPdf(bytes: Uint8Array): Promise<PdfDocument>;
  /** Plain text of a DOCX. */
  readDocx(bytes: Uint8Array): Promise<string>;
};

export type ReadFailureKind = 'password-protected' | 'corrupt' | 'read-error';

/** Raised by readers when a document cannot be read, with the reason it is reported under. */
export class CvReadError extends Error {
  constructor(
    readonly kind: ReadFailureKind,
    options?: { cause?: unknown },
  ) {
    super(kind, options);
    this.name = 'CvReadError';
  }
}
