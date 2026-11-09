/*
Web: una sola familia «Inter» con sus cuatro pesos, y el navegador elige el archivo con
`font-weight`, como en cualquier `@font-face`. Se descargan WOFF2, unas cinco veces más ligeros
que los OTF, desde el propio origen.

El estilo conserva respaldos del sistema por si el archivo no llega. Usa familias genéricas y no
una variable CSS: antes de que cargue `global.css`, una variable sin definir invalidaría toda la
declaración y el navegador mostraría su fuente serif por defecto.
*/
// eslint-config-expo admite `require()` para recursos como `.otf`, pero su lista no incluye `.woff2`.
/* eslint-disable @typescript-eslint/no-require-imports */
import { FontDisplay, type FontFamilyDefinition } from 'expo-font';
import type { TextStyle } from 'react-native';

import type { InterWeight } from './font-files';

const files: Record<InterWeight, number> = {
  400: require('../../../assets/fonts/Inter-Regular.woff2'),
  500: require('../../../assets/fonts/Inter-Medium.woff2'),
  600: require('../../../assets/fonts/Inter-SemiBold.woff2'),
  700: require('../../../assets/fonts/Inter-Bold.woff2'),
};

export type { InterWeight };

export const appFontFamilies: FontFamilyDefinition[] = [
  {
    fontFamily: 'Inter',
    fontDefinitions: ([400, 500, 600, 700] as const).map((weight) => ({
      path: files[weight],
      weight,
      style: 'normal',
      display: FontDisplay.SWAP,
    })),
  },
];

const family = `Inter, -apple-system, 'Segoe UI', system-ui, sans-serif`;

export function interStyle(weight: InterWeight): TextStyle {
  return { fontFamily: family, fontWeight: weight };
}
