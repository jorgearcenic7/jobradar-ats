/*
Resultados del análisis (`/analisis/resultados`).

Muestra el último análisis de la sesión con los mismos componentes que antes (`AnalysisResults`);
el rediseño de Resultados llegará en su propia fase. Sin análisis en esta sesión, por ejemplo al
abrir la dirección directamente o al recargar, muestra un estado vacío con la acción de prepararlo:
nunca recupera datos de una sesión anterior.

Al abrirse, en web el foco pasa al título, para que el teclado y los lectores de pantalla empiecen
por arriba en lugar de seguir donde estaba el botón «Analizar».
*/
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Notice } from '@/shared/ui/notice';
import { Screen } from '@/shared/ui/screen';
import { ThemedText } from '@/shared/ui/themed-text';

import { AnalysisResults } from './analysis-results';
import { useAnalysisSession } from './analysis-session';

const isWeb = process.env.EXPO_OS === 'web';

export type ResultsScreenProps = {
  /** Vuelve a Preparar conservando el CV y la oferta. */
  onEdit: () => void;
};

export function ResultsScreen({ onEdit }: ResultsScreenProps) {
  const { match } = useAnalysisSession();
  const { result, comparison, offerChanged, isOutdated, cvReplaced } = match;
  const titleRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (isWeb) titleRef.current?.focus();
  }, []);

  // Desde aquí no hay campos que enfocar: si falta algo, se vuelve a Preparar para corregirlo.
  const reanalyze = () => {
    if (!match.analyze()) onEdit();
  };

  return (
    <Screen style={styles.content}>
      {result || cvReplaced ? (
        <Button
          label="Editar CV u oferta"
          variant="secondary"
          onPress={onEdit}
          style={styles.start}
        />
      ) : null}
      {/* Destino del foco al abrir la pantalla; no es un control, así que no entra en la tabulación. */}
      <View ref={titleRef} tabIndex={-1} style={styles.focusTarget}>
        <ThemedText step="title" accessibilityRole="header">
          Resultados del análisis
        </ThemedText>
      </View>

      {/* Siempre montada, para anunciar que los resultados han quedado desactualizados. */}
      <View aria-live="polite">
        {result && isOutdated ? (
          <Notice tone="warning" actions={<Button label="Volver a analizar" onPress={reanalyze} />}>
            Has cambiado el CV o la oferta desde el último análisis. Estos resultados corresponden a
            la versión anterior.
          </Notice>
        ) : null}
      </View>

      {result ? (
        <AnalysisResults result={result} comparison={comparison} offerChanged={offerChanged} />
      ) : cvReplaced ? (
        <EmptyState
          title="Has cambiado de CV"
          description="Los resultados anteriores no corresponden al CV actual. Vuelve a analizar para ver los del nuevo."
          action={{ label: 'Volver a analizar', onPress: reanalyze }}
        />
      ) : (
        <EmptyState
          title="Todavía no hay resultados"
          description="Prepara un análisis con tu CV y una oferta para verlos aquí. Los datos solo se conservan mientras usas el analizador."
          action={{ label: 'Preparar análisis', onPress: onEdit }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[6],
  },
  start: {
    alignSelf: 'flex-start',
  },
  // El título recibe el foco por programa; no se dibuja un anillo porque no es interactivo.
  focusTarget: {
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
});
