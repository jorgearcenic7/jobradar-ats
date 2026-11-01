import { render, renderHook, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { navigationThemes, palettes } from '@/shared/theme';

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
    await render(<HomeScreen />);

    expect(screen.root).toHaveStyle({ backgroundColor: palette.background });
    expect(screen.getByRole('header', { name: 'JobRadar ATS' })).toHaveStyle({
      color: palette.text,
    });
    expect(screen.getByText('Aplicación en construcción.')).toHaveStyle({
      color: palette.textSecondary,
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
