/*
Baja de cuenta: borra todo lo del usuario en un orden que nunca deja archivos huérfanos.

1. Archivos del bucket `cvs`, con la Storage API: borrarlos por SQL dejaría el archivo en el bucket.
   Después se vuelve a listar la carpeta y, si queda algo, se detiene.
2. Filas de `public.cvs`, comprobando después que no queda ninguna.
3. La cuenta de Supabase Auth. Supabase no borra un usuario que aún tenga archivos, así que este
   paso también actúa como última comprobación.

Cada paso solo empieza si el anterior terminó, y el resultado dice en cuál se detuvo, para que la
app no anuncie una baja completa que no lo es. Repetir la operación es seguro: los pasos ya hechos
no encuentran nada que borrar.

No depende de Deno ni de supabase-js: `index.ts` le pasa las operaciones reales y las pruebas de
Jest, unas en memoria.
*/

export type DeletionStep = 'files' | 'records' | 'account';

export type DeletionResult = { ok: true } | { ok: false; step: DeletionStep };

/** Operaciones con privilegios de servidor sobre los datos de un usuario. */
export type AccountStore = {
  /** Rutas completas de todos los archivos de la carpeta del usuario; falla si hay subcarpetas. */
  listFiles(userId: string): Promise<string[]>;
  removeFiles(paths: string[]): Promise<void>;
  deleteRecords(userId: string): Promise<void>;
  countRecords(userId: string): Promise<number>;
  deleteUser(userId: string): Promise<void>;
};

/** Una entrada del listado de Storage: los archivos tienen `id`; las carpetas, `null`. */
export type StorageEntry = { name: string; id: string | null };

export class UnexpectedFolderError extends Error {
  constructor() {
    super('unexpected-folder');
    this.name = 'UnexpectedFolderError';
  }
}

/*
La app nunca crea subcarpetas dentro de la carpeta del usuario. Si aparece una, la baja se detiene:
ignorarla haría parecer vacío un almacenamiento que no lo está, y borrar en recursivo eliminaría
algo que la app no conoce. La carpeta queda para revisarla a mano.
*/
export function filePathsOf(userId: string, entries: StorageEntry[]): string[] {
  if (entries.some((entry) => entry.id === null)) throw new UnexpectedFolderError();
  return entries.map((entry) => `${userId}/${entry.name}`);
}

export type AdminKey = { ok: true; key: string } | { ok: false };

/**
 * Elige la clave privilegiada: la `default` de `SUPABASE_SECRET_KEYS` o, si esa variable no la
 * trae, la `SUPABASE_SERVICE_ROLE_KEY` antigua.
 *
 * Un `SUPABASE_SECRET_KEYS` con JSON no válido es un error de configuración: no se usa ninguna
 * clave, y el resultado no lleva el contenido de la variable, para que no acabe en una respuesta
 * ni en un registro.
 */
export function adminKeyFrom(
  secretKeys: string | undefined,
  legacyKey: string | undefined,
): AdminKey {
  if (secretKeys) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(secretKeys);
    } catch {
      return { ok: false };
    }
    const key =
      parsed && typeof parsed === 'object' && 'default' in parsed ? parsed.default : undefined;
    if (typeof key === 'string' && key) return { ok: true, key };
  }
  return legacyKey ? { ok: true, key: legacyKey } : { ok: false };
}

// La Storage API admite hasta 1000 rutas por llamada.
const removeBatch = 1000;

export async function deleteAccount(userId: string, store: AccountStore): Promise<DeletionResult> {
  try {
    const paths = await store.listFiles(userId);
    for (let start = 0; start < paths.length; start += removeBatch) {
      await store.removeFiles(paths.slice(start, start + removeBatch));
    }
    // `remove` no falla con rutas que no ha podido borrar: solo se confía en un nuevo listado.
    if ((await store.listFiles(userId)).length > 0) return { ok: false, step: 'files' };
  } catch {
    return { ok: false, step: 'files' };
  }

  try {
    await store.deleteRecords(userId);
    if ((await store.countRecords(userId)) > 0) return { ok: false, step: 'records' };
  } catch {
    return { ok: false, step: 'records' };
  }

  try {
    await store.deleteUser(userId);
  } catch {
    return { ok: false, step: 'account' };
  }
  return { ok: true };
}
