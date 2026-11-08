import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';
import { palettes } from '@/shared/theme';

import { renderAnalysis } from '../jest/render-analysis';

// The screen as on web, where CV files can be picked. The native app has its own test.
jest.mock('@/features/cv-import/infrastructure/pick-cv-file', () => ({
  canPickCvFile: true,
  pickCvFile: jest.fn(),
}));

async function renderScreen() {
  await renderAnalysis();
  return userEvent.setup();
}

const analyzeButton = () => screen.getByRole('button', { name: 'Analizar' });

// Tras analizar se está en Resultados: para cambiar el CV o la oferta hay que volver a Preparar.
const editInputs = (user: ReturnType<typeof userEvent.setup>) =>
  user.press(screen.getByRole('button', { name: 'Editar CV u oferta' }));

describe('CV match screen', () => {
  it('asks for a CV and an offer, and shows no results without them', async () => {
    const user = await renderScreen();

    await user.press(analyzeButton());

    expect(screen.getByText('Selecciona tu CV o pega su texto para analizarlo.')).toBeOnTheScreen();
    expect(screen.getByText('Pega el texto de la oferta para analizarla.')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Resultados del análisis' })).not.toBeOnTheScreen();
  });

  it('keeps the heading levels in order below the screen title', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: 'Tu CV' }).props['aria-level']).toBe(2);
  });

  it('offers the fictional example as a development demonstration, after the main action', async () => {
    await renderScreen();

    expect(screen.getByText(/^Demostración, solo en desarrollo/)).toBeOnTheScreen();
    const buttons = screen.getAllByRole('button').map((button) => button.props.accessibilityLabel);
    expect(buttons.indexOf('Analizar')).toBeLessThan(buttons.indexOf('Cargar ejemplo ficticio'));
  });

  it('clears an error once the pasted CV has text', async () => {
    const user = await renderScreen();
    await user.press(analyzeButton());
    await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
    expect(screen.getByText('Pega el texto de tu CV para analizarlo.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Texto del CV'), 'Texto de un CV ficticio');

    expect(screen.queryByText('Pega el texto de tu CV para analizarlo.')).not.toBeOnTheScreen();
    expect(screen.getByText('Pega el texto de la oferta para analizarla.')).toBeOnTheScreen();
  });

  it('analyzes the fictional example and explains the results', async () => {
    const user = await renderScreen();
    const expected = analyzeMatch(sampleCv, sampleOffer);

    await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
    await user.press(analyzeButton());

    expect(screen.getByRole('header', { name: 'Resultados del análisis' })).toBeOnTheScreen();
    expect(screen.getByText(`${expected.coverage.percentage} %`)).toBeOnTheScreen();
    expect(
      screen.getByText(/No es una puntuación ATS ni una probabilidad de contratación/),
    ).toBeOnTheScreen();
    // Literal evidence from the CV and the unevaluable line of the offer.
    expect(
      screen.getAllByText(
        'Desarrollé el nuevo catálogo de la tienda con React y TypeScript, usado por 15.000 clientes al mes.',
      ).length,
    ).toBeGreaterThan(0);
    // Shown as a title without the final period, and literally as the offer source.
    expect(
      screen.getByText('Capacidad para organizar tu propio trabajo en remoto'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('«Capacidad para organizar tu propio trabajo en remoto.»'),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: /No evaluables, fuera del porcentaje/ }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Qué mejorar primero' })).toBeOnTheScreen();
  });

  it('does not compare analyses of different offers', async () => {
    const user = await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
    await user.press(analyzeButton());
    await editInputs(user);

    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Requisitos\n- Python.',
    );
    await user.press(analyzeButton());

    expect(
      screen.queryByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).not.toBeOnTheScreen();
    expect(screen.getByText(/La oferta ha cambiado/)).toBeOnTheScreen();
  });

  it('explains with an empty state when the offer has no recognizable requirements', async () => {
    const user = await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Hola, buscamos a alguien con ganas.',
    );

    await user.press(analyzeButton());

    expect(screen.getByRole('header', { name: 'Resultados del análisis' })).toBeOnTheScreen();
    // Ocupa el lugar de los grupos de requisitos, con un título del mismo nivel que ellos.
    const emptyTitle = screen.getByRole('header', {
      name: 'No se ha reconocido ningún requisito en la oferta',
    });
    expect(emptyTitle.props['aria-level']).toBe(3);
    expect(
      screen.getByText('Comprueba que el texto de la oferta incluye sus requisitos.'),
    ).toBeOnTheScreen();
    const sectionTitles = screen
      .getAllByRole('header')
      .filter((header) => header.props['aria-level'] === 3);
    expect(sectionTitles).toEqual([emptyTitle]);
    // Sin acción propia: el flujo del analizador no cambia y las recomendaciones siguen debajo.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('header', { name: 'Qué mejorar primero' })).toBeOnTheScreen();
  });

  it('shows requirement names with a capital letter', async () => {
    const user = await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
    await user.press(analyzeButton());

    expect(screen.getByText('Inglés B2')).toBeOnTheScreen();
    expect(screen.getByText('Grado universitario')).toBeOnTheScreen();
  });

  it('marks the results as outdated after an edit and compares the next analysis', async () => {
    const user = await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
    await user.press(analyzeButton());
    await editInputs(user);

    await fireEvent.changeText(
      screen.getByLabelText('Texto del CV'),
      `${sampleCv}\n\nPERFIL\nTengo 4 años de experiencia con React en comercio electrónico.`,
    );
    expect(screen.getByText(/Has cambiado el texto desde el último análisis/)).toBeOnTheScreen();
    // Aviso de advertencia, anunciado de forma educada y sin interrumpir como una alerta.
    const root = screen.root!;
    const region = [root, ...root.queryAll(() => true)].find(
      (node) =>
        node.props['aria-live'] === 'polite' &&
        node.queryAll(
          (child) =>
            StyleSheet.flatten(child.props.style)?.backgroundColor ===
              palettes.light.warningSubtle &&
            child.queryAll((text) => /Has cambiado el texto/.test(String(text.props.children)))
              .length > 0,
        ).length > 0,
    );
    expect(region).toBeDefined();
    expect(screen.queryByRole('alert')).toBeNull();

    await user.press(analyzeButton());

    expect(
      screen.queryByText(/Has cambiado el texto desde el último análisis/),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).toBeOnTheScreen();
    // La lista de cambios está plegada hasta que se pide.
    await user.press(screen.getByRole('button', { name: /de estado$/ }));
    expect(
      screen.getByText('3 años de experiencia con React: sin evidencia suficiente → respaldado'),
    ).toBeOnTheScreen();
  });
});

