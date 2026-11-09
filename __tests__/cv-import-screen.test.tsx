import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { PickResult } from '@/features/cv-import/domain/readers';
import { pickCvFile } from '@/features/cv-import/infrastructure/pick-cv-file';
import { palettes } from '@/shared/theme';

import {
  buildCompoundFile,
  buildDocx,
  buildImageOnlyPdf,
  buildTextPdf,
  docx,
  type PdfLine,
} from '../jest/cv-fixtures';
import { pickedFile } from '../jest/real-cv-readers';
import { renderAnalysis } from '../jest/render-analysis';

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
  await renderAnalysis();
  return userEvent.setup();
}

type User = ReturnType<typeof userEvent.setup>;

async function selectCv(user: User, result: PickResult) {
  pick.mockResolvedValueOnce(result);
  const button =
    screen.queryByRole('button', { name: 'Cambiar archivo' }) ??
    screen.getByRole('button', { name: 'Seleccionar PDF o Word' });
  await user.press(button);
}

// El nombre aparece ya mientras se lee; el recuento de caracteres, solo cuando termina.
async function waitForImport(name: string) {
  await screen.findByText(name);
  // Detalles de la tarjeta del archivo; la línea de la oferta también termina en «caracteres».
  await screen.findByText(/^(PDF|Word) · .*caracteres?$/);
}

// Abre «Revisar el texto extraído» si está plegado y devuelve el campo con el texto del CV.
async function reviewField(user: User) {
  const header = screen.getByRole('button', { name: 'Revisar el texto extraído' });
  if (!screen.queryByLabelText('Texto del CV')) await user.press(header);
  return screen.getByLabelText('Texto del CV');
}

const analyze = (user: ReturnType<typeof userEvent.setup>) =>
  user.press(screen.getByRole('button', { name: 'Analizar' }));

// Tras analizar se está en Resultados: para cambiar el CV o la oferta hay que volver a Preparar.
const editInputs = (user: ReturnType<typeof userEvent.setup>) =>
  user.press(screen.getByRole('button', { name: 'Editar CV u oferta' }));

