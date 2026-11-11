/*
Un CV guardado en la lista: nombre, datos del archivo y sus acciones.

Renombrar y eliminar se resuelven dentro de la propia tarjeta. Eliminar siempre pide
confirmación, porque borra el archivo y el texto de la cuenta y no se puede deshacer.
*/
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Icon } from '@/shared/ui/icon';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';
import { ThemedText } from '@/shared/ui/themed-text';

import {
  formatFileSize,
  formatSavedDate,
  savedCvLimits,
  validateTitle,
  type SavedCv,
} from '../domain/saved-cv';
import { savedCvErrorMessage } from './messages';

const formatNames = { pdf: 'PDF', docx: 'Word' } as const;

function describe(cv: SavedCv) {
  const pages = cv.pageCount
    ? `${cv.pageCount} ${cv.pageCount === 1 ? 'página' : 'páginas'}`
    : null;
  const date = formatSavedDate(cv.createdAt);
  return [formatNames[cv.format], pages, formatFileSize(cv.byteSize), date && `Guardado el ${date}`]
    .filter(Boolean)
    .join(' · ');
}

export type SavedCvItemProps = {
  cv: SavedCv;
  onAnalyze: (cv: SavedCv) => Promise<void>;
  onRename: (cv: SavedCv, title: string) => Promise<void>;
  onDelete: (cv: SavedCv) => Promise<void>;
};

type Mode = 'idle' | 'rename' | 'confirm-delete';
type Busy = 'analyze' | 'rename' | 'delete' | null;

export function SavedCvItem({ cv, onAnalyze, onRename, onDelete }: SavedCvItemProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('idle');
  const [busy, setBusy] = useState<Busy>(null);
  const [draft, setDraft] = useState(cv.title);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const validation = validateTitle(draft);

  const run = async (kind: Exclude<Busy, null>, action: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    setError('');
    try {
      await action();
      // Tras eliminar, la tarjeta desaparece de la lista: no hay estado que restaurar.
      if (kind !== 'delete') setMode('idle');
    } catch (cause) {
      setError(
        savedCvErrorMessage(
          cause,
          kind === 'analyze' ? 'open' : kind === 'rename' ? 'rename' : 'delete',
        ),
      );
    } finally {
      setBusy(null);
    }
  };

  const rename = () => {
    setSubmitted(true);
    if (!validation.ok) return;
    const { title } = validation;
    if (title === cv.title) {
      setMode('idle');
      return;
    }
    void run('rename', () => onRename(cv, title));
  };

  return (
    // El grupo lleva el nombre del CV, para distinguir las acciones repetidas de cada tarjeta.
    <Card role="group" aria-label={cv.title} style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.accentSubtle }]}>
          <Icon name="document" size="sm" color="onAccentSubtle" />
        </View>
        <View style={styles.text}>
          <ThemedText step="headline" selectable>
            {cv.title}
          </ThemedText>
          <ThemedText step="footnote" color="textSecondary">
            {describe(cv)}
          </ThemedText>
          {cv.fileName !== cv.title ? (
            <ThemedText step="footnote" color="textTertiary" numberOfLines={1}>
              {`Archivo: ${cv.fileName}`}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {mode === 'rename' ? (
        <View style={styles.block}>
          <TextField
            label="Nuevo nombre"
            value={draft}
            onChangeText={setDraft}
            error={submitted && !validation.ok ? validation.message : undefined}
            disabled={busy === 'rename'}
            characterLimit={savedCvLimits.maxTitleLength}
          />
          <View style={styles.actions}>
            <Button label="Guardar nombre" loading={busy === 'rename'} onPress={rename} />
            <Button
              label="Cancelar"
              variant="secondary"
              disabled={busy === 'rename'}
              onPress={() => setMode('idle')}
            />
          </View>
        </View>
      ) : mode === 'confirm-delete' ? (
        <Notice
          tone="danger"
          title="¿Eliminar este CV?"
          actions={
            <>
              <Button
                label="Sí, eliminar"
                loading={busy === 'delete'}
                onPress={() => void run('delete', () => onDelete(cv))}
              />
              <Button
                label="Cancelar"
                variant="secondary"
                disabled={busy === 'delete'}
                onPress={() => setMode('idle')}
              />
            </>
          }>
          {`Se borrarán de tu cuenta el archivo «${cv.fileName}» y su texto. No se puede deshacer.`}
        </Notice>
      ) : (
        <View style={styles.actions}>
          <Button
            label="Analizar"
            icon="search"
            loading={busy === 'analyze'}
            onPress={() => void run('analyze', () => onAnalyze(cv))}
          />
          <Button
            label="Renombrar"
            variant="secondary"
            disabled={busy !== null}
            onPress={() => {
              setDraft(cv.title);
              setSubmitted(false);
              setError('');
              setMode('rename');
            }}
          />
          <Button
            label="Eliminar"
            variant="secondary"
            disabled={busy !== null}
            onPress={() => {
              setError('');
              setMode('confirm-delete');
            }}
          />
        </View>
      )}
      <View aria-live="polite">{error ? <Notice tone="danger">{error}</Notice> : null}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.icon,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: space[1],
  },
  block: {
    gap: space[3],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
});
