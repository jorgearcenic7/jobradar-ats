import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { useCvImport, type CvImport } from '@/features/cv-import';
import type { AnalysisResult } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';
import { Screen } from '@/shared/ui/screen';
import { TextField } from '@/shared/ui/text-field';

import { AnalysisResults } from './analysis-results';
import { CvSection, type CvMode } from './cv-section';
import { formatPercent } from './labels';
import { sampleCv } from './sample-texts';
import { useCvMatch, type CvInput } from './use-cv-match';

function fileCvInput(cvImport: CvImport): CvInput {
  const input = cvImport.analysisInput;
  return {
    text: input?.canAnalyze ? input.text : null,
    sourceKey: `file-${cvImport.documentId ?? 'none'}`,
  };
}

/** Why the CV stops the analysis, worded for the way the CV is being provided. */
function cvErrorMessage(mode: CvMode, cvImport: CvImport) {
  if (mode === 'paste') return 'Pega el texto de tu CV para analizarlo.';
  const { state } = cvImport;
  if (state.kind !== 'imported') return 'Selecciona tu CV o pega su texto para analizarlo.';
  if (state.cv.status === 'failed') {
    return 'No se ha podido leer este CV. Selecciona otro archivo o pega el texto.';
  }
  return 'Este CV no tiene texto que se pueda analizar. Escríbelo en «Revisar el texto extraído», pégalo o selecciona otro archivo.';
}

function statusMessage(result: AnalysisResult | null, isOutdated: boolean) {
  if (!result) return '';
  if (isOutdated) return '';
  const { percentage, evaluated } = result.coverage;
  return percentage === null
    ? 'Análisis listo. Ningún requisito se ha podido evaluar; los detalles están debajo.'
    : `Análisis listo: ${formatPercent(percentage)} de cobertura en ${evaluated} requisitos evaluados. Los detalles están debajo.`;
}

export type CvMatchScreenProps = {
  /** Provisional way back until the tab navigation exists. */
  onGoHome: () => void;
};

export function CvMatchScreen({ onGoHome }: CvMatchScreenProps) {
  const theme = useTheme();
  const cvRef = useRef<TextInputInstance>(null);
  const offerRef = useRef<TextInputInstance>(null);
  const cvImport = useCvImport();
  // Uploading a PDF or DOCX is the main way in; pasting the text is the alternative, and the
  // only way where files cannot be imported yet (the native app).
  const [cvMode, setCvMode] = useState<CvMode>(cvImport.canPickFile ? 'file' : 'paste');
  const [pastedCv, setPastedCv] = useState('');
  const cv: CvInput =
    cvMode === 'paste' ? { text: pastedCv, sourceKey: 'paste' } : fileCvInput(cvImport);
  const match = useCvMatch(cv, (field) => (field === 'cv' ? cvRef : offerRef).current?.focus());
  const { result, comparison, offerChanged, isOutdated } = match;
  const cvError = match.errors.includes('cv') ? cvErrorMessage(cvMode, cvImport) : undefined;

  const loadSample = () => {
    setCvMode('paste');
    setPastedCv(sampleCv);
    match.loadSampleOffer();
  };

  return (
    <Screen style={styles.content}>
      <Button label="Volver al inicio" variant="secondary" onPress={onGoHome} style={styles.back} />
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
          mode={cvMode}
          onModeChange={setCvMode}
          cvImport={cvImport}
          pastedCv={pastedCv}
          onPastedCvChange={setPastedCv}
          error={cvError}
          pastedRef={cvRef}
        />
        <TextField
          ref={offerRef}
          label="Oferta de empleo"
          helperText="Pega la oferta completa, sin recortarla."
          error={
            match.errors.includes('offer')
              ? 'Pega el texto de la oferta para analizarla.'
              : undefined
          }
          value={match.offerText}
          onChangeText={match.changeOffer}
          multiline
          autoCorrect={false}
        />
        <View style={styles.submit}>
          <Button
            label="Analizar"
            icon="arrowForward"
            onPress={match.analyze}
            style={styles.analyze}
          />
          {/* Always mounted, so screen readers announce the result when it appears. */}
          <View aria-live="polite">
            {statusMessage(result, isOutdated) ? (
              <ThemedText step="callout" color="textSecondary">
                {statusMessage(result, isOutdated)}
              </ThemedText>
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
              onPress={loadSample}
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

      {result ? (
        <AnalysisResults result={result} comparison={comparison} offerChanged={offerChanged} />
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
  back: {
    alignSelf: 'flex-start',
  },
  analyze: {
    alignSelf: 'flex-start',
  },
  submit: {
    gap: space[3],
  },
  demo: {
    gap: space[2],
    paddingTop: space[4],
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
});
