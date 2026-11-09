import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';

import { palettes, type Palette } from './colors';

function toNavigationTheme(base: Theme, palette: Palette): Theme {
  return {
    ...base,
    colors: {
      ...base.colors,
      // Navigation tints text (back buttons, active tabs), so it uses the text-safe accent.
      primary: palette.accentText,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.danger,
    },
  };
}

export const navigationThemes: Record<'light' | 'dark', Theme> = {
  light: toNavigationTheme(DefaultTheme, palettes.light),
  dark: toNavigationTheme(DarkTheme, palettes.dark),
};
