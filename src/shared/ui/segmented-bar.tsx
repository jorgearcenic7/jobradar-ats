/*
Barra de cobertura compartida por Inicio (ejemplo ilustrativo) y Resultados, para que la promesa y
el resultado real se lean igual.

Cada tramo ocupa lo que vale su estado y se rellena con lo que aporta: el tono vivo (`*Dot`) es lo
conseguido y la pista del mismo tono (`*Track`), lo que falta. No conoce ninguna regla de
puntuación: quien la usa decide pesos y rellenos, y da el texto equivalente, porque la barra es
solo visual y se oculta a los lectores de pantalla.
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, type ThemeColor } from '@/shared/theme';

export type SegmentedBarTone = 'success' | 'warning' | 'danger';

const tones: Record<SegmentedBarTone, { track: ThemeColor; fill: ThemeColor }> = {
  success: { track: 'successTrack', fill: 'successDot' },
  warning: { track: 'warningTrack', fill: 'warningDot' },
  danger: { track: 'dangerTrack', fill: 'dangerDot' },
};

export type SegmentedBarSegment = {
  key: string;
  tone: SegmentedBarTone;
  /** Anchura relativa del tramo, por ejemplo los puntos posibles de un estado. */
  weight: number;
  /** Parte rellena, de 0 a 1. */
  fill: number;
  testID?: string;
  fillTestID?: string;
};

export function SegmentedBar({ segments }: { segments: readonly SegmentedBarSegment[] }) {
  const theme = useTheme();

  return (
    <View style={styles.bar} aria-hidden accessibilityElementsHidden>
      {segments.map(({ key, tone, weight, fill, testID, fillTestID }) => {
        if (weight <= 0) return null;
        const percentage = Math.min(100, Math.max(0, fill * 100));
        return (
          <View
            key={key}
            testID={testID}
            style={[
              styles.segment,
              { flexGrow: weight, backgroundColor: theme[tones[tone].track] },
            ]}>
            {percentage > 0 ? (
              <View
                testID={fillTestID}
                style={[
                  styles.fill,
                  {
                    width: `${percentage}%` as `${number}%`,
                    backgroundColor: theme[tones[tone].fill],
                  },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Un hueco de 3 px separa los estados sin necesidad de bordes.
  bar: { flexDirection: 'row', gap: 3, height: 10, width: '100%' },
  segment: {
    flexBasis: 0,
    minWidth: 0,
    height: '100%',
    overflow: 'hidden',
    borderRadius: radius.full,
  },
  fill: { height: '100%' },
});
