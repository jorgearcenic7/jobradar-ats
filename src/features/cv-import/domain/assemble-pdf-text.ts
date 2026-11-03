import { countLetters } from './characters';
import type { PageLetters } from './types';

/**
 * A piece of text as PDF.js reports it, reduced to what the assembly needs.
 * Coordinates are PDF user space: `x` grows to the right and `y` (the baseline) grows upwards.
 */
export type PdfTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** PDF.js marks the item that ends a line of text. */
  hasEOL: boolean;
};

export type PdfPageItems = { pageNumber: number; items: PdfTextItem[] };

export type AssembledPdfText = {
  text: string;
  pages: PageLetters[];
  /** Pages where the text jumps back up, as in multi-column layouts: reading order may need review. */
  multiColumnPages: number[];
};

/**
 * Proportions of the text height, so they work at any font size:
 * - a baseline change smaller than `sameLine` keeps the item on the line (sub- and superscripts);
 * - a gap between items wider than `wordGap` means a space between words;
 * - a drop wider than `blockGap` between lines means a new block, kept as a blank line;
 * - a rise wider than `columnJump` means the text restarts higher up, as a new column does.
 */
export const pdfLayoutRatios = {
  sameLine: 0.5,
  wordGap: 0.25,
  blockGap: 1.8,
  columnJump: 1,
};

function assemblePage(items: PdfTextItem[], ratios: typeof pdfLayoutRatios) {
  const lines: string[] = [];
  let line = '';
  let lastTextItem: PdfTextItem | null = null;
  let breakPending = false;
  let spacePending = false;
  let multiColumn = false;

  const closeLine = () => {
    if (line) lines.push(line);
    line = '';
  };

  // PDF.js returns items in content order, which usually follows each column from top to
  // bottom. Sorting by position would interleave the columns, so the order is kept.
  for (const item of items) {
    if (item.str.trim() === '') {
      if (item.hasEOL) breakPending = true;
      else if (item.str) spacePending = true;
      continue;
    }

    if (lastTextItem) {
      const height = Math.max(lastTextItem.height, item.height) || 1;
      const drop = lastTextItem.y - item.y;
      const newLine =
        breakPending || lastTextItem.hasEOL || Math.abs(drop) > height * ratios.sameLine;
      if (newLine) {
        closeLine();
        const risesAsNewColumn = -drop > height * ratios.columnJump;
        if (risesAsNewColumn) multiColumn = true;
        if (risesAsNewColumn || drop > height * ratios.blockGap) lines.push('');
      } else {
        const gap = item.x - (lastTextItem.x + lastTextItem.width);
        const needsSpace =
          (spacePending || gap > height * ratios.wordGap) &&
          !line.endsWith(' ') &&
          !item.str.startsWith(' ');
        if (needsSpace) line += ' ';
      }
    }

    line += line ? item.str : item.str.trimStart();
    lastTextItem = item;
    breakPending = false;
    spacePending = false;
  }
  closeLine();

  const text = lines
    .join('\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
  return { text, multiColumn };
}

/** Rebuilds the lines of each page from PDF.js text items, keeping every piece of text. */
export function assemblePdfText(
  pages: PdfPageItems[],
  ratios: typeof pdfLayoutRatios = pdfLayoutRatios,
): AssembledPdfText {
  const assembled = pages.map((page) => ({ page, ...assemblePage(page.items, ratios) }));
  return {
    text: assembled
      .map(({ text }) => text)
      .filter(Boolean)
      .join('\n\n'),
    pages: assembled.map(({ page, text }) => ({
      pageNumber: page.pageNumber,
      letterCount: countLetters(text),
    })),
    multiColumnPages: assembled
      .filter(({ multiColumn }) => multiColumn)
      .map(({ page }) => page.pageNumber),
  };
}
