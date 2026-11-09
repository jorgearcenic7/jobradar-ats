import type { TextStyle } from 'react-native';

/**
 * Type scale. The steps in `displaySteps` are set in Sora (SemiBold 600, or Bold 700 for figures);
 * the rest use the system font. Text scales with the user's font size setting: no step caps it.
 */
export const typography = {
  // Sora es ancha: los pasos grandes se compactan un poco para que los titulares se lean más limpios.
  display: { fontSize: 34, lineHeight: 40, fontWeight: 600, letterSpacing: -0.6 },
  metric: { fontSize: 40, lineHeight: 44, fontWeight: 700, letterSpacing: -0.8 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: 600, letterSpacing: -0.4 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: 600, letterSpacing: -0.2 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: 400 },
  callout: { fontSize: 15, lineHeight: 22, fontWeight: 400 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
} as const satisfies Record<string, TextStyle>;

export type TypographyStep = keyof typeof typography;

/** Headline and figure steps, set in Sora when it is available. */
export const displaySteps: readonly TypographyStep[] = ['display', 'metric', 'title', 'heading'];
