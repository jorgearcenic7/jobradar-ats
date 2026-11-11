/*
Acceso a «Mis CV» en Supabase: la tabla `public.cvs` y el bucket privado `cvs`.

Solo usa el cliente autenticado con la clave publicable; quién puede ver o cambiar cada CV lo
deciden las políticas RLS de la migración, no este archivo. Los errores del servidor se
convierten en categorías propias sin conservar su mensaje, para que ni el texto del CV ni los
detalles internos acaben en la interfaz o en un registro.
*/
import type { SupabaseClient } from '@supabase/supabase-js';

import { contentTypes, savedCvLimits, type SavedCv, type SavedCvFormat } from '../domain/saved-cv';

const bucket = 'cvs';
const columns = 'id, title, file_name, format, byte_size, page_count, file_path, created_at';

type SavedCvRow = {
  id: string;
  title: string;
  file_name: string;
  format: SavedCvFormat;
  byte_size: number;
  page_count: number | null;
  file_path: string;
  created_at: string;
};

export type SavedCvErrorKind =
  /** La cuenta ya tiene el máximo de CV guardados. */
  | 'limit'
  /** La sesión cambió de cuenta entre la confirmación y el guardado. */
  | 'account-changed'
  /** El CV ya no existe o no es de esta cuenta. */
  | 'not-found'
  | 'too-long'
  /** Red, permisos o cualquier otro fallo del servicio. */
  | 'request';

export class SavedCvError extends Error {
  constructor(readonly kind: SavedCvErrorKind) {
    super(kind);
    this.name = 'SavedCvError';
  }
}

function requestError(error: { code?: string; message?: string }): SavedCvError {
  // El trigger del límite lanza `cv_limit_reached` con el código P0001 de PL/pgSQL.
  if (error.code === 'P0001' && error.message === 'cv_limit_reached') {
    return new SavedCvError('limit');
  }
  return new SavedCvError('request');
}

function toSavedCv(row: SavedCvRow): SavedCv {
  return {
    id: row.id,
    title: row.title,
    fileName: row.file_name,
    format: row.format,
    byteSize: row.byte_size,
    pageCount: row.page_count,
    filePath: row.file_path,
    createdAt: row.created_at,
  };
}

/** CV guardados por la cuenta de la sesión, del más reciente al más antiguo. */
export async function listSavedCvs(client: SupabaseClient): Promise<SavedCv[]> {
  const { data, error } = await client
    .from('cvs')
    .select(columns)
    .order('created_at', { ascending: false });
  if (error) throw requestError(error);
  return (data as SavedCvRow[]).map(toSavedCv);
}

export type NewSavedCv = {
  title: string;
  fileName: string;
  format: SavedCvFormat;
  byteSize: number;
  pageCount: number | null;
  /** Texto que se analizará: el extraído o el corregido por el usuario. */
  text: string;
  /** Archivo original, tal como se leyó. */
  bytes: Uint8Array;
};

/**
 * Guarda un CV en la cuenta `userId`, la que el usuario vio al confirmar.
 *
 * Primero crea la fila, que fija la ruta del archivo, y después sube el original: la política
 * de Storage solo acepta archivos con su fila. Si la subida falla, borra la fila para no dejar
 * un CV a medias.
 */
export async function saveCv(
  client: SupabaseClient,
  userId: string,
  cv: NewSavedCv,
): Promise<SavedCv> {
  if (cv.text.length > savedCvLimits.maxTextLength) throw new SavedCvError('too-long');
  // Si entre la confirmación y este momento la sesión pasó a otra cuenta, no se guarda nada.
  const { data: current } = await client.auth.getSession();
  if (current.session?.user.id !== userId) throw new SavedCvError('account-changed');

  const { data, error } = await client
    .from('cvs')
    .insert({
      title: cv.title,
      file_name: cv.fileName,
      format: cv.format,
      byte_size: cv.byteSize,
      page_count: cv.pageCount,
      cv_text: cv.text,
    })
    .select(columns)
    .single();
  if (error) throw requestError(error);
  const saved = toSavedCv(data as SavedCvRow);

  const upload = await client.storage
    .from(bucket)
    .upload(saved.filePath, cv.bytes, { contentType: contentTypes[cv.format], upsert: false });
  if (upload.error) {
    await client.from('cvs').delete().eq('id', saved.id);
    throw new SavedCvError('request');
  }
  return saved;
}

export async function renameSavedCv(client: SupabaseClient, id: string, title: string) {
  const { data, error } = await client.from('cvs').update({ title }).eq('id', id).select('id');
  if (error) throw requestError(error);
  // RLS no da error con una fila ajena o borrada: simplemente no actualiza nada.
  if (!data?.length) throw new SavedCvError('not-found');
}

/** Borra el archivo y después la fila: si falla el archivo, el CV sigue visible para reintentar. */
export async function deleteSavedCv(client: SupabaseClient, cv: SavedCv) {
  const removal = await client.storage.from(bucket).remove([cv.filePath]);
  if (removal.error) throw requestError(removal.error);
  const { error } = await client.from('cvs').delete().eq('id', cv.id);
  if (error) throw requestError(error);
}

/** Texto guardado de un CV, que solo se descarga al ir a analizarlo. */
export async function loadSavedCvText(client: SupabaseClient, id: string): Promise<string> {
  const { data, error } = await client.from('cvs').select('cv_text').eq('id', id).maybeSingle();
  if (error) throw requestError(error);
  if (!data) throw new SavedCvError('not-found');
  return (data as { cv_text: string }).cv_text;
}
