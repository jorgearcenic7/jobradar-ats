/**
 * Semantic color tokens: the single source of truth for every color in the app.
 * Contrast ratios are enforced by `__tests__/theme-contrast.test.ts`.
 */

/*
Identidad v1.1: superficies blancas sobre un fondo casi blanco, texto casi negro y un único acento
violeta (`primary`), el mismo del logo. Los estados del análisis tienen tres tonos: el fondo suave,
el texto que se lee sobre él y un color vivo (`*Dot`) solo para puntos y barras, nunca para texto.
El tema oscuro conserva la misma jerarquía con valores derivados.
*/
const light = {
  background: '#FAFAFB',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSelected: '#EFEDFF',
  text: '#15141A',
  textSecondary: '#47454F',
  textTertiary: '#5E5C6B',
  // Borde de las tarjetas y separadores decorativos; los controles usan `borderStrong`.
  border: '#E7E6EE',
  // Separadores internos de una tarjeta.
  divider: '#F0EFF5',
  headerBorder: '#ECEBF1',
  // Borde de los campos de texto: límite de un control, al menos 3:1 sobre su fondo (WCAG 1.4.11).
  inputBorder: '#8F8C9E',
  // La zona de subida es un botón con texto visible; su borde discontinuo es decorativo.
  dropzoneBorder: '#D6D3E3',
  dropzoneBackground: '#FCFCFE',
  borderStrong: '#86849A',
  secondaryBorder: '#E3E1EC',
  primary: '#5B4BE8',
  // Hover y pulsado de la acción principal.
  primaryPressed: '#4335C9',
  onPrimary: '#FFFFFF',
  accentText: '#4E3FD6',
  accentSubtle: '#EFEDFF',
  onAccentSubtle: '#4E3FD6',
  success: '#0F6B3E',
  successSubtle: '#E8F6EE',
  successDot: '#16A34A',
  warning: '#7A4F00',
  warningSubtle: '#FDF3DC',
  warningDot: '#F59E0B',
  danger: '#A3261B',
  dangerSubtle: '#FDECEA',
  dangerDot: '#DC2626',
  neutral: '#47454F',
  // Fondo de los grupos segmentados y del enlace activo de la navegación.
  neutralSubtle: '#F0EFF5',
  segmentActive: '#FFFFFF',
  focusRing: '#5B4BE8',
  // Halo del campo enfocado, por fuera de su borde de acento.
  focusHalo: 'rgba(91, 75, 232, 0.18)',
  headerBackground: 'rgba(255, 255, 255, 0.85)',
  // Botón oscuro de la cabecera; en el tema oscuro se invierte.
  darkButton: '#15141A',
  darkButtonPressed: '#2C2A35',
  onDarkButton: '#FFFFFF',
  // Bloque de llamada a la acción y su botón blanco.
  ctaBackground: '#15141A',
  ctaText: '#FFFFFF',
  ctaTextSecondary: '#B9B7C6',
  lightButton: '#FFFFFF',
  lightButtonPressed: '#ECEBF1',
  onLightButton: '#15141A',
  // Bloque visible solo en desarrollo.
  devBackground: '#FFFBF0',
  devBorder: '#E3D3A8',
  devText: '#6B4A00',
  devBadge: '#FDECC0',
  // Sombras: solo el botón principal, la tarjeta de ejemplo y el segmento activo.
  shadowPrimary: '0 1px 2px rgba(21, 20, 26, 0.16), 0 8px 24px rgba(91, 75, 232, 0.24)',
  shadowExample: '0 1px 2px rgba(21, 20, 26, 0.04), 0 24px 64px -24px rgba(21, 20, 26, 0.18)',
  shadowSegment: '0 1px 2px rgba(21, 20, 26, 0.08), 0 0 0 1px rgba(21, 20, 26, 0.04)',
} as const;

export type ThemeColor = keyof typeof light;
export type Palette = Record<ThemeColor, string>;

const dark: Palette = {
  background: '#0E0D14',
  surface: '#16151F',
  surfaceRaised: '#1D1C28',
  surfaceSelected: '#262147',
  text: '#F4F3FA',
  textSecondary: '#C4C2D0',
  textTertiary: '#A3A1B2',
  border: '#2A2836',
  divider: '#22212D',
  headerBorder: '#262532',
  inputBorder: '#6E6C85',
  dropzoneBorder: '#454357',
  dropzoneBackground: '#13121B',
  borderStrong: '#727089',
  secondaryBorder: '#33313F',
  // El violeta se mantiene con texto blanco; al pulsar se oscurece, como en el tema claro.
  primary: '#6C5CF0',
  primaryPressed: '#5B4BE8',
  onPrimary: '#FFFFFF',
  accentText: '#A99FFF',
  accentSubtle: '#262147',
  onAccentSubtle: '#C9C1FF',
  success: '#5FD39A',
  successSubtle: '#10291C',
  successDot: '#22C55E',
  warning: '#F5C163',
  warningSubtle: '#2E2410',
  warningDot: '#F59E0B',
  danger: '#FF8F84',
  dangerSubtle: '#33171A',
  dangerDot: '#EF4444',
  neutral: '#C4C2D0',
  neutralSubtle: '#22212D',
  segmentActive: '#38354C',
  focusRing: '#8B7FF5',
  focusHalo: 'rgba(139, 127, 245, 0.3)',
  headerBackground: 'rgba(14, 13, 20, 0.85)',
  darkButton: '#F4F3FA',
  darkButtonPressed: '#DCDAE8',
  onDarkButton: '#15141A',
  ctaBackground: '#1D1C28',
  ctaText: '#F4F3FA',
  ctaTextSecondary: '#B9B7C6',
  lightButton: '#FFFFFF',
  lightButtonPressed: '#ECEBF1',
  onLightButton: '#15141A',
  devBackground: '#211B0C',
  devBorder: '#5C4A1F',
  devText: '#F2D58E',
  devBadge: '#3A2E10',
  shadowPrimary: '0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(91, 75, 232, 0.28)',
  shadowExample: '0 1px 2px rgba(0, 0, 0, 0.3), 0 24px 64px -24px rgba(0, 0, 0, 0.6)',
  shadowSegment: '0 1px 2px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)',
};

export const palettes: Record<'light' | 'dark', Palette> = { light, dark };
