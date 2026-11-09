import { normalizeExtractedText } from '@/features/cv-import/domain/normalize-extracted-text';

// All texts are fictional.

describe('normalization of extracted text', () => {
  it('unifies line endings', () => {
    expect(normalizeExtractedText('Perfil\r\nExperiencia\rFormación').text).toBe(
      'Perfil\nExperiencia\nFormación',
    );
  });

  it('expands typographic ligatures so words can be matched', () => {
    const { text, changes } = normalizeExtractedText(
      'Certi\uFB01cación, \uFB02ujos, e\uFB00icient, o\uFB03ce, ba\uFB04e',
    );
    expect(text).toBe('Certificación, flujos, efficient, office, baffle');
    expect(changes.ligatures).toBe(5);
  });

  it('removes soft hyphens and invisible characters inside words', () => {
    const { text, changes } = normalizeExtractedText('Desa\u00ADrrollo de Java\u200BScript\uFEFF');
    expect(text).toBe('Desarrollo de JavaScript');
    expect(changes.softHyphens).toBe(1);
    expect(changes.invisibleCharacters).toBe(2);
  });

  it('turns special spaces into normal spaces', () => {
    expect(normalizeExtractedText('React\u00A0y\u202FTypeScript\u2003juntos').text).toBe(
      'React y TypeScript juntos',
    );
  });

  it('keeps tabs and the spacing inside lines', () => {
    expect(normalizeExtractedText('Empresa\tCargo  2020').text).toBe('Empresa\tCargo  2020');
  });

  it('trims trailing spaces and keeps a single blank line between blocks', () => {
    const { text, changes } = normalizeExtractedText('\n\nPerfil   \n\n\n\n\nExperiencia\n\n\n');
    expect(text).toBe('Perfil\n\nExperiencia');
    expect(changes.trailingSpaces).toBe(1);
    expect(changes.blankLines).toBe(3);
  });

  it('leaves clean text untouched and reports no changes', () => {
    const clean = 'PERFIL\nDesarrolladora web ficticia.\n\nEXPERIENCIA\n- React y Node.js.';
    expect(normalizeExtractedText(clean)).toEqual({
      text: clean,
      changes: {
        lineEndings: 0,
        ligatures: 0,
        softHyphens: 0,
        invisibleCharacters: 0,
        specialSpaces: 0,
        trailingSpaces: 0,
        blankLines: 0,
      },
    });
  });

  it('never truncates long texts', () => {
    const line = 'Desarrollé servicios ficticios con Python para el equipo de datos.\n';
    const long = line.repeat(2000);
    expect(long.length).toBeGreaterThan(100_000);
    expect(normalizeExtractedText(long).text).toBe(long.trimEnd());
  });
});
