import { act, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import { analysisRoutes as routes } from '../jest/render-analysis';

describe('Home navigation to the analysis', () => {
  it('opens the analysis from the home screen and goes back to it', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    const user = userEvent.setup();
    expect(screen.getByRole('link', { name: 'Inicio' }).props['aria-current']).toBe('page');
    expect(screen.getAllByRole('link')).toHaveLength(2);

    await user.press(screen.getByRole('button', { name: 'Analizar mi CV' }));
    expect(screen).toHavePathname('/analisis');
    expect(screen.getByRole('link', { name: 'Analizar' }).props['aria-current']).toBe('page');
    expect(screen.getByRole('header', { name: 'Analizar CV y oferta' })).toBeOnTheScreen();

    await user.press(screen.getByRole('link', { name: 'Volver al inicio' }));
    expect(screen).toHavePathname('/');
  });

  it('goes to the home screen from an analysis opened directly', async () => {
    await renderRouter(routes, { initialUrl: '/analisis' });
    const user = userEvent.setup();

    await user.press(screen.getByRole('link', { name: 'Volver al inicio' }));
    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: 'Comprueba qué respalda tu CV' })).toBeOnTheScreen();
  });

  it.each(['prepare-link', 'results-link', 'prepare-back'] as const)(
    'protects a populated session, permits cancellation and discards it only on confirmed exit (%s)',
    async (scenario) => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      try {
        await renderRouter(routes, { initialUrl: '/' });
        const user = userEvent.setup();
        await user.press(screen.getByRole('link', { name: 'Analizar' }));
        await user.press(screen.getByRole('button', { name: 'Cargar ejemplo ficticio' }));
        if (scenario === 'results-link') {
          await user.press(screen.getByRole('button', { name: 'Analizar' }));
        }
        const originalPath = scenario === 'results-link' ? '/analisis/resultados' : '/analisis';
        const leave = () =>
          scenario === 'prepare-back'
            ? act(() => router.back())
            : user.press(screen.getByRole('link', { name: 'Volver al inicio' }));
        await leave();
        expect(alert).toHaveBeenCalledTimes(1);
        expect(alert.mock.calls[0][1]).toMatch(/se perderán el CV, la oferta y los resultados/);
        expect(screen).toHavePathname(originalPath);
        // Cancelar deja la navegación bloqueada y los datos disponibles.
        await act(() => alert.mock.calls[0][2]?.[0].onPress?.());
        if (scenario !== 'results-link') {
          expect(screen.getByLabelText('Texto de la oferta').props.value.length).toBeGreaterThan(0);
        } else {
          expect(screen.getByRole('header', { name: 'Requisitos de la oferta' })).toBeOnTheScreen();
        }
        await leave();
        await act(() => alert.mock.calls[1][2]?.[1].onPress?.());
        expect(screen).toHavePathname('/');
        await user.press(screen.getByRole('link', { name: 'Analizar' }));
        expect(screen.getByLabelText('Texto de la oferta').props.value).toBe('');
        expect(screen.queryByRole('button', { name: 'Ver resultados' })).not.toBeOnTheScreen();
      } finally {
        alert.mockRestore();
      }
    },
  );
});
