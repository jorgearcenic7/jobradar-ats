import { StyleSheet, View } from 'react-native';

import type { AnalysisComparison } from '@/features/cv-match/domain/compare';
import type { AnalysisResult, RequirementStatus } from '@/features/cv-match/domain/types';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

import { AnalysisChanges } from './analysis-changes';
import { CoverageSummary } from './coverage-summary';
import { statusGroupDescriptions, statusGroupTitles } from './labels';
import { RecommendationList } from './recommendation-list';
import { RequirementItem } from './requirement-item';

const groupOrder: RequirementStatus[] = ['supported', 'mentioned', 'missing', 'not-evaluable'];

type AnalysisResultsProps = {
  result: AnalysisResult;
  comparison: AnalysisComparison | null;
  offerChanged: boolean;
};

export function AnalysisResults({ result, comparison, offerChanged }: AnalysisResultsProps) {
  return (
    <View style={styles.results}>
      <CoverageSummary coverage={result.coverage} assessments={result.requirements} />
      {comparison ? <AnalysisChanges comparison={comparison} /> : null}
      {offerChanged ? (
        <ThemedText step="footnote" color="textSecondary">
          La oferta ha cambiado desde el análisis anterior, así que los resultados no se comparan
          con él.
        </ThemedText>
      ) : null}

      {/* Lo accionable va primero: las recomendaciones, antes del detalle de cada requisito. */}
      <RecommendationList recommendations={result.recommendations} />

      <Heading level={2}>Requisitos de la oferta</Heading>
      {result.requirements.length === 0 ? (
        // Ocupa el lugar de los grupos de requisitos, así que su título es también un `h3`.
        <Card>
          <EmptyState
            icon="info"
            level={3}
            title="No se ha reconocido ningún requisito en la oferta"
            description="Comprueba que el texto de la oferta incluye sus requisitos."
          />
        </Card>
      ) : (
        groupOrder.map((status) => {
          const items = result.requirements.filter((item) => item.status === status);
          if (items.length === 0) return null;
          return (
            <View key={status} style={styles.group}>
              <Heading level={3}>{`${statusGroupTitles[status]} (${items.length})`}</Heading>
              <ThemedText step="footnote" color="textSecondary">
                {statusGroupDescriptions[status]}
              </ThemedText>
              <View role="list" style={styles.group}>
                {items.map((item) => (
                  <RequirementItem key={item.requirement.id} assessment={item} />
                ))}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  results: {
    gap: space[4],
  },
  group: {
    gap: space[3],
  },
});
