import { StyleSheet, View } from 'react-native';

import type { RequirementAssessment } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { ThemedText } from '@/shared/ui/themed-text';

import { displayLabel, formatNumber, importanceLabels, roleLabels, sectionLabels } from './labels';
import { StatusBadge } from './status-badge';

// A requirement can match hundreds of lines of a long CV; a few are enough to explain it.
const VISIBLE_EVIDENCE = 3;

export function RequirementItem({ assessment }: { assessment: RequirementAssessment }) {
  const theme = useTheme();
  const { requirement, status, reason, evidence, contribution } = assessment;
  const hidden = evidence.length - VISIBLE_EVIDENCE;

  return (
    <Card role="listitem" style={styles.card}>
      <View style={styles.header}>
        <ThemedText step="headline" style={styles.title}>
          {displayLabel(requirement.label)}
        </ThemedText>
        <StatusBadge status={status} />
      </View>
      <ThemedText step="footnote" color="textSecondary">
        {importanceLabels[requirement.importance]} ·{' '}
        {contribution
          ? `Aporta ${formatNumber(contribution.points * contribution.weight)} de ${contribution.weight} ${
              contribution.weight === 1 ? 'punto' : 'puntos'
            }`
          : 'Fuera del porcentaje'}
      </ThemedText>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[3],
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  title: {
    flexShrink: 1,
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
