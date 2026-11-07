import { StyleSheet, View } from 'react-native';

import { formatCount } from '@/shared/format';
import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { Notice, type NoticeTone } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';
import { TextField } from '@/shared/ui/text-field';

import type { ImportedCv } from '../domain/types';
import {
  extractionCaution,
  failureMessage,
  formatMegabytes,
  issueMessage,
  issueTones,
} from './messages';
import { useHydrated, type CvImport } from './use-cv-import';

/*
Error de validación del CV, con el mismo aspecto que el error de un `TextField`: va junto a los
botones que lo resuelven y no en un recuadro, que queda para los avisos sobre el documento.
*/
function FieldError({ children }: { children: string }) {
  return (
    <View style={styles.fieldError}>
      <View style={styles.fieldErrorIcon}>
        <Icon name="error" size="sm" color="danger" />
      </View>
      <ThemedText step="callout" color="danger" style={styles.fieldErrorText}>
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

function DocumentStatus({ cvImport }: { cvImport: CvImport }) {
  const { state } = cvImport;
  switch (state.kind) {
    case 'empty':
      return null;
    case 'reading':
      return <Notice tone="info">{`Leyendo «${state.fileName}» en este dispositivo…`}</Notice>;
    case 'unavailable':
      return (
        <Notice tone="info">
          Importar archivos todavía no está disponible en esta versión de la app. Pega el texto del
          CV.
        </Notice>
      );
    case 'too-large':
      return (
        <Notice tone="danger">
          {`«${state.fileName}» ocupa ${formatMegabytes(state.byteSize)} y el límite es de ${formatMegabytes(state.maxBytes).replace(',0', '')}. Elige un archivo más pequeño o pega el texto.`}
        </Notice>
      );
    case 'needs-confirmation':
      // Las acciones van dentro del aviso: son la respuesta a su pregunta.
      return (
        <Notice
          tone="warning"
          actions={
            <>
              <Button
                label={`Leer las ${state.pageCount} páginas`}
                onPress={cvImport.confirmLongPdf}
              />
              <Button label="Cancelar" variant="secondary" onPress={cvImport.cancelLongPdf} />
            </>
          }>
          {`«${state.fileName}» tiene ${state.pageCount} páginas, más de las ${state.pageLimit} habituales en un CV. Se leerá completo, sin recortar nada. ¿Quieres continuar?`}
        </Notice>
      );
    case 'imported': {
      const { cv } = state;
      // El nombre del documento encabeza el aviso de su estado, que es lo que describe.
      if (cv.status === 'failed') {
        return (
          <Notice tone="danger" title={describeDocument(cv)}>
            {failureMessage(cv.failure)}
          </Notice>
        );
      }
      const summary: { tone: NoticeTone; text: string } =
        cv.status === 'blocked'
          ? { tone: 'danger', text: 'No hay texto que se pueda analizar.' }
          : cv.status === 'needs-review'
            ? { tone: 'warning', text: 'Texto extraído con avisos: revísalo antes de analizar.' }
            : {
                tone: 'success',
                text: `Texto extraído: ${formatCount(cv.extractedText.length)} caracteres.`,
              };
      return (
        <View style={styles.block}>
          <Notice tone={summary.tone} title={describeDocument(cv)}>
            {summary.text}
          </Notice>
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
        {error ? <FieldError>{error}</FieldError> : null}
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
  // Mismas medidas que el error de `TextField`.
  fieldError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[1],
  },
  fieldErrorIcon: {
    marginTop: 3,
  },
  fieldErrorText: {
    flexShrink: 1,
    minWidth: 0,
  },
});
