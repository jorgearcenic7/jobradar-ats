/*
Modalidad «Archivo» de la sección del CV: elegir un PDF o un Word, ver qué se ha leído y revisar
el texto extraído.

El documento, su texto y las correcciones del usuario viven en `useCvImport`, fuera de este
componente. Por eso plegar «Revisar el texto extraído», que desmonta el campo, o cambiar a «Pegar
texto», que desmonta todo el componente, no pierde nada: al volver se muestra el mismo estado.
Aquí solo se guarda si el bloque de revisión está abierto.
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import type { BadgeTone } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Disclosure } from '@/shared/ui/disclosure';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';
import { TextField } from '@/shared/ui/text-field';

import type { ImportedCv } from '../domain/types';
import { FileCard } from './file-card';
import {
  extractionCaution,
  failureMessage,
  formatMegabytes,
  issueMessage,
  issueTones,
} from './messages';
import { useHydrated, type CvImport } from './use-cv-import';

/*
Error de validación del CV, con el mismo aspecto que el error de un `TextField`: va junto a la
zona que lo resuelve y no en un recuadro, que queda para los avisos sobre el documento.
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

// Etiqueta del estado de la lectura en la tarjeta; el detalle de cada problema va en los avisos.
const statusBadges: Record<ImportedCv['status'], { tone: BadgeTone; label: string }> = {
  ready: { tone: 'success', label: 'Texto extraído' },
  'needs-review': { tone: 'warning', label: 'Revisa el texto' },
  blocked: { tone: 'danger', label: 'Sin texto que analizar' },
  failed: { tone: 'danger', label: 'No se ha podido leer' },
};

type FieldActions = { onPick: () => void; pickDisabled: boolean; onPasteInstead: () => void };

/** Zona para elegir un archivo cuando todavía no hay ninguno que mostrar. */
function Dropzone({
  onPick,
  pickDisabled,
  invalid,
}: Omit<FieldActions, 'onPasteInstead'> & {
  invalid: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.dropzone,
        { borderColor: theme[invalid ? 'danger' : 'borderStrong'], backgroundColor: theme.surface },
      ]}>
      <View style={[styles.tile, { backgroundColor: theme.accentSubtle }]}>
        <Icon name="uploadFile" size="lg" color="onAccentSubtle" />
      </View>
      <Button
        label="Seleccionar PDF o Word"
        variant="secondary"
        disabled={pickDisabled}
        onPress={onPick}
        style={styles.pick}
      />
      <ThemedText step="footnote" color="textSecondary" style={styles.centered}>
        PDF con texto o Word (.docx), hasta 10 MB. Se lee en este dispositivo y no se guarda ni se
        envía a ningún servicio.
      </ThemedText>
    </View>
  );
}

function DocumentStatus({
  cvImport,
  onPick,
  pickDisabled,
  onPasteInstead,
}: FieldActions & { cvImport: CvImport }) {
  const { state } = cvImport;
  const pasteInstead = (
    <Button label="Pegar texto en su lugar" variant="secondary" onPress={onPasteInstead} />
  );
  switch (state.kind) {
    case 'empty':
      return null;
    case 'reading':
      return (
        <FileCard
          fileName={state.fileName}
          format={null}
          pageCount={null}
          characterCount={null}
          status={null}
          onReplace={onPick}
        />
      );
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
      const card = (
        <FileCard
          fileName={cv.source.fileName}
          format={cv.source.format}
          pageCount={cv.source.pageCount}
          characterCount={cv.status === 'failed' ? null : cv.extractedText.length}
          status={statusBadges[cv.status]}
          corrected={cv.status !== 'failed' && cv.correctedText !== null}
          onReplace={onPick}
          replaceDisabled={pickDisabled}
        />
      );
      if (cv.status === 'failed') {
        return (
          <View style={styles.block}>
            {card}
            <Notice tone="danger" actions={pasteInstead}>
              {failureMessage(cv.failure)}
            </Notice>
          </View>
        );
      }
      return (
        <View style={styles.block}>
          {card}
          {/* Un error impide analizar el texto: el aviso ofrece la alternativa de pegarlo. */}
          {cv.issues.map((issue, index) => (
            <Notice
              key={index}
              tone={issueTones[issue.level]}
              actions={issue.level === 'error' ? pasteInstead : undefined}>
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
  const { state, documentId } = cvImport;
  const cv = state.kind === 'imported' && state.cv.status !== 'failed' ? state.cv : null;
  // Antes de hidratar el botón no respondería, así que no se presenta como disponible.
  const pickDisabled = !hydrated || state.kind === 'needs-confirmation';
  const showDropzone =
    state.kind === 'empty' || state.kind === 'unavailable' || state.kind === 'too-large';
  // La región de anuncios está siempre montada; solo separa cuando tiene algo debajo de la zona.
  const statusBelowDropzone = showDropzone && (state.kind !== 'empty' || Boolean(error));

  /*
  El bloque de revisión empieza plegado tras una lectura correcta y abierto cuando hay avisos que
  revisar, como en el prototipo. Lo que decide el usuario se recuerda solo para ese documento:
  con un archivo nuevo vuelve a valer el estado inicial.
  */
  const [review, setReview] = useState<{ documentId: number; expanded: boolean } | null>(null);
  const reviewExpanded =
    cv !== null && documentId !== null && review?.documentId === documentId
      ? review.expanded
      : cv?.status === 'needs-review';

  return (
    <View>
      {showDropzone ? (
        <Dropzone onPick={cvImport.pick} pickDisabled={pickDisabled} invalid={Boolean(error)} />
      ) : null}

      {/* Siempre montada, para que los lectores de pantalla anuncien cada cambio del documento. */}
      <View aria-live="polite" style={[styles.block, statusBelowDropzone && styles.belowDropzone]}>
        <DocumentStatus
          cvImport={cvImport}
          onPick={cvImport.pick}
          pickDisabled={pickDisabled}
          onPasteInstead={onPasteInstead}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </View>

      {cv && documentId !== null ? (
        <Disclosure
          header="Revisar el texto extraído"
          expanded={reviewExpanded}
          onToggle={(expanded) => setReview({ documentId, expanded })}>
          <View style={styles.review}>
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
                style={styles.restore}
              />
            ) : null}
            <ThemedText step="footnote" color="textSecondary">
              {extractionCaution}
            </ThemedText>
          </View>
        </Disclosure>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space[3],
  },
  belowDropzone: {
    marginTop: space[3],
  },
  dropzone: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[2],
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  tile: {
    width: space[8],
    height: space[8],
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flexBasis: '100%',
    textAlign: 'left',
  },
  pick: { flex: 1 },
  review: {
    gap: space[3],
    paddingBottom: space[1],
  },
  restore: {
    alignSelf: 'flex-start',
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
