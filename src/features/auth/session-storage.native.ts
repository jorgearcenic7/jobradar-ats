import type { SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Each chunk has at most 400 code points / 1,600 UTF-8 bytes, below older Keychain limits.
// Write to an alternate bank and switch the manifest last to avoid partial sessions.
export const authSessionStorage: SupportedStorage = {
  async getItem(key) {
    const manifest = await SecureStore.getItemAsync(key);
    if (!manifest) return null;
    const { bank, count } = JSON.parse(manifest) as { bank: number; count: number };
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${bank}.${i}`)),
    );
    return chunks.some((chunk) => chunk === null) ? null : chunks.join('');
  },
  async setItem(key, value) {
    const previous = await SecureStore.getItemAsync(key);
    const old = previous ? (JSON.parse(previous) as { bank: number; count: number }) : null;
    const bank = old?.bank === 0 ? 1 : 0;
    const characters = Array.from(value);
    const count = Math.ceil(characters.length / 400);
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(
        `${key}.${bank}.${i}`,
        characters.slice(i * 400, (i + 1) * 400).join(''),
      );
    }
    await SecureStore.setItemAsync(key, JSON.stringify({ bank, count }));
    if (old) {
      for (let i = 0; i < old.count; i++)
        await SecureStore.deleteItemAsync(`${key}.${old.bank}.${i}`);
    }
  },
  async removeItem(key) {
    const previous = await SecureStore.getItemAsync(key);
    await SecureStore.deleteItemAsync(key);
    if (previous) {
      const { bank, count } = JSON.parse(previous) as { bank: number; count: number };
      for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${key}.${bank}.${i}`);
    }
  },
};
