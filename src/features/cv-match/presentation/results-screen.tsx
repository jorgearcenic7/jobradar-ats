/*
Resultados del análisis (`/analisis/resultados`).

Muestra el último análisis de la sesión con `AnalysisResults`. Sin análisis en esta sesión, al
abrir la dirección directamente o al recargar, muestra un estado vacío con la acción de prepararlo:
nunca recupera datos de una sesión anterior.

Al abrirse, en web el foco pasa al título, para que el teclado y los lectores de pantalla empiecen
por arriba en lugar de seguir donde estaba el botón «Analizar».
*/
import { useEffect, useRef, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Notice } from '@/shared/ui/notice';
import { Screen } from '@/shared/ui/screen';
import { ThemedText } from '@/shared/ui/themed-text';

import { AnalysisResults } from './analysis-results';
import { OfferCleanupNotice } from './offer-cleanup-notice';
import { useAnalysisSession } from './analysis-session';
import { ResultsPage } from './results-layout';
import { SemanticPanel } from './semantic-panel';
import { useSemanticReview } from './use-semantic-review';

const isWeb = process.env.EXPO_OS === 'web';

export type ResultsScreenProps = {
  /** Vuelve a Preparar conservando el CV y la oferta. */
  onEdit: () => void;
};

export function ResultsScreen({ onEdit }: ResultsScreenProps) {
  const { match } = useAnalysisSession();
  const { result, comparison, offerChanged, isOutdated, cvReplaced, analyzedCvText } = match;
  const semantic = useSemanticReview(result, analyzedCvText);
  const titleRef = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    if (isWeb) titleRef.current?.focus();
  }, []);

  // Desde aquí no hay campos que enfocar: si falta algo, se vuelve a Preparar para corregirlo.
  const reanalyze = () => {
    if (!match.analyze()) onEdit();
  };

  return (
    <Screen
      header={<AppNavigation section="analysis" />}
      style={[styles.content, isWeb && styles.webContent]}>
      <ResultsPage>
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            {/* El título conserva su destino de foco y queda antes de la acción contextual. */}
            <View ref={titleRef} tabIndex={-1} style={styles.focusTarget}>
              <ThemedText step="title" accessibilityRole="header">
                Resultados del análisis
              </ThemedText>
            </View>
            {result || cvReplaced ? (
              <Button
                label="Editar CV u oferta"
                variant="secondary"
                onPress={onEdit}
                style={styles.edit}
              />
            ) : null}
          </View>
          {/* Siempre montada, pero sin reservar separaciones cuando no hay aviso. */}
          <View aria-live="polite">
            {result && isOutdated ? (
              <View style={styles.notice}>
                <Notice
                  tone="warning"
                  actions={<Button label="Volver a analizar" onPress={reanalyze} />}>
                  Has cambiado el CV o la oferta desde el último análisis. Estos resultados
                  corresponden a la versión anterior.
                </Notice>
              </View>
            ) : null}
          </View>
        </View>

        {result ? <OfferCleanupNotice cleanup={match.offerCleanup} moment="after" /> : null}
        {result ? (
          <AnalysisResults
            result={result}
            comparison={comparison}
            offerChanged={offerChanged}
            semanticReview={semantic.state.kind === 'ready' ? semantic.state.review : undefined}
            semanticPanel={
              <SemanticPanel
                state={semantic.state}
                onActivate={() => void semantic.activate()}
                onRemove={() => void semantic.remove()}
              />
            }
          />
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
      </ResultsPage>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[6],
  },
  // ResultsPage aplica el límite responsive en web; Screen conserva márgenes y áreas seguras.
  webContent: {
    maxWidth: '100%',
  },
  titleBlock: {
    paddingTop: space[6],
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  edit: {
    paddingVertical: space[2],
  },
  notice: {
    marginTop: space[3],
  },
  // El título recibe el foco por programa; no se dibuja un anillo porque no es interactivo.
  focusTarget: {
    maxWidth: '100%',
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
});
