import { Platform, type TextStyle } from 'react-native';

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  // Font stacks are defined as CSS variables in `src/global.css`.
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Type scale. Every step uses the system font for now; the display steps
 * (`display` to `heading`) switch to Sora once its files are added.
 * Text scales with the user's font size setting: no step caps it.
 */
export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: 600 },
  metric: { fontSize: 40, lineHeight: 44, fontWeight: 600 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: 600 },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: 600 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  body: { fontSize: 17, lineHeight: 24, fontWeight: 400 },
  callout: { fontSize: 15, lineHeight: 22, fontWeight: 400 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
} as const satisfies Record<string, TextStyle>;
