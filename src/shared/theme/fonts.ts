import { createContext, useContext } from 'react';
import type { TextStyle } from 'react-native';

import { interStyle, type InterWeight } from './font-files';

/**
 * Inter by Rasmus Andersson (SIL Open Font License 1.1), version 4.1 from
 * https://github.com/rsms/inter/releases; the license ships alongside it in `assets/fonts/OFL.txt`.
 * The files are bundled with the app, so loading the font never contacts a third-party service.
 * Each platform registers them its own way (see `font-files.ts` and `font-files.web.ts`).
 */
export { appFontFamilies } from './font-files';

/** Whether Inter finished loading. While false, every text keeps the system font. */
export const AppFontContext = createContext(false);

// Inter se incluye en cuatro pesos; cualquier otro valor usa el más cercano por debajo.
function interWeight(weight: TextStyle['fontWeight']): InterWeight {
  const value = weight === 'bold' ? 700 : Number(weight);
  if (!Number.isFinite(value) || value < 500) return 400;
  if (value < 600) return 500;
  if (value < 700) return 600;
  return 700;
}

/** Estilo de Inter para un peso: familia y peso en web; la familia del archivo de ese peso en nativo. */
export type AppFont = (weight: TextStyle['fontWeight']) => TextStyle;

const appFont: AppFont = (weight) => interStyle(interWeight(weight));

/**
 * Returns the function that turns a weight into Inter's style, or `undefined` while Inter isn't
 * available, so the text keeps the system font with its own weight. Apply its result last: on iOS
 * and Android it replaces `fontWeight`.
 */
export function useAppFont(): AppFont | undefined {
  return useContext(AppFontContext) ? appFont : undefined;
}
