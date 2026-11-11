import type { SupabaseClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export function authRedirectUrl(recovery = false) {
  const path = `/auth/callback${recovery ? '?flow=recovery' : ''}`;
  return Platform.OS === 'web' && typeof window !== 'undefined'
    ? `${window.location.origin}${path}`
    : Linking.createURL('auth/callback', { queryParams: recovery ? { flow: 'recovery' } : {} });
}

/** El enlace es válido, pero de una cuenta distinta a la que tiene la sesión abierta. */
export class OtherAccountError extends Error {
  constructor() {
    super('other-account');
    this.name = 'OtherAccountError';
  }
}

/*
Cualquiera puede enviar un enlace de callback con los tokens de su propia cuenta. Si se aceptara
con otra sesión abierta, el usuario pasaría sin aviso a la cuenta ajena y lo que guardase después
(un CV) acabaría en ella. Antes de sustituir la sesión se pregunta al servidor de quién es el token
(`getUser` lo valida sin guardar nada) y solo se acepta si es de la misma cuenta.

Los códigos PKCE no necesitan esta comprobación: solo se canjean con el verificador que guardó
este mismo dispositivo al iniciar el flujo, así que no se pueden inyectar desde un enlace ajeno.
*/
async function assertSameAccount(client: SupabaseClient, accessToken: string) {
  const { data: current } = await client.auth.getSession();
  if (!current.session) return;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw error ?? new Error('callback');
  if (data.user.id !== current.session.user.id) throw new OtherAccountError();
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
    await assertSameAccount(client, access);
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
