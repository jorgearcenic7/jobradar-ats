import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

import { SafeArea } from '../jest/safe-area';

describe('HomeScreen', () => {
  it('renders the app title as a header', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });

    expect(screen.getByRole('header', { name: 'JobRadar ATS' })).toBeOnTheScreen();
  });

  it('renders the under-construction message', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });

    expect(screen.getByText('Aplicación en construcción.')).toBeOnTheScreen();
  });

  it('keeps the screen title outside the card', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });

    const card = screen.getByText('Aplicación en construcción.').parent!;
    const title = screen.getByRole('header', { name: 'JobRadar ATS' });

    expect(card).not.toContainElement(title);
    expect(card.parent).toBe(title.parent);
  });
});
