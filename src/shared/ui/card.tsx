import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';

export type CardProps = ViewProps;

/**
 * Groups related content on a surface. It is not focusable and does not merge its children,
 * so screen readers still reach each child on its own.
 */
export function Card({ style, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          // Sombra corta y difusa: separa la tarjeta del fondo sin competir con el contenido.
          boxShadow: `0 1px 3px ${theme.shadow}`,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[2],
    padding: space[4],
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
});
