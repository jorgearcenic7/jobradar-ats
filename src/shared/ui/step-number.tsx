/*
Número de un paso o de una prioridad en una secuencia real: los pasos de Inicio, las secciones de
Preparar o el orden de las recomendaciones. Solo se usa cuando el contenido es de verdad una
secuencia.

Es decorativo: la lista o el encabezado que lo acompaña ya transmiten el orden, así que se oculta
a los lectores de pantalla para que el número no se lea dos veces.
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export function StepNumber({ value }: { value: number }) {
  const theme = useTheme();

  return (
    <View
      style={[styles.circle, { backgroundColor: theme.accentSubtle }]}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <ThemedText step="caption" color="onAccentSubtle" style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  // Crece con el texto ampliado en lugar de recortar el número.
  circle: {
    minWidth: space[6],
    minHeight: space[6],
    padding: space[1],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontWeight: 700,
    fontVariant: ['tabular-nums'],
  },
});
