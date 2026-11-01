import { FontDisplay, type FontFamilyDefinition } from 'expo-font';
import { createContext, useContext } from 'react';
import { Platform } from 'react-native';

const SORA = 'Sora';

/**
 * Sora by Jonathan Barnbrook and Julián Moncada (SIL Open Font License 1.1).
 * Static OTF files from https://github.com/sora-xor/sora-font at commit 7f9a9c5;
 * the license ships alongside them in `assets/fonts/OFL.txt`.
 */
export const displayFontFamilies: FontFamilyDefinition[] = [
  {
    fontFamily: SORA,
    fontDefinitions: [
      // Literal paths so Metro can resolve the assets statically.
      {
        path: require('../../../assets/fonts/Sora-SemiBold.otf'),
        weight: 600,
        style: 'normal',
        display: FontDisplay.SWAP,
      },
      {
        path: require('../../../assets/fonts/Sora-Bold.otf'),
        weight: 700,
        style: 'normal',
        display: FontDisplay.SWAP,
      },
    ],
  },
];

// On web the declaration keeps a system fallback in case the file never arrives. It uses generic
// families, not a CSS variable: before `global.css` loads, an undefined variable would invalidate
// the whole declaration and the browser would fall back to its default serif font.
const displayFont = Platform.select({ web: `${SORA}, system-ui, sans-serif`, default: SORA });

/** Whether Sora finished loading. While false, every text keeps the system font. */
export const DisplayFontContext = createContext(false);

/** Returns the `fontFamily` for headline and figure styles, or `undefined` to keep the system font. */
export function useDisplayFont() {
  return useContext(DisplayFontContext) ? displayFont : undefined;
}
