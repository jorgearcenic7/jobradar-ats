import { screen, userEvent } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';

import { analysisRoutes as routes } from '../jest/render-analysis';

describe('Provisional navigation to the analysis', () => {
  it('opens the analysis from the home screen and goes back to it', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Analizar CV y oferta' }));
    expect(screen).toHavePathname('/analisis');
    expect(screen.getByRole('header', { name: 'Analizar CV y oferta' })).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Volver al inicio' }));
    expect(screen).toHavePathname('/');
  });

  it('goes to the home screen from an analysis opened directly', async () => {
    await renderRouter(routes, { initialUrl: '/analisis' });
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Volver al inicio' }));
    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: 'JobRadar ATS' })).toBeOnTheScreen();
  });
});
