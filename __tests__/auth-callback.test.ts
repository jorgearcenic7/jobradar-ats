import type { SupabaseClient } from '@supabase/supabase-js';

import { completeAuthCallback } from '@/features/auth/callback';

const setSession = jest.fn();
const exchangeCodeForSession = jest.fn();
const client = { auth: { setSession, exchangeCodeForSession } } as unknown as SupabaseClient;

beforeEach(() => {
  jest.resetAllMocks();
  setSession.mockResolvedValue({ error: null });
  exchangeCodeForSession.mockResolvedValue({ error: null });
});

it('confirms a signup and distinguishes recovery from normal sign-in', async () => {
  await expect(
    completeAuthCallback(
      client,
      'https://app.test/auth/callback#access_token=test-access&refresh_token=test-refresh&type=signup',
    ),
  ).resolves.toBe('/mi-cuenta');
  expect(setSession).toHaveBeenCalledWith({
    access_token: 'test-access',
    refresh_token: 'test-refresh',
  });
  await expect(
    completeAuthCallback(
      client,
      'jobradarats://auth/callback#access_token=test-access&refresh_token=test-refresh&type=recovery',
    ),
  ).resolves.toBe('/recuperar?verified=1');
});

it('accepts a PKCE callback and propagates failed exchanges', async () => {
  await expect(
    completeAuthCallback(client, 'https://app.test/auth/callback?code=test-code&flow=recovery'),
  ).resolves.toBe('/recuperar?verified=1');
  expect(exchangeCodeForSession).toHaveBeenCalledWith('test-code');
  exchangeCodeForSession.mockResolvedValue({ error: new Error('expired') });
  await expect(
    completeAuthCallback(client, 'https://app.test/auth/callback?code=expired'),
  ).rejects.toThrow();
});

it.each([
  'https://app.test/auth/callback',
  'https://app.test/auth/callback#access_token=incomplete',
  'https://app.test/auth/callback#error=access_denied&error_description=untrusted',
  'https://app.test/auth/callback?error_code=otp_expired',
])('rejects missing, incomplete and expired callbacks without authenticating: %s', async (url) => {
  await expect(completeAuthCallback(client, url)).rejects.toThrow();
  expect(setSession).not.toHaveBeenCalled();
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
});

it('does not navigate on a rejected session', async () => {
  setSession.mockResolvedValue({ error: new Error('invalid token') });
  await expect(
    completeAuthCallback(
      client,
      'https://app.test/auth/callback#access_token=invalid&refresh_token=invalid',
    ),
  ).rejects.toThrow();
});
