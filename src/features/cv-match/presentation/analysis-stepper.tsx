/*
Progreso del análisis en Preparar: Tu CV, La oferta y Resultados.

Refleja el estado real de la sesión, sin guardar nada propio. Solo hay un paso en curso: el
primero que falta. Los completados llevan su marca aunque se hayan hecho en otro orden (por
ejemplo, la oferta antes que el CV), y Resultados queda pendiente hasta que hay un análisis que
corresponde a los datos actuales.

Tres columnas del mismo ancho en una sola fila a cualquier anchura: cada una tiene una barra que se
llena a medias mientras el paso está en curso y del todo al completarlo.

No es una región viva: el estado cambia al escribir y anunciarlo sería ruido. Cada paso dice su
estado en su nombre accesible, que se lee al recorrer la lista.
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { motion, radius, space, webTransition } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

type StepState = 'done' | 'current' | 'pending';

const stateLabels: Record<StepState, string> = {
  done: 'completado',
  current: 'en curso',
  pending: 'pendiente',
};

const fills: Record<StepState, `${number}%`> = { done: '100%', current: '50%', pending: '0%' };

export type AnalysisStepperProps = {
  cvReady: boolean;
  offerReady: boolean;
  resultsReady: boolean;
};

export function AnalysisStepper({ cvReady, offerReady, resultsReady }: AnalysisStepperProps) {
  const theme = useTheme();
  const completed = [cvReady, offerReady, resultsReady];
  const current = completed.indexOf(false);
  const steps = ['Tu CV', 'La oferta', 'Resultados'].map((label, index) => ({
    label,
    state: (completed[index] ? 'done' : index === current ? 'current' : 'pending') as StepState,
  }));

  return (
    <View role="list" aria-label="Pasos del análisis" style={styles.stepper}>
      {steps.map((step, index) => {
        const active = step.state !== 'pending';
        return (
          <View
            key={step.label}
            role="listitem"
            accessible
            accessibilityLabel={`Paso ${index + 1} de ${steps.length}, ${step.label}: ${stateLabels[step.state]}`}
            style={styles.step}>
            <View style={[styles.track, { backgroundColor: theme.neutralSubtle }]}>
              <View
                style={[
                  styles.fill,
                  { width: fills[step.state], backgroundColor: theme.primary },
                  webTransition(['width'], motion.duration.base),
                ]}
              />
            </View>
            <View style={styles.label}>
              <View
                style={[
                  styles.circle,
                  step.state === 'done'
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : {
                        backgroundColor: theme.surface,
                        borderColor: active ? theme.primary : theme.border,
                      },
                ]}>
                {step.state === 'done' ? (
                  <Icon name="check" size="xs" color="onPrimary" />
                ) : (
                  <ThemedText
                    step="caption"
                    color={active ? 'accentText' : 'textSecondary'}
                    style={styles.number}>
                    {index + 1}
                  </ThemedText>
                )}
              </View>
              <ThemedText
                step="footnote"
                color={active ? 'text' : 'textSecondary'}
                numberOfLines={1}
                style={styles.name}>
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
  // Junto al título cuando cabe y en su propia fila en el móvil, siempre con las tres columnas.
  stepper: {
    flexDirection: 'row',
    gap: space[2],
    flexBasis: 300,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: 420,
  },
  step: { flexBasis: 0, flexGrow: 1, minWidth: 0, gap: space[2] },
  track: { height: 4, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  label: { flexDirection: 'row', alignItems: 'center', gap: space[1] + 2, minWidth: 0 },
  circle: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: { fontWeight: 600, fontVariant: ['tabular-nums'], lineHeight: 14 },
  name: { flexShrink: 1, fontWeight: 500 },
});
