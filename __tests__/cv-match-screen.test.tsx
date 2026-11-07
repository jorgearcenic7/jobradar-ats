import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import AnalysisRoute from '@/app/analisis';
import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';
import { palettes } from '@/shared/theme';

import { SafeArea } from '../jest/safe-area';

// The screen as on web, where CV files can be picked. The native app has its own test.
jest.mock('@/features/cv-import/infrastructure/pick-cv-file', () => ({
  canPickCvFile: true,
  pickCvFile: jest.fn(),
}));

async function renderScreen() {
  await render(<AnalysisRoute />, { wrapper: SafeArea });
  return userEvent.setup();
}

const analyzeButton = () => screen.getByRole('button', { name: 'Analizar' });

describe('CV match screen', () => {
  it('asks for a CV and an offer, and shows no results without them', async () => {
    const user = await renderScreen();

    await user.press(analyzeButton());

    expect(screen.getByText('Selecciona tu CV o pega su texto para analizarlo.')).toBeOnTheScreen();
    expect(screen.getByText('Pega el texto de la oferta para analizarla.')).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Resultados' })).not.toBeOnTheScreen();
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
    await user.press(screen.getByRole('button', { name: 'Pegar texto en su lugar' }));
    expect(screen.getByText('Pega el texto de tu CV para analizarlo.')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Tu CV'), 'Texto de un CV ficticio');

    expect(screen.queryByText('Pega el texto de tu CV para analizarlo.')).not.toBeOnTheScreen();
    expect(screen.getByText('Pega el texto de la oferta para analizarla.')).toBeOnTheScreen();
  });

  it('analyzes the fictional example and explains the results', async () => {
    const user = await renderScreen();
    const expected = analyzeMatch(sampleCv, sampleOffer);

    await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
    await user.press(analyzeButton());

    expect(screen.getByRole('header', { name: 'Resultados' })).toBeOnTheScreen();
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
    expect(screen.getByRole('header', { name: 'Recomendaciones' })).toBeOnTheScreen();
  });

  it('does not compare analyses of different offers', async () => {
    const user = await renderScreen();
    await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
    await user.press(analyzeButton());

    await fireEvent.changeText(screen.getByLabelText('Oferta de empleo'), 'Requisitos\n- Python.');
    await user.press(analyzeButton());

    expect(
      screen.queryByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).not.toBeOnTheScreen();
    expect(screen.getByText(/La oferta ha cambiado/)).toBeOnTheScreen();
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

    await fireEvent.changeText(
      screen.getByLabelText('Tu CV'),
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
    expect(
      screen.getByText('3 años de experiencia con React: sin evidencia suficiente → respaldado'),
    ).toBeOnTheScreen();
  });
});
