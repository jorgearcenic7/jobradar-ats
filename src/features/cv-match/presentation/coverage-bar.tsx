/*
Representa los puntos posibles y los realmente aportados por cada estado evaluable.

No decide reglas de puntuaciÃ³n: agrega `contribution`, que ya entrega el dominio para cada
requisito. Por eso vive en la presentaciÃ³n de `cv-match` y no en el sistema compartido.
*/
import { StyleSheet, View } from 'react-native';

import type { RequirementAssessment, RequirementStatus } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

import { formatNumber, statusLabels } from './labels';
import { statusTones } from './status-badge';

type EvaluatedStatus = Exclude<RequirementStatus, 'not-evaluable'>;

const order: EvaluatedStatus[] = ['supported', 'mentioned', 'missing'];

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
    return 'DistribuciÃ³n de puntos de cobertura. No hay requisitos evaluables.';
  }

  const details = segments
    .map(
      ({ status, earned, possible: segmentPossible }) =>
        `${statusLabels[status]}: ${pointsLabel(earned, segmentPossible)}`,
    )
    .join('; ');
  return `DistribuciÃ³n de puntos de cobertura. ${details}.`;
}

/** Barra segmentada: anchura posible por estado y relleno interior con su aportaciÃ³n real. */
export function CoverageBar({ assessments, showLegend = true }: CoverageBarProps) {
  const theme = useTheme();
  const segments = segmentsOf(assessments);
  const hasEvaluablePoints = segments.some((segment) => segment.possible > 0);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityDescription(segments)}
      testID="coverage-bar">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        <View
          style={[styles.track, { backgroundColor: theme.neutralSubtle }]}
          testID="coverage-track">
          {hasEvaluablePoints
            ? segments.map(({ status, earned, possible }) => {
                if (possible === 0) return null;
                const earnedPercentage = Math.min(100, Math.max(0, (earned / possible) * 100));
                const tone = statusTones[status];
                const earnedWidth = `${earnedPercentage}%` as `${number}%`;

                return (
                  <View
                    key={status}
                    testID={`coverage-segment-${status}`}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: theme[tone.background],
                        flexGrow: possible,
                      },
                    ]}>
                    {earnedPercentage > 0 ? (
                      <View
                        testID={`coverage-earned-${status}`}
                        style={[
                          styles.earned,
                          { backgroundColor: theme[tone.color], width: earnedWidth },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })
            : null}
        </View>

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
  track: {
    width: '100%',
    height: space[4],
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radius.full,
  },
  segment: {
    flexBasis: 0,
    minWidth: 0,
    height: '100%',
  },
  earned: {
    height: '100%',
  },
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