// Sección «La oferta»: texto completo, editor ampliable y relación con los resultados.
describe('Offer section on the analysis screen', () => {
  const cvWithPython =
    'EXPERIENCIA\n- Construí una herramienta ficticia con Python para el equipo.';

  async function pasteCv(user: ReturnType<typeof userEvent.setup>) {
    await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
    await fireEvent.changeText(screen.getByLabelText('Texto del CV'), cvWithPython);
  }

  it('analyzes the whole offer, also a requirement at the end of a very long text', async () => {
    const user = await renderScreen();
    await pasteCv(user);
    const filler = 'Somos una empresa ficticia con un equipo amable y cercano. '.repeat(600);
    const offer = `Sobre nosotros\n${filler}\n\nRequisitos\n- Experiencia con Python.`;
    expect(offer.length).toBeGreaterThan(35_000);

    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), offer);
    // Escribir la oferta no analiza nada por sí solo.
    expect(screen.queryByRole('header', { name: 'Resultados del análisis' })).not.toBeOnTheScreen();

    await user.press(analyzeButton());
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (1)' })).toBeOnTheScreen();
    // De vuelta en Preparar, la oferta sigue entera.
    await editInputs(user);
    expect(screen.getByLabelText('Texto de la oferta').props.value).toBe(offer);
  });

  it('keeps the results current when the editor is expanded or reduced', async () => {
    const user = await renderScreen();
    await pasteCv(user);
    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Requisitos\n- Experiencia con Python.',
    );
    await user.press(analyzeButton());
    await editInputs(user);

    await user.press(screen.getByRole('button', { name: 'Ampliar el editor' }));
    await user.press(screen.getByRole('button', { name: 'Reducir el editor' }));

    expect(
      screen.queryByText(/Has cambiado el texto desde el último análisis/),
    ).not.toBeOnTheScreen();
    // Los resultados siguen siendo los del texto actual: se pueden volver a ver sin analizar.
    await user.press(screen.getByRole('button', { name: 'Ver resultados' }));
    expect(screen.getByRole('header', { name: 'Resultados del análisis' })).toBeOnTheScreen();
    expect(screen.queryByText(/Has cambiado el CV o la oferta/)).not.toBeOnTheScreen();
  });

  it('marks the results as outdated after editing the offer in the expanded editor', async () => {
    const user = await renderScreen();
    await pasteCv(user);
    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Requisitos\n- Experiencia con Python.',
    );
    await user.press(analyzeButton());
    await editInputs(user);

    await user.press(screen.getByRole('button', { name: 'Ampliar el editor' }));
    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Requisitos\n- Experiencia con Python.\n- Inglés B2.',
    );

    expect(screen.getByText(/Has cambiado el texto desde el último análisis/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reducir el editor' })).toBeOnTheScreen();
  });

  it('keeps the offer when the CV mode changes', async () => {
    const user = await renderScreen();
    await fireEvent.changeText(
      screen.getByLabelText('Texto de la oferta'),
      'Requisitos\n- Inglés B2.',
    );

    await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
    await user.press(screen.getByRole('radio', { name: 'Archivo' }));

    expect(screen.getByLabelText('Texto de la oferta').props.value).toBe(
      'Requisitos\n- Inglés B2.',
    );
    expect(screen.getByText('Lista para analizar · 23 caracteres')).toBeOnTheScreen();
  });

  it('asks for the offer next to its field and clears the error once it has text', async () => {
    const user = await renderScreen();
    await pasteCv(user);

    await user.press(analyzeButton());
    expect(screen.getByText('Pega el texto de la oferta para analizarla.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Texto de la oferta').props['aria-invalid']).toBe(true);

    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), 'Requisitos');
    expect(screen.queryByText('Pega el texto de la oferta para analizarla.')).not.toBeOnTheScreen();
  });
});
