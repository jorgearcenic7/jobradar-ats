/*
Preparar análisis (`/analisis`): el CV, la oferta y la acción «Analizar».

El estado vive en la sesión del analizador (`analysis-session.tsx`), compartida con Resultados.
La ruta le pasa qué hacer al terminar un análisis. La cabecera compartida ofrece los destinos
principales; la protección de salida se monta en el layout del analizador.
*/
import { StyleSheet, View } from 'react-native';

import { cleanOfferText } from '@/features/cv-match/domain/offer-cleanup';
import type { AnalysisResult } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';
import { Screen } from '@/shared/ui/screen';

import { AnalysisStepper } from './analysis-stepper';
import { useAnalysisSession } from './analysis-session';
import { CvSection } from './cv-section';
import { formatPercent } from './labels';
import { OfferCleanupNotice } from './offer-cleanup-notice';
import { OfferSection } from './offer-section';

function statusMessage(result: AnalysisResult | null, isOutdated: boolean) {
  if (!result) return '';
  if (isOutdated) return '';
  const { percentage, evaluated } = result.coverage;
  return percentage === null
    ? 'Último análisis: ningún requisito se ha podido evaluar.'
    : `Último análisis: ${formatPercent(percentage)} de cobertura en ${evaluated} requisitos evaluados.`;
}

/** Qué falta para analizar, o `null` si ya está todo. Es una guía, no un error. */
function missingMessage(cvReady: boolean, offerReady: boolean) {
  if (!cvReady && !offerReady) return 'Falta añadir tu CV y la oferta';
  if (!cvReady) return 'Falta añadir tu CV';
  if (!offerReady) return 'Falta añadir la oferta';
  return null;
}

export type CvMatchScreenProps = {
  /** Abre Resultados: tras un análisis correcto o para volver a ver el último. */
  onShowResults: () => void;
};

