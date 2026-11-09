import {
  assessExtraction,
  defaultQualityThresholds,
  documentStatus,
  type QualityThresholds,
} from './assess-extraction';
import { normalizeExtractedText } from './normalize-extracted-text';
import type {
  AnalysisInput,
  CvSource,
  ExtractionFailure,
  ImportedCv,
  PageLetters,
  ReadableFormat,
} from './types';

export type Extraction = {
  /** Text as the reader returned it, before normalization. */
  text: string;
  pages?: PageLetters[];
  multiColumnPages?: number[];
};

/** Builds the imported CV from a successful extraction: normalized text, issues and status. */
export function createImportedCv(
  source: CvSource & { format: ReadableFormat },
  extraction: Extraction,
  thresholds: QualityThresholds = defaultQualityThresholds,
): ImportedCv {
  const { text, changes } = normalizeExtractedText(extraction.text);
  const issues = assessExtraction(
    {
      format: source.format,
      text,
      pages: extraction.pages,
      multiColumnPages: extraction.multiColumnPages,
    },
    thresholds,
  );
  return {
    status: documentStatus(issues),
    source,
    extractedText: text,
    normalization: changes,
    correctedText: null,
    issues,
  };
}

export function failedImport(source: CvSource, failure: ExtractionFailure): ImportedCv {
  return { status: 'failed', source, failure };
}

/**
 * Returns a copy with the user's correction. The extracted text stays as it was, and a
 * correction identical to it is not kept. A file that could not be read has no text to correct.
 */
export function reviseText(cv: ImportedCv, text: string): ImportedCv {
  if (cv.status === 'failed') return cv;
  return { ...cv, correctedText: text === cv.extractedText ? null : text };
}

export function discardCorrection(cv: ImportedCv): ImportedCv {
  if (cv.status === 'failed') return cv;
  return { ...cv, correctedText: null };
}

/**
 * The text to analyze: the user's correction when there is one, otherwise the extracted
 * text. A correction makes a blocked extraction usable, since the user wrote that text.
 */
export function analysisInput(cv: ImportedCv): AnalysisInput {
  if (cv.status === 'failed') return { canAnalyze: false, reason: 'failed' };
  if (cv.correctedText !== null) {
    return cv.correctedText.trim()
      ? { canAnalyze: true, text: cv.correctedText, usesCorrection: true }
      : { canAnalyze: false, reason: 'empty-correction' };
  }
  if (cv.status === 'blocked') return { canAnalyze: false, reason: 'blocked' };
  return { canAnalyze: true, text: cv.extractedText, usesCorrection: false };
}
