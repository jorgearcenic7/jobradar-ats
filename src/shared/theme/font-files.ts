/*
iOS y Android: una familia por archivo de Inter, y el peso lo decide el nombre de la familia.

Una sola familia con varios pesos no basta en Android: `expo-font` la construye con la API
`FontFamily` de Android 10 (API 29), y por debajo solo carga la cara por defecto (Regular) y
sintetiza la negrita. Expo SDK 58 admite desde la API 24, así que en Android 7 a 9 los pesos 500 y
600 no existirían. Con una familia por peso cada archivo se registra solo y `fontWeight` queda en
`normal`, para que ninguna plataforma añada una negrita sintética encima del archivo correcto.
*/
import type { FontFamilyDefinition } from 'expo-font';
import type { TextStyle } from 'react-native';

export type InterWeight = 400 | 500 | 600 | 700;

// Rutas literales para que Metro las resuelva.
const faces: Record<InterWeight, { family: string; file: number }> = {
  400: { family: 'Inter-Regular', file: require('../../../assets/fonts/Inter-Regular.otf') },
  500: { family: 'Inter-Medium', file: require('../../../assets/fonts/Inter-Medium.otf') },
  600: { family: 'Inter-SemiBold', file: require('../../../assets/fonts/Inter-SemiBold.otf') },
  700: { family: 'Inter-Bold', file: require('../../../assets/fonts/Inter-Bold.otf') },
};

// Sin `weight` declarado: cada familia tiene un solo archivo y Android lo carga tal cual.
export const appFontFamilies: FontFamilyDefinition[] = Object.values(faces).map(
  ({ family, file }) => ({ fontFamily: family, fontDefinitions: [{ path: file }] }),
);

export function interStyle(weight: InterWeight): TextStyle {
  return { fontFamily: faces[weight].family, fontWeight: 'normal' };
}
