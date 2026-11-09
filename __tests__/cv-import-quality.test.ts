import {
  assessExtraction,
  defaultQualityThresholds,
  documentStatus,
} from '@/features/cv-import/domain/assess-extraction';

// All texts are fictional.

const fullCv = `PERFIL
Desarrolladora web ficticia con experiencia en comercio electrónico y accesibilidad.

EXPERIENCIA
- Desarrollé el catálogo de una tienda ficticia con React y TypeScript para miles de clientes.
- Configuré la integración continua de tres repositorios del equipo de producto.
- Mejoré el rendimiento de la web y reduje el tiempo de carga de las páginas principales.

FORMACIÓN
Grado en Ingeniería Informática por una universidad ficticia.

IDIOMAS
Inglés: B2`.repeat(2);

const codes = (issues: { code: string; level: string }[]) =>
  issues.map((issue) => `${issue.level}:${issue.code}`);

describe('extraction quality', () => {
  it('reports nothing for a complete text', () => {
    expect(assessExtraction({ format: 'docx', text: fullCv })).toEqual([]);
  });

  it('blocks the analysis when there is no text at all', () => {
    expect(assessExtraction({ format: 'docx', text: '' })).toEqual([
      { code: 'no-text', level: 'error', possibleScan: false },
    ]);
  });

  it('treats symbols and punctuation without letters as no text', () => {
    expect(codes(assessExtraction({ format: 'docx', text: '• • — 2020 · ✉ ☎' }))).toEqual([
      'error:no-text',
    ]);
  });

  it('suggests a possible scan, without asserting it, only when a PDF has no text on any page', () => {
    const issues = assessExtraction({
      format: 'pdf',
      text: '',
      pages: [
        { pageNumber: 1, letterCount: 0 },
        { pageNumber: 2, letterCount: 0 },
      ],
    });
    expect(issues).toEqual([{ code: 'no-text', level: 'error', possibleScan: true }]);
  });

  it('does not block a short CV: it is only an uncertain situation', () => {
    const shortCv = 'Ana Ficticia\nDesarrolladora web junior\nReact, HTML y CSS\nInglés B1';
    const issues = assessExtraction({ format: 'docx', text: shortCv });
    expect(codes(issues)).toEqual(['uncertain:little-text']);
    expect(documentStatus(issues)).toBe('ready');
  });

  it('marks little text per PDF page as uncertain, not as a scan', () => {
    const issues = assessExtraction({
      format: 'pdf',
      text: 'Nombre ficticio\nDesarrolladora\nContacto ficticio',
      pages: [
        { pageNumber: 1, letterCount: 20 },
        { pageNumber: 2, letterCount: 20 },
      ],
    });
    expect(issues).toEqual([
      expect.objectContaining({ code: 'little-text', level: 'uncertain', lettersPerPage: 20 }),
    ]);
  });

  it('warns about PDF pages without text when other pages have text', () => {
    const issues = assessExtraction({
      format: 'pdf',
      text: fullCv,
      pages: [
        { pageNumber: 1, letterCount: 900 },
        { pageNumber: 2, letterCount: 0 },
        { pageNumber: 3, letterCount: 0 },
      ],
    });
    expect(issues).toEqual([{ code: 'pages-without-text', level: 'warning', pages: [2, 3] }]);
    expect(documentStatus(issues)).toBe('needs-review');
  });

  it('asks to review the reading order of multi-column pages without blocking', () => {
    const issues = assessExtraction({
      format: 'pdf',
      text: fullCv,
      pages: [{ pageNumber: 1, letterCount: 900 }],
      multiColumnPages: [1],
    });
    expect(issues).toEqual([{ code: 'reading-order', level: 'warning', pages: [1] }]);
    expect(documentStatus(issues)).toBe('needs-review');
  });

  it('ignores a few unreadable symbols, such as icons from a font', () => {
    const withIcons = `\uE0B0 600 000 000\n\uE0BE correo@example.com\n${fullCv}`;
    expect(assessExtraction({ format: 'pdf', text: withIcons })).toEqual([]);
  });

  it('warns when a noticeable share of characters cannot be read', () => {
    const damaged = fullCv.replace(/[aeo]/g, (char, index) => (index % 5 === 0 ? '\uFFFD' : char));
    const issues = assessExtraction({ format: 'pdf', text: damaged });
    expect(codes(issues)).toEqual(['warning:unreadable-characters']);
    expect(issues[0]).toMatchObject({ ratio: expect.any(Number) });
  });

  it('blocks the analysis when most characters cannot be read', () => {
    const garbled = fullCv.replace(/[a-záéíóú]/g, '\uFFFD');
    const issues = assessExtraction({ format: 'pdf', text: garbled });
    expect(codes(issues)).toEqual(['error:unreadable-characters']);
    expect(documentStatus(issues)).toBe('blocked');
  });

  it('does not treat missing section headings as an extraction problem', () => {
    const noHeadings = fullCv.replace(/^[A-ZÁÉÍÓÚ]+$/gm, '');
    expect(assessExtraction({ format: 'docx', text: noHeadings })).toEqual([]);
  });

  it('accepts other thresholds', () => {
    const withIcons = `\uE0B0 600 000 000\n${fullCv}`;
    const strict = { ...defaultQualityThresholds, unreadableWarningRatio: 0.0001 };
    expect(codes(assessExtraction({ format: 'pdf', text: withIcons }, strict))).toEqual([
      'warning:unreadable-characters',
    ]);
  });

  it('lists errors before warnings', () => {
    const issues = assessExtraction({
      format: 'pdf',
      text: '\uFFFD\uFFFD\uFFFD ab',
      pages: [
        { pageNumber: 1, letterCount: 2 },
        { pageNumber: 2, letterCount: 0 },
      ],
      multiColumnPages: [1],
    });
    expect(codes(issues)).toEqual([
      'error:unreadable-characters',
      'warning:pages-without-text',
      'warning:reading-order',
    ]);
  });

  it('lists warnings before uncertain situations', () => {
    const issues = assessExtraction({
      format: 'pdf',
      text: 'Nombre ficticio',
      pages: [{ pageNumber: 1, letterCount: 14 }],
      multiColumnPages: [1],
    });
    expect(codes(issues)).toEqual(['warning:reading-order', 'uncertain:little-text']);
  });

  it('does not add the little-text note when an error already blocks the document', () => {
    expect(codes(assessExtraction({ format: 'docx', text: '\uFFFD\uFFFD ab' }))).toEqual([
      'error:unreadable-characters',
    ]);
  });
});

describe('document status', () => {
  it('is ready without issues or with uncertain situations only', () => {
    expect(documentStatus([])).toBe('ready');
    expect(
      documentStatus([
        { code: 'little-text', level: 'uncertain', letters: 10, lettersPerPage: null },
      ]),
    ).toBe('ready');
  });
});
