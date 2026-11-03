// Mammoth turns a DOCX into simple HTML that keeps paragraphs, line breaks, lists and
// tables. This module reads that HTML as a string and returns plain text: the HTML is
// never parsed by a browser, inserted into the interface or executed.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
};

function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

const BLOCKS = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'table']);
const TOKEN = /<(\/?)([a-z][a-z0-9]*)\b[^>]*>|([^<]+)/gi;

/** Plain text of mammoth's HTML: one line per paragraph, list item and table row. */
export function docxHtmlToText(html: string): string {
  let text = '';
  const lists: { ordered: boolean; count: number }[] = [];
  let row: string[] | null = null;
  let cell: string | null = null;

  const write = (chunk: string) => {
    if (cell !== null) cell += chunk;
    else text += chunk;
  };
  const newLine = () => {
    if (cell !== null) {
      // Paragraphs inside a cell are separated by a space; the row stays on one line.
      if (cell && !cell.endsWith(' ')) cell += ' ';
      return;
    }
    if (text && !text.endsWith('\n')) text += '\n';
  };

  for (const [, closing, rawName, content] of html.matchAll(TOKEN)) {
    if (content !== undefined) {
      write(decodeEntities(content));
      continue;
    }
    const name = rawName.toLowerCase();
    const opening = closing === '';

    if (BLOCKS.has(name)) newLine();
    else if (name === 'br') write(cell !== null ? ' ' : '\n');
    else if ((name === 'ul' || name === 'ol') && opening) {
      newLine();
      lists.push({ ordered: name === 'ol', count: 0 });
    } else if (name === 'ul' || name === 'ol') {
      lists.pop();
      newLine();
    } else if (name === 'li' && opening) {
      newLine();
      const list = lists[lists.length - 1];
      const indent = '  '.repeat(Math.max(lists.length - 1, 0));
      if (list) list.count += 1;
      write(`${indent}${list?.ordered ? `${list.count}. ` : '- '}`);
    } else if (name === 'li') newLine();
    else if (name === 'tr' && opening) {
      newLine();
      row = [];
    } else if (name === 'tr') {
      if (row) text += row.filter(Boolean).join(' | ');
      row = null;
      newLine();
    } else if ((name === 'td' || name === 'th') && opening) cell = '';
    else if (name === 'td' || name === 'th') {
      if (row && cell !== null) row.push(cell.trim());
      cell = null;
    }
    // Any other tag (formatting, links, images) adds no text of its own.
  }

  return text.trim();
}
