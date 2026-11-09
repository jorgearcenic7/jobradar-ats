/*
Foco visible de los controles pulsables propios (`Button`, `Disclosure`) en la web.

`Pressable` no dibuja ningún indicador de foco, así que cada control muestra el anillo
`focusRing` del tema. Solo aparece con el teclado: un clic también enfoca el control, pero
mostrar el anillo entonces distrae. En iOS y Android el sistema dibuja su propio foco y
`matches` no existe, así que el anillo nunca se activa.
*/
import type { NativeSyntheticEvent, TargetedEvent, ViewStyle } from 'react-native';

/** Indica si el foco ha llegado con el teclado (`:focus-visible`), no con un clic. */
export function isKeyboardFocus(event: NativeSyntheticEvent<TargetedEvent>) {
  const target = event.target as unknown as { matches?: (selector: string) => boolean };
  return target.matches?.(':focus-visible') ?? false;
}

/** Contorno del anillo; el color (`theme.focusRing`) lo añade cada control. */
export const focusRing = {
  outlineStyle: 'solid',
  outlineWidth: 2,
  outlineOffset: 2,
} as const satisfies ViewStyle;
