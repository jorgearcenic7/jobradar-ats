import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { AuthFrame } from './auth-frame';
import { completeAuthCallback } from './callback';
import { getAuthClient } from './client';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';

export function CallbackScreen() {
  const [error, setError] = useState('');
  const task = useRef<Promise<string> | null>(null);
  const nativeUrl = Linking.useURL();
  useEffect(() => {
    let active = true;
    if (!task.current) {
      const rawUrl = Platform.OS === 'web' ? window.location.href : nativeUrl;
      if (!rawUrl) return;
      // Remove credentials even on failed/expired callbacks, before any network request.
      if (Platform.OS === 'web')
        window.history.replaceState(window.history.state, '', '/auth/callback');
      const client = getAuthClient();
      task.current = client
        ? completeAuthCallback(client, rawUrl)
        : Promise.reject(new Error('configuration'));
    }
    task.current
      .then((destination) => {
        if (active) router.replace(destination as '/mi-cuenta' | '/recuperar?verified=1');
      })
      .catch(() => {
        if (active)
          setError(
            'El enlace no es válido o ha caducado. Solicita un nuevo correo de confirmación o recuperación.',
          );
      });
    return () => {
      active = false;
    };
  }, [nativeUrl]);
  return (
    <AuthFrame title="Verificar enlace">
      <View aria-live="polite">
        {error ? (
          <Notice tone="danger">{error}</Notice>
        ) : (
          <ActivityIndicator accessibilityLabel="Verificando enlace" />
        )}
      </View>
      {error ? (
        <>
          <Link href="/acceso">
            <ThemedText color="primary">Acceder o reenviar confirmación</ThemedText>
          </Link>
          <Link href="/recuperar">
            <ThemedText color="primary">Solicitar recuperación</ThemedText>
          </Link>
        </>
      ) : null}
    </AuthFrame>
  );
}
