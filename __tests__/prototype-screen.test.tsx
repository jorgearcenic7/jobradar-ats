import { render, screen } from '@testing-library/react-native';

import { PrototypeScreen } from '@/features/prototype/presentation/prototype-screen';

import { SafeArea } from '../jest/safe-area';

// Jest se ejecuta como iOS: el prototipo inmersivo es solo web y aquí se explica sin romper nada.
describe('PrototypeScreen on native', () => {
  it('says the prototype is web only and offers a way back', async () => {
    await render(<PrototypeScreen />, { wrapper: SafeArea });

    expect(screen.getByRole('header', { name: 'Prototipo de dirección visual' })).toBeOnTheScreen();
    expect(screen.getByText(/solo se puede ver en la versión web/)).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeOnTheScreen();
  });
});
