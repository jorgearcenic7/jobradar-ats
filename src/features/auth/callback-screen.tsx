import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';

import { AuthFrame } from './auth-frame';
import { completeAuthCallback, OtherAccountError } from './callback';
import { getAuthClient } from './client';
import { Notice } from '@/shared/ui/notice';
import { TextLink } from '@/shared/ui/text-link';

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
      .catch((cause) => {
        if (!active) return;
        setError(
          cause instanceof OtherAccountError
            ? 'Este enlace es de otra cuenta. Tu sesión actual sigue abierta y no se ha cambiado. Si quieres usar la otra cuenta, cierra sesión y vuelve a abrir el enlace.'
            : 'El enlace no es válido o ha caducado. Solicita un nuevo correo de confirmación o recuperación.',
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
          <TextLink href="/acceso" label="Acceder o reenviar confirmación" />
          <TextLink href="/recuperar" label="Solicitar recuperación" />
        </>
      ) : null}
    </AuthFrame>
  );
}
