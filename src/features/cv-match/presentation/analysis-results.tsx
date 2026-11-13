import { useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { AnalysisComparison } from '@/features/cv-match/domain/compare';
import type { SemanticReview } from '@/features/cv-match/domain/semantic-candidates';
import type { AnalysisResult, RequirementStatus } from '@/features/cv-match/domain/types';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { EmptyState } from '@/shared/ui/empty-state';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

import { AnalysisChanges } from './analysis-changes';
import { CoverageSummary } from './coverage-summary';
import { FilterChips, type RequirementFilter } from './filter-chips';
import { statusGroupDescriptions, statusGroupTitles } from './labels';
import { RecommendationList } from './recommendation-list';
import { RequirementItem } from './requirement-item';
import { ResultsColumns } from './results-layout';

const groupOrder: RequirementStatus[] = ['supported', 'mentioned', 'missing', 'not-evaluable'];

type AnalysisResultsProps = {
  result: AnalysisResult;
  comparison: AnalysisComparison | null;
  offerChanged: boolean;
  /** Bloque del análisis semántico opcional, tras las recomendaciones. */
  semanticPanel?: ReactNode;
  /** Posibles relaciones semánticas por requisito; no cambian ningún estado. */
  semanticReview?: SemanticReview;
};

export function AnalysisResults({
  result,
  comparison,
  offerChanged,
  semanticPanel,
  semanticReview,
}: AnalysisResultsProps) {
  const [filter, setFilter] = useState<RequirementFilter>('all');
  const [otherExpanded, setOtherExpanded] = useState(false);
  const allFilterRef = useRef<ComponentRef<typeof View>>(null);
  const counts = { all: result.requirements.length, missing: 0, mentioned: 0, supported: 0 };
  for (const item of result.requirements) {
    if (item.status !== 'not-evaluable') counts[item.status] += 1;
  }

  return (
    <ResultsColumns
      summary={
        <>
          <CoverageSummary coverage={result.coverage} assessments={result.requirements} />
          {comparison ? <AnalysisChanges comparison={comparison} /> : null}
          {offerChanged ? (
            <ThemedText step="footnote" color="textSecondary">
              La oferta ha cambiado desde el análisis anterior, así que los resultados no se
              comparan con él.
            </ThemedText>
          ) : null}

          {/* Lo accionable va primero: las recomendaciones, antes del detalle de cada requisito. */}
          <RecommendationList recommendations={result.recommendations} />
          {semanticPanel}
        </>
      }
      requirements={
        <>
          <Heading level={2}>Requisitos de la oferta</Heading>
          <FilterChips counts={counts} value={filter} onChange={setFilter} allRef={allFilterRef} />
          {filter !== 'all' && counts[filter] === 0 ? (
            <Card>
              <EmptyState
                icon="info"
                level={3}
                title="No hay requisitos con este estado"
                description="Selecciona otro filtro o vuelve a ver todos los requisitos."
                action={{
                  label: 'Ver todos los requisitos',
                  onPress: () => {
                    setFilter('all');
                    allFilterRef.current?.focus();
                  },
                }}
              />
            </Card>
          ) : null}
          {result.requirements.length === 0 ? (
            // Ocupa el lugar de los grupos de requisitos, así que su título es también un `h3`.
            filter === 'all' ? (
              <Card>
                <EmptyState
                  icon="info"
                  level={3}
                  title="No se ha reconocido ningún requisito en la oferta"
                  description="Comprueba que el texto de la oferta incluye sus requisitos."
                />
              </Card>
            ) : null
          ) : (
            groupOrder.map((status) => {
              // Los no evaluables conservan su grupo, incluso al filtrar los estados evaluables.
              if (filter !== 'all' && status !== filter && status !== 'not-evaluable') return null;
              const items = result.requirements.filter((item) => item.status === status);
              if (items.length === 0) return null;
              const content = (
                <>
                  <Heading level={3}>{`${statusGroupTitles[status]} (${items.length})`}</Heading>
                  <ThemedText step="footnote" color="textSecondary">
                    {statusGroupDescriptions[status]}
                  </ThemedText>
                  <View role="list" style={styles.group}>
                    {items.map((item) => (
                      <RequirementItem
                        key={item.requirement.id}
                        assessment={item}
                        related={semanticReview?.[item.requirement.id]}
                      />
                    ))}
                  </View>
                </>
              );
              return (
                <View key={status} style={styles.group}>
                  {status === 'not-evaluable' ? (
                    <>
                      <Disclosure
                        header={`Otros elementos detectados · ${items.length} ${items.length === 1 ? 'no evaluable' : 'no evaluables'}`}
                        expanded={otherExpanded}
                        onToggle={setOtherExpanded}>
                        <View style={styles.group}>{content}</View>
                      </Disclosure>
                      <ThemedText step="footnote" color="textSecondary">
                        Fuera del porcentaje de cobertura.
                      </ThemedText>
                    </>
                  ) : (
                    content
                  )}
                </View>
              );
            })
          )}
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space[3],
  },
});