describe('CV import on the analysis screen', () => {
  beforeEach(() => pick.mockReset());

  it('reads a PDF, shows its status and text, and analyzes it against the offer', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));

    await waitForImport('cv-ficticio.pdf');
    expect(screen.getByText('cv-ficticio.pdf')).toBeOnTheScreen();
    expect(screen.getByText(/^PDF · 1 página · [\d.]+ caracteres$/)).toBeOnTheScreen();
    expect(screen.getByText('Texto extraído')).toBeOnTheScreen();
    expect((await reviewField(user)).props.value).toContain(
      'EXPERIENCIA\n- Desarrollé el catálogo',
    );
    expect(screen.getByText(/pueden perderse los encabezados y pies de página/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), offer);
    await analyze(user);
    expect(screen.getByRole('header', { name: 'Resultados del análisis' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (2)' })).toBeOnTheScreen();
  });

  it('reads a DOCX keeping its line breaks, bullets and table rows', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.docx', docxCv));

    await waitForImport('cv-ficticio.docx');
    expect(screen.getByText('cv-ficticio.docx')).toBeOnTheScreen();
    // Un Word no tiene páginas: la tarjeta no las inventa.
    expect(screen.getByText(/^Word · [\d.]+ caracteres$/)).toBeOnTheScreen();
    const text = (await reviewField(user)).props.value;
    expect(text).toContain('- Desplegué los servicios');
    expect(text).toContain('2021 – actualidad\nMadrid');
    expect(text).toContain('Docker | Kubernetes');
  });

  it('explains unsupported files and does not analyze them', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv.doc', buildCompoundFile()));
    expect(await screen.findByText(/Parece un Word antiguo \(\.doc\)/)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), offer);
    await analyze(user);
    expect(screen.getByText(/No se ha podido leer este CV/)).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Resultados del análisis' })).not.toBeOnTheScreen();
  });

  it('explains that a PDF without text needs OCR and blocks the analysis', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('escaneado.pdf', buildImageOnlyPdf()));
    expect(
      await screen.findByText(/todavía no reconoce texto en imágenes \(OCR\)/),
    ).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), offer);
    await analyze(user);
    expect(screen.getByText(/Este CV no tiene texto que se pueda analizar/)).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Resultados del análisis' })).not.toBeOnTheScreen();
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
    await waitForImport('largo.pdf');
    expect(screen.getByText('largo.pdf')).toBeOnTheScreen();
    expect(screen.getByText(/^PDF · 25 páginas · /)).toBeOnTheScreen();
    expect((await reviewField(user)).props.value).toContain('Página ficticia 25');
  });

  it('keeps the previous CV when a long PDF is not confirmed or the picker is cancelled', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await waitForImport('cv-ficticio.pdf');

    await selectCv(user, { kind: 'cancelled' });
    expect(screen.getByText('cv-ficticio.pdf')).toBeOnTheScreen();

    const long = Array.from({ length: 21 }, (): PdfLine[] => [[50, 780, 'Página']]);
    await selectCv(user, picked('largo.pdf', buildTextPdf(long)));
    await user.press(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('cv-ficticio.pdf')).toBeOnTheScreen();
    expect(screen.getByText(/^PDF · 1 página · /)).toBeOnTheScreen();
  });

  it('lets the user correct the extracted text, analyzes the correction and can restore it', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await waitForImport('cv-ficticio.pdf');
    const field = await reviewField(user);
    const extracted = field.props.value;

    await fireEvent.changeText(
      field,
      `${extracted}\nPROYECTOS\n- Construí una herramienta ficticia con Python para el equipo.`,
    );
    expect(screen.getByText(/Has corregido el texto/)).toBeOnTheScreen();

    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Requisitos\n- Experiencia con Python.',
    );
    await analyze(user);
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (1)' })).toBeOnTheScreen();

    // De vuelta en Preparar, la corrección sigue y se puede restaurar.
    await editInputs(user);
    expect((await reviewField(user)).props.value).toContain('PROYECTOS');
    await user.press(screen.getByRole('button', { name: 'Restaurar el texto extraído' }));
    expect(screen.getByLabelText('Texto del CV').props.value).toBe(extracted);
  });

  it('hides the results of a replaced CV and compares the next analysis with them', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await waitForImport('cv-ficticio.pdf');
    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), offer);
    await analyze(user);
    expect(screen.getByRole('header', { name: 'Resultados del análisis' })).toBeOnTheScreen();

    // «Cambiar archivo» en la tarjeta sustituye el documento.
    await editInputs(user);
    await selectCv(user, picked('cv-ficticio.docx', docxCv));
    await waitForImport('cv-ficticio.docx');
    expect(screen.queryByText('cv-ficticio.pdf')).not.toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Resultados del análisis' })).not.toBeOnTheScreen();
    expect(screen.getByText(/Has cambiado de CV/)).toBeOnTheScreen();

    await analyze(user);
    expect(screen.getByRole('header', { name: 'Resultados del análisis' })).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).toBeOnTheScreen();
  });

  it('switches to pasting the text and back to selecting a file', async () => {
    const user = await renderScreen();
    expect(screen.getByRole('radio', { name: 'Archivo', checked: true })).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
    expect(screen.getByRole('radio', { name: 'Pegar texto', checked: true })).toBeOnTheScreen();
    expect(screen.getByLabelText('Texto del CV')).toBeOnTheScreen();

    await user.press(screen.getByRole('radio', { name: 'Archivo' }));
    expect(screen.getByRole('button', { name: 'Seleccionar PDF o Word' })).toBeOnTheScreen();
  });
});

