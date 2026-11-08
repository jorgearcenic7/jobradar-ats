/*
Sección «Tu CV» de la pantalla del analizador: elige cómo se aporta el CV, un archivo o el texto
pegado, y muestra el campo de esa modalidad.

Las dos modalidades conservan su contenido por separado: el documento vive en `useCvImport` y el
texto pegado, en la pantalla. Cambiar de modalidad no borra ninguno de los dos; solo decide cuál
se analiza. Cuando la otra modalidad también tiene contenido, un aviso lo dice, para que nadie
analice un CV distinto del que cree.

En la app nativa todavía no se pueden importar archivos: no se ofrece el selector y solo queda el
texto pegado, con un aviso que lo explica.
*/
import type { Ref } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { CvFileField, type CvImport } from '@/features/cv-import';
import { space } from '@/shared/theme';
import { Notice } from '@/shared/ui/notice';
import { SegmentedControl, type SegmentedOption } from '@/shared/ui/segmented-control';
import { TextField } from '@/shared/ui/text-field';
import { Heading } from '@/shared/ui/themed-text';

export type CvMode = 'file' | 'paste';

const modes: readonly SegmentedOption<CvMode>[] = [
  { value: 'file', label: 'Archivo', icon: 'uploadFile' },
  { value: 'paste', label: 'Pegar texto', icon: 'contentPaste' },
];

export type CvSectionProps = {
  mode: CvMode;
  onModeChange: (mode: CvMode) => void;
  cvImport: CvImport;
  pastedCv: string;
  onPastedCvChange: (text: string) => void;
  /** Mensaje cuando el análisis no puede empezar por el CV. */
  error?: string;
  /** Campo del texto pegado, para llevar el foco a él si falta el CV. */
  pastedRef: Ref<TextInputInstance>;
};

/** Qué se conserva en la modalidad que no está elegida, o `null` si no hay nada. */
function keptContent(mode: CvMode, cvImport: CvImport, pastedCv: string) {
  if (mode === 'paste' && cvImport.state.kind === 'imported') {
    return `«${cvImport.state.cv.source.fileName}» se conserva en «Archivo». Con «Pegar texto» elegido, se analizará el texto pegado.`;
  }
  if (mode === 'file' && pastedCv.trim()) {
    return 'El texto que pegaste se conserva en «Pegar texto». Con «Archivo» elegido, se analizará el archivo.';
  }
  return null;
}

export function CvSection({
  mode,
  onModeChange,
  cvImport,
  pastedCv,
  onPastedCvChange,
  error,
  pastedRef,
}: CvSectionProps) {
  const kept = cvImport.canPickFile ? keptContent(mode, cvImport, pastedCv) : null;

  return (
    <View style={styles.section}>
      <Heading level={2}>Tu CV</Heading>
      {cvImport.canPickFile ? (
        <SegmentedControl
          accessibilityLabel="Cómo quieres añadir tu CV"
          options={modes}
          value={mode}
          onChange={onModeChange}
        />
      ) : null}
      {kept ? <Notice tone="info">{kept}</Notice> : null}

      {mode === 'file' ? (
        <CvFileField
          cvImport={cvImport}
          error={error}
          onPasteInstead={() => onModeChange('paste')}
        />
      ) : (
        <View style={styles.pasted}>
          <TextField
            ref={pastedRef}
            label="Texto del CV"
            helperText="Pega el texto completo de tu CV."
            error={error}
            value={pastedCv}
            onChangeText={onPastedCvChange}
            multiline
            autoCorrect={false}
          />
          {cvImport.canPickFile ? null : (
            <Notice tone="info">
              Importar un PDF o un Word todavía no está disponible en la app para iOS y Android. Por
              ahora, pega el texto de tu CV.
            </Notice>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space[3],
  },
  pasted: {
    gap: space[3],
  },
});
