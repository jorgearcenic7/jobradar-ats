import 'react-native-url-polyfill/auto';

import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { authSessionStorage } from './session-storage';

let client: SupabaseClient | null | undefined;

export function getAuthClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key || !/^https?:\/\//.test(url) || !key.startsWith('sb_publishable_')) {
    return (client = null);
  }
  try {
    client = createClient(url, key, {
      auth: {
        storage: authSessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'implicit',
        ...(Platform.OS !== 'web' ? { lock: processLock } : {}),
      },
    });
  } catch {
    client = null;
  }
  return client;
}
