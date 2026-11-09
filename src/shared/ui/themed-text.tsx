import { StyleSheet, Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { typography, useAppFont, type ThemeColor, type TypographyStep } from '@/shared/theme';

export type ThemedTextProps = TextProps & {
  /** Step of the shared type scale. */
  step?: TypographyStep;
  /** Theme color of the text. */
  color?: ThemeColor;
};

/** Text on the shared type scale, set in Inter when it has loaded. */
export function ThemedText({ step = 'body', color = 'text', style, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const font = useAppFont();
  // El peso puede venir del paso o del `style` de quien lo usa; el archivo de Inter sigue al final.
  const weight = StyleSheet.flatten(style)?.fontWeight ?? typography[step].fontWeight;

  return (
    <Text style={[typography[step], { color: theme[color] }, style, font?.(weight)]} {...rest} />
  );
}

/** A section heading. `level` reaches the web as `<h2>`, `<h3>`… */
export function Heading({ level, ...rest }: ThemedTextProps & { level: 2 | 3 }) {
  return (
    <ThemedText
      step={level === 2 ? 'heading' : 'headline'}
      accessibilityRole="header"
      aria-level={level}
      {...rest}
    />
  );
}
