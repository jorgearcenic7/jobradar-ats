/*
Recomendaciones del análisis, con las más importantes primero.

El motor entrega las recomendaciones ya ordenadas por prioridad; aquí solo se muestran las tres
primeras y el resto queda tras «Ver todas», sin repetir ninguna. Si dos mensajes son idénticos se
muestra uno solo. El texto de las recomendaciones no se modifica.
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Recommendation } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { StepNumber } from '@/shared/ui/step-number';
import { TextButton } from '@/shared/ui/text-link';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

/** Cuántas recomendaciones se ven sin pedir más. */
export const PRIORITY_RECOMMENDATIONS = 3;

/*
Todas van en una sola superficie, una fila por recomendación y separadas por una línea fina. El
número ya marca la prioridad; las tres primeras no necesitan una tarjeta cada una.
*/
function Item({ message, number }: { message: string; number: number }) {
  const theme = useTheme();
  return (
    <View
      role="listitem"
      style={[styles.item, number > 1 && { borderTopWidth: 1, borderTopColor: theme.divider }]}>
      <StepNumber value={number} />
      <ThemedText step="callout" style={styles.text}>
        {/* Las citas destacan el requisito al recorrer la lista, sin reescribir el mensaje. */}
        {message.includes('«')
          ? message.split(/(«[^»]+»)/g).map((part, index) =>
              part.startsWith('«') ? (
                <ThemedText key={index} step="callout" style={styles.subject}>
                  {part}
                </ThemedText>
              ) : (
                part
              ),
            )
          : message}
      </ThemedText>
    </View>
  );
}

export function RecommendationList({ recommendations }: { recommendations: Recommendation[] }) {
  const theme = useTheme();
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
        <View
          role="list"
          style={[styles.list, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {priority.map((message, index) => (
            <Item key={message} message={message} number={index + 1} />
          ))}
          {showAll
            ? rest.map((message, index) => (
                <Item
                  key={message}
                  message={message}
                  number={index + PRIORITY_RECOMMENDATIONS + 1}
                />
              ))
            : null}
        </View>
      )}
      {rest.length > 0 ? (
        <TextButton
          label={showAll ? 'Ver solo las 3 primeras' : `Ver todas (${messages.length})`}
          onPress={() => setShowAll(!showAll)}
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
    borderWidth: 1,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
  },
  text: {
    flex: 1,
    // Alinea la primera línea con el número de 24 px.
    paddingTop: 1,
  },
  subject: { fontWeight: 600 },
});
