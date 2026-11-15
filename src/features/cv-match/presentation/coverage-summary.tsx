/*
Resumen compacto de la cobertura: porcentaje, barra, recuentos por estado y los criterios con que
se calcula. La explicación completa del cálculo queda plegada para que la primera
pantalla de Resultados llegue antes a lo accionable, pero sigue disponible.
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  Coverage,
  RequirementAssessment,
  RequirementStatus,
} from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

import { CoverageBar, CoverageLegend } from './coverage-bar';
import { formatNumber, formatPercent, statusLabels } from './labels';
import { statusTones } from './status-badge';

const order: RequirementStatus[] = ['supported', 'mentioned', 'missing', 'not-evaluable'];

type CoverageSummaryProps = {
  coverage: Coverage;
  assessments: readonly RequirementAssessment[];
};

export function CoverageSummary({ coverage, assessments }: CoverageSummaryProps) {
  const theme = useTheme();
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

      {coverage.percentage === null ? null : (
        <CoverageBar assessments={assessments} showLegend={false} />
      )}

      {/*
      Leyenda en línea en lugar de una tarjeta por estado: cada recuento con su icono, su cifra y
      su estado, que pasan a la línea siguiente cuando no caben.
      */}
      <View role="list" style={[styles.counts, { borderTopColor: theme.divider }]}>
        {order.map((status) => (
          <View
            key={status}
            role="listitem"
            accessible
            accessibilityLabel={`${statusLabels[status]}: ${coverage.counts[status]}${status === 'not-evaluable' ? ' (fuera del porcentaje)' : ''}`}
            style={styles.count}>
            <Icon name={statusTones[status].icon} size="sm" color={statusTones[status].color} />
            <ThemedText step="footnote" style={styles.countValue}>
              {coverage.counts[status]}
            </ThemedText>
            <ThemedText step="footnote" color="textSecondary" style={styles.countLabel}>
              {statusLabels[status]}
              {status === 'not-evaluable' ? ' (fuera del porcentaje)' : ''}
            </ThemedText>
          </View>
        ))}
      </View>

      <ThemedText step="footnote" color="textSecondary">
        Calculado con criterios habituales de evaluación ATS: los requisitos de la oferta y las
        evidencias de tu CV.
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
        {coverage.percentage === null ? null : <CoverageLegend assessments={assessments} />}
      </Disclosure>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
    padding: space[5],
  },
  figure: {
    gap: space[1],
  },
  figureRow: {
    flexDirection: 'row',
    // Los puntos se ajustan junto al porcentaje en lugar de añadir otra fila completa.
    alignItems: 'center',
    columnGap: space[3],
  },
  points: {
    flex: 1,
    minWidth: 0,
  },
  // Compacto: en el móvil la primera recomendación debe quedar lo más arriba posible.
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space[4],
    rowGap: space[2],
    paddingTop: space[3],
    borderTopWidth: 1,
  },
  count: { flexDirection: 'row', alignItems: 'center', gap: space[1] + 2, maxWidth: '100%' },
  countValue: { fontVariant: ['tabular-nums'], fontWeight: 600 },
  countLabel: { flexShrink: 1 },
});
