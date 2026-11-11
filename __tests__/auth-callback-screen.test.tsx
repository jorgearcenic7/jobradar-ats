import { render, screen } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import { useAuth } from '@/features/auth/auth-provider';
import { CallbackScreen } from '@/features/auth/callback-screen';
import { getAuthClient } from '@/features/auth/client';
import { SafeArea } from '../jest/safe-area';

jest.mock('@/features/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/auth/client', () => ({ getAuthClient: jest.fn() }));
jest.mock('expo-linking', () => ({ ...jest.requireActual('expo-linking'), useURL: jest.fn() }));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { replace: jest.fn() },
}));

const setSession = jest.fn();
const getUser = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useAuth).mockReturnValue({
    session: null,
    configured: true,
    loading: false,
    error: null,
  });
  jest.mocked(getAuthClient).mockReturnValue({
    auth: {
      setSession,
      getUser,
      getSession: async () => ({ data: { session: { user: { id: 'user-a' } } }, error: null }),
    },
  } as unknown as NonNullable<ReturnType<typeof getAuthClient>>);
});

it('explains that a link of another account keeps the current session', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'user-b' } }, error: null });
  jest
    .mocked(Linking.useURL)
    .mockReturnValue(
      'jobradarats://auth/callback#access_token=token-of-b&refresh_token=refresh-of-b&type=signup',
    );
  await render(<CallbackScreen />, { wrapper: SafeArea });
  expect(await screen.findByText(/Este enlace es de otra cuenta/)).toBeOnTheScreen();
  expect(setSession).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
});
