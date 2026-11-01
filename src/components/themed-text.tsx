import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { typography } from '@/shared/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const color = theme[themeColor ?? (type === 'linkPrimary' ? 'accentText' : 'text')];

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

// Legacy variants mapped onto the shared type scale until this component moves to `src/shared/ui/`.
const styles = StyleSheet.create({
  small: typography.callout,
  smallBold: { ...typography.callout, fontWeight: 600 },
  default: typography.body,
  title: typography.display,
  subtitle: typography.title,
  link: typography.callout,
  linkPrimary: typography.callout,
  code: { ...typography.footnote, fontFamily: Fonts.mono },
});
