/*
«Eliminar cuenta» en Mi cuenta.

Pide dos confirmaciones: abrir el aviso y escribir el email de la cuenta. Solo entonces se puede
pulsar «Eliminar definitivamente». Si el servidor se detiene a mitad, el mensaje dice qué se ha
borrado y qué no, y el aviso sigue abierto para reintentar.
*/
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';
import { TextLink } from '@/shared/ui/text-link';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

import { getAuthClient } from './client';
import { deleteOwnAccount, type DeletionFailure } from './delete-account';

const failureMessages: Record<DeletionFailure, string> = {
  files:
    'No se ha completado la baja: no se han podido borrar todos tus archivos. Tu cuenta sigue activa y puede que algunos CV ya no tengan su archivo. Vuelve a intentarlo.',
  records:
    'No se ha completado la baja: tus archivos se han borrado, pero no los datos de tus CV. Tu cuenta sigue activa. Vuelve a intentarlo.',
  account:
    'Tus CV y sus archivos se han borrado, pero no se ha podido eliminar la cuenta, que sigue activa. Vuelve a intentarlo.',
  session:
    'Tu sesión ya no es válida. Si ya habías eliminado la cuenta, no tienes que hacer nada más; si no, vuelve a iniciar sesión e inténtalo de nuevo.',
  unknown:
    'No se ha podido confirmar la baja. Puede que tu cuenta siga activa: vuelve a intentarlo dentro de unos minutos.',
};

export function DeleteAccountSection({ email }: { email: string }) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  async function remove() {
    const client = getAuthClient();
    if (!matches || pending.current || !client) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await deleteOwnAccount(client);
      if (result.status === 'deleted') {
        router.replace('/acceso?cuenta=eliminada');
        return;
      }
      setError(failureMessages[result.reason]);
    } catch {
      setError(failureMessages.unknown);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Heading level={2} step="headline">
        Eliminar cuenta
      </Heading>
      {/* El campo va antes que los botones: «Eliminar definitivamente» se activa al escribir. */}
      {confirming ? (
        <>
          <Notice tone="danger" title="¿Eliminar tu cuenta?">
            Se borrarán definitivamente todos tus CV guardados, con sus archivos, y después tu
            cuenta. No se puede deshacer.
          </Notice>
          <TextField
            label="Escribe tu email para confirmar"
            value={typed}
            onChangeText={setTyped}
            disabled={busy}
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.actions}>
            <Button
              label="Eliminar definitivamente"
              disabled={!matches}
              loading={busy}
              onPress={() => void remove()}
            />
            <Button
              label="Cancelar"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                setConfirming(false);
                setTyped('');
                setError('');
              }}
            />
          </View>
        </>
      ) : (
        <>
          <ThemedText step="callout" color="textSecondary">
            Borra tus CV guardados, sus archivos y tu cuenta. El analizador seguirá disponible sin
            cuenta.
          </ThemedText>
          <Button
            label="Eliminar mi cuenta"
            variant="secondary"
            onPress={() => setConfirming(true)}
            style={styles.start}
          />
        </>
      )}
      <View aria-live="polite">{error ? <Notice tone="danger">{error}</Notice> : null}</View>
      <TextLink
        href="/privacidad"
        step="footnote"
        label="Qué datos se guardan y cómo se eliminan"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[3] },
  start: { alignSelf: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
