/*
Prototipo de la nueva dirección visual en iOS y Android: todavía no existe. La versión web
(`prototype-screen.web.tsx`) depende de canvas y de eventos de puntero; aquí solo se explica y se
ofrece volver a la app.
*/
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Screen } from '@/shared/ui/screen';
import { TextLink } from '@/shared/ui/text-link';
import { ThemedText } from '@/shared/ui/themed-text';

export function PrototypeScreen() {
  return (
    <Screen>
      <View style={styles.content}>
        <ThemedText step="title" accessibilityRole="header">
          Prototipo de dirección visual
        </ThemedText>
        <ThemedText color="textSecondary">
          Por ahora solo se puede ver en la versión web de JobRadar.
        </ThemedText>
        <TextLink href="/" label="Volver al inicio" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[4], paddingTop: space[8] },
});
