import { Link, Redirect, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from './auth-provider';
import { AuthFrame } from './auth-frame';
import { getAuthClient } from './client';
import { authError } from './messages';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';

export function AccountScreen() {
  const { session, loading, configured } = useAuth();
  const { password } = useLocalSearchParams<{ password?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function signOut() {
    if (pending.current) return;
    const client = getAuthClient();
    if (!client) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
      router.replace('/acceso');
    } catch (cause) {
      setError(authError(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  if (!loading && configured && !session) return <Redirect href="/acceso" />;
  return (
    <AuthFrame title="Mi cuenta">
      {loading ? <ActivityIndicator accessibilityLabel="Cargando sesión" /> : null}
      {session ? (
        <>
          {password === 'updated' ? (
            <Notice tone="success">Tu contraseña se ha actualizado.</Notice>
          ) : null}
          <ThemedText step="headline">Sesión iniciada</ThemedText>
          <ThemedText selectable>{session.user.email}</ThemedText>
          <Link href="/recuperar">
            <ThemedText color="primary">Cambiar contraseña por email</ThemedText>
          </Link>
          <View aria-live="polite">{error ? <Notice tone="danger">{error}</Notice> : null}</View>
          <Button
            label="Cerrar sesión"
            variant="secondary"
            loading={busy}
            onPress={() => void signOut()}
          />
        </>
      ) : null}
      <Link href="/analisis">
        <ThemedText color="primary">Ir al analizador</ThemedText>
      </Link>
    </AuthFrame>
  );
}
