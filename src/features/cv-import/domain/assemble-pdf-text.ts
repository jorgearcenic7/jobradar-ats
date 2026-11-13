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
  /** Páginas con dos columnas claras que el PDF mezclaba línea a línea y se han leído columna a columna. */
  reorderedColumnPages: number[];
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

/*
Dos columnas mezcladas. Algunos generadores escriben el contenido fila a fila: una línea de la
columna izquierda, la de su altura en la derecha, la siguiente de la izquierda… Leído en ese
orden, cada línea del CV queda partida entre dos temas. Solo se reordena cuando la estructura es
inequívoca; en cualquier otro caso se conserva el orden y el aviso de columnas pide revisarlo:

- hay una separación vertical que ningún fragmento cruza, salvo los de una cabecera situada por
  encima de las dos columnas;
- cada columna tiene al menos `minColumnItems` fragmentos y una quinta parte del texto, y las dos
  se solapan en altura al menos a la mitad (si no, son bloques apilados, no columnas);
- los fragmentos de cada columna miden de media `minAverageLength` caracteres o más. Una tabla de
  etiquetas y valores («Teléfono   600 000 000») también alterna de lado fila a fila, pero sus
  filas sí van juntas: sus etiquetas cortas evitan que se separen;
- el orden del PDF salta entre columnas más de `maxOrderedSwitches` veces. Si salta pocas veces,
  ya va columna a columna y no hace falta tocarlo.

El resultado es la cabecera, la columna izquierda y la derecha, cada una en el orden del PDF.
*/
const columnRules = {
  minColumnItems: 5,
  minShare: 0.2,
  minOverlap: 0.5,
  minAverageLength: 12,
  maxOrderedSwitches: 2,
};

function verticalRange(items: PdfTextItem[]) {
  return {
    top: Math.max(...items.map((item) => item.y + item.height)),
    bottom: Math.min(...items.map((item) => item.y)),
  };
}

function textLength(items: PdfTextItem[]) {
  return items.reduce((total, item) => total + item.str.trim().length, 0);
}

export function reorderInterleavedColumns(items: PdfTextItem[]): PdfTextItem[] | null {
  const text = items.filter((item) => item.str.trim() !== '');
  if (text.length < columnRules.minColumnItems * 2) return null;
  const left = Math.min(...text.map((item) => item.x));
  const right = Math.max(...text.map((item) => item.x + item.width));
  const width = right - left;
  const total = textLength(text);

  // Candidatas: el borde derecho de cada fragmento, en la franja central de la página.
  const candidates = [...new Set(text.map((item) => item.x + item.width))].filter(
    (x) => x > left + width * 0.2 && x < left + width * 0.8,
  );
  for (const gutter of candidates.sort((a, b) => a - b)) {
    const leftItems = text.filter((item) => item.x + item.width <= gutter + 0.5);
    const rightItems = text.filter((item) => item.x > gutter + 0.5);
    const crossing = text.filter((item) => !leftItems.includes(item) && !rightItems.includes(item));
    if (
      leftItems.length < columnRules.minColumnItems ||
      rightItems.length < columnRules.minColumnItems ||
      textLength(leftItems) < total * columnRules.minShare ||
      textLength(rightItems) < total * columnRules.minShare ||
      textLength(leftItems) / leftItems.length < columnRules.minAverageLength ||
      textLength(rightItems) / rightItems.length < columnRules.minAverageLength
    )
      continue;
    const leftRange = verticalRange(leftItems);
    const rightRange = verticalRange(rightItems);
    const overlap =
      Math.min(leftRange.top, rightRange.top) - Math.max(leftRange.bottom, rightRange.bottom);
    const shorter = Math.min(leftRange.top - leftRange.bottom, rightRange.top - rightRange.bottom);
    if (shorter <= 0 || overlap < shorter * columnRules.minOverlap) continue;
    // Un fragmento que cruza la separación solo se admite como cabecera, encima de ambas.
    const columnsTop = Math.min(leftRange.top, rightRange.top);
    if (crossing.some((item) => item.y < columnsTop)) continue;

    let switches = 0;
    let previous: 'left' | 'right' | null = null;
    for (const item of text) {
      const side = leftItems.includes(item) ? 'left' : rightItems.includes(item) ? 'right' : null;
      if (!side) continue;
      if (previous && side !== previous) switches += 1;
      previous = side;
    }
    if (switches <= columnRules.maxOrderedSwitches) return null;

    const side = new Map<PdfTextItem, number>();
    for (const item of crossing) side.set(item, 0);
    for (const item of leftItems) side.set(item, 1);
    for (const item of rightItems) side.set(item, 2);
    // Los fragmentos vacíos (espacios, saltos) siguen al fragmento de texto anterior.
    let current = 0;
    const ranked = items.map((item, index) => {
      current = side.get(item) ?? current;
      return { item, index, column: current };
    });
    return ranked.sort((a, b) => a.column - b.column || a.index - b.index).map(({ item }) => item);
  }
  return null;
}

/** Rebuilds the lines of each page from PDF.js text items, keeping every piece of text. */
export function assemblePdfText(
  pages: PdfPageItems[],
  ratios: typeof pdfLayoutRatios = pdfLayoutRatios,
): AssembledPdfText {
  const assembled = pages.map((page) => {
    const reordered = reorderInterleavedColumns(page.items);
    return {
      page,
      reordered: reordered !== null,
      ...assemblePage(reordered ?? page.items, ratios),
    };
  });
  return {
    text: assembled
      .map(({ text }) => text)
      .filter(Boolean)
      .join('\n\n'),
    pages: assembled.map(({ page, text }) => ({
      pageNumber: page.pageNumber,
      letterCount: countLetters(text),
    })),
    // Una página reordenada ya no necesita el aviso de orden dudoso, sino uno informativo.
    multiColumnPages: assembled
      .filter(({ multiColumn, reordered }) => multiColumn && !reordered)
      .map(({ page }) => page.pageNumber),
    reorderedColumnPages: assembled
      .filter(({ reordered }) => reordered)
      .map(({ page }) => page.pageNumber),
  };
}
