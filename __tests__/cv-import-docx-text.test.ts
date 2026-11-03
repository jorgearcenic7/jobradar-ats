import { docxHtmlToText } from '@/features/cv-import/domain/docx-html-to-text';

// HTML as mammoth produces it from fictional Word documents. It is only read as text.

describe('conversion of Word HTML to plain text', () => {
  it('puts each paragraph and heading on its own line', () => {
    expect(docxHtmlToText('<h1>Lucía Ficticia</h1><p>PERFIL</p><p>Texto del perfil.</p>')).toBe(
      'Lucía Ficticia\nPERFIL\nTexto del perfil.',
    );
  });

  it('keeps line breaks inside a paragraph', () => {
    expect(docxHtmlToText('<p>2021 – actualidad<br />Madrid</p>')).toBe(
      '2021 – actualidad\nMadrid',
    );
  });

  it('keeps tabs', () => {
    expect(docxHtmlToText('<p>Empresa Ficticia\t2021</p>')).toBe('Empresa Ficticia\t2021');
  });

  it('turns bullet and numbered lists into marked lines, with nesting', () => {
    expect(
      docxHtmlToText(
        '<ul><li>React</li><li>Docker<ul><li>Compose</li></ul></li></ul><ol><li>Uno</li><li>Dos</li></ol>',
      ),
    ).toBe('- React\n- Docker\n  - Compose\n1. Uno\n2. Dos');
  });

  it('writes each table row on one line, separating the cells', () => {
    expect(
      docxHtmlToText(
        '<table><tr><td><p>Docker</p></td><td><p>Kubernetes</p></td></tr><tr><td><p>Git</p></td><td></td></tr></table><p>Después</p>',
      ),
    ).toBe('Docker | Kubernetes\nGit\nDespués');
  });

  it('drops images and keeps only the text of links', () => {
    expect(
      docxHtmlToText(
        '<p>Foto <img src="data:image/png;base64,AAAA" /> y <a href="https://example.com">portfolio</a></p>',
      ),
    ).toBe('Foto  y portfolio');
  });

  it('decodes entities into plain characters', () => {
    expect(docxHtmlToText('<p>I+D &amp; R&lt;3 &quot;x&quot; &#39;y&#39; &#233; &#xE9;</p>')).toBe(
      'I+D & R<3 "x" \'y\' é é',
    );
  });

  it('returns markup written in the document as literal text, never as HTML', () => {
    expect(docxHtmlToText('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toBe(
      '<script>alert(1)</script>',
    );
  });

  it('removes formatting tags without changing the text', () => {
    expect(docxHtmlToText('<p><strong>React</strong> y <em>TypeScript</em></p>')).toBe(
      'React y TypeScript',
    );
  });

  it('returns an empty string for an empty document', () => {
    expect(docxHtmlToText('')).toBe('');
  });
});
