/*
Modalidad «Archivo» de la sección del CV: elegir un PDF o un Word, ver qué se ha leído y revisar
el texto extraído.

El documento, su texto y las correcciones del usuario viven en `useCvImport`, fuera de este
componente. Por eso plegar «Revisar el texto extraído», que desmonta el campo, o cambiar a «Pegar
texto», que desmonta todo el componente, no pierde nada: al volver se muestra el mismo estado.
Aquí solo se guarda si el bloque de revisión está abierto.
*/
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import type { BadgeTone } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Disclosure } from '@/shared/ui/disclosure';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';
import { TextField } from '@/shared/ui/text-field';

import type { DroppedFile } from '../domain/readers';
import type { ImportedCv } from '../domain/types';
import { DropTarget } from './drop-target';
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

type FieldActions = { onPick: () => void; pickDisabled: boolean; onPasteInstead?: () => void };

const formats = ['PDF con texto', 'Word (.docx)', 'Máx. 10 MB'];

/*
Zona para elegir un archivo cuando todavía no hay ninguno que mostrar. Toda la zona es un único
botón, con el mismo nombre que tenía el botón de selección; en la web también acepta un archivo
arrastrado. El texto visible lo explica, y el botón no tiene controles anidados.
*/
function Dropzone({
  onPick,
  onDrop,
  pickDisabled,
  invalid,
}: Omit<FieldActions, 'onPasteInstead'> & {
  onDrop: (file: DroppedFile) => void;
  invalid: boolean;
}) {
  const theme = useTheme();
  const [focusVisible, setFocusVisible] = useState(false);
  const [dragging, setDragging] = useState(false);

  return (
    <DropTarget disabled={pickDisabled} onDragChange={setDragging} onDrop={onDrop}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Seleccionar PDF o Word"
        aria-disabled={pickDisabled}
        disabled={pickDisabled}
        onPress={onPick}
        onFocus={(event) => setFocusVisible(isKeyboardFocus(event))}
        onBlur={() => setFocusVisible(false)}
        // `hovered` solo llega en la web (React Native Web); los tipos de React Native no lo declaran.
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => {
          const active = dragging || ((pressed || hovered) && !pickDisabled);
          return [
            styles.dropzone,
            {
              borderColor: invalid ? theme.danger : active ? theme.primary : theme.dropzoneBorder,
              backgroundColor: active ? theme.surfaceSelected : theme.dropzoneBackground,
            },
            focusVisible && { ...focusRing, outlineColor: theme.focusRing },
          ];
        }}>
        <View style={[styles.dropIcon, { backgroundColor: theme.accentSubtle }]}>
          <Icon name="uploadFile" size="lg" color="onAccentSubtle" />
        </View>
        <ThemedText step="headline" style={styles.centered}>
          {dragging ? 'Suelta el archivo para leerlo' : 'Arrastra tu CV aquí'}
        </ThemedText>
        <ThemedText step="callout" color="textSecondary" style={styles.centered}>
          o{' '}
          <ThemedText step="callout" color="accentText" style={styles.link}>
            selecciona un archivo
          </ThemedText>{' '}
          de tu equipo
        </ThemedText>
        <View style={styles.formats}>
          {formats.map((format) => (
            <View key={format} style={[styles.format, { backgroundColor: theme.neutralSubtle }]}>
              <ThemedText step="footnote" color="textSecondary">
                {format}
              </ThemedText>
            </View>
          ))}
        </View>
      </Pressable>
    </DropTarget>
  );
}

function DocumentStatus({
  cvImport,
  onPick,
  pickDisabled,
  onPasteInstead,
}: FieldActions & { cvImport: CvImport }) {
  const { state } = cvImport;
  // Fuera del analizador (en «Mis CV») no hay texto pegado al que cambiar.
  const pasteInstead = onPasteInstead ? (
    <Button label="Pegar texto en su lugar" variant="secondary" onPress={onPasteInstead} />
  ) : undefined;
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
  /** Cambia a pegar el texto; sin él, no se ofrece esa alternativa. */
  onPasteInstead?: () => void;
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
        <Dropzone
          onPick={cvImport.pick}
          onDrop={cvImport.importDropped}
          pickDisabled={pickDisabled}
          invalid={Boolean(error)}
        />
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
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    padding: space[6],
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  dropIcon: {
    width: 48,
    height: 48,
    marginBottom: space[2],
    borderRadius: radius.icon,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  link: { fontWeight: 600 },
  formats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[2],
  },
  format: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
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
