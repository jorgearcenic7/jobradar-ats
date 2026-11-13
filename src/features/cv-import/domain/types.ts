/** Format identified from the content of the file, never from its name. */
export type DetectedFormat = 'pdf' | 'docx' | 'legacy-or-protected-word' | 'unsupported';

/** Formats JobRadar can extract text from. */
export type ReadableFormat = Extract<DetectedFormat, 'pdf' | 'docx'>;

export type UnsupportedReason = 'empty' | 'zip-without-word-document' | 'rtf' | 'unknown-signature';

export type FormatDetection =
  | {
      format: Exclude<DetectedFormat, 'unsupported'>;
      /** Whether the file name agrees with the content; `null` when there is no name to compare. */
      extensionMatches: boolean | null;
    }
  | { format: 'unsupported'; reason: UnsupportedReason; extensionMatches: null };

/** The picked file, described without its content. */
export type CvSource = {
  fileName: string;
  format: DetectedFormat;
  byteSize: number;
  /** Pages of a PDF; `null` for formats without pages or when the file could not be read. */
  pageCount: number | null;
};

/** Why a file could not be read at all. */
export type ExtractionFailure =
  | { kind: 'unsupported-format'; reason: UnsupportedReason }
  | { kind: 'legacy-or-protected-word' }
  | { kind: 'password-protected' }
  | { kind: 'corrupt' }
  | { kind: 'read-error' };

/**
 * - `error`: demonstrated problem; the extracted text cannot support a reliable analysis.
 * - `warning`: demonstrated situation that can make the text wrong; the user should review it.
 * - `uncertain`: something unusual that may or may not be a problem; it is only shown.
 */
export type IssueLevel = 'error' | 'warning' | 'uncertain';

export type ExtractionIssue =
  | { code: 'no-text'; level: 'error'; possibleScan: boolean }
  | { code: 'unreadable-characters'; level: 'error' | 'warning'; ratio: number }
  | { code: 'pages-without-text'; level: 'warning'; pages: number[] }
  | { code: 'reading-order'; level: 'warning'; pages: number[] }
  | { code: 'columns-reordered'; level: 'uncertain'; pages: number[] }
  | { code: 'fragmented-lines'; level: 'uncertain' }
  | { code: 'little-text'; level: 'uncertain'; letters: number; lettersPerPage: number | null };

/** Status of a document whose text was extracted. */
export type DocumentStatus = 'ready' | 'needs-review' | 'blocked';

export type PageLetters = { pageNumber: number; letterCount: number };

/** Counts of what normalization changed, so nothing is altered silently. */
export type NormalizationChanges = {
  lineEndings: number;
  ligatures: number;
  softHyphens: number;
  invisibleCharacters: number;
  specialSpaces: number;
  trailingSpaces: number;
  blankLines: number;
};

/**
 * A CV read from a file. The extracted text is never modified: the user's corrections
 * live apart in `correctedText`, and the file itself is never touched.
 */
export type ImportedCv =
  | { status: 'failed'; source: CvSource; failure: ExtractionFailure }
  | {
      status: DocumentStatus;
      source: CvSource;
      /** Text extracted from the document, after normalization. */
      extractedText: string;
      normalization: NormalizationChanges;
      /** Text corrected by the user; `null` when there is no correction. */
      correctedText: string | null;
      issues: ExtractionIssue[];
    };

export type AnalysisInput =
  | { canAnalyze: true; text: string; usesCorrection: boolean }
  | { canAnalyze: false; reason: 'failed' | 'blocked' | 'empty-correction' };
