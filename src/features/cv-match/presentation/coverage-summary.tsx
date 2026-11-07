import { StyleSheet, View } from 'react-native';

import type {
  Coverage,
  RequirementAssessment,
  RequirementStatus,
} from '@/features/cv-match/domain/types';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { ThemedText } from '@/shared/ui/themed-text';
import { Icon } from '@/shared/ui/icon';

import { formatNumber, formatPercent, statusLabels } from './labels';
import { CoverageBar } from './coverage-bar';
import { statusTones } from './status-badge';

const order: RequirementStatus[] = ['supported', 'mentioned', 'missing', 'not-evaluable'];

type CoverageSummaryProps = {
  coverage: Coverage;
  assessments: readonly RequirementAssessment[];
};

export function CoverageSummary({ coverage, assessments }: CoverageSummaryProps) {
  return (
    <Card style={styles.card}>
      <ThemedText step="callout" color="textSecondary">
        Cobertura de los requisitos evaluados
      </ThemedText>
      {coverage.percentage === null ? (
        <ThemedText step="headline">
          No se ha podido evaluar ningún requisito de esta oferta.
        </ThemedText>
      ) : (
        <View style={styles.figure}>
          <ThemedText step="metric">{formatPercent(coverage.percentage)}</ThemedText>
          <ThemedText step="callout" color="textSecondary">
            {formatNumber(coverage.earned)} de {formatNumber(coverage.possible)} puntos ·{' '}
            {coverage.evaluated}{' '}
            {coverage.evaluated === 1 ? 'requisito evaluado' : 'requisitos evaluados'}
          </ThemedText>
        </View>
      )}

      {coverage.percentage === null ? null : <CoverageBar assessments={assessments} />}

      <View role="list" style={styles.counts}>
        {order.map((status) => (
          <View key={status} role="listitem" style={styles.count}>
            <Icon name={statusTones[status].icon} size="sm" color={statusTones[status].color} />
            <ThemedText step="callout">
              {statusLabels[status]}: {coverage.counts[status]}
              {status === 'not-evaluable' ? ' (fuera del porcentaje)' : ''}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText step="footnote" color="textSecondary">
        Cada requisito suma 1 punto si está respaldado, 0,5 si aparece sin evidencia suficiente y 0
        si no está acreditado; los obligatorios cuentan el doble. Indica qué parte de los requisitos
        reconocidos encuentra JobRadar en tu CV. No es una puntuación ATS ni una probabilidad de
        contratación.
      </ThemedText>
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
  counts: {
    gap: space[2],
  },
  count: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
});
