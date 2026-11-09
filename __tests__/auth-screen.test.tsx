import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AuthScreen } from '@/features/auth/auth-screen';
import { useAuth } from '@/features/auth/auth-provider';
import { getAuthClient } from '@/features/auth/client';
import { SafeArea } from '../jest/safe-area';

jest.mock('@/features/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/auth/client', () => ({ getAuthClient: jest.fn() }));
jest.mock('@/features/auth/callback', () => ({
  authRedirectUrl: (recovery = false) =>
    `https://app.test/auth/callback${recovery ? '?flow=recovery' : ''}`,
}));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({}),
  router: { replace: jest.fn() },
}));

const signInWithPassword = jest.fn();
const signUp = jest.fn();
const resetPasswordForEmail = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: null, configured: true, loading: false, error: null });
  jest.mocked(getAuthClient).mockReturnValue({
    auth: { signInWithPassword, signUp, resetPasswordForEmail },
  } as unknown as NonNullable<ReturnType<typeof getAuthClient>>);
});

it('keeps anonymous analysis available when configuration is missing', async () => {
  jest
    .mocked(useAuth)
    .mockReturnValue({ session: null, configured: false, loading: false, error: null });
  await render(<AuthScreen mode="login" />, { wrapper: SafeArea });
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Continuar sin cuenta' })).toBeOnTheScreen();
  expect(screen.getByText(/Falta configurar Supabase/)).toBeOnTheScreen();
});

it('validates input and translates invalid credentials without exposing server messages', async () => {
  signInWithPassword.mockResolvedValue({
    error: { code: 'invalid_credentials', message: 'private details' },
  });
  await render(<AuthScreen mode="login" />, { wrapper: SafeArea });
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(signInWithPassword).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Email'), 'user@example.test');
  await user.type(screen.getByLabelText('Contraseña'), 'password123');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByText('Email o contraseña incorrectos.')).toBeOnTheScreen();
  expect(screen.queryByText('private details')).toBeNull();
  expect(router.replace).not.toHaveBeenCalled();
});

it('requires confirmation and explains the signup email step', async () => {
  signUp.mockResolvedValue({ data: { session: null }, error: null });
  await render(<AuthScreen mode="signup" />, { wrapper: SafeArea });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), 'user@example.test');
  await user.type(screen.getByLabelText('Contraseña'), 'password123');
  await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(signUp).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText('Repite la contraseña'), 'password123');
  await user.press(screen.getByRole('button', { name: 'Crear cuenta' }));
  expect(await screen.findByText(/Revisa tu correo y abre el enlace/)).toBeOnTheScreen();
  expect(signUp.mock.calls[0][0].options.emailRedirectTo).toContain('auth/callback');
});

it('uses an enumeration-safe recovery message and a recovery callback', async () => {
  resetPasswordForEmail.mockResolvedValue({ error: null });
  await render(<AuthScreen mode="recovery" />, { wrapper: SafeArea });
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Email'), 'user@example.test');
  await user.press(screen.getByRole('button', { name: 'Enviar enlace de recuperación' }));
  await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalled());
  expect(resetPasswordForEmail.mock.calls[0][1].redirectTo).toContain('flow=recovery');
  expect(screen.getByText(/Si existe una cuenta/)).toBeOnTheScreen();
});
