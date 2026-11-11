import { FunctionsHttpError } from '@supabase/supabase-js';
import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { AccountScreen } from '@/features/auth/account-screen';
import { useAuth } from '@/features/auth/auth-provider';
import { getAuthClient } from '@/features/auth/client';
import { deleteOwnAccount } from '@/features/auth/delete-account';
import { SafeArea } from '../jest/safe-area';

jest.mock('@/features/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/auth/client', () => ({ getAuthClient: jest.fn() }));
jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  useLocalSearchParams: () => ({}),
  router: { replace: jest.fn() },
}));

const email = 'ana.ficticia@example.test';
const invoke = jest.fn();
const signOut = jest.fn();
const client = { functions: { invoke }, auth: { signOut } } as unknown as NonNullable<
  ReturnType<typeof getAuthClient>
>;

const httpError = (status: number, body: unknown) =>
  new FunctionsHttpError(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  jest.clearAllMocks();
  signOut.mockResolvedValue({ error: null });
  jest.mocked(getAuthClient).mockReturnValue(client);
  jest.mocked(useAuth).mockReturnValue({
    session: { user: { id: 'user-a', email } } as never,
    loading: false,
    configured: true,
    error: null,
  });
});

describe('deleteOwnAccount', () => {
  it('only reports a deletion the server confirmed', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    expect(await deleteOwnAccount(client)).toEqual({ status: 'deleted' });
    expect(invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });

    invoke.mockResolvedValueOnce({ data: {}, error: null });
    expect(await deleteOwnAccount(client)).toEqual({ status: 'failed', reason: 'unknown' });
  });

  it('keeps the session and names the step where the server stopped', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(500, { step: 'records' }) });
    expect(await deleteOwnAccount(client)).toEqual({ status: 'failed', reason: 'records' });
    invoke.mockResolvedValueOnce({ data: null, error: httpError(401, {}) });
    expect(await deleteOwnAccount(client)).toEqual({ status: 'failed', reason: 'session' });
    invoke.mockResolvedValueOnce({ data: null, error: new Error('network') });
    expect(await deleteOwnAccount(client)).toEqual({ status: 'failed', reason: 'unknown' });
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('Delete account section', () => {
  async function openConfirmation() {
    await render(<AccountScreen />, { wrapper: SafeArea });
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: 'Eliminar mi cuenta' }));
    return user;
  }

  it('requires typing the account email before calling the server', async () => {
    const user = await openConfirmation();
    const confirm = screen.getByRole('button', { name: 'Eliminar definitivamente' });
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText('Escribe tu email para confirmar'), 'otra@example.test');
    await user.press(confirm);
    expect(invoke).not.toHaveBeenCalled();

    invoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    await user.clear(screen.getByLabelText('Escribe tu email para confirmar'));
    await user.type(screen.getByLabelText('Escribe tu email para confirmar'), email);
    await user.press(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/acceso?cuenta=eliminada');
  });

  it('explains a partial deletion without claiming it is complete', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: httpError(500, { step: 'account' }) });
    const user = await openConfirmation();
    await user.type(screen.getByLabelText('Escribe tu email para confirmar'), email);
    await user.press(screen.getByRole('button', { name: 'Eliminar definitivamente' }));
    expect(
      await screen.findByText(/no se ha podido eliminar la cuenta, que sigue activa/),
    ).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Eliminar definitivamente' })).toBeOnTheScreen();
  });
});
