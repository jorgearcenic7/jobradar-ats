import type { TextStyle } from 'react-native';

/**
 * Type scale, set in Inter when it has loaded. Text scales with the user's font size setting: no
 * step caps it. Letter spacing is in pixels, as React Native requires.
 */
export const typography = {
  // Titular de Inicio en iOS y Android; en web lo amplía `clamp()` hasta 68 px (ver Inicio).
  display: { fontSize: 40, lineHeight: 42, fontWeight: 700, letterSpacing: -1.4 },
  // Títulos de sección de Inicio.
  section: { fontSize: 36, lineHeight: 40, fontWeight: 700, letterSpacing: -0.9 },
  metric: { fontSize: 40, lineHeight: 44, fontWeight: 700, letterSpacing: -1 },
  // Título de pantalla, como «Analizar CV y oferta».
  title: { fontSize: 32, lineHeight: 38, fontWeight: 700, letterSpacing: -0.8 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: 600, letterSpacing: -0.2 },
  // Título de tarjeta.
  headline: { fontSize: 17, lineHeight: 24, fontWeight: 600 },
  body: { fontSize: 16, lineHeight: 25, fontWeight: 400 },
  callout: { fontSize: 15, lineHeight: 23, fontWeight: 400 },
  // Metadatos y ayudas.
  footnote: { fontSize: 13, lineHeight: 20, fontWeight: 400 },
  // El tamaño mínimo de la interfaz.
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
} as const satisfies Record<string, TextStyle>;

export type TypographyStep = keyof typeof typography;
