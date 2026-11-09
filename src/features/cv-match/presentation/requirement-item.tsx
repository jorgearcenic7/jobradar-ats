/*
Un requisito como fila compacta que se despliega: el nombre, la insignia de estado, la importancia
y los puntos están siempre a la vista; la explicación y las evidencias, al expandirla.

Cada fila guarda su propio estado, así que varias pueden estar abiertas a la vez. La cabecera es
una vista personalizada dentro del `Disclosure`, que exige un nombre accesible explícito: lo
compone esta fila con el nombre, el estado, la importancia y los puntos, porque dentro de un botón
la insignia y el resto no se leerían por separado. La cabecera no contiene controles anidados.
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RequirementAssessment } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { ThemedText } from '@/shared/ui/themed-text';

import {
  displayLabel,
  formatNumber,
  importanceLabels,
  roleLabels,
  sectionLabels,
  statusLabels,
} from './labels';
import { StatusBadge } from './status-badge';

// A requirement can match hundreds of lines of a long CV; a few are enough to explain it.
const VISIBLE_EVIDENCE = 3;

export function RequirementItem({ assessment }: { assessment: RequirementAssessment }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const { requirement, status, reason, evidence, contribution } = assessment;
  const hidden = evidence.length - VISIBLE_EVIDENCE;
  const name = displayLabel(requirement.label);
  const summary = `${importanceLabels[requirement.importance]} · ${
    contribution
      ? `Aporta ${formatNumber(contribution.points * contribution.weight)} de ${contribution.weight} ${
          contribution.weight === 1 ? 'punto' : 'puntos'
        }`
      : 'Fuera del porcentaje'
  }`;

  return (
    <Card role="listitem" style={styles.card}>
      <Disclosure
        accessibilityLabel={`${name}. ${statusLabels[status]}. ${summary}`}
        expanded={expanded}
        onToggle={setExpanded}
        header={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <ThemedText step="headline" style={styles.title}>
                {name}
              </ThemedText>
              <StatusBadge status={status} />
            </View>
            <ThemedText step="footnote" color="textSecondary">
              {summary}
            </ThemedText>
          </View>
        }>
        <View style={styles.details}>
          <ThemedText step="callout">{reason}</ThemedText>

          {evidence.length > 0 ? (
            <View style={styles.block}>
              <ThemedText step="footnote" color="textSecondary" style={styles.blockTitle}>
                En tu CV
              </ThemedText>
              {evidence.slice(0, VISIBLE_EVIDENCE).map((item, index) => (
                <View key={index} style={[styles.quote, { borderColor: theme.borderStrong }]}>
                  <ThemedText step="footnote" color="textSecondary">
                    {sectionLabels[item.section]} · {roleLabels[item.role]}
                  </ThemedText>
                  <ThemedText step="callout">{item.text}</ThemedText>
                </View>
              ))}
              {hidden > 0 ? (
                <ThemedText step="footnote" color="textSecondary">
                  Y {hidden} {hidden === 1 ? 'frase más' : 'frases más'} con el mismo requisito.
                </ThemedText>
              ) : null}
            </View>
          ) : null}

          <View style={styles.block}>
            <ThemedText step="footnote" color="textSecondary" style={styles.blockTitle}>
              En la oferta
            </ThemedText>
            {requirement.sources.map((source, index) => (
              <ThemedText key={index} step="callout" color="textSecondary">
                «{source}»
              </ThemedText>
            ))}
          </View>
        </View>
      </Disclosure>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
    paddingVertical: 0,
    borderRadius: radius.md,
  },
  header: {
    gap: space[1],
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
  },
  title: {
    flexShrink: 1,
  },
  details: {
    gap: space[3],
    paddingBottom: space[3],
  },
  block: {
    gap: space[2],
  },
  blockTitle: {
    fontWeight: 600,
  },
  quote: {
    gap: space[1],
    paddingLeft: space[3],
    borderLeftWidth: 3,
  },
});
