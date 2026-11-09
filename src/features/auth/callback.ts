import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export function authRedirectUrl(recovery = false) {
  const path = `/auth/callback${recovery ? '?flow=recovery' : ''}`;
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}${path}`
    : Linking.createURL('auth/callback', { queryParams: recovery ? { flow: 'recovery' } : {} });
}

export async function completeAuthCallback(client: SupabaseClient, rawUrl: string) {
  const url = new URL(rawUrl);
  const hash = new URLSearchParams(url.hash.slice(1));
  const query = url.searchParams;
  // Never surface error_description, which is untrusted URL input.
  if (
    hash.has('error') ||
    query.has('error') ||
    hash.has('error_code') ||
    query.has('error_code')
  ) {
    throw new Error('callback');
  }
  const access = hash.get('access_token');
  const refresh = hash.get('refresh_token');
  const code = query.get('code');
  let recovery = hash.get('type') === 'recovery';
  if (access && refresh) {
    const { error } = await client.auth.setSession({
      access_token: access,
      refresh_token: refresh,
    });
    if (error) throw error;
  } else if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    recovery = query.get('flow') === 'recovery';
  } else {
    throw new Error('callback');
  }
  return recovery ? '/recuperar?verified=1' : '/mi-cuenta';
}
