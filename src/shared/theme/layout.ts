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
  sm: 8, // inner elements
  md: 12, // buttons and fields
  lg: 20, // cards
  xl: 28, // sheets
  full: 9999, // pills
} as const;

export const layout = {
  screenPadding: space[5],
  maxContentWidth: 800,
} as const;
