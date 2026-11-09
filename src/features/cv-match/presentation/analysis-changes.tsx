import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AnalysisComparison, StatusChange } from '@/features/cv-match/domain/compare';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
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

/*
Comparación con el análisis anterior, compacta: la cobertura siempre visible y la lista de
requisitos que han cambiado de estado plegada, para que no domine la pantalla.
*/
export function AnalysisChanges({ comparison }: { comparison: AnalysisComparison }) {
  const [open, setOpen] = useState(false);
  const { changes } = comparison;

  return (
    <Card style={styles.card}>
      <Heading level={3}>Cambios respecto al análisis anterior</Heading>
      <ThemedText step="callout">{describeCoverage(comparison.coverage)}</ThemedText>
      {changes.length === 0 ? (
        <ThemedText step="callout" color="textSecondary">
          Ningún requisito ha cambiado de estado.
        </ThemedText>
      ) : (
        <Disclosure
          header={`${changes.length} ${changes.length === 1 ? 'requisito ha cambiado' : 'requisitos han cambiado'} de estado`}
          expanded={open}
          onToggle={setOpen}>
          <View role="list" style={styles.list}>
            {changes.map((change) => (
              <ThemedText key={change.requirementId} role="listitem" step="callout">
                {describeChange(change)}
              </ThemedText>
            ))}
          </View>
        </Disclosure>
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
