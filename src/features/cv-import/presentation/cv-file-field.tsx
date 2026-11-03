import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space, type ThemeColor } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { ThemedText } from '@/shared/ui/themed-text';
import { Icon, type IconName } from '@/shared/ui/icon';
import { TextField } from '@/shared/ui/text-field';

import type { ImportedCv } from '../domain/types';
import {
  extractionCaution,
  failureMessage,
  formatCount,
  formatMegabytes,
  issueMessage,
  issueTones,
} from './messages';
import { useHydrated, type CvImport } from './use-cv-import';

type Tone = { icon: IconName; color: ThemeColor };

function Notice({ tone, children }: { tone: Tone; children: string }) {
  return (
    <View style={styles.notice}>
      <Icon name={tone.icon} size="sm" color={tone.color} />
      <ThemedText
        step="callout"
        color={tone.color === 'textSecondary' ? 'text' : tone.color}
        style={styles.noticeText}>
        {children}
      </ThemedText>
    </View>
  );
}

function describeDocument(cv: ImportedCv) {
  const { fileName, format, pageCount } = cv.source;
  const kind = format === 'pdf' ? 'PDF' : format === 'docx' ? 'Word' : null;
  const pages = pageCount ? `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}` : null;
  return [fileName, kind, pages].filter(Boolean).join(' · ');
}

const tones = {
  success: { icon: 'checkCircle', color: 'success' },
  warning: { icon: 'warning', color: 'warning' },
  error: { icon: 'error', color: 'danger' },
  info: { icon: 'info', color: 'textSecondary' },
} satisfies Record<string, Tone>;

function DocumentStatus({ cvImport }: { cvImport: CvImport }) {
  const { state } = cvImport;
  switch (state.kind) {
    case 'empty':
      return null;
    case 'reading':
      return (
        <Notice tone={tones.info}>{`Leyendo «${state.fileName}» en este dispositivo…`}</Notice>
      );
    case 'unavailable':
      return (
        <Notice tone={tones.info}>
          Importar archivos todavía no está disponible en esta versión de la app. Pega el texto del
          CV.
        </Notice>
      );
    case 'too-large':
      return (
        <Notice tone={tones.error}>
          {`«${state.fileName}» ocupa ${formatMegabytes(state.byteSize)} y el límite es de ${formatMegabytes(state.maxBytes).replace(',0', '')}. Elige un archivo más pequeño o pega el texto.`}
        </Notice>
      );
    case 'needs-confirmation':
      return (
        <View style={styles.block}>
          <Notice tone={tones.warning}>
            {`«${state.fileName}» tiene ${state.pageCount} páginas, más de las ${state.pageLimit} habituales en un CV. Se leerá completo, sin recortar nada. ¿Quieres continuar?`}
          </Notice>
          <View style={styles.actions}>
            <Button
              label={`Leer las ${state.pageCount} páginas`}
              onPress={cvImport.confirmLongPdf}
            />
            <Button label="Cancelar" variant="secondary" onPress={cvImport.cancelLongPdf} />
          </View>
        </View>
      );
    case 'imported': {
      const { cv } = state;
      if (cv.status === 'failed') {
        return (
          <View style={styles.block}>
            <ThemedText step="callout" style={styles.fileName}>
              {describeDocument(cv)}
            </ThemedText>
            <Notice tone={tones.error}>{failureMessage(cv.failure)}</Notice>
          </View>
        );
      }
      const summary =
        cv.status === 'blocked'
          ? { tone: tones.error, text: 'No hay texto que se pueda analizar.' }
          : cv.status === 'needs-review'
            ? {
                tone: tones.warning,
                text: 'Texto extraído con avisos: revísalo antes de analizar.',
              }
            : {
                tone: tones.success,
                text: `Texto extraído: ${formatCount(cv.extractedText.length)} caracteres.`,
              };
      return (
        <View style={styles.block}>
          <ThemedText step="callout" style={styles.fileName}>
            {describeDocument(cv)}
          </ThemedText>
          <Notice tone={summary.tone}>{summary.text}</Notice>
          {cv.issues.map((issue, index) => (
            <Notice key={index} tone={issueTones[issue.level]}>
              {issueMessage(issue)}
            </Notice>
          ))}
        </View>
      );
    }
  }
}

export type CvFileFieldProps = {
  cvImport: CvImport;
  /** Message when the analysis cannot start because of the CV. */
  error?: string;
  onPasteInstead: () => void;
};

/** Picks a PDF or DOCX, shows how its text was read and lets the user review that text. */
export function CvFileField({ cvImport, error, onPasteInstead }: CvFileFieldProps) {
  const theme = useTheme();
  const hydrated = useHydrated();
  const { state } = cvImport;
  const cv = state.kind === 'imported' && state.cv.status !== 'failed' ? state.cv : null;

  return (
    <View style={styles.field}>
      <View style={styles.block}>
        {/* Second level: the screen title is the only heading above it. */}
        <ThemedText step="headline" accessibilityRole="header" aria-level={2}>
          Tu CV
        </ThemedText>
        <ThemedText step="callout" color="textSecondary">
          PDF con texto o Word (.docx), hasta 10 MB. Se lee en este dispositivo y no se guarda ni se
          envía a ningún servicio.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button
          label={state.kind === 'imported' ? 'Sustituir CV' : 'Seleccionar CV'}
          icon="add"
          variant="secondary"
          // Before hydration the button would not respond, so it does not look ready.
          disabled={!hydrated || state.kind === 'needs-confirmation'}
          loading={state.kind === 'reading'}
          onPress={cvImport.pick}
        />
        <Button label="Pegar texto en su lugar" variant="secondary" onPress={onPasteInstead} />
      </View>

      {/* Always mounted, so screen readers announce each change of the document status. */}
      <View aria-live="polite" style={styles.block}>
        <DocumentStatus cvImport={cvImport} />
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.dangerSubtle }]}>
            <Notice tone={tones.error}>{error}</Notice>
          </View>
        ) : null}
      </View>

      {cv ? (
        <View style={styles.block}>
          <TextField
            label="Texto del CV"
            helperText={
              cv.correctedText !== null
                ? 'Has corregido el texto. Se analizará esta versión; el archivo original no cambia.'
                : 'Puedes corregir errores de lectura. El archivo original no cambia.'
            }
            value={cv.correctedText ?? cv.extractedText}
            onChangeText={cvImport.reviseText}
            multiline
            autoCorrect={false}
          />
          {cv.correctedText !== null ? (
            <Button
              label="Restaurar el texto extraído"
              variant="secondary"
              onPress={cvImport.discardCorrection}
            />
          ) : null}
          <ThemedText step="footnote" color="textSecondary">
            {extractionCaution}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space[4],
  },
  block: {
    gap: space[2],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
  },
  noticeText: {
    flex: 1,
  },
  fileName: {
    fontWeight: 600,
  },
  errorBox: {
    padding: space[3],
    borderRadius: radius.md,
  },
});
