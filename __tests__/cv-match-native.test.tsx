import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnalysisRoute from '@/app/analisis';
import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';

// Jest resolves the iOS files, so nothing is mocked here: this is the screen of the native
// app, where importing CV files is not implemented yet.
function SafeArea({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}>
      {children}
    </SafeAreaProvider>
  );
}

describe('CV match screen in the native app', () => {
  it('starts with the pasted CV and says that importing files is still pending', async () => {
    await render(<AnalysisRoute />, { wrapper: SafeArea });

    expect(screen.getByLabelText('Tu CV')).toBeOnTheScreen();
    expect(
      screen.getByText(/Importar un PDF o un Word todavía no está disponible en la app/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Seleccionar CV' })).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'Seleccionar un archivo en su lugar' }),
    ).not.toBeOnTheScreen();
  });

  it('analyzes a pasted CV', async () => {
    await render(<AnalysisRoute />, { wrapper: SafeArea });
    const user = userEvent.setup();

    await fireEvent.changeText(screen.getByLabelText('Tu CV'), sampleCv);
    await fireEvent.changeText(screen.getByLabelText('Oferta de empleo'), sampleOffer);
    await user.press(screen.getByRole('button', { name: 'Analizar' }));

    expect(screen.getByRole('header', { name: 'Resultados' })).toBeOnTheScreen();
  });
});
