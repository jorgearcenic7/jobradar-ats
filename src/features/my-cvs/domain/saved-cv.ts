/*
Reglas de los CV guardados en la cuenta. Repiten los límites de la migración
`supabase/migrations/20261111120000_my_cvs.sql` para avisar antes de enviar nada; la base de
datos los vuelve a imponer, así que el cliente no es la única defensa.
*/

/** Formatos que se pueden guardar: los que el importador sabe leer. */
export type SavedCvFormat = 'pdf' | 'docx';

/** Un CV guardado, sin su texto: la lista no lo necesita y se pide solo al analizarlo. */
export type SavedCv = {
  id: string;
  title: string;
  fileName: string;
  format: SavedCvFormat;
  byteSize: number;
  pageCount: number | null;
  /** Ruta del archivo original en el bucket privado: `<user_id>/<id>.<formato>`. */
  filePath: string;
  /** Fecha ISO de creación. */
  createdAt: string;
};

export const savedCvLimits = {
  maxCvs: 20,
  maxTitleLength: 120,
  maxTextLength: 300_000,
} as const;

export const contentTypes: Record<SavedCvFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** Nombre propuesto al guardar: el del archivo sin extensión, recortado al máximo permitido. */
export function defaultTitle(fileName: string): string {
  const base = fileName.replace(/\.(pdf|docx)$/i, '').trim();
  return base.slice(0, savedCvLimits.maxTitleLength).trim() || 'Mi CV';
}

export type TitleValidation = { ok: true; title: string } | { ok: false; message: string };

export function validateTitle(raw: string): TitleValidation {
  const title = raw.trim();
  if (!title) return { ok: false, message: 'Escribe un nombre para el CV.' };
  if (title.length > savedCvLimits.maxTitleLength) {
    return {
      ok: false,
      message: `Usa como máximo ${savedCvLimits.maxTitleLength} caracteres.`,
    };
  }
  return { ok: true, title };
}

/** Tamaño legible: en KB por debajo de 100 KB, para que un CV pequeño no aparezca como «0,0 MB». */
export function formatFileSize(bytes: number): string {
  if (bytes < 100 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Fecha corta dd/mm/aaaa en hora local, sin `Intl` para que no varíe entre entornos. */
export function formatSavedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
