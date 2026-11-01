import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { layout, radius, space } from '@/shared/theme';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.panel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <ThemedText type="subtitle" accessibilityRole="header" style={styles.centerText}>
            JobRadar ATS
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centerText}>
            Aplicación en construcción.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: layout.screenPadding,
    maxWidth: layout.maxContentWidth,
  },
  panel: {
    gap: space[2],
    padding: space[6],
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  centerText: {
    textAlign: 'center',
  },
});
