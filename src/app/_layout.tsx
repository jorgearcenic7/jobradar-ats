import '@/global.css';

import { Stack, ThemeProvider } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { navigationThemes } from '@/shared/theme';

// Provisional Stack: the bottom tab navigation is built in Phase 3.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={navigationThemes[colorScheme === 'dark' ? 'dark' : 'light']}>
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
