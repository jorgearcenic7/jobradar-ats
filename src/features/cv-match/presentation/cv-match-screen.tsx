/*
Preparar análisis (`/analisis`): el CV, la oferta y la acción «Analizar».

El estado vive en la sesión del analizador (`analysis-session.tsx`), compartida con Resultados.
La ruta le pasa qué hacer al terminar un análisis. La cabecera compartida ofrece los destinos
principales; la protección de salida se monta en el layout del analizador.
*/
import { StyleSheet, View } from 'react-native';

import type { AnalysisResult } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { space } from '@/shared/theme';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';
import { Screen } from '@/shared/ui/screen';

import { useAnalysisSession } from './analysis-session';
import { CvSection } from './cv-section';
import { formatPercent } from './labels';
import { OfferSection } from './offer-section';

function statusMessage(result: AnalysisResult | null, isOutdated: boolean) {
  if (!result) return '';
  if (isOutdated) return '';
  const { percentage, evaluated } = result.coverage;
  return percentage === null
    ? 'Último análisis: ningún requisito se ha podido evaluar.'
    : `Último análisis: ${formatPercent(percentage)} de cobertura en ${evaluated} requisitos evaluados.`;
}

export type CvMatchScreenProps = {
  /** Abre Resultados: tras un análisis correcto o para volver a ver el último. */
  onShowResults: () => void;
};

export function CvMatchScreen({ onShowResults }: CvMatchScreenProps) {
  const theme = useTheme();
  const session = useAnalysisSession();
  const { cvImport, match } = session;
  const { result, isOutdated } = match;
  // Si la validación falla, `analyze` marca los errores y lleva el foco al campo: no se navega.
  const analyze = () => {
    if (match.analyze()) onShowResults();
  };
  const status = statusMessage(result, isOutdated);

  return (
    <Screen style={styles.content}>
      <AppNavigation section="analysis" />
      <View style={styles.intro}>
        <ThemedText step="title" accessibilityRole="header">
          Analizar CV y oferta
        </ThemedText>
        <ThemedText step="callout" color="textSecondary">
          Compara tu CV con una oferta requisito a requisito y comprueba qué respalda tu CV con
          evidencias. El análisis se hace en este dispositivo: el texto no se guarda ni se envía a
          ningún servicio.
        </ThemedText>
      </View>

      <Card style={styles.form}>
        <CvSection
          mode={session.cvMode}
          onModeChange={session.setCvMode}
          cvImport={cvImport}
          pastedCv={session.pastedCv}
          onPastedCvChange={session.setPastedCv}
          error={session.cvError}
          pastedRef={session.cvRef}
        />
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
        <View style={styles.submit}>
          <Button label="Analizar" icon="arrowForward" onPress={analyze} style={styles.analyze} />
          {/* Siempre montada, para que los lectores de pantalla anuncien el estado del último análisis. */}
          <View aria-live="polite" style={styles.status}>
            {status ? (
              <>
                <ThemedText step="callout" color="textSecondary">
                  {status}
                </ThemedText>
                {/* Vuelve al último análisis cuando sigue correspondiendo a los datos. */}
                <Button
                  label="Ver resultados"
                  variant="secondary"
                  onPress={onShowResults}
                  style={styles.analyze}
                />
              </>
            ) : null}
          </View>
        </View>
        {/* A development aid, never part of the published app. */}
        {__DEV__ ? (
          <View style={[styles.demo, { borderColor: theme.border }]}>
            <ThemedText step="footnote" color="textSecondary">
              Demostración, solo en desarrollo: rellena el formulario con un CV y una oferta
              inventados.
            </ThemedText>
            <Button
              label="Cargar ejemplo ficticio"
              variant="secondary"
              onPress={session.loadSample}
              style={styles.analyze}
            />
          </View>
        ) : null}
      </Card>

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
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: space[6],
  },
  intro: {
    gap: space[2],
  },
  form: {
    // Wider than the label-to-field gap, so helper text never reads as the next field's.
    gap: space[6],
  },
  analyze: {
    alignSelf: 'flex-start',
  },
  submit: {
    gap: space[3],
  },
  status: {
    gap: space[3],
  },
  demo: {
    gap: space[2],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
});
