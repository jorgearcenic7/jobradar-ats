import { StyleSheet, View } from 'react-native';

import type { Recommendation } from '@/features/cv-match/domain/types';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { ThemedText, Heading } from '@/shared/ui/themed-text';
import { Icon } from '@/shared/ui/icon';

export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  return (
    <Card style={styles.card}>
      <Heading level={2}>Recomendaciones</Heading>
      <ThemedText step="footnote" color="textSecondary">
        Solo te sugieren añadir lo que de verdad hayas hecho. Nunca redactan experiencia por ti.
      </ThemedText>
      {recommendations.length === 0 ? (
        <ThemedText step="callout">No hay recomendaciones para esta oferta.</ThemedText>
      ) : (
        <View role="list" style={styles.list}>
          {recommendations.map((item, index) => (
            <View key={index} role="listitem" style={styles.item}>
              <Icon name="info" size="sm" color="accentText" />
              <ThemedText step="callout" style={styles.text}>
                {item.message}
              </ThemedText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
  },
  list: {
    gap: space[3],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
  },
  text: {
    flex: 1,
  },
});
