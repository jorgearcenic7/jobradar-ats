import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import AnalysisRoute from '@/app/analisis';
import type { PickResult } from '@/features/cv-import/domain/readers';
import { pickCvFile } from '@/features/cv-import/infrastructure/pick-cv-file';

import {
  buildCompoundFile,
  buildDocx,
  buildImageOnlyPdf,
  buildTextPdf,
  docx,
  type PdfLine,
} from '../jest/cv-fixtures';
import { pickedFile } from '../jest/real-cv-readers';
import { SafeArea } from '../jest/safe-area';

// The whole flow on the analysis screen with the real PDF.js and mammoth on fictional
// documents. Only the system file picker is simulated: Jest has no browser.
jest.mock('@/features/cv-import/infrastructure/pick-cv-file', () => ({
  canPickCvFile: true,
  pickCvFile: jest.fn(),
}));
jest.mock('@/features/cv-import/infrastructure/cv-readers', () => ({
  cvReaders: jest.requireActual('../jest/real-cv-readers').realCvReaders,
}));

jest.setTimeout(60_000);

const pick = jest.mocked(pickCvFile);

const pdfCv: PdfLine[] = [
  [50, 780, 'Lucía Ficticia Ortega'],
  [50, 766, 'lucia.ficticia@example.com · 600 000 000'],
  [50, 730, 'EXPERIENCIA'],
  [50, 716, '- Desarrollé el catálogo de una tienda ficticia con React y TypeScript.'],
  [50, 680, 'IDIOMAS'],
  [50, 666, 'Inglés: B2'],
];

const docxCv = buildDocx(
  [
    docx.heading('Mario Ficticio Gil'),
    docx.paragraph('EXPERIENCIA'),
    docx.bullet('Desplegué los servicios del equipo con Docker en un servidor de pruebas.'),
    docx.tabAndBreak('Empresa Ficticia', '2021 – actualidad', 'Madrid'),
    docx.paragraph('HABILIDADES'),
    docx.table([['Docker', 'Kubernetes']]),
  ].join(''),
);

const offer = 'Requisitos\n- Experiencia con React.\n- Inglés B2.';

const picked = (name: string, bytes: Uint8Array, size?: number): PickResult => ({
  kind: 'picked',
  file: pickedFile(name, bytes, size),
});

async function renderScreen() {
  await render(<AnalysisRoute />, { wrapper: SafeArea });
  return userEvent.setup();
}

async function selectCv(user: ReturnType<typeof userEvent.setup>, result: PickResult) {
  pick.mockResolvedValueOnce(result);
  const button =
    screen.queryByRole('button', { name: 'Sustituir CV' }) ??
    screen.getByRole('button', { name: 'Seleccionar CV' });
  await user.press(button);
}

const analyze = (user: ReturnType<typeof userEvent.setup>) =>
  user.press(screen.getByRole('button', { name: 'Analizar' }));

