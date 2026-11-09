import { countLetters, isUnreadable } from './characters';
import type {
  DocumentStatus,
  ExtractionIssue,
  IssueLevel,
  PageLetters,
  ReadableFormat,
} from './types';

/**
 * Configurable limits of the quality checks. They are judgement calls, not facts about
 * any given document, so they can only raise warnings or uncertain notes, except where
 * the text clearly cannot support an analysis.
 */
export type QualityThresholds = {
  /**
   * Share of visible characters that cannot be read from which a warning is shown.
   * Designed CVs often draw icons (phone, email) with private-use glyphs: a handful of
   * them in a page of text stays well below 2 %.
   */
  unreadableWarningRatio: number;
  /**
   * Share from which the text is blocked: with 30 % or more unreadable characters most
   * words are broken, so finding or missing requirements in them would be meaningless.
   */
  unreadableErrorRatio: number;
  /**
   * Letters below which the whole text is noted as unusually short (about 40 words).
   * A brief CV can be valid, so it is only an uncertain note.
   */
  littleTextLetters: number;
  /**
   * Average letters per PDF page with text below which the note is also shown. A page of
   * CV usually holds well over 1,000 letters; much less may mean parts are images of text.
   */
  littleTextLettersPerPage: number;
};

export const defaultQualityThresholds: QualityThresholds = {
  unreadableWarningRatio: 0.02,
  unreadableErrorRatio: 0.3,
  littleTextLetters: 250,
  littleTextLettersPerPage: 250,
};

export type ExtractionInput = {
  format: ReadableFormat;
  text: string;
  /** Letters per page, for formats with pages. */
  pages?: PageLetters[];
  multiColumnPages?: number[];
};

const levelOrder: IssueLevel[] = ['error', 'warning', 'uncertain'];

function unreadableRatio(text: string) {
  let visible = 0;
  let unreadable = 0;
  for (const char of text) {
    if (char.trim() === '') continue;
    visible += 1;
    if (isUnreadable(char)) unreadable += 1;
  }
  return visible === 0 ? 0 : unreadable / visible;
}

/**
 * Checks whether extracted text can support an analysis. Only demonstrated problems are
 * errors; missing headings are never an extraction problem, and little text is never
 * taken as proof of a scanned document.
 */
export function assessExtraction(
  { format, text, pages, multiColumnPages = [] }: ExtractionInput,
  thresholds: QualityThresholds = defaultQualityThresholds,
): ExtractionIssue[] {
  const issues: ExtractionIssue[] = [];
  const letters = countLetters(text);

  if (letters === 0) {
    issues.push({
      code: 'no-text',
      level: 'error',
      // A PDF with pages and no text at all is often a scan, but nothing here proves it.
      possibleScan: format === 'pdf' && (pages?.length ?? 0) > 0,
    });
  } else {
    const ratio = unreadableRatio(text);
    if (ratio >= thresholds.unreadableErrorRatio) {
      issues.push({ code: 'unreadable-characters', level: 'error', ratio });
    } else if (ratio >= thresholds.unreadableWarningRatio) {
      issues.push({ code: 'unreadable-characters', level: 'warning', ratio });
    }

    const emptyPages = (pages ?? []).filter((page) => page.letterCount === 0);
    if (emptyPages.length > 0) {
      issues.push({
        code: 'pages-without-text',
        level: 'warning',
        pages: emptyPages.map((page) => page.pageNumber),
      });
    }
  }

  if (multiColumnPages.length > 0) {
    issues.push({ code: 'reading-order', level: 'warning', pages: multiColumnPages });
  }

  // An error already explains the problem; the note would only repeat it.
  if (!issues.some((issue) => issue.level === 'error')) {
    const pagesWithText = (pages ?? []).filter((page) => page.letterCount > 0);
    const lettersPerPage =
      pagesWithText.length > 0
        ? Math.round(
            pagesWithText.reduce((total, page) => total + page.letterCount, 0) /
              pagesWithText.length,
          )
        : null;
    const littleOverall = letters < thresholds.littleTextLetters;
    const littlePerPage =
      lettersPerPage !== null && lettersPerPage < thresholds.littleTextLettersPerPage;
    if (littleOverall || littlePerPage) {
      issues.push({ code: 'little-text', level: 'uncertain', letters, lettersPerPage });
    }
  }

  return issues.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
}

/** Errors block the analysis, warnings ask for a review, uncertain notes are only shown. */
export function documentStatus(issues: ExtractionIssue[]): DocumentStatus {
  if (issues.some((issue) => issue.level === 'error')) return 'blocked';
  if (issues.some((issue) => issue.level === 'warning')) return 'needs-review';
  return 'ready';
}
