import {
  analysisInput,
  createImportedCv,
  discardCorrection,
  failedImport,
  reviseText,
} from '@/features/cv-import/domain/imported-cv';
import type { CvSource, ReadableFormat } from '@/features/cv-import/domain/types';

// All documents and texts are fictional.

const source: CvSource & { format: ReadableFormat } = {
  fileName: 'cv-ficticio.pdf',
  format: 'pdf',
  byteSize: 48_000,
  pageCount: 1,
};

const extractedCv = `PERFIL
Desarrolladora web ficticia con experiencia en comercio electrónico y accesibilidad.

EXPERIENCIA
- Desarrollé el catálogo de una tienda ficticia con React y TypeScript para miles de clientes.
- Configuré la integración continua de tres repositorios del equipo de producto.
- Mejoré el rendimiento de la web y reduje el tiempo de carga de las páginas principales.

FORMACIÓN
Grado en Ingeniería Informática por una universidad ficticia.`;

const ready = () =>
  createImportedCv(source, {
    text: `${extractedCv}\r\nCerti\uFB01cación ficticia`,
    pages: [{ pageNumber: 1, letterCount: 600 }],
  });

describe('imported CV', () => {
  it('keeps the normalized extracted text, the changes made and the status', () => {
    const cv = ready();
    expect(cv.status).toBe('ready');
    if (cv.status === 'failed') throw new Error('unexpected');
    expect(cv.extractedText).toBe(`${extractedCv}\nCertificación ficticia`);
    expect(cv.normalization).toMatchObject({ lineEndings: 1, ligatures: 1 });
    expect(cv.correctedText).toBeNull();
    expect(cv.issues).toEqual([]);
  });

  it('stores a correction apart from the extracted text, without changing the original', () => {
    const cv = ready();
    const corrected = reviseText(cv, 'Texto corregido por la usuaria ficticia');
    if (cv.status === 'failed' || corrected.status === 'failed') throw new Error('unexpected');
    expect(corrected.correctedText).toBe('Texto corregido por la usuaria ficticia');
    expect(corrected.extractedText).toBe(cv.extractedText);
    expect(cv.correctedText).toBeNull();
  });

  it('forgets a correction identical to the extracted text', () => {
    const cv = ready();
    if (cv.status === 'failed') throw new Error('unexpected');
    const same = reviseText(cv, cv.extractedText);
    if (same.status === 'failed') throw new Error('unexpected');
    expect(same.correctedText).toBeNull();
  });

  it('can discard a correction', () => {
    const corrected = reviseText(ready(), 'Otro texto');
    const restored = discardCorrection(corrected);
    if (restored.status === 'failed') throw new Error('unexpected');
    expect(restored.correctedText).toBeNull();
  });

  it('analyzes the extracted text when there is no correction', () => {
    const cv = ready();
    if (cv.status === 'failed') throw new Error('unexpected');
    expect(analysisInput(cv)).toEqual({
      canAnalyze: true,
      text: cv.extractedText,
      usesCorrection: false,
    });
  });

  it('analyzes the corrected text when there is one', () => {
    expect(analysisInput(reviseText(ready(), 'Texto revisado ficticio'))).toEqual({
      canAnalyze: true,
      text: 'Texto revisado ficticio',
      usesCorrection: true,
    });
  });

  it('allows the analysis of a document that needs review', () => {
    const cv = createImportedCv(source, {
      text: extractedCv,
      pages: [{ pageNumber: 1, letterCount: 600 }],
      multiColumnPages: [1],
    });
    expect(cv.status).toBe('needs-review');
    expect(analysisInput(cv).canAnalyze).toBe(true);
  });

  it('blocks a document without usable text until the user writes it', () => {
    const scanned = createImportedCv(source, {
      text: '',
      pages: [{ pageNumber: 1, letterCount: 0 }],
    });
    expect(scanned.status).toBe('blocked');
    expect(analysisInput(scanned)).toEqual({ canAnalyze: false, reason: 'blocked' });

    const typed = reviseText(scanned, 'CV escrito a mano por la usuaria ficticia');
    expect(analysisInput(typed)).toEqual({
      canAnalyze: true,
      text: 'CV escrito a mano por la usuaria ficticia',
      usesCorrection: true,
    });
  });

  it('does not analyze an empty correction', () => {
    expect(analysisInput(reviseText(ready(), '   \n '))).toEqual({
      canAnalyze: false,
      reason: 'empty-correction',
    });
  });

  it('represents a file that could not be read, which cannot be corrected or analyzed', () => {
    const failed = failedImport({ ...source, pageCount: null }, { kind: 'password-protected' });
    expect(failed).toEqual({
      status: 'failed',
      source: { ...source, pageCount: null },
      failure: { kind: 'password-protected' },
    });
    expect(reviseText(failed, 'texto')).toBe(failed);
    expect(analysisInput(failed)).toEqual({ canAnalyze: false, reason: 'failed' });
  });
});
