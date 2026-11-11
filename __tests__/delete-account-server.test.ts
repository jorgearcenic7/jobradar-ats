import {
  adminKeyFrom,
  deleteAccount,
  filePathsOf,
  UnexpectedFolderError,
  type AccountStore,
} from '../supabase/functions/delete-account/delete-account';

// Datos de un usuario en memoria, con la regla de Supabase de no borrar usuarios con archivos.
function memoryStore(fileCount = 2) {
  const userId = 'user-a';
  const state = {
    files: Array.from({ length: fileCount }, (_, index) => `${userId}/cv-${index}.pdf`),
    records: fileCount,
    userExists: true,
    log: [] as string[],
    failOn: null as keyof AccountStore | null,
    // Simula un `remove` que responde sin error pero no borra nada.
    silentRemove: false,
  };
  const step = (name: keyof AccountStore) => {
    state.log.push(name);
    if (state.failOn === name) throw new Error('internal detail');
  };
  const store: AccountStore = {
    async listFiles() {
      step('listFiles');
      return [...state.files];
    },
    async removeFiles(paths) {
      step('removeFiles');
      if (!state.silentRemove) state.files = state.files.filter((path) => !paths.includes(path));
    },
    async deleteRecords() {
      step('deleteRecords');
      state.records = 0;
    },
    async countRecords() {
      step('countRecords');
      return state.records;
    },
    async deleteUser() {
      step('deleteUser');
      if (state.files.length > 0) throw new Error('user owns storage objects');
      state.userExists = false;
    },
  };
  return { userId, state, store };
}

it('deletes files through storage, then records, then the auth user', async () => {
  const { userId, state, store } = memoryStore();
  expect(await deleteAccount(userId, store)).toEqual({ ok: true });
  expect(state.log).toEqual([
    'listFiles',
    'removeFiles',
    'listFiles',
    'deleteRecords',
    'countRecords',
    'deleteUser',
  ]);
  expect(state).toMatchObject({ files: [], records: 0, userExists: false });
});

it('stops before touching records or the account when files remain', async () => {
  const { userId, state, store } = memoryStore();
  state.silentRemove = true;
  expect(await deleteAccount(userId, store)).toEqual({ ok: false, step: 'files' });
  expect(state.log).not.toContain('deleteRecords');
  expect(state).toMatchObject({ records: 2, userExists: true });

  state.failOn = 'removeFiles';
  state.silentRemove = false;
  expect(await deleteAccount(userId, store)).toEqual({ ok: false, step: 'files' });
  expect(state.userExists).toBe(true);
});

it('keeps the account when records cannot be deleted', async () => {
  const { userId, state, store } = memoryStore();
  state.failOn = 'deleteRecords';
  expect(await deleteAccount(userId, store)).toEqual({ ok: false, step: 'records' });
  expect(state.log).not.toContain('deleteUser');
  expect(state.userExists).toBe(true);
});

it('reports a failed auth deletion and completes on retry', async () => {
  const { userId, state, store } = memoryStore();
  state.failOn = 'deleteUser';
  expect(await deleteAccount(userId, store)).toEqual({ ok: false, step: 'account' });
  expect(state).toMatchObject({ files: [], records: 0, userExists: true });

  state.failOn = null;
  expect(await deleteAccount(userId, store)).toEqual({ ok: true });
  expect(state.userExists).toBe(false);
});

it('removes files in batches the storage API accepts', async () => {
  const { userId, state, store } = memoryStore(2500);
  expect(await deleteAccount(userId, store)).toEqual({ ok: true });
  expect(state.log.filter((name) => name === 'removeFiles')).toHaveLength(3);
});

it('stops at the files step when the user folder contains a subfolder', async () => {
  expect(filePathsOf('user-a', [{ name: 'cv-1.pdf', id: 'object-1' }])).toEqual([
    'user-a/cv-1.pdf',
  ]);
  expect(() =>
    filePathsOf('user-a', [
      { name: 'cv-1.pdf', id: 'object-1' },
      { name: 'otra-carpeta', id: null },
    ]),
  ).toThrow(UnexpectedFolderError);

  // Como en `index.ts`: el listado real pasa por `filePathsOf`, así que la subcarpeta lo hace fallar.
  const { userId, state, store } = memoryStore();
  store.listFiles = async () => {
    state.log.push('listFiles');
    return filePathsOf(userId, [{ name: 'otra-carpeta', id: null }]);
  };
  expect(await deleteAccount(userId, store)).toEqual({ ok: false, step: 'files' });
  expect(state.log).toEqual(['listFiles']);
  expect(state).toMatchObject({ records: 2, userExists: true });
});

it('chooses the server key without exposing a malformed secret', () => {
  expect(adminKeyFrom('{"default":"clave-servidor-ficticia"}', 'legacy')).toEqual({
    ok: true,
    key: 'clave-servidor-ficticia',
  });
  const malformed = adminKeyFrom('{"default":"clave-servidor-ficticia"', 'legacy');
  expect(malformed).toEqual({ ok: false });
  expect(JSON.stringify(malformed)).not.toContain('clave-servidor');
  // Sin `default` en el JSON, o sin la variable, vale la clave antigua; sin ninguna, no hay clave.
  expect(adminKeyFrom('{}', 'legacy')).toEqual({ ok: true, key: 'legacy' });
  expect(adminKeyFrom(undefined, 'legacy')).toEqual({ ok: true, key: 'legacy' });
  expect(adminKeyFrom(undefined, undefined)).toEqual({ ok: false });
  expect(adminKeyFrom('null', undefined)).toEqual({ ok: false });
});
