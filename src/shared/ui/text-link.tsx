/*
Enlaces y acciones de texto: lo terciario de una pantalla, como «Crear una cuenta» o «Reenviar
confirmación», sin el peso de un botón.

Usan `accentText`, que supera 4,5:1 en los dos temas (el violeta de relleno, `primary`, no llega
sobre las superficies oscuras), y reservan 44 px de alto aunque el texto sea más pequeño, para que
se puedan tocar con el pulgar. El texto se subraya al pulsarlo y, en la web, al pasar el puntero.
*/
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { layout, radius } from '@/shared/theme';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { ThemedText } from '@/shared/ui/themed-text';

type TextActionProps = {
  /** Texto visible y nombre accesible. */
  label: string;
  /** `footnote` para notas al pie; `callout`, el tamaño del texto que lo rodea. */
  step?: 'callout' | 'footnote';
};

type PressableState = { pressed: boolean; hovered?: boolean };

function useTextAction() {
  const theme = useTheme();
  const [focusVisible, setFocusVisible] = useState(false);
  return {
    focusProps: {
      onFocus: (event: Parameters<typeof isKeyboardFocus>[0]) =>
        setFocusVisible(isKeyboardFocus(event)),
      onBlur: () => setFocusVisible(false),
    },
    // Plano: `Link asChild` fusiona el estilo como un objeto y no admite listas.
    style: StyleSheet.flatten([
      styles.target,
      focusVisible && { ...focusRing, outlineColor: theme.focusRing },
    ]),
  };
}

function Label({
  label,
  step = 'callout',
  state,
  disabled = false,
}: TextActionProps & { state: PressableState; disabled?: boolean }) {
  const active = !disabled && (state.pressed || state.hovered);
  return (
    <ThemedText
      step={step}
      color={disabled ? 'textSecondary' : 'accentText'}
      style={[styles.label, active && styles.underline]}>
      {label}
    </ThemedText>
  );
}

/** Enlace de texto a otra pantalla de la app. */
export function TextLink({ href, ...props }: TextActionProps & { href: Href }) {
  const { focusProps, style } = useTextAction();
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={props.label}
        {...focusProps}
        style={style}>
        {(state: PressableState) => <Label {...props} state={state} />}
      </Pressable>
    </Link>
  );
}

/** Acción secundaria con aspecto de enlace, por ejemplo reenviar un correo. */
export function TextButton({
  onPress,
  disabled = false,
  ...props
}: TextActionProps & { onPress: () => void; disabled?: boolean }) {
  const { focusProps, style } = useTextAction();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      {...focusProps}
      style={style}>
      {(state: PressableState) => <Label {...props} state={state} disabled={disabled} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Ocupa solo el ancho del texto, para que el área táctil no invada la fila entera.
  target: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: layout.minTouchTarget,
    borderRadius: radius.xs,
  },
  label: { fontWeight: 500 },
  underline: { textDecorationLine: 'underline' },
});
