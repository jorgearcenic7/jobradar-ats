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
      // Solo borde, sin sombra: las sombras quedan para lo que debe destacar.
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}
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
