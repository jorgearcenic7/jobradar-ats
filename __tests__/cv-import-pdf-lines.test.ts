import { assemblePdfText, type PdfTextItem } from '@/features/cv-import/domain/assemble-pdf-text';

// Simulated text items with the shape PDF.js returns, in PDF coordinates: `y` grows upwards.
// Every text is fictional.

function item(str: string, x: number, y: number, extra: Partial<PdfTextItem> = {}): PdfTextItem {
  return { str, x, y, width: str.length * 5, height: 10, hasEOL: false, ...extra };
}

const page = (pageNumber: number, items: PdfTextItem[]) => ({ pageNumber, items });

describe('PDF line assembly', () => {
  it('joins the items of a line with a space when there is a gap between them', () => {
    const result = assemblePdfText([
      page(1, [item('Desarrolladora', 0, 700), item('frontend', 80, 700)]),
    ]);
    expect(result.text).toBe('Desarrolladora frontend');
  });

  it('joins items without a gap into a single word', () => {
    const result = assemblePdfText([page(1, [item('Desarro', 0, 700), item('llo', 35, 700)])]);
    expect(result.text).toBe('Desarrollo');
  });

  it('starts a new line when PDF.js marks the end of a line', () => {
    const result = assemblePdfText([
      page(1, [item('PERFIL', 0, 700, { hasEOL: true }), item('Texto ficticio', 0, 700)]),
    ]);
    expect(result.text).toBe('PERFIL\nTexto ficticio');
  });

  it('starts a new line when the baseline changes', () => {
    const result = assemblePdfText([
      page(1, [item('Línea uno', 0, 700), item('Línea dos', 0, 686)]),
    ]);
    expect(result.text).toBe('Línea uno\nLínea dos');
  });

  it('keeps a blank line where the vertical gap shows a new block', () => {
    const result = assemblePdfText([
      page(1, [item('Texto del perfil', 0, 700), item('EXPERIENCIA', 0, 660)]),
    ]);
    expect(result.text).toBe('Texto del perfil\n\nEXPERIENCIA');
  });

  it('uses empty end-of-line items as line breaks without adding text', () => {
    const result = assemblePdfText([
      page(1, [
        item('Inglés: B2', 0, 700),
        item('', 50, 700, { hasEOL: true }),
        item('Francés: A2', 0, 686),
      ]),
    ]);
    expect(result.text).toBe('Inglés: B2\nFrancés: A2');
  });

  it('does not double spaces given as separate items', () => {
    const result = assemblePdfText([
      page(1, [item('React', 0, 700), item(' ', 25, 700), item('Native', 40, 700)]),
    ]);
    expect(result.text).toBe('React Native');
  });

  it('separates pages with a blank line and counts the letters of each page', () => {
    const result = assemblePdfText([
      page(1, [item('Página uno', 0, 700)]),
      page(2, [item('Página dos', 0, 700)]),
    ]);
    expect(result.text).toBe('Página uno\n\nPágina dos');
    expect(result.pages).toEqual([
      { pageNumber: 1, letterCount: 9 },
      { pageNumber: 2, letterCount: 9 },
    ]);
  });

  it('reports pages without any text', () => {
    const result = assemblePdfText([page(1, [item('Texto', 0, 700)]), page(2, [])]);
    expect(result.pages[1]).toEqual({ pageNumber: 2, letterCount: 0 });
    expect(result.text).toBe('Texto');
  });

  it('keeps the content order of a two-column page and flags it for review', () => {
    // Left column top to bottom, then the right column starts again at the top.
    const result = assemblePdfText([
      page(1, [
        item('EXPERIENCIA', 0, 700),
        item('Puesto ficticio', 0, 686),
        item('IDIOMAS', 300, 700),
        item('Inglés: B2', 300, 686),
      ]),
    ]);
    expect(result.text).toBe('EXPERIENCIA\nPuesto ficticio\n\nIDIOMAS\nInglés: B2');
    expect(result.multiColumnPages).toEqual([1]);
  });

  it('does not flag a single-column page', () => {
    const result = assemblePdfText([page(1, [item('Uno', 0, 700), item('Dos', 0, 686)])]);
    expect(result.multiColumnPages).toEqual([]);
  });

  it('keeps every piece of text, in order, without truncating', () => {
    const items = Array.from({ length: 3000 }, (_, index) =>
      item(`palabra${index}`, (index % 10) * 60, 700 - Math.floor(index / 10) * 14),
    );
    const { text } = assemblePdfText([page(1, items)]);
    let position = -1;
    for (const { str } of items) {
      const next = text.indexOf(str, position + 1);
      expect(next).toBeGreaterThan(position);
      position = next;
    }
  });
});
