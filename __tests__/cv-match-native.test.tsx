import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import AnalysisRoute from '@/app/analisis';
import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';

import { SafeArea } from '../jest/safe-area';

// Jest resolves the iOS files, so nothing is mocked here: this is the screen of the native
// app, where importing CV files is not implemented yet.
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
