/**
 * Semantic color tokens: the single source of truth for every color in the app.
 * Contrast ratios are enforced by `__tests__/theme-contrast.test.ts`.
 */

/*
Identidad v1.1: el azul es el color de acción (botones, foco, selección y enlaces, incluido
`accentText`) y el violeta del logo es el secundario (`accentSubtle` y `onAccentSubtle`: iconos
destacados, pasos numerados y avisos informativos). Las superficies son blancas sobre un fondo casi
blanco; el tema oscuro parte del marino del logo.
*/
const light = {
  background: '#F8F9FC',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSelected: '#EAF0FF',
  text: '#11142B',
  textSecondary: '#4A5068',
  textTertiary: '#5E6480',
  // Decorative separators only; field outlines use `borderStrong`.
  border: '#DFE2EC',
  borderStrong: '#868CA5',
  primary: '#2563EB',
  primaryPressed: '#1D4ED8',
  onPrimary: '#FFFFFF',
  accentText: '#1D4ED8',
  accentSubtle: '#F1EDFF',
  onAccentSubtle: '#5A3ED6',
  success: '#16784A',
  successSubtle: '#E3F4EB',
  warning: '#8A5200',
  warningSubtle: '#FFF1DA',
  danger: '#B42A40',
  dangerSubtle: '#FDE8EB',
  neutral: '#4A5068',
  neutralSubtle: '#EEF0F5',
  focusRing: '#2563EB',
  // Sombra de las tarjetas: solo las separa del fondo, nunca es la única pista de un límite.
  shadow: 'rgba(17, 20, 43, 0.06)',
} as const;

export type ThemeColor = keyof typeof light;
export type Palette = Record<ThemeColor, string>;

const dark: Palette = {
  background: '#0B0D1A',
  surface: '#151830',
  surfaceRaised: '#1D2142',
  surfaceSelected: '#1B2A55',
  text: '#F2F4FF',
  textSecondary: '#AEB3D1',
  textTertiary: '#8E94B6',
  border: '#2A2F52',
  borderStrong: '#6B7199',
  // Un azul claro es el color de acción en oscuro, con texto marino encima.
  primary: '#7AA2FF',
  primaryPressed: '#9DBBFF',
  onPrimary: '#0B0D1A',
  accentText: '#8FB0FF',
  accentSubtle: '#252050',
  onAccentSubtle: '#CBBFFF',
  success: '#5FD79A',
  successSubtle: '#12301F',
  warning: '#FFBE5C',
  warningSubtle: '#352510',
  danger: '#FF8A99',
  dangerSubtle: '#3A1820',
  neutral: '#AEB3D1',
  neutralSubtle: '#22274A',
  focusRing: '#7AA2FF',
  // En oscuro las superficies ya se distinguen por su tono; una sombra no se vería.
  shadow: 'transparent',
};

export const palettes: Record<'light' | 'dark', Palette> = { light, dark };
