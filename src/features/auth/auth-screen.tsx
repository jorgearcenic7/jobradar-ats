import { Redirect, Link, router, useLocalSearchParams } from 'expo-router';
import { useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, View, type TextInputInstance } from 'react-native';

import { useAuth } from './auth-provider';
import { AuthFrame } from './auth-frame';
import { authRedirectUrl } from './callback';
import { getAuthClient } from './client';
import { authError } from './messages';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { TextField } from '@/shared/ui/text-field';
import { ThemedText } from '@/shared/ui/themed-text';

type Mode = 'login' | 'signup' | 'recovery';
const subscribe = () => () => {};

export function AuthScreen({ mode }: { mode: Mode }) {
  const { session, loading, configured } = useAuth();
  const { verified, cuenta } = useLocalSearchParams<{ verified?: string; cuenta?: string }>();
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const updatePassword = hydrated && mode === 'recovery' && verified === '1';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const pending = useRef(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const needsPassword = mode !== 'recovery' || updatePassword;
  const newPassword = mode === 'signup' || updatePassword;
  const emailError =
    !updatePassword && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
      ? 'Introduce un email válido.'
      : undefined;
  const passwordError =
    needsPassword && (!password || (newPassword && password.length < 8))
      ? newPassword
        ? 'Usa al menos 8 caracteres.'
        : 'Introduce tu contraseña.'
      : undefined;
  const confirmationError =
    newPassword && password !== confirmation ? 'Las contraseñas no coinciden.' : undefined;
  const disabled = !configured || loading || busy || (updatePassword && !session);
  const title = updatePassword
    ? 'Nueva contraseña'
    : mode === 'signup'
      ? 'Crear cuenta'
      : mode === 'recovery'
        ? 'Recuperar contraseña'
        : 'Acceder';

  async function submit(resend = false) {
    if (disabled || pending.current) return;
    setSubmitted(true);
    setError('');
    setMessage('');
    if (emailError || (!resend && (passwordError || confirmationError))) return;
    const client = getAuthClient();
    if (!client) return;
    pending.current = true;
    setBusy(true);
    try {
      if (resend) {
        const { error } = await client.auth.resend({
          type: 'signup',
          email: email.trim(),
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        setMessage(
          'Si la cuenta necesita confirmación, recibirás un nuevo enlace. Revisa también spam.',
        );
      } else if (updatePassword) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setPassword('');
        setConfirmation('');
        router.replace('/mi-cuenta?password=updated');
      } else if (mode === 'recovery') {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirectUrl(true),
        });
        if (error) throw error;
        setMessage(
          'Si existe una cuenta con ese email, recibirás un enlace para cambiar la contraseña. Revisa también spam.',
        );
      } else if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        setPassword('');
        setConfirmation('');
        setSubmitted(false);
        if (data.session) router.replace('/mi-cuenta');
        else
          setMessage(
            'Revisa tu correo y abre el enlace para confirmar tu cuenta antes de entrar. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.',
          );
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        setPassword('');
        router.replace('/mi-cuenta');
      }
    } catch (cause) {
      setError(authError(cause));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (session && mode !== 'recovery') return <Redirect href="/mi-cuenta" />;
  return (
    <AuthFrame title={title}>
      {loading ? <ActivityIndicator accessibilityLabel="Cargando sesión" /> : null}
      {mode === 'login' && cuenta === 'eliminada' && !session ? (
        <Notice tone="success">Tu cuenta y tus CV guardados se han eliminado.</Notice>
      ) : null}
      {updatePassword && !loading && !session ? (
        <Notice tone="warning">
          Necesitas un enlace de recuperación válido. Solicita uno nuevo.
        </Notice>
      ) : null}
      {!updatePassword ? (
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          inputMode="email"
          autoComplete="email"
          textContentType="emailAddress"
          autoCapitalize="none"
          autoCorrect={false}
          disabled={disabled}
          error={submitted ? emailError : undefined}
          enterKeyHint={needsPassword ? 'next' : 'send'}
          onSubmitEditing={() => (needsPassword ? passwordRef.current?.focus() : void submit())}
        />
      ) : null}
      {needsPassword ? (
        <TextField
          ref={passwordRef}
          label={updatePassword ? 'Nueva contraseña' : 'Contraseña'}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={newPassword ? 'new-password' : 'current-password'}
          textContentType={newPassword ? 'newPassword' : 'password'}
          autoCapitalize="none"
          autoCorrect={false}
          disabled={disabled}
          helperText={newPassword ? 'Al menos 8 caracteres.' : undefined}
          error={submitted ? passwordError : undefined}
          enterKeyHint={newPassword ? 'next' : 'go'}
          onSubmitEditing={() => (newPassword ? confirmRef.current?.focus() : void submit())}
        />
      ) : null}
      {newPassword ? (
        <TextField
          ref={confirmRef}
          label="Repite la contraseña"
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          disabled={disabled}
          error={submitted ? confirmationError : undefined}
          enterKeyHint="go"
          onSubmitEditing={() => void submit()}
        />
      ) : null}
      <View aria-live="polite">
        {error ? <Notice tone="danger">{error}</Notice> : null}
        {message ? <Notice tone="success">{message}</Notice> : null}
      </View>
      <Button
        label={
          updatePassword
            ? 'Guardar contraseña'
            : mode === 'signup'
              ? 'Crear cuenta'
              : mode === 'recovery'
                ? 'Enviar enlace de recuperación'
                : 'Entrar'
        }
        loading={busy}
        disabled={disabled}
        onPress={() => void submit()}
      />
      {mode !== 'recovery' ? (
        <Button
          label="Reenviar confirmación"
          variant="secondary"
          disabled={disabled}
          onPress={() => void submit(true)}
        />
      ) : null}
      {mode === 'login' ? (
        <>
          <Link href="/registro">
            <ThemedText color="primary">Crear una cuenta</ThemedText>
          </Link>
          <Link href="/recuperar">
            <ThemedText color="primary">He olvidado mi contraseña</ThemedText>
          </Link>
        </>
      ) : (
        <Link href="/acceso">
          <ThemedText color="primary">Volver a acceder</ThemedText>
        </Link>
      )}
      {updatePassword && !session ? (
        <Link href="/recuperar">
          <ThemedText color="primary">Solicitar otro enlace</ThemedText>
        </Link>
      ) : null}
      <Link href="/analisis">
        <ThemedText color="primary">Continuar sin cuenta</ThemedText>
      </Link>
    </AuthFrame>
  );
}
