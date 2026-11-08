import { render, renderHook, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { navigationThemes, palettes } from '@/shared/theme';

import { SafeArea } from '../jest/safe-area';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

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
    expect(screen.getByText('JobRadar ATS')).toHaveStyle({
      color: palette.text,
    });
    const message = screen.getByText(
      'Compara tu CV con una oferta, requisito a requisito, y descubre qué pruebas le faltan.',
    );
    expect(message).toHaveStyle({ color: palettes.dark.textSecondary });
    expect(message.parent?.parent).toHaveStyle({
      backgroundColor: scheme === 'dark' ? palette.accentSubtle : palettes.dark.surface,
      borderColor: palettes.dark.border,
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
