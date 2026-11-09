/**
 * Semantic color tokens: the single source of truth for every color in the app.
 * Contrast ratios are enforced by `__tests__/theme-contrast.test.ts`.
 */

const light = {
  background: '#F7F7FC',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSelected: '#ECE8FF',
  text: '#15152D',
  textSecondary: '#55556F',
  textTertiary: '#6A6A84',
  // Decorative separators only; field outlines use `borderStrong`.
  border: '#DCDCEA',
  borderStrong: '#8787A1',
  primary: '#7055F5',
  primaryPressed: '#5B40E0',
  onPrimary: '#FFFFFF',
  accentText: '#5B40E0',
  accentSubtle: '#EEEAFE',
  onAccentSubtle: '#4A30C2',
  success: '#16784A',
  successSubtle: '#E3F4EB',
  warning: '#8A5200',
  warningSubtle: '#FFF1DA',
  danger: '#B42A40',
  dangerSubtle: '#FDE8EB',
  neutral: '#55556F',
  neutralSubtle: '#EDEDF4',
  focusRing: '#7055F5',
} as const;

export type ThemeColor = keyof typeof light;
export type Palette = Record<ThemeColor, string>;

const dark: Palette = {
  background: '#0F0F22',
  surface: '#1A1A35',
  surfaceRaised: '#24244A',
  surfaceSelected: '#2A2552',
  text: '#F3F2FF',
  textSecondary: '#B3B1D3',
  textTertiary: '#8E8CB0',
  border: '#34345C',
  borderStrong: '#6E6C96',
  // Lavender is the action color in dark mode, with navy text on top.
  primary: '#A896FF',
  primaryPressed: '#9580FF',
  onPrimary: '#15152D',
  accentText: '#A896FF',
  accentSubtle: '#2A2552',
  onAccentSubtle: '#CFC6FF',
  success: '#5FD79A',
  successSubtle: '#12301F',
  warning: '#FFBE5C',
  warningSubtle: '#352510',
  danger: '#FF8A99',
  dangerSubtle: '#3A1820',
  neutral: '#B3B1D3',
  neutralSubtle: '#26264A',
  focusRing: '#A896FF',
};

export const palettes: Record<'light' | 'dark', Palette> = { light, dark };
