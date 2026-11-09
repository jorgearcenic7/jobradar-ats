import * as SecureStore from 'expo-secure-store';

import { authSessionStorage as storage } from '@/features/auth/session-storage.native';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
const items = new Map<string, string>();
beforeEach(() => {
  items.clear();
  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key) => items.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
    items.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
    items.delete(key);
  });
});

it('persists large Unicode sessions, replaces them and removes all active chunks', async () => {
  const value = JSON.stringify({ token: 'a'.repeat(8000), metadata: '😀á'.repeat(1500) });
  await storage.setItem('auth', value);
  expect(await storage.getItem('auth')).toBe(value);
  await storage.setItem('auth', 'replacement');
  expect(await storage.getItem('auth')).toBe('replacement');
  await storage.removeItem('auth');
  expect(await storage.getItem('auth')).toBeNull();
  expect(items.size).toBe(0);
});

it('keeps the previous session if writing a new session fails', async () => {
  await storage.setItem('auth', 'previous');
  jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('storage full'));
  await expect(storage.setItem('auth', 'new session')).rejects.toThrow('storage full');
  expect(await storage.getItem('auth')).toBe('previous');
});

it('does not return a partial session', async () => {
  await storage.setItem('auth', 'a'.repeat(1000));
  items.delete('auth.0.1');
  expect(await storage.getItem('auth')).toBeNull();
});
