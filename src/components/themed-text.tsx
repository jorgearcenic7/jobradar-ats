import { Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displaySteps, typography, useDisplayFont, type TypographyStep } from '@/shared/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

type Variant = NonNullable<ThemedTextProps['type']>;

// Legacy variants mapped onto the shared type scale until this component moves to `src/shared/ui/`.
const steps: Record<Variant, TypographyStep> = {
  default: 'body',
  title: 'display',
  subtitle: 'title',
  small: 'callout',
  smallBold: 'callout',
  link: 'callout',
  linkPrimary: 'callout',
  code: 'footnote',
};

const overrides: Partial<Record<Variant, TextStyle>> = {
  smallBold: { fontWeight: 600 },
  code: { fontFamily: Fonts.mono },
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const displayFont = useDisplayFont();
  const color = theme[themeColor ?? (type === 'linkPrimary' ? 'accentText' : 'text')];
  const step = steps[type];
  const fontFamily = displaySteps.includes(step) ? displayFont : undefined;

  return (
    <Text
      style={[{ color }, typography[step], overrides[type], fontFamily && { fontFamily }, style]}
      {...rest}
    />
  );
}
