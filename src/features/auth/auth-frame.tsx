import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAuth } from './auth-provider';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Notice } from '@/shared/ui/notice';
import { Screen } from '@/shared/ui/screen';
import { ThemedText } from '@/shared/ui/themed-text';

export function AuthFrame({ title, children }: { title: string; children: ReactNode }) {
  const { configured, loading, error } = useAuth();
  return (
    <Screen header={<AppNavigation section="account" />}>
      <View style={styles.container}>
        <ThemedText accessibilityRole="header" aria-level={1} step="title">
          {title}
        </ThemedText>
        <ThemedText color="textSecondary">Puedes analizar tu CV sin crear una cuenta.</ThemedText>
        <Card style={styles.card}>
          {!loading && !configured ? (
            <Notice tone="warning">
              El acceso con cuenta no está disponible. Falta configurar Supabase. Puedes seguir
              usando el analizador.
            </Notice>
          ) : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {children}
        </Card>
        <ThemedText step="footnote" color="textSecondary">
          Tu email y tu sesión se gestionan con Supabase. Tu CV, las ofertas y los resultados siguen
          en tu dispositivo y no se guardan en tu cuenta.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: space[4],
    paddingTop: space[6],
  },
  card: { gap: space[4], padding: space[6] },
});
