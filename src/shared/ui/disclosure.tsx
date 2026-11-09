/*
Bloque plegable: una cabecera siempre visible que muestra u oculta el contenido de debajo.

Es controlado: el estado lo guarda quien lo usa (`expanded`) y la cabecera solo pide el cambio
(`onToggle`). Así una pantalla puede abrir un bloque desde fuera, por ejemplo al elegir un
requisito en otro lugar, y cada instancia es independiente sin coordinar nada.

No tiene fondo, borde ni relleno lateral, para que encaje dentro de una `Card` o en una lista
que ya dibuja sus separadores. Tampoco tiene animación: el contenido aparece y desaparece al
instante, lo que evita movimiento innecesario y no depende de `prefers-reduced-motion`.

Accesibilidad:

La cabecera es un único botón con `aria-expanded`, que React Native convierte en el estado
«expandido» de iOS y Android y React Native Web escribe en el DOM. Un `header` de texto se anuncia
con ese texto; un `ReactElement` exige `accessibilityLabel`, que sustituye la composición de sus
descendientes. La cabecera no puede contener otros controles, que acabarían dentro del botón.

El contenido contraído no se monta, así que no llega a los lectores de pantalla ni al orden de
tabulación. Al expandirse aparece justo después de la cabecera, que es su orden de lectura
natural. No se usa `aria-controls`: apuntaría a un elemento inexistente mientras el bloque está
contraído. Como `children` se desmonta, su estado local se reinicia cada vez que se cierra.
*/
import { useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { layout, radius, space } from '@/shared/theme';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

type DisclosureBaseProps = {
  expanded: boolean;
  /** Recibe el estado que se pide: `true` para expandir, `false` para contraer. */
  onToggle: (expanded: boolean) => void;
  /** Contenido que se muestra solo mientras el bloque está expandido. */
  children: ReactNode;
};

type DisclosureHeaderProps =
  | {
      /** Un texto visible sirve también como nombre accesible. */
      header: string;
      accessibilityLabel?: never;
    }
  | {
      /** Cabecera visual personalizada, sin controles interactivos anidados. */
      header: ReactElement;
      /** Nombre accesible único de la cabecera personalizada. */
      accessibilityLabel: string;
    };

export type DisclosureProps = DisclosureBaseProps & DisclosureHeaderProps;

/*
Una cabecera de texto se anuncia con su propio contenido. La cabecera personalizada exige una
etiqueta explícita porque la composición de sus descendientes varía entre plataformas; al aplicarla
al botón, reemplaza esa composición y evita que insignias o iconos dupliquen el nombre.
*/
export function Disclosure({
  header,
  accessibilityLabel,
  expanded,
  onToggle,
  children,
}: DisclosureProps) {
  const theme = useTheme();
  const [focusVisible, setFocusVisible] = useState(false);
  const isText = typeof header === 'string';

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isText ? header : accessibilityLabel}
        aria-expanded={expanded}
        onPress={() => onToggle(!expanded)}
        onFocus={(event) => setFocusVisible(isKeyboardFocus(event))}
        onBlur={() => setFocusVisible(false)}
        style={[styles.header, focusVisible && { ...focusRing, outlineColor: theme.focusRing }]}>
        <View style={styles.headerContent}>
          {isText ? (
            <ThemedText step="callout" style={styles.headerText}>
              {header}
            </ThemedText>
          ) : (
            header
          )}
        </View>
        {/* Apunta hacia abajo cuando se puede expandir y hacia arriba cuando se puede contraer. */}
        <View style={expanded && styles.chevronExpanded}>
          <Icon name="chevronDown" color="textSecondary" />
        </View>
      </Pressable>
      {expanded ? children : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3],
    // Redondea el anillo de foco, que sigue el contorno del botón.
    borderRadius: radius.sm,
  },
  headerContent: {
    flex: 1,
    // Permite que el texto se parta en varias líneas en lugar de empujar el indicador fuera.
    minWidth: 0,
  },
  headerText: {
    fontWeight: 600,
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
});
