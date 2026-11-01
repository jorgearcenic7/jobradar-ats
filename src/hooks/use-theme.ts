/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes } from '@/shared/theme';

/** Returns the semantic color tokens for the current color scheme. */
export function useTheme() {
  const scheme = useColorScheme();

  return palettes[scheme === 'dark' ? 'dark' : 'light'];
}
