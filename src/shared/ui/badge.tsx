/*
Etiqueta breve de estado: un icono y un texto sobre un fondo suave del mismo tono.

El tono decide también el icono, de modo que el estado nunca se comunica solo con el color.
El componente no conoce los estados de ninguna funcionalidad: cada módulo traduce los suyos a
uno de estos tonos (por ejemplo, el analizador en `status-badge.tsx`).
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space, type ThemeColor } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Icono y colores de cada tono. Los pares de color tienen el contraste comprobado por tests. */
export const badgeTones: Record<
  BadgeTone,
  { icon: IconName; color: ThemeColor; background: ThemeColor }
> = {
  success: { icon: 'checkCircle', color: 'success', background: 'successSubtle' },
  warning: { icon: 'warning', color: 'warning', background: 'warningSubtle' },
  danger: { icon: 'error', color: 'danger', background: 'dangerSubtle' },
  neutral: { icon: 'info', color: 'neutral', background: 'neutralSubtle' },
};

export type BadgeProps = {
  tone: BadgeTone;
  /** Texto visible, que es también lo que leen los lectores de pantalla. */
  label: string;
};

export function Badge({ tone, label }: BadgeProps) {
  const theme = useTheme();
  const { icon, color, background } = badgeTones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: theme[background] }]}>
      <Icon name={icon} size="sm" color={color} />
      <ThemedText step="footnote" color={color} style={styles.label}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    paddingVertical: space[1],
    paddingHorizontal: space[2],
    borderRadius: radius.full,
  },
  label: {
    fontWeight: 600,
    flexShrink: 1,
  },
});
