import { act, cleanup, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { renderAnalysis } from '../jest/render-analysis';

// Recorrido entre Preparar (`/analisis`) y Resultados (`/analisis/resultados`) con la sesión
// compartida del analizador, como en la web, donde se pueden elegir archivos.
jest.mock('@/features/cv-import/infrastructure/pick-cv-file', () => ({
  canPickCvFile: true,
  pickCvFile: jest.fn(),
}));

const cv = 'EXPERIENCIA\n- Construí una herramienta ficticia con Python para el equipo.';
const offer = 'Requisitos\n- Experiencia con Python.\n- Inglés B2.';

type User = ReturnType<typeof userEvent.setup>;

async function start(initialUrl?: string) {
  await renderAnalysis(initialUrl);
  return userEvent.setup();
}

async function fillAndAnalyze(user: User) {
  await user.press(screen.getByRole('radio', { name: 'Pegar texto' }));
  await fireEvent.changeText(screen.getByLabelText('Texto del CV'), cv);
  await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), offer);
  await user.press(screen.getByRole('button', { name: 'Analizar' }));
}

const resultsTitle = () => screen.queryByRole('header', { name: 'Resultados del análisis' });
const editInputs = (user: User) =>
  user.press(screen.getByRole('button', { name: 'Editar CV u oferta' }));

describe('Analysis flow between Prepare and Results', () => {
  it('opens Results after a successful analysis, with its title first', async () => {
    const user = await start();
    await fillAndAnalyze(user);

    expect(screen).toHavePathname('/analisis/resultados');
    // Ningún dato del CV ni de la oferta viaja en la dirección.
    expect(screen).toHavePathnameWithParams('/analisis/resultados');
    const headers = screen.getAllByRole('header');
    expect(headers[0]).toBe(resultsTitle());
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (1)' })).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Analizar' }).props['aria-current']).toBe('page');
    expect(screen.getByRole('link', { name: 'Acceder' })).toBeOnTheScreen();
    expect(screen.queryByRole('link', { name: 'Resultados' })).not.toBeOnTheScreen();
  });

  it('stays on Prepare with the errors when the analysis cannot start', async () => {
    const user = await start();

    await user.press(screen.getByRole('button', { name: 'Analizar' }));

    expect(screen).toHavePathname('/analisis');
    expect(resultsTitle()).not.toBeOnTheScreen();
    expect(screen.getByText('Pega el texto de la oferta para analizarla.')).toBeOnTheScreen();
  });

  it.each(['context-action', 'main-navigation'] as const)(
    'goes back to Prepare keeping the mode, the CV and the offer (%s)',
    async (source) => {
      const user = await start();
      await fillAndAnalyze(user);

      if (source === 'context-action') await editInputs(user);
      else await user.press(screen.getByRole('link', { name: 'Analizar' }));

      expect(screen).toHavePathname('/analisis');
      expect(screen.getByRole('radio', { name: 'Pegar texto', checked: true })).toBeOnTheScreen();
      expect(screen.getByLabelText('Texto del CV').props.value).toBe(cv);
      expect(screen.getByLabelText('Texto de la oferta').props.value).toBe(offer);
      expect(screen.getByText(/^Último análisis: /)).toBeOnTheScreen();
    },
  );

  it('reopens the last results without analyzing again while they are current', async () => {
    const user = await start();
    await fillAndAnalyze(user);
    await editInputs(user);

    await user.press(screen.getByRole('button', { name: 'Ver resultados' }));

    expect(screen).toHavePathname('/analisis/resultados');
    expect(
      screen.queryByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).not.toBeOnTheScreen();
  });

  it('analyzes again after an edit and compares with the previous analysis', async () => {
    const user = await start();
    await fillAndAnalyze(user);
    await editInputs(user);

    await fireEvent.changeText(
      screen.getByLabelText('Texto del CV'),
      `${cv}\n\nIDIOMAS\nInglés: B2`,
    );
    expect(screen.getByText(/Has cambiado el texto desde el último análisis/)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ver resultados' })).not.toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Analizar' }));

    expect(screen).toHavePathname('/analisis/resultados');
    expect(
      screen.getByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).toBeOnTheScreen();
  });

  it('marks outdated results on Results and analyzes them again from there', async () => {
    const user = await start();
    await fillAndAnalyze(user);
    await editInputs(user);
    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), `${offer}\n- Docker.`);

    // Como Adelante en el navegador: vuelve a Resultados sin analizar.
    await act(() => router.push('/analisis/resultados'));
    expect(screen.getByText(/^Has cambiado el CV o la oferta/)).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Volver a analizar' }));
    expect(screen).toHavePathname('/analisis/resultados');
    expect(screen.queryByText(/^Has cambiado el CV o la oferta/)).not.toBeOnTheScreen();
    // El nuevo análisis incluye Docker, que el CV no acredita, además del inglés.
    expect(screen.getByRole('header', { name: 'No acreditados (2)' })).toBeOnTheScreen();
  });

  it('hides the results of another CV and returns to Prepare if it cannot be analyzed', async () => {
    const user = await start();
    await fillAndAnalyze(user);
    await editInputs(user);
    // La modalidad «Archivo», sin documento, es otro CV y todavía no se puede analizar.
    await user.press(screen.getByRole('radio', { name: 'Archivo' }));
    await act(() => router.push('/analisis/resultados'));

    expect(screen.getByRole('header', { name: 'Has cambiado de CV' })).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Volver a analizar' }));

    expect(screen).toHavePathname('/analisis');
    expect(screen.getByText('Selecciona tu CV o pega su texto para analizarlo.')).toBeOnTheScreen();
  });

  it('goes back and forth with the history keeping the data', async () => {
    const user = await start();
    await fillAndAnalyze(user);

    await act(() => router.back());
    expect(screen).toHavePathname('/analisis');
    expect(screen.getByLabelText('Texto de la oferta').props.value).toBe(offer);

    await act(() => router.push('/analisis/resultados'));
    expect(resultsTitle()).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Respaldados por tu CV (1)' })).toBeOnTheScreen();
  });

  it('shows an empty state with a working action when Results opens without an analysis', async () => {
    const user = await start('/analisis/resultados');

    expect(resultsTitle()).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Todavía no hay resultados' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Editar CV u oferta' })).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Preparar análisis' }));
    expect(screen).toHavePathname('/analisis');
    expect(screen.getByRole('header', { name: 'Tu CV' })).toBeOnTheScreen();
  });

  it('does not recover anything from a previous session after a reload', async () => {
    const user = await start();
    await fillAndAnalyze(user);
    expect(resultsTitle()).toBeOnTheScreen();

    // Una recarga vuelve a montar la app desde cero.
    await cleanup();
    await start('/analisis/resultados');
    expect(screen.getByRole('header', { name: 'Todavía no hay resultados' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Preparar análisis' }));
    expect(screen.getByLabelText('Texto de la oferta').props.value).toBe('');
  });

  it('makes the Results title the focus target for the web, outside the tab order', async () => {
    const user = await start();
    await fillAndAnalyze(user);

    const target = resultsTitle()!.parent!;
    expect(target.props.tabIndex).toBe(-1);
  });
});
