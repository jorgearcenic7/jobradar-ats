import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '@/app/index';

// Test harness only: in the app, Expo Router renders the safe area provider.
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
