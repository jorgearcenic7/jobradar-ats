/*
Baja de cuenta desde la app: llama a la Edge Function `delete-account` con el token de la sesión.

El borrado lo hace el servidor (ver `supabase/functions/delete-account`): la app nunca tiene la
clave secreta. Solo se da la baja por completada si la función responde `deleted`. Cualquier otra
respuesta, o ninguna, se informa como no confirmada, indicando el paso en que se detuvo.
*/
import type { SupabaseClient } from '@supabase/supabase-js';

export type DeletionFailure =
  /** No se han podido borrar todos los archivos; la cuenta sigue activa. */
  | 'files'
  /** Los archivos se han borrado, pero no los registros; la cuenta sigue activa. */
  | 'records'
  /** Los CV se han borrado, pero la cuenta sigue existiendo. */
  | 'account'
  /** El servidor no ha aceptado la sesión. */
  | 'session'
  /** Sin respuesta clara: no se sabe hasta dónde ha llegado. */
  | 'unknown';

export type AccountDeletion = { status: 'deleted' } | { status: 'failed'; reason: DeletionFailure };

const steps: readonly DeletionFailure[] = ['files', 'records', 'account'];

async function failureOf(error: unknown): Promise<DeletionFailure> {
  // Los errores HTTP de `functions.invoke` traen la respuesta en `context`.
  const response =
    error && typeof error === 'object' && 'context' in error && error.context instanceof Response
      ? error.context
      : null;
  if (!response) return 'unknown';
  if (response.status === 401) return 'session';
  const body: unknown = await response.json().catch(() => null);
  const step = body && typeof body === 'object' && 'step' in body ? body.step : null;
  return steps.find((known) => known === step) ?? 'unknown';
}

export async function deleteOwnAccount(client: SupabaseClient): Promise<AccountDeletion> {
  const { data, error } = await client.functions.invoke<{ status?: string }>('delete-account', {
    method: 'POST',
  });
  if (error) return { status: 'failed', reason: await failureOf(error) };
  if (data?.status !== 'deleted') return { status: 'failed', reason: 'unknown' };
  // La cuenta ya no existe: se retira la sesión de este dispositivo aunque el servidor la rechace.
  await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
  return { status: 'deleted' };
}
