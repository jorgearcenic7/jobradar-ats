import { fireEvent, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';
import { palettes } from '@/shared/theme';

import { renderAnalysis } from '../jest/render-analysis';

// Jest resolves the iOS files, so nothing is mocked here: this is the screen of the native
// app, where importing CV files is not implemented yet.
describe('CV match screen in the native app', () => {
  it('starts with the pasted CV and says that importing files is still pending', async () => {
    await renderAnalysis();

    expect(screen.getByLabelText('Texto del CV')).toBeOnTheScreen();
    expect(
      screen.getByText(/Importar un PDF o un Word todavía no está disponible en la app/),
    ).toBeOnTheScreen();
    // Es información, no un error: se muestra como aviso informativo.
    const root = screen.root!;
    const infoNotice = [root, ...root.queryAll(() => true)].find(
      (node) =>
        StyleSheet.flatten(node.props.style)?.backgroundColor === palettes.light.accentSubtle &&
        node.queryAll((child) => /todavía no está disponible/.test(String(child.props.children)))
          .length > 0,
    );
    expect(infoNotice).toBeDefined();
    // Sin importación nativa no se ofrece la modalidad «Archivo» ni el botón para elegir uno.
    expect(screen.queryByRole('radiogroup')).not.toBeOnTheScreen();
    expect(screen.queryByRole('radio', { name: 'Archivo' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Seleccionar PDF o Word' })).not.toBeOnTheScreen();
  });

  it('analyzes a pasted CV', async () => {
    await renderAnalysis();
    const user = userEvent.setup();

    await fireEvent.changeText(screen.getByLabelText('Texto del CV'), sampleCv);
    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), sampleOffer);
    await user.press(screen.getByRole('button', { name: 'Analizar' }));

    expect(screen.getByRole('header', { name: 'Resultados del análisis' })).toBeOnTheScreen();
  });

  it('offers the same offer section, with an editor that expands within the window', async () => {
    await renderAnalysis();
    const user = userEvent.setup();

    expect(screen.getByRole('header', { name: 'La oferta' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Texto de la oferta'), sampleOffer);
    const regular = StyleSheet.flatten(screen.getByLabelText('Texto de la oferta').props.style);

    await user.press(screen.getByRole('button', { name: 'Ampliar el editor' }));
    const expanded = StyleSheet.flatten(screen.getByLabelText('Texto de la oferta').props.style);

    // En nativo la altura ampliada se limita a una parte de la ventana, nunca al texto.
    expect(expanded.maxHeight).toBeGreaterThan(regular.maxHeight as number);
    expect(screen.getByLabelText('Texto de la oferta').props.value).toBe(sampleOffer);
  });
});