// Sección «Tu CV»: tarjeta del archivo, texto plegable y conservación del contenido de cada
// modalidad.
describe('CV section on the analysis screen', () => {
  beforeEach(() => pick.mockReset());

  it('keeps the extracted text folded after a clean import', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await waitForImport('cv-ficticio.pdf');

    const header = screen.getByRole('button', { name: 'Revisar el texto extraído' });
    expect(header).toBeCollapsed();
    expect(screen.queryByLabelText('Texto del CV')).not.toBeOnTheScreen();

    await user.press(header);
    expect(header).toBeExpanded();
    expect(screen.getByLabelText('Texto del CV')).toBeOnTheScreen();

    await user.press(header);
    expect(header).toBeCollapsed();
    expect(screen.queryByLabelText('Texto del CV')).not.toBeOnTheScreen();
  });

  it('opens the extracted text when the import has warnings to review', async () => {
    const lines: PdfLine[] = [
      [50, 760, 'EXPERIENCIA'],
      [50, 744, '- Diseñé informes ficticios con Python.'],
      [320, 760, 'HABILIDADES'],
      [320, 744, 'Python, SQL, Docker'],
    ];
    const user = await renderScreen();
    await selectCv(user, picked('dos-columnas.pdf', buildTextPdf([lines])));
    await waitForImport('dos-columnas.pdf');

    expect(screen.getByText('Revisa el texto')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Revisar el texto extraído' })).toBeExpanded();
    expect(screen.getByLabelText('Texto del CV')).toBeOnTheScreen();
  });

  it('keeps a correction when the review is folded and when switching modes', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await waitForImport('cv-ficticio.pdf');
    const corrected = `${(await reviewField(user)).props.value}\nPROYECTOS\n- Herramienta ficticia.`;
    await fireEvent.changeText(screen.getByLabelText('Texto del CV'), corrected);

    // Plegado: el campo se desmonta, pero la tarjeta sigue indicando la corrección.
    await user.press(screen.getByRole('button', { name: 'Revisar el texto extraído' }));
    expect(screen.queryByLabelText('Texto del CV')).not.toBeOnTheScreen();
    expect(screen.getByText(/^Con tus correcciones/)).toBeOnTheScreen();
    expect((await reviewField(user)).props.value).toBe(corrected);

    // Pegar texto y volver: el documento y su corrección siguen ahí.
    await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
    await fireEvent.changeText(screen.getByLabelText('Texto del CV'), 'Texto pegado ficticio');
    await user.press(screen.getByRole('radio', { name: 'Archivo' }));
    expect(screen.getByText('cv-ficticio.pdf')).toBeOnTheScreen();
    expect((await reviewField(user)).props.value).toBe(corrected);

    // Y el texto pegado tampoco se ha perdido.
    await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
    expect(screen.getByLabelText('Texto del CV').props.value).toBe('Texto pegado ficticio');
  });

  it('says which content is analyzed when both modes have content', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await waitForImport('cv-ficticio.pdf');

    await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
    expect(
      screen.getByText(/^«cv-ficticio\.pdf» se conserva en «Archivo»\. Con «Pegar texto» elegido/),
    ).toBeOnTheScreen();

    // Se analiza la modalidad elegida: el texto pegado, que acredita Python y no React.
    await fireEvent.changeText(
      screen.getByLabelText('Texto del CV'),
      'PROYECTOS\n- Construí una herramienta ficticia con Python para el equipo.',
    );
    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Requisitos\n- Experiencia con Python.\n- Experiencia con React.',
    );
    await analyze(user);
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (1)' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'No acreditados (1)' })).toBeOnTheScreen();

    await editInputs(user);
    await user.press(screen.getByRole('radio', { name: 'Archivo' }));
    expect(
      screen.getByText(
        /^El texto que pegaste se conserva en «Pegar texto»\. Con «Archivo» elegido/,
      ),
    ).toBeOnTheScreen();
    // Otra modalidad es otro CV: los resultados anteriores se ocultan hasta volver a analizar.
    expect(screen.getByText(/Has cambiado de CV/)).toBeOnTheScreen();
  });

  it('offers to paste the text from a file that cannot be read', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv.doc', buildCompoundFile()));
    await screen.findByText(/Parece un Word antiguo/);

    expect(screen.getByText('cv.doc')).toBeOnTheScreen();
    expect(screen.getByText('No se ha podido leer')).toBeOnTheScreen();
    // Sin texto no hay nada que revisar ni recuento de caracteres que mostrar.
    expect(
      screen.queryByRole('button', { name: 'Revisar el texto extraído' }),
    ).not.toBeOnTheScreen();
    // El único recuento es el de la oferta, todavía vacía.
    expect(screen.getAllByText(/caracteres/)).toEqual([screen.getByText('0 caracteres')]);

    await user.press(screen.getByRole('button', { name: 'Pegar texto en su lugar' }));
    expect(screen.getByRole('radio', { name: 'Pegar texto', checked: true })).toBeOnTheScreen();
  });

  it('shows the file being read in its card, without inventing its details', async () => {
    // La prueba decide cuándo termina la lectura, para observar el estado intermedio.
    const bytes = buildTextPdf([pdfCv]);
    let release = () => {};
    const file = {
      ...pickedFile('cv-ficticio.pdf', bytes),
      readBytes: () => new Promise<Uint8Array>((resolve) => (release = () => resolve(bytes))),
    };
    const user = await renderScreen();
    await selectCv(user, { kind: 'picked', file });

    expect(await screen.findByText('Leyendo en este dispositivo…')).toBeOnTheScreen();
    expect(screen.getByText('cv-ficticio.pdf')).toBeOnTheScreen();
    expect(screen.queryByText(/^PDF ·/)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cambiar archivo' })).toBeBusy();

    release();
    expect(await screen.findByText('Texto extraído')).toBeOnTheScreen();
    expect(screen.getByText(/^PDF · 1 página · /)).toBeOnTheScreen();
  });
});

