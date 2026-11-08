/*
Resumen compacto de la cobertura: porcentaje, barra, recuentos por estado y la aclaración de que
no es una predicción ATS. La explicación completa del cálculo queda plegada para que la primera
pantalla de Resultados llegue antes a lo accionable, pero sigue disponible.
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  Coverage,
  RequirementAssessment,
  RequirementStatus,
} from '@/features/cv-match/domain/types';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

import { CoverageBar } from './coverage-bar';
import { formatNumber, formatPercent, statusLabels } from './labels';
import { statusTones } from './status-badge';

const order: RequirementStatus[] = ['supported', 'mentioned', 'missing', 'not-evaluable'];

type CoverageSummaryProps = {
  coverage: Coverage;
  assessments: readonly RequirementAssessment[];
};

export function CoverageSummary({ coverage, assessments }: CoverageSummaryProps) {
  const [methodOpen, setMethodOpen] = useState(false);

  return (
    <Card style={styles.card}>
      {coverage.percentage === null ? (
        <ThemedText step="headline">
          No se ha podido evaluar ningún requisito de esta oferta.
        </ThemedText>
      ) : (
        <View style={styles.figure}>
          <ThemedText step="callout" color="textSecondary">
            Cobertura de los requisitos evaluados
          </ThemedText>
          <View style={styles.figureRow}>
            <ThemedText step="metric">{formatPercent(coverage.percentage)}</ThemedText>
            <ThemedText step="callout" color="textSecondary" style={styles.points}>
              {formatNumber(coverage.earned)} de {formatNumber(coverage.possible)} puntos ·{' '}
              {coverage.evaluated}{' '}
              {coverage.evaluated === 1 ? 'requisito evaluado' : 'requisitos evaluados'}
            </ThemedText>
          </View>
        </View>
      )}

      {coverage.percentage === null ? null : <CoverageBar assessments={assessments} />}

      <View role="list" style={styles.counts}>
        {order.map((status) => (
          <View key={status} role="listitem" style={styles.count}>
            <Icon name={statusTones[status].icon} size="sm" color={statusTones[status].color} />
            <ThemedText step="footnote">
              {statusLabels[status]}: {coverage.counts[status]}
              {status === 'not-evaluable' ? ' (fuera del porcentaje)' : ''}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText step="footnote" color="textSecondary">
        No es una puntuación ATS ni una probabilidad de contratación.
      </ThemedText>
      <Disclosure
        header="Cómo se calcula la cobertura"
        expanded={methodOpen}
        onToggle={setMethodOpen}>
        <ThemedText step="footnote" color="textSecondary">
          Cada requisito suma 1 punto si está respaldado, 0,5 si aparece sin evidencia suficiente y
          0 si no está acreditado; los obligatorios cuentan el doble. Indica qué parte de los
          requisitos reconocidos encuentra JobRadar en tu CV.
        </ThemedText>
      </Disclosure>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
  },
  figure: {
    gap: space[1],
  },
  figureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: space[3],
  },
  points: {
    flexShrink: 1,
  },
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space[4],
    rowGap: space[1],
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
  },
});
