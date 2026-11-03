import { StyleSheet, View } from 'react-native';

import type { AnalysisComparison, StatusChange } from '@/features/cv-match/domain/compare';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { ThemedText, Heading } from '@/shared/ui/themed-text';

import { displayLabel, formatPercent, statusLabels } from './labels';

function describeChange({ label: rawLabel, before, after }: StatusChange) {
  const label = displayLabel(rawLabel);
  if (before === null && after !== null) {
    return `${label}: nuevo en la oferta (${statusLabels[after].toLowerCase()})`;
  }
  if (after === null) return `${label}: ya no está en la oferta`;
  return `${label}: ${statusLabels[before!].toLowerCase()} → ${statusLabels[after].toLowerCase()}`;
}

function describeCoverage({ before, after }: AnalysisComparison['coverage']) {
  const format = (value: number | null) =>
    value === null ? 'sin porcentaje' : formatPercent(value);
  return before === after
    ? `La cobertura no cambia: ${format(after)}.`
    : `Cobertura: ${format(before)} → ${format(after)}.`;
}

export function AnalysisChanges({ comparison }: { comparison: AnalysisComparison }) {
  return (
    <Card style={styles.card}>
      <Heading level={3}>Cambios respecto al análisis anterior</Heading>
      <ThemedText step="callout">{describeCoverage(comparison.coverage)}</ThemedText>
      {comparison.changes.length === 0 ? (
        <ThemedText step="callout" color="textSecondary">
          Ningún requisito ha cambiado de estado.
        </ThemedText>
      ) : (
        <View role="list" style={styles.list}>
          {comparison.changes.map((change) => (
            <ThemedText key={change.requirementId} role="listitem" step="callout">
              {describeChange(change)}
            </ThemedText>
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
    gap: space[2],
  },
});
