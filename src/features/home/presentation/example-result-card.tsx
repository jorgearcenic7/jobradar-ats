/*
Tarjeta «Resultado del análisis» de Inicio: enseña cómo se ven los resultados con un ejemplo
estático, que se presenta siempre como «Ejemplo ilustrativo». No sale del motor ni de ningún
análisis del usuario, y no se mezcla con datos reales.

Los estados usan las mismas etiquetas y tonos que `status-badge.tsx` del analizador; se repiten
aquí porque Inicio no depende de ese módulo. La barra es la misma de Resultados y reparte los
puntos con la regla que explica «Cómo se calcula la cobertura» (1, 0,5 o 0 por requisito).
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space, type ThemeColor } from '@/shared/theme';
import { Badge } from '@/shared/ui/badge';
import { SegmentedBar, type SegmentedBarTone } from '@/shared/ui/segmented-bar';
import { ThemedText } from '@/shared/ui/themed-text';

type ExampleStatus = 'supported' | 'mentioned' | 'missing';

const statuses: Record<
  ExampleStatus,
  { label: string; tone: SegmentedBarTone; dot: ThemeColor; points: number }
> = {
  supported: { label: 'Respaldado', tone: 'success', dot: 'successDot', points: 1 },
  mentioned: { label: 'Sin evidencia suficiente', tone: 'warning', dot: 'warningDot', points: 0.5 },
  missing: { label: 'No acreditado', tone: 'danger', dot: 'dangerDot', points: 0 },
};

const requirements: { name: string; detail: string; status: ExampleStatus }[] = [
  {
    name: 'Experiencia con Python',
    detail: '«3 años desarrollando APIs con Python y FastAPI»',
    status: 'supported',
  },
  {
    name: 'Metodologías ágiles (Scrum)',
    detail: '«Sprints de dos semanas en un equipo de seis personas»',
    status: 'supported',
  },
  {
    name: 'Inglés nivel C1',
    detail: 'Aparece en el CV, pero sin describir dónde lo usaste',
    status: 'mentioned',
  },
  { name: 'Certificación AWS', detail: 'No aparece en el CV', status: 'missing' },
];

const supported = requirements.filter((item) => item.status === 'supported').length;

// Un tramo por estado: vale tantos puntos como requisitos tiene y se rellena con los que aporta.
const barSegments = (Object.keys(statuses) as ExampleStatus[]).map((status) => {
  const count = requirements.filter((item) => item.status === status).length;
  return { key: status, tone: statuses[status].tone, weight: count, fill: statuses[status].points };
});

export function ExampleResultCard() {
  const theme = useTheme();

  return (
    <View
      role="group"
      aria-label="Ejemplo ilustrativo de un resultado"
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: theme.shadowExample,
        },
      ]}>
      <View style={[styles.header, { borderBottomColor: theme.divider }]}>
        <View style={styles.titleRow}>
          <ThemedText step="callout" style={styles.strong}>
            Resultado del análisis
          </ThemedText>
          <View style={[styles.example, { backgroundColor: theme.neutralSubtle }]}>
            <ThemedText step="caption" color="textSecondary">
              Ejemplo ilustrativo
            </ThemedText>
          </View>
        </View>
        <ThemedText step="footnote" color="textTertiary">
          Desarrollador/a Backend · {requirements.length} requisitos
        </ThemedText>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <View style={styles.figure}>
            <ThemedText step="heading" style={styles.figureValue}>
              {`${supported} de ${requirements.length}`}
            </ThemedText>
            <ThemedText step="callout" color="textSecondary">
              requisitos respaldados
            </ThemedText>
          </View>
          <View style={styles.legend}>
            {(Object.keys(statuses) as ExampleStatus[]).map((status) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: theme[statuses[status].dot] }]} />
                <ThemedText step="footnote" color="textSecondary">
                  {statuses[status].label}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
        {/* Las cifras ya están en el texto; la barra solo las dibuja. */}
        <SegmentedBar segments={barSegments} />
      </View>

      <View role="list">
        {requirements.map((item) => (
          <View
            key={item.name}
            role="listitem"
            style={[styles.row, { borderTopColor: theme.divider }]}>
            <View style={styles.rowText}>
              <ThemedText step="callout" style={styles.strong}>
                {item.name}
              </ThemedText>
              <ThemedText step="callout" color="textTertiary" style={styles.detail}>
                {item.detail}
              </ThemedText>
            </View>
            <Badge tone={statuses[item.status].tone} label={statuses[item.status].label} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
    paddingVertical: space[4],
    paddingHorizontal: space[6],
    borderBottomWidth: 1,
  },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[3] },
  strong: { fontWeight: 600 },
  example: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.xs },
  summary: { gap: space[4], paddingVertical: space[5], paddingHorizontal: space[6] },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[3],
  },
  figure: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: space[2] },
  figureValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
    letterSpacing: -0.6,
    fontVariant: ['tabular-nums'],
  },
  // Puede encogerse por debajo de su contenido: así sus elementos pasan de línea y no se cortan.
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
    minWidth: 0,
    columnGap: space[4],
    rowGap: space[1],
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  dot: { width: 8, height: 8, borderRadius: 2 },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[4],
    paddingHorizontal: space[6],
    borderTopWidth: 1,
  },
  rowText: { flexGrow: 1, flexShrink: 1, flexBasis: 220, minWidth: 0, gap: 2 },
  detail: { fontSize: 14, lineHeight: 21 },
});
