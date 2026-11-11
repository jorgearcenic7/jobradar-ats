/*
Guardar en la cuenta el CV recién importado.

Nada se envía sin dos pasos: «Guardar en Mis CV» solo abre una confirmación que nombra el archivo
y la cuenta de destino, y únicamente «Sí, guardar» lo sube. Cada documento importado empieza con
el formulario limpio (la pantalla lo monta con la clave del documento).
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { CvImport } from '@/features/cv-import';
import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';

import { defaultTitle, savedCvLimits, validateTitle, type SavedCvFormat } from '../domain/saved-cv';
import type { NewSavedCv } from '../infrastructure/cv-library';
import { savedCvErrorMessage } from './messages';

type SaveFormProps = {
  fileName: string;
  /** El texto que se guardará es el corregido por el usuario. */
  usesCorrection: boolean;
  /** Cuenta de destino, tal como la ve el usuario. */
  email: string;
  atLimit: boolean;
  onSave: (title: string) => Promise<void>;
};

function SaveForm({ fileName, usesCorrection, email, atLimit, onSave }: SaveFormProps) {
  const [title, setTitle] = useState(() => defaultTitle(fileName));
  const [step, setStep] = useState<'edit' | 'confirm' | 'saving' | 'saved'>('edit');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const validation = validateTitle(title);

  if (step === 'saved') {
    return (
      <Notice tone="success">{`«${title.trim()}» se ha guardado en Mis CV, en la cuenta ${email}.`}</Notice>
    );
  }

  const confirm = async () => {
    if (!validation.ok) return;
    setStep('saving');
    setError('');
    try {
      await onSave(validation.title);
      setStep('saved');
    } catch (cause) {
      setError(savedCvErrorMessage(cause, 'save'));
      setStep('edit');
    }
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Nombre del CV"
        helperText="Así aparecerá en tu lista. Puedes cambiarlo después."
        value={title}
        onChangeText={(text) => {
          setTitle(text);
          // Un nombre nuevo invalida la confirmación anterior: se vuelve a preguntar.
          if (step === 'confirm') setStep('edit');
        }}
        error={submitted && !validation.ok ? validation.message : undefined}
        disabled={step === 'saving'}
        characterLimit={savedCvLimits.maxTitleLength}
      />
      {atLimit ? (
        <Notice tone="warning">
          {`Ya tienes ${savedCvLimits.maxCvs} CV guardados, el máximo. Elimina alguno para guardar este.`}
        </Notice>
      ) : step === 'edit' ? (
        <Button
          label="Guardar en Mis CV"
          onPress={() => {
            setSubmitted(true);
            if (validation.ok) setStep('confirm');
          }}
          style={styles.action}
        />
      ) : (
        <Notice
          tone="warning"
          title="¿Guardar este CV en tu cuenta?"
          actions={
            <>
              <Button
                label="Sí, guardar"
                loading={step === 'saving'}
                onPress={() => void confirm()}
              />
              <Button
                label="Cancelar"
                variant="secondary"
                disabled={step === 'saving'}
                onPress={() => setStep('edit')}
              />
            </>
          }>
          {`Se guardarán el archivo «${fileName}» y su texto${usesCorrection ? ' corregido' : ''} en la cuenta ${email}. Solo tú puedes verlos, y puedes eliminarlos cuando quieras.`}
        </Notice>
      )}
      <View aria-live="polite">{error ? <Notice tone="danger">{error}</Notice> : null}</View>
    </View>
  );
}

export type SaveCvPanelProps = {
  cvImport: CvImport;
  email: string;
  atLimit: boolean;
  onSave: (cv: NewSavedCv) => Promise<unknown>;
};

/** Formulario de guardado del documento importado, si tiene texto y archivo que guardar. */
export function SaveCvPanel({ cvImport, email, atLimit, onSave }: SaveCvPanelProps) {
  const { state, analysisInput, original, documentId } = cvImport;
  if (state.kind !== 'imported' || documentId === null || !original) return null;
  const { cv } = state;
  const format = cv.source.format;
  if (cv.status === 'failed' || (format !== 'pdf' && format !== 'docx')) return null;
  // Sin texto analizable no hay nada útil que guardar; los avisos del documento ya lo explican.
  if (!analysisInput?.canAnalyze) return null;

  const { text, usesCorrection } = analysisInput;
  return (
    <SaveForm
      key={documentId}
      fileName={cv.source.fileName}
      usesCorrection={usesCorrection}
      email={email}
      atLimit={atLimit}
      onSave={async (title) => {
        await onSave({
          title,
          fileName: cv.source.fileName,
          format: format satisfies SavedCvFormat,
          byteSize: original.length,
          pageCount: cv.source.pageCount,
          text,
          bytes: original,
        });
      }}
    />
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space[3],
  },
  action: {
    alignSelf: 'flex-start',
  },
});