describe('CV import on the analysis screen', () => {
  beforeEach(() => pick.mockReset());

  it('reads a PDF, shows its status and text, and analyzes it against the offer', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));

    expect(await screen.findByText('cv-ficticio.pdf · PDF · 1 página')).toBeOnTheScreen();
    expect(screen.getByText(/^Texto extraído: \d/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Texto del CV').props.value).toContain(
      'EXPERIENCIA\n- Desarrollé el catálogo',
    );
    expect(screen.getByText(/pueden perderse los encabezados y pies de página/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Oferta de empleo'), offer);
    await analyze(user);
    expect(screen.getByRole('header', { name: 'Resultados' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (2)' })).toBeOnTheScreen();
  });

  it('reads a DOCX keeping its line breaks, bullets and table rows', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.docx', docxCv));

    expect(await screen.findByText('cv-ficticio.docx · Word')).toBeOnTheScreen();
    const text = screen.getByLabelText('Texto del CV').props.value;
    expect(text).toContain('- Desplegué los servicios');
    expect(text).toContain('2021 – actualidad\nMadrid');
    expect(text).toContain('Docker | Kubernetes');
  });

  it('explains unsupported files and does not analyze them', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv.doc', buildCompoundFile()));
    expect(await screen.findByText(/Parece un Word antiguo \(\.doc\)/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Oferta de empleo'), offer);
    await analyze(user);
    expect(screen.getByText(/No se ha podido leer este CV/)).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Resultados' })).not.toBeOnTheScreen();
  });

  it('explains that a PDF without text needs OCR and blocks the analysis', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('escaneado.pdf', buildImageOnlyPdf()));
    expect(
      await screen.findByText(/todavía no reconoce texto en imágenes \(OCR\)/),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Oferta de empleo'), offer);
    await analyze(user);
    expect(screen.getByText(/Este CV no tiene texto que se pueda analizar/)).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Resultados' })).not.toBeOnTheScreen();
  });

  it('refuses files over 10 MB without reading them', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('enorme.pdf', new Uint8Array(0), 11 * 1024 * 1024));
    expect(await screen.findByText(/ocupa 11,0 MB y el límite es de 10 MB/)).toBeOnTheScreen();
  });

  it('asks before reading a long PDF and keeps every page', async () => {
    const pages = Array.from({ length: 25 }, (_, index): PdfLine[] => [
      [50, 780, `Página ficticia ${index + 1}`],
    ]);
    const user = await renderScreen();
    await selectCv(user, picked('largo.pdf', buildTextPdf(pages)));
    expect(await screen.findByText(/tiene 25 páginas, más de las 20 habituales/)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Leer las 25 páginas' }));
    expect(await screen.findByText('largo.pdf · PDF · 25 páginas')).toBeOnTheScreen();
    expect(screen.getByLabelText('Texto del CV').props.value).toContain('Página ficticia 25');
  });

  it('keeps the previous CV when a long PDF is not confirmed or the picker is cancelled', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await screen.findByText('cv-ficticio.pdf · PDF · 1 página');

    await selectCv(user, { kind: 'cancelled' });
    expect(screen.getByText('cv-ficticio.pdf · PDF · 1 página')).toBeOnTheScreen();

    const long = Array.from({ length: 21 }, (): PdfLine[] => [[50, 780, 'Página']]);
    await selectCv(user, picked('largo.pdf', buildTextPdf(long)));
    await user.press(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('cv-ficticio.pdf · PDF · 1 página')).toBeOnTheScreen();
  });

  it('lets the user correct the extracted text, analyzes the correction and can restore it', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    const field = await screen.findByLabelText('Texto del CV');
    const extracted = field.props.value;

    await fireEvent.changeText(
      field,
      `${extracted}\nPROYECTOS\n- Construí una herramienta ficticia con Python para el equipo.`,
    );
    expect(screen.getByText(/Has corregido el texto/)).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByLabelText('Oferta de empleo'),
      'Requisitos\n- Experiencia con Python.',
    );
    await analyze(user);
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (1)' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Restaurar el texto extraído' }));
    expect(screen.getByLabelText('Texto del CV').props.value).toBe(extracted);
  });

  it('hides the results of a replaced CV and compares the next analysis with them', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await screen.findByText('cv-ficticio.pdf · PDF · 1 página');
    await fireEvent.changeText(screen.getByLabelText('Oferta de empleo'), offer);
    await analyze(user);
    expect(screen.getByRole('header', { name: 'Resultados' })).toBeOnTheScreen();

    await selectCv(user, picked('cv-ficticio.docx', docxCv));
    await screen.findByText('cv-ficticio.docx · Word');
    expect(screen.queryByRole('header', { name: 'Resultados' })).not.toBeOnTheScreen();
    expect(screen.getByText(/Has cambiado de CV/)).toBeOnTheScreen();

    await analyze(user);
    expect(screen.getByRole('header', { name: 'Resultados' })).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).toBeOnTheScreen();
  });

  it('switches to pasting the text and back to selecting a file', async () => {
    const user = await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Pegar texto en su lugar' }));
    expect(screen.getByLabelText('Tu CV')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Seleccionar un archivo en su lugar' }));
    expect(screen.getByRole('button', { name: 'Seleccionar CV' })).toBeOnTheScreen();
  });
});
