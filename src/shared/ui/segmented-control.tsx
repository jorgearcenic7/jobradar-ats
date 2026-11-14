/*
Selector segmentado: elige una opción entre dos o más alternativas que se excluyen entre sí, por
ejemplo cómo añadir el CV. Es controlado: el valor lo guarda quien lo usa y el control solo pide
el cambio con `onChange`.

Accesibilidad:

Sigue el patrón de grupo de botones de opción. El contenedor lleva `role="radiogroup"` con su
nombre y cada opción `role="radio"` con `aria-checked`; React Native los convierte en los roles y
estados de iOS y Android, y React Native Web los escribe en el DOM.

En la web solo la opción elegida entra en el orden de tabulación. Las flechas recorren las
opciones y eligen la que recibe el foco, e Inicio y Fin van a los extremos, como en un grupo de
botones de opción del navegador. Intro y Espacio eligen la opción enfocada.

La opción activa se ve por tres señales a la vez: la superficie elevada con su sombra, el texto en
`text` en lugar de `textSecondary` y el peso del texto. No lleva borde de acento, como pide el
diseño v1.1: el estado también llega a las tecnologías de asistencia con `aria-checked`.
*/
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { layout, radius, space, webTransition, type ThemeColor } from '@/shared/theme';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { Icon, type IconName } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

export type SegmentedOption<T extends string> = {
  value: T;
  /** Texto visible, que es también el nombre accesible de la opción. */
  label: string;
  /** Icono decorativo delante de la etiqueta. */
  icon?: IconName;
  /** Recuento tras la etiqueta, en cifras tabulares. Se lee como «Etiqueta (n)». */
  count?: number;
};

export type SegmentedControlProps<T extends string> = {
  /** Nombre del grupo para las tecnologías de asistencia, por ejemplo «Cómo quieres añadir tu CV». */
  accessibilityLabel: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
   * `compact`: texto más pequeño y opciones de al menos 120 px que pasan a otra fila cuando no
   * caben, por ejemplo cuatro filtros en el móvil (dos filas de dos).
   */
  size?: 'regular' | 'compact';
  /** Recibe cada opción montada, para que quien usa el control pueda devolverle el foco. */
  optionRef?: (value: T, node: { focus: () => void } | null) => void;
};

// Tecla del teclado → posición relativa o absoluta de la opción que se elige.
const keyMoves: Record<string, (index: number, last: number) => number> = {
  ArrowRight: (index) => index + 1,
  ArrowDown: (index) => index + 1,
  ArrowLeft: (index) => index - 1,
  ArrowUp: (index) => index - 1,
  Home: () => 0,
  End: (_, last) => last,
};

const isWeb = process.env.EXPO_OS === 'web';

export function SegmentedControl<T extends string>({
  accessibilityLabel,
  options,
  value,
  onChange,
  size = 'regular',
  optionRef,
}: SegmentedControlProps<T>) {
  const compact = size === 'compact';
  const theme = useTheme();
  const [keyboardFocus, setKeyboardFocus] = useState<T | null>(null);
  const optionRefs = useRef<({ focus: () => void } | null)[]>([]);

  // Las flechas dan la vuelta al llegar a un extremo, igual que los botones de opción del navegador.
  const moveFrom = (index: number, key: string) => {
    const move = keyMoves[key];
    if (!move) return false;
    const target = (move(index, options.length - 1) + options.length) % options.length;
    onChange(options[target].value);
    optionRefs.current[target]?.focus();
    return true;
  };

  return (
    <View
      role="radiogroup"
      aria-label={accessibilityLabel}
      style={[styles.group, compact && styles.wrap, { backgroundColor: theme.neutralSubtle }]}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const color: ThemeColor = selected ? 'text' : 'textSecondary';
        return (
          <Pressable
            key={option.value}
            ref={(node) => {
              optionRefs.current[index] = node;
              optionRef?.(option.value, node);
            }}
            role="radio"
            aria-checked={selected}
            accessibilityLabel={
              option.count === undefined ? option.label : `${option.label} (${option.count})`
            }
            /*
            Solo web: la opción elegida es la única parada de tabulación del grupo. React Native
            Web solo atiende a `tabIndex` en `Pressable`; `focusable` no lo cambia.
            */
            tabIndex={isWeb ? (selected ? 0 : -1) : undefined}
            onPress={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (moveFrom(index, event.key)) event.preventDefault();
            }}
            onFocus={(event) => setKeyboardFocus(isKeyboardFocus(event) ? option.value : null)}
            onBlur={() => setKeyboardFocus(null)}
            // `hovered` solo llega en la web (React Native Web); los tipos de React Native no lo declaran.
            style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
              styles.option,
              compact && styles.compactOption,
              optionTransition,
              selected
                ? { backgroundColor: theme.segmentActive, boxShadow: theme.shadowSegment }
                : (pressed || hovered) && { backgroundColor: theme.border },
              keyboardFocus === option.value && { ...focusRing, outlineColor: theme.focusRing },
            ]}>
            {option.icon ? <Icon name={option.icon} size="sm" color={color} /> : null}
            <ThemedText
              step={compact ? 'footnote' : 'callout'}
              color={color}
              style={[styles.label, { fontWeight: selected ? 600 : 500 }]}>
              {option.label}
              {option.count === undefined ? null : (
                <ThemedText
                  step={compact ? 'footnote' : 'callout'}
                  color={selected ? 'textSecondary' : 'textTertiary'}
                  style={styles.count}>
                  {` ${option.count}`}
                </ThemedText>
              )}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: space[1],
    padding: space[1],
    borderRadius: radius.icon,
    borderCurve: 'continuous',
  },
  // Cada opción parte del ancho de su contenido y crece por igual si el grupo es más ancho.
  option: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    flexDirection: 'row',
    // Con texto muy ampliado el icono pasa encima de la etiqueta antes de partir palabras.
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[1],
    paddingHorizontal: space[3],
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  label: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: 'center',
  },
  wrap: { flexWrap: 'wrap' },
  // 120 px: cuatro filtros caben en una fila en escritorio y en dos filas de dos en el móvil.
  compactOption: { minWidth: 120, paddingHorizontal: space[2] },
  count: { fontVariant: ['tabular-nums'], fontWeight: 500 },
});

// El fondo de la opción bajo el puntero entra y sale suave; la elección es inmediata.
const optionTransition = webTransition(['background-color']);
