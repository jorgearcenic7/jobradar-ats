import type { ViewStyle } from 'react-native';

/*
Movimiento de la interfaz: una sola curva de salida y duraciones por debajo de 240 ms.

Solo se animan cambios de estado que el usuario provoca (hover, selección, progreso), nunca datos
ni entradas al cargar. En la web React Native Web convierte estas propiedades en transiciones CSS,
y `src/global.css` las anula con «reducir movimiento». iOS y Android no las conocen: allí el
helper no devuelve nada y el cambio es inmediato, como hasta ahora.
*/
export const motion = {
  // Arranca rápido y frena al final: la respuesta se ve en el primer fotograma.
  easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',
  duration: { fast: 150, base: 200 },
} as const;

/** Transición CSS de las propiedades indicadas (en notación CSS), solo en la web. */
export function webTransition(
  properties: readonly string[],
  duration: number = motion.duration.fast,
): ViewStyle {
  if (process.env.EXPO_OS !== 'web') return {};
  return {
    transitionProperty: properties.join(', '),
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: motion.easeOut,
  };
}
