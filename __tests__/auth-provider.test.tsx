import type { Session } from '@supabase/supabase-js';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { getAuthClient } from '@/features/auth/client';

jest.mock('@/features/auth/client', () => ({ getAuthClient: jest.fn() }));
const unsubscribe = jest.fn();
const getSession = jest.fn();
let listener: (event: string, session: Session | null) => void;
const session = { user: { id: 'test-user', email: 'test@example.test' } } as Session;

beforeEach(() => {
  jest.clearAllMocks();
  getSession.mockResolvedValue({ data: { session }, error: null });
  jest.mocked(getAuthClient).mockReturnValue({
    auth: {
      getSession,
      onAuthStateChange: (callback: typeof listener) => {
        listener = callback;
        return { data: { subscription: { unsubscribe } } };
      },
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  } as unknown as NonNullable<ReturnType<typeof getAuthClient>>);
});

it('restores a session, follows auth events and unsubscribes on unmount', async () => {
  const { result, unmount } = await renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.session).toBe(session));
  expect(result.current.loading).toBe(false);
  await act(() => listener('SIGNED_OUT', null));
  expect(result.current.session).toBeNull();
  await unmount();
  expect(unsubscribe).toHaveBeenCalled();
});

it('does not overwrite a newer auth event with an older session read', async () => {
  let resolve!: (value: unknown) => void;
  getSession.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(() => listener('SIGNED_IN', session));
  await act(() => resolve({ data: { session: null }, error: null }));
  expect(result.current.session).toBe(session);
});

it('settles loading without configuration and exposes storage failures safely', async () => {
  jest.mocked(getAuthClient).mockReturnValueOnce(null);
  const missing = await renderHook(useAuth, { wrapper: AuthProvider });
  expect(missing.result.current).toMatchObject({
    configured: false,
    loading: false,
    session: null,
  });
  await missing.unmount();
  getSession.mockRejectedValue(new Error('private storage failure'));
  const { result } = await renderHook(useAuth, { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toMatch(/almacenamiento/);
  expect(result.current.error).not.toContain('private storage failure');
});
