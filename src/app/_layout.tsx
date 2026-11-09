import '@/global.css';

import { useFonts } from 'expo-font';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { DisplayFontContext, displayFontFamilies, navigationThemes } from '@/shared/theme';

// Keep the native splash screen visible while Sora loads (no-op on web).
SplashScreen.preventAutoHideAsync();

// Provisional Stack: the bottom tab navigation is built in Phase 3.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Called during render, not in an effect, so web server rendering embeds the fonts in the HTML.
  const [fontsLoaded, fontError] = useFonts(displayFontFamilies);
  // A failed load still renders the app, with the system font in place of Sora.
  const fontsSettled = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (fontsSettled) {
      SplashScreen.hide();
    }
  }, [fontsSettled]);

  if (!fontsSettled) {
    return null;
  }

  return (
    <DisplayFontContext value={fontsLoaded}>
      <ThemeProvider value={navigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </DisplayFontContext>
  );
}
