/*
Estado sin contenido: ocupa el lugar de una lista o de una sección cuando no hay nada que mostrar
y explica por qué y qué puede hacer la persona.

Es un bloque centrado sin superficie propia, para que encaje tanto dentro de una `Card` como
directamente en la pantalla. El icono es decorativo, porque el título ya lo dice todo, y la
acción, si existe, debe ejecutar algo real de la pantalla: un estado vacío sin salida útil no
lleva botón.

No se anuncia como alerta: describe la situación de la pantalla, no un cambio que haya que
interrumpir para comunicar. El título es un encabezado, así que los lectores de pantalla lo
encuentran al recorrer la página por encabezados.
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

export type EmptyStateProps = {
  title: string;
  description: string;
  /** Icono decorativo sobre el título. */
  icon?: IconName;
  /** Nivel del título en la jerarquía de la pantalla: 3 dentro de una sección con su `h2`. */
  level?: 2 | 3;
  /** Acción principal que resuelve el estado vacío. */
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, description, icon, level = 2, action }: EmptyStateProps) {
  const theme = useTheme();

  return (
    <View style={styles.emptyState}>
      {icon ? (
        <View style={[styles.iconCircle, { backgroundColor: theme.accentSubtle }]}>
          <Icon name={icon} size="lg" color="onAccentSubtle" />
        </View>
      ) : null}
      <Heading level={level} style={styles.text}>
        {title}
      </Heading>
      <ThemedText step="callout" color="textSecondary" style={styles.text}>
        {description}
      </ThemedText>
      {action ? (
        <Button label={action.label} onPress={action.onPress} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[4],
  },
  iconCircle: {
    width: space[12],
    height: space[12],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    marginBottom: space[2],
  },
  // Unas 60 letras por línea en callout: el texto centrado se lee mal en líneas largas.
  text: {
    maxWidth: 480,
    textAlign: 'center',
  },
  action: {
    marginTop: space[2],
  },
});