export function CvMatchScreen({ onShowResults }: CvMatchScreenProps) {
  const theme = useTheme();
  const session = useAnalysisSession();
  const { cvImport, match, cvReady, offerReady } = session;
  const { result, isOutdated } = match;
  /*
  «Analizar» siempre se puede pulsar: si falta algo, la validación marca el error y lleva el foco
  al campo que falta, y no se navega. La ayuda de debajo lo anticipa sin desactivar el botón.
  */
  const analyze = () => {
    if (match.analyze()) onShowResults();
  };
  const status = statusMessage(result, isOutdated);
  const missing = missingMessage(cvReady, offerReady);

  return (
    <Screen header={<AppNavigation section="analysis" />} style={styles.content}>
      <View style={styles.top}>
        <View style={styles.intro}>
          <ThemedText step="title" accessibilityRole="header">
            Analizar CV y oferta
          </ThemedText>
          <ThemedText step="body" color="textTertiary">
            Añade tu CV y la oferta para revisar, requisito a requisito, qué puedes demostrar.
          </ThemedText>
        </View>
        <AnalysisStepper
          cvReady={cvReady}
          offerReady={offerReady}
          resultsReady={Boolean(result) && !isOutdated && !match.cvReplaced}
        />
      </View>

      {/* Dos columnas cuando caben, una debajo de otra en el móvil, sin consultar la ventana. */}
      <View style={styles.columns}>
        <Card style={styles.panel}>
          <CvSection
            mode={session.cvMode}
            onModeChange={session.setCvMode}
            cvImport={cvImport}
            pastedCv={session.pastedCv}
            onPastedCvChange={session.setPastedCv}
            error={session.cvError}
            pastedRef={session.cvRef}
            savedCvTitle={session.savedCvTitle}
          />
        </Card>
        <Card style={styles.panel}>
          <OfferSection
            value={match.offerText}
            onChange={match.changeOffer}
            error={
              match.errors.includes('offer')
                ? 'Pega el texto de la oferta para analizarla.'
                : undefined
            }
            fieldRef={session.offerRef}
          />
          <OfferCleanupNotice cleanup={cleanOfferText(match.offerText)} moment="before" />
        </Card>
      </View>

      {match.cvReplaced ? (
        <View aria-live="polite">
          <Notice tone="warning">
            Has cambiado de CV. Pulsa «Analizar» para ver los resultados del nuevo.
          </Notice>
        </View>
      ) : null}

      {isOutdated ? (
        <View aria-live="polite">
          <Notice tone="warning">
            Has cambiado el texto desde el último análisis. Pulsa «Analizar» para actualizar los
            resultados.
          </Notice>
        </View>
      ) : null}

      <Card style={styles.actionBar}>
        <View style={styles.actionRow}>
          <View style={styles.privacy}>
            <Icon name="lock" size="sm" color="textTertiary" />
            <ThemedText step="callout" color="textTertiary" style={styles.flexText}>
              El análisis se hace en este dispositivo: el texto no se guarda ni se envía a ningún
              servicio.
            </ThemedText>
          </View>
          <View style={styles.submit}>
            <Button
              label="Analizar"
              icon="arrowForward"
              iconPosition="end"
              size="large"
              onPress={analyze}
            />
            {missing ? (
              <ThemedText step="footnote" color="textTertiary" style={styles.missing}>
                {missing}
              </ThemedText>
            ) : null}
          </View>
        </View>
        {/* Siempre montada, para que los lectores de pantalla anuncien el estado del último análisis. */}
        <View aria-live="polite">
          {status ? (
            <View style={[styles.status, { borderTopColor: theme.divider }]}>
              <ThemedText step="callout" color="textSecondary" style={styles.flexText}>
                {status}
              </ThemedText>
              {/* Vuelve al último análisis cuando sigue correspondiendo a los datos. */}
              <Button label="Ver resultados" variant="secondary" onPress={onShowResults} />
            </View>
          ) : null}
        </View>
      </Card>

      {/* A development aid, never part of the published app. */}
      {__DEV__ ? (
        <View
          style={[
            styles.dev,
            { backgroundColor: theme.devBackground, borderColor: theme.devBorder },
          ]}>
          <View style={[styles.devBadge, { backgroundColor: theme.devBadge }]}>
            <ThemedText step="caption" color="devText" style={styles.devBadgeText}>
              SOLO DESARROLLO
            </ThemedText>
          </View>
          <ThemedText step="callout" color="devText" style={styles.devText}>
            Rellena el formulario con un CV y una oferta inventados.
          </ThemedText>
          <Button
            label="Cargar ejemplo ficticio"
            variant="secondary"
            onPress={session.loadSample}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[4],
  },
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[4],
    paddingTop: space[8],
    paddingBottom: space[4],
  },
  intro: {
    flexBasis: 420,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: space[2],
  },
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[4],
  },
  // Equivale a `repeat(auto-fit, minmax(min(100%, 420px), 1fr))`.
  panel: {
    flexBasis: 420,
    flexGrow: 1,
    maxWidth: '100%',
    minWidth: 0,
    padding: space[6],
  },
  actionBar: {
    gap: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[6],
  },
  /*
  En escritorio la privacidad queda a la izquierda y el botón a la derecha; en el móvil el botón
  pasa debajo y ocupa toda la fila, al alcance del pulgar.
  */
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[4],
  },
  // Puede encogerse por debajo de su base: en el móvil la tarjeta deja menos de 280 px.
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    flexBasis: 280,
    flexGrow: 3,
    flexShrink: 1,
    minWidth: 0,
  },
  submit: {
    flexBasis: 180,
    flexGrow: 1,
    maxWidth: 260,
    gap: space[1],
  },
  missing: { textAlign: 'center' },
  flexText: { flex: 1, minWidth: 0 },
  status: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[3],
    paddingTop: space[4],
    borderTopWidth: 1,
  },
  dev: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[6],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
  },
  devBadge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.xs },
  devBadgeText: { fontWeight: 700, letterSpacing: 0.6 },
  devText: { flexBasis: 240, flexGrow: 1, flexShrink: 1, minWidth: 0 },
});
