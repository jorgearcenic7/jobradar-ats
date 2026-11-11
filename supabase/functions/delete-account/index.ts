/*
Edge Function `delete-account`: el usuario con sesión elimina su cuenta y todos sus CV.

Se ejecuta en Supabase (Deno), el único sitio donde existe la clave secreta: la app solo envía el
token de su sesión. El usuario se identifica validando ese token con Supabase Auth, nunca por un
dato que mande el cliente, así que cada llamada solo puede borrar la cuenta que la hace.

La respuesta no incluye datos del usuario ni mensajes internos: solo si terminó o en qué paso se
detuvo. Los registros tampoco guardan el id ni el email.
*/
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.119.0';

import { adminKeyFrom, deleteAccount, filePathsOf, type AccountStore } from './delete-account.ts';

// La app llama desde el navegador con el token en una cabecera, sin cookies.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const bucket = 'cvs';
const pageSize = 1000;

function json(status: number, body: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function supabaseStore(admin: SupabaseClient): AccountStore {
  const files = admin.storage.from(bucket);
  return {
    async listFiles(userId) {
      const paths: string[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await files.list(userId, { limit: pageSize, offset });
        if (error) throw error;
        // Una subcarpeta lanza un error y la baja se detiene en el paso de archivos.
        paths.push(...filePathsOf(userId, data));
        if (data.length < pageSize) return paths;
      }
    },
    async removeFiles(paths) {
      const { error } = await files.remove(paths);
      if (error) throw error;
    },
    async deleteRecords(userId) {
      const { error } = await admin.from('cvs').delete().eq('user_id', userId);
      if (error) throw error;
    },
    async countRecords(userId) {
      const { count, error } = await admin
        .from('cvs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error || count === null) throw error ?? new Error('count');
      return count;
    },
    async deleteUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { status: 'method-not-allowed' });

  // La clave privilegiada solo se usa aquí, para crear el cliente de servidor; nunca se devuelve.
  const url = Deno.env.get('SUPABASE_URL');
  const key = adminKeyFrom(
    Deno.env.get('SUPABASE_SECRET_KEYS'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  );
  if (!url || !key.ok) {
    console.error('delete-account: falta la URL o la clave de servidor, o no son válidas');
    return json(500, { status: 'misconfigured' });
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { status: 'unauthorized' });

  const admin = createClient(url, key.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  // Valida el token con Auth: una clave publicable o un token caducado no identifican a nadie.
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return json(401, { status: 'unauthorized' });

  const result = await deleteAccount(data.user.id, supabaseStore(admin));
  if (result.ok) return json(200, { status: 'deleted' });
  console.error(`delete-account: detenida en el paso ${result.step}`);
  return json(500, { status: 'failed', step: result.step });
});
