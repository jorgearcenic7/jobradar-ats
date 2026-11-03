import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import {
  displaySteps,
  typography,
  useDisplayFont,
  type ThemeColor,
  type TypographyStep,
} from '@/shared/theme';

export type ThemedTextProps = TextProps & {
  /** Step of the shared type scale. */
  step?: TypographyStep;
  /** Theme color of the text. */
  color?: ThemeColor;
};

/** Text on the shared type scale, with Sora on display steps when it has loaded. */
export function ThemedText({ step = 'body', color = 'text', style, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const displayFont = useDisplayFont();
  const fontFamily = displaySteps.includes(step) ? displayFont : undefined;

  return (
    <Text
      style={[typography[step], { color: theme[color] }, fontFamily && { fontFamily }, style]}
      {...rest}
    />
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
