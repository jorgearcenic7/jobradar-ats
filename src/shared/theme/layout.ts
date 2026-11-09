/** Spacing on a 4-point grid: `space[n]` is `n * 4`. */
export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

/** Radii grow with the size of the element, so hierarchy stays visible. */
export const radius = {
  xs: 6, // chips de estado y etiquetas
  sm: 8, // navegación, segmentos y logo
  icon: 10, // cuadrados de icono y botones pequeños
  md: 12, // botones y campos
  lg: 16, // tarjetas
  xl: 20, // tarjeta de ejemplo
  xxl: 24, // bloque de llamada a la acción
  full: 9999, // pills
} as const;

/** Icon sizes, shared by standalone icons and icons inside other components. */
export const iconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const layout = {
  screenPadding: space[6],
  maxContentWidth: 1120,
  /** Minimum height and width of anything tappable (Apple HIG). */
  minTouchTarget: 44,
} as const;
