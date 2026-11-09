/*
Progreso del análisis en Preparar: Tu CV, La oferta y Resultados.

Refleja el estado real de la sesión, sin guardar nada propio. Los dos primeros pasos se hacen en
esta pantalla, así que siempre están en curso o completados; Resultados queda pendiente hasta que
hay un análisis que corresponde a los datos actuales.

No es una región viva: el estado cambia al escribir y anunciarlo sería ruido. Cada paso dice su
estado en su nombre accesible, que se lee al recorrer la lista.
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

type StepState = 'done' | 'current' | 'pending';

const stateLabels: Record<StepState, string> = {
  done: 'completado',
  current: 'en curso',
  pending: 'pendiente',
};

export type AnalysisStepperProps = {
  cvReady: boolean;
  offerReady: boolean;
  resultsReady: boolean;
};

export function AnalysisStepper({ cvReady, offerReady, resultsReady }: AnalysisStepperProps) {
  const theme = useTheme();
  const steps: { label: string; state: StepState }[] = [
    { label: 'Tu CV', state: cvReady ? 'done' : 'current' },
    { label: 'La oferta', state: offerReady ? 'done' : 'current' },
    { label: 'Resultados', state: resultsReady ? 'done' : 'pending' },
  ];

  return (
    <View role="list" aria-label="Pasos del análisis" style={styles.stepper}>
      {steps.map((step, index) => {
        const pending = step.state === 'pending';
        return (
          <View key={step.label} style={styles.item}>
            {index > 0 ? (
              <View
                style={[styles.connector, { backgroundColor: theme.border }]}
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            ) : null}
            <View
              role="listitem"
              accessible
              accessibilityLabel={`Paso ${index + 1} de ${steps.length}, ${step.label}: ${stateLabels[step.state]}`}
              style={[
                styles.pill,
                pending
                  ? styles.pendingPill
                  : { borderColor: theme.border, backgroundColor: theme.surface },
              ]}>
              <View
                style={[
                  styles.circle,
                  { backgroundColor: pending ? theme.neutralSubtle : theme.primary },
                ]}>
                {step.state === 'done' ? (
                  <Icon name="check" size="xs" color="onPrimary" />
                ) : (
                  <ThemedText
                    step="caption"
                    color={pending ? 'textSecondary' : 'onPrimary'}
                    style={styles.number}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <ThemedText
                step="callout"
                color={pending ? 'textSecondary' : 'text'}
                style={styles.label}>
                {step.label}
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Nunca más ancho que la pantalla: los pasos que no caben pasan a la línea siguiente.
  stepper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: space[2],
    flexShrink: 1,
    maxWidth: '100%',
  },
  item: { flexDirection: 'row', alignItems: 'center' },
  connector: { width: space[4], height: 1, marginHorizontal: space[2] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[1],
    paddingLeft: space[1],
    paddingRight: space[3],
    borderWidth: 1,
    borderRadius: radius.full,
  },
  pendingPill: { borderColor: 'transparent' },
  circle: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontWeight: 600, fontVariant: ['tabular-nums'] },
  label: { fontWeight: 500 },
});
