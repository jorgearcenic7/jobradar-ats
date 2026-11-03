import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Screen } from '@/shared/ui/screen';
import { ThemedText } from '@/shared/ui/themed-text';

export default function HomeScreen() {
  return (
    <Screen style={styles.content}>
      <ThemedText step="title" accessibilityRole="header" style={styles.centerText}>
        JobRadar ATS
      </ThemedText>
      <Card style={styles.card}>
        <ThemedText color="textSecondary" style={styles.centerText}>
          Aplicación en construcción.
        </ThemedText>
        {/* Provisional entry until the tab navigation of Phase 3. */}
        <Button
          label="Analizar CV y oferta"
          icon="arrowForward"
          onPress={() => router.push('/analisis')}
          style={styles.action}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
  },
  card: {
    gap: space[4],
  },
  centerText: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'center',
  },
});
