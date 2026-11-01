import { render, renderHook, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '@/app/index';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { navigationThemes, palettes } from '@/shared/theme';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

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

describe.each(['light', 'dark'] as const)('%s scheme', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue(scheme);
  });

  it('exposes the matching palette through useTheme', async () => {
    const { result } = await renderHook(() => useTheme());

    expect(result.current).toBe(palette);
  });

  it('renders the home screen with the palette colors', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });

    // `screen.root` is the harness provider; the screen's own root is its first child.
    expect(screen.root?.children[0]).toHaveStyle({ backgroundColor: palette.background });
    expect(screen.getByRole('header', { name: 'JobRadar ATS' })).toHaveStyle({
      color: palette.text,
    });
    const message = screen.getByText('Aplicación en construcción.');
    expect(message).toHaveStyle({ color: palette.textSecondary });
    expect(message.parent).toHaveStyle({
      backgroundColor: palette.surface,
      borderColor: palette.border,
    });
  });

  it('derives the navigation theme from the palette', () => {
    expect(navigationThemes[scheme]).toMatchObject({
      dark: scheme === 'dark',
      colors: {
        primary: palette.accentText,
        background: palette.background,
        card: palette.surface,
        text: palette.text,
        border: palette.border,
        notification: palette.danger,
      },
    });
  });
});

it('falls back to the light palette when the scheme is unknown', async () => {
  mockedUseColorScheme.mockReturnValue(null);

  const { result } = await renderHook(() => useTheme());

  expect(result.current).toBe(palettes.light);
});
