import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';

export default function HomeScreen() {
  return (
    <Screen style={styles.content}>
      <ThemedText type="subtitle" accessibilityRole="header" style={styles.centerText}>
        JobRadar ATS
      </ThemedText>
      <Card>
        <ThemedText themeColor="textSecondary" style={styles.centerText}>
          Aplicación en construcción.
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
