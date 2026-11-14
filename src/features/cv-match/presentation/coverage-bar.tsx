/*
Representa los puntos posibles y los realmente aportados por cada estado evaluable.

No decide reglas de puntuación: agrega `contribution`, que ya entrega el dominio para cada
requisito. Por eso vive en la presentación de `cv-match` y no en el sistema compartido.
*/
import { StyleSheet, View } from 'react-native';

import type { RequirementAssessment, RequirementStatus } from '@/features/cv-match/domain/types';
import { space } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { SegmentedBar, type SegmentedBarTone } from '@/shared/ui/segmented-bar';
import { ThemedText } from '@/shared/ui/themed-text';

import { formatNumber, statusLabels } from './labels';
import { statusTones } from './status-badge';

type EvaluatedStatus = Exclude<RequirementStatus, 'not-evaluable'>;

const order: EvaluatedStatus[] = ['supported', 'mentioned', 'missing'];

const barTones: Record<EvaluatedStatus, SegmentedBarTone> = {
  supported: 'success',
  mentioned: 'warning',
  missing: 'danger',
};

type CoverageSegment = {
  status: EvaluatedStatus;
  earned: number;
  possible: number;
};

export type CoverageBarProps = {
  assessments: readonly RequirementAssessment[];
  showLegend?: boolean;
};

function segmentsOf(assessments: readonly RequirementAssessment[]): CoverageSegment[] {
  return order.map((status) => {
    let earned = 0;
    let possible = 0;

    for (const assessment of assessments) {
      if (assessment.status !== status || assessment.contribution === null) continue;
      const { points, weight } = assessment.contribution;
      earned += points * weight;
      possible += weight;
    }

    return { status, earned, possible };
  });
}

function pointsLabel(earned: number, possible: number) {
  return `${formatNumber(earned)} de ${formatNumber(possible)} ${possible === 1 ? 'punto' : 'puntos'}`;
}

function accessibilityDescription(segments: CoverageSegment[]) {
  const possible = segments.reduce((total, segment) => total + segment.possible, 0);
  if (possible === 0) {
    return 'Distribución de puntos de cobertura. No hay requisitos evaluables.';
  }

  const details = segments
    .map(
      ({ status, earned, possible: segmentPossible }) =>
        `${statusLabels[status]}: ${pointsLabel(earned, segmentPossible)}`,
    )
    .join('; ');
  return `Distribución de puntos de cobertura. ${details}.`;
}

/** Barra segmentada: anchura posible por estado y relleno interior con su aportación real. */
export function CoverageBar({ assessments, showLegend = true }: CoverageBarProps) {
  const segments = segmentsOf(assessments);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityDescription(segments)}
      testID="coverage-bar">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        <SegmentedBar
          segments={segments.map(({ status, earned, possible }) => ({
            key: status,
            tone: barTones[status],
            weight: possible,
            fill: possible > 0 ? earned / possible : 0,
            testID: `coverage-segment-${status}`,
            fillTestID: `coverage-earned-${status}`,
          }))}
        />

        {showLegend ? <CoverageLegend assessments={assessments} /> : null}
      </View>
    </View>
  );
}

// El mismo desglose se reutiliza en la explicación plegada, sin duplicar sus cálculos.
export function CoverageLegend({ assessments }: Pick<CoverageBarProps, 'assessments'>) {
  return (
    <View style={styles.legend}>
      {segmentsOf(assessments).map(({ status, earned, possible }) => {
        const tone = statusTones[status];
        return (
          <View key={status} style={styles.legendItem}>
            <Icon name={tone.icon} size="sm" color={tone.color} />
            <ThemedText step="footnote" style={styles.legendText}>
              {statusLabels[status]}: {pointsLabel(earned, possible)}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    marginTop: space[2],
    gap: space[1],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
  },
  legendText: {
    flexShrink: 1,
  },
});
