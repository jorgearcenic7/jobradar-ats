/*
Recomendaciones del análisis, con las más importantes primero.

El motor entrega las recomendaciones ya ordenadas por prioridad; aquí solo se muestran las tres
primeras y el resto queda tras «Ver todas», sin repetir ninguna. Si dos mensajes son idénticos se
muestra uno solo. El texto de las recomendaciones no se modifica.
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Recommendation } from '@/features/cv-match/domain/types';
import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

/** Cuántas recomendaciones se ven sin pedir más. */
export const PRIORITY_RECOMMENDATIONS = 3;

function Item({ message }: { message: string }) {
  return (
    <View role="listitem" style={styles.item}>
      <Icon name="info" size="sm" color="accentText" />
      <ThemedText step="callout" style={styles.text}>
        {message}
      </ThemedText>
    </View>
  );
}

export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  const [showAll, setShowAll] = useState(false);
  const messages = [...new Set(recommendations.map((item) => item.message))];
  const priority = messages.slice(0, PRIORITY_RECOMMENDATIONS);
  const rest = messages.slice(PRIORITY_RECOMMENDATIONS);

  return (
    <View style={styles.section}>
      <Heading level={2}>Qué mejorar primero</Heading>
      {messages.length === 0 ? (
        <ThemedText step="callout">No hay recomendaciones para esta oferta.</ThemedText>
      ) : (
        <View role="list" style={styles.list}>
          {priority.map((message) => (
            <Item key={message} message={message} />
          ))}
          {showAll ? rest.map((message) => <Item key={message} message={message} />) : null}
        </View>
      )}
      {rest.length > 0 ? (
        <Button
          label={showAll ? 'Ver solo las 3 primeras' : `Ver todas (${messages.length})`}
          variant="secondary"
          onPress={() => setShowAll(!showAll)}
          style={styles.more}
        />
      ) : null}
      <ThemedText step="footnote" color="textSecondary">
        Solo te sugieren añadir lo que de verdad hayas hecho. Nunca redactan experiencia por ti.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
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
  more: {
    alignSelf: 'flex-start',
    paddingVertical: space[2],
  },
});