// Cómo se muestran los mensajes: avisos del documento en `Notice` y errores de validación junto
// a su control, en una región que los anuncia sin interrumpir.
describe('import and validation messages on the analysis screen', () => {
  beforeEach(() => pick.mockReset());

  const allNodes = () => {
    const root = screen.root!;
    return [root, ...root.queryAll(() => true)];
  };
  const textIn = (node: ReturnType<typeof allNodes>[number], text: RegExp) =>
    node.queryAll(
      (child) => typeof child.props.children === 'string' && text.test(child.props.children),
    ).length > 0;
  // El recuadro de aviso más interno con ese fondo que contiene el texto.
  const noticeWith = (text: RegExp, background: keyof typeof palettes.light) =>
    allNodes()
      .filter(
        (node) =>
          StyleSheet.flatten(node.props.style)?.backgroundColor === palettes.light[background],
      )
      .find((node) => textIn(node, text));

  it('shows the document in a card with its name, details and status', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('cv-ficticio.pdf', buildTextPdf([pdfCv])));
    await waitForImport('cv-ficticio.pdf');

    expect(screen.getByText('cv-ficticio.pdf')).toHaveStyle({ fontWeight: 600 });
    // Estado con insignia de éxito, y la tarjeta dentro de la región que anuncia los cambios.
    expect(noticeWith(/^Texto extraído$/, 'successSubtle')).toBeDefined();
    const region = allNodes().find(
      (node) => node.props['aria-live'] === 'polite' && textIn(node, /^cv-ficticio\.pdf$/),
    );
    expect(region).toBeDefined();
    expect(textIn(region!, /^PDF · 1 página · [\d.]+ caracteres$/)).toBe(true);
  });

  it('shows the warnings of a two-column PDF as warning notices, without losing any message', async () => {
    const left = [
      'EXPERIENCIA',
      '- Diseñé informes ficticios con Python.',
      '- Coordiné un equipo de tres personas.',
    ];
    const right = ['HABILIDADES', 'Python, SQL, Docker', 'IDIOMAS', 'Inglés: C1'];
    const lines: PdfLine[] = [
      ...left.map((text, index): PdfLine => [50, 760 - index * 16, text]),
      ...right.map((text, index): PdfLine => [320, 760 - index * 16, text]),
    ];
    const user = await renderScreen();
    await selectCv(user, picked('dos-columnas.pdf', buildTextPdf([lines])));

    expect(await screen.findByText('Revisa el texto')).toBeOnTheScreen();
    expect(noticeWith(/^Revisa el texto$/, 'warningSubtle')).toBeDefined();
    expect(noticeWith(/varias columnas/, 'warningSubtle')).toBeDefined();
  });

  it('shows a PDF without text as a danger notice with the way out', async () => {
    const user = await renderScreen();
    await selectCv(user, picked('escaneado.pdf', buildImageOnlyPdf()));
    await screen.findByText(/todavía no reconoce texto en imágenes \(OCR\)/);

    expect(noticeWith(/^Sin texto que analizar$/, 'dangerSubtle')).toBeDefined();
    const notice = noticeWith(/\(OCR\)/, 'dangerSubtle');
    expect(notice).toBeDefined();
    expect(textIn(notice!, /^Pegar texto en su lugar$/)).toBe(true);
    // El texto bloqueado se puede escribir en la revisión, que sigue disponible y plegada.
    expect(screen.getByRole('button', { name: 'Revisar el texto extraído' })).toBeCollapsed();
  });

  it('keeps the long PDF question and its answers in one notice', async () => {
    const pages = Array.from({ length: 25 }, (_, index): PdfLine[] => [
      [50, 780, `Página ${index + 1}`],
    ]);
    const user = await renderScreen();
    await selectCv(user, picked('largo.pdf', buildTextPdf(pages)));
    await screen.findByText(/tiene 25 páginas/);

    const notice = noticeWith(/tiene 25 páginas/, 'warningSubtle');
    expect(notice).toBeDefined();
    expect(textIn(notice!, /^Leer las 25 páginas$/)).toBe(true);
    expect(textIn(notice!, /^Cancelar$/)).toBe(true);
  });

  it('shows the CV and offer validation errors inline, in the same style', async () => {
    const user = await renderScreen();
    await analyze(user);

    const cvError = screen.getByText('Selecciona tu CV o pega su texto para analizarlo.');
    const offerError = screen.getByText('Pega el texto de la oferta para analizarla.');
    expect(cvError).toHaveStyle({ color: palettes.light.danger });
    // La zona para elegir el archivo también se marca con el color del error.
    const dropzone = screen.getByRole('button', { name: 'Seleccionar PDF o Word' });
    expect(dropzone).toHaveStyle({ borderColor: palettes.light.danger });
    expect(offerError).toHaveStyle({ color: palettes.light.danger });
    // Ninguno de los dos va en un recuadro: los recuadros quedan para los avisos.
    expect(noticeWith(/^Selecciona tu CV/, 'dangerSubtle')).toBeUndefined();
    expect(noticeWith(/^Pega el texto de la oferta/, 'dangerSubtle')).toBeUndefined();
    // El error del CV llega a los lectores de pantalla por la región educada del campo.
    const region = allNodes().find(
      (node) => node.props['aria-live'] === 'polite' && textIn(node, /^Selecciona tu CV/),
    );
    expect(region).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
