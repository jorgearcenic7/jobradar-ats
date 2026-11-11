import {
  defaultTitle,
  formatFileSize,
  formatSavedDate,
  validateTitle,
} from '@/features/my-cvs/domain/saved-cv';
import {
  deleteSavedCv,
  listSavedCvs,
  renameSavedCv,
  saveCv,
  SavedCvError,
  type NewSavedCv,
} from '@/features/my-cvs/infrastructure/cv-library';
import { savedCvErrorMessage } from '@/features/my-cvs/presentation/messages';

import { FakeSupabase } from '../jest/fake-supabase';

const userA = 'user-a';
const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
const newCv: NewSavedCv = {
  title: 'CV Frontend',
  fileName: 'cv-ficticio.pdf',
  format: 'pdf',
  byteSize: bytes.length,
  pageCount: 1,
  text: 'Texto ficticio del CV.',
  bytes,
};

async function kindOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (cause: unknown) => cause,
  );
  expect(error).toBeInstanceOf(SavedCvError);
  return (error as SavedCvError).kind;
}

describe('saved CV rules', () => {
  it('proposes the file name without extension and validates titles', () => {
    expect(defaultTitle('cv-frontend.PDF')).toBe('cv-frontend');
    expect(defaultTitle('   .docx')).toBe('Mi CV');
    expect(defaultTitle(`${'a'.repeat(200)}.pdf`)).toHaveLength(120);
    expect(validateTitle('  CV Backend  ')).toEqual({ ok: true, title: 'CV Backend' });
    expect(validateTitle('   ')).toMatchObject({ ok: false });
    expect(validateTitle('a'.repeat(121))).toMatchObject({ ok: false });
  });

  it('formats sizes and dates without depending on the locale', () => {
    expect(formatFileSize(809)).toBe('1 KB');
    expect(formatFileSize(54_000)).toBe('53 KB');
    expect(formatFileSize(1_900_000)).toBe('1,8 MB');
    expect(formatSavedDate('2026-03-05T12:00:00')).toBe('05/03/2026');
    expect(formatSavedDate('not a date')).toBe('');
  });
});

describe('saveCv', () => {
  it('creates the row and uploads the original to the path chosen by the database', async () => {
    const fake = new FakeSupabase(userA);
    const saved = await saveCv(fake.client, userA, newCv);

    expect(fake.log).toEqual(['insert', 'upload']);
    expect(saved).toMatchObject({ title: 'CV Frontend', fileName: 'cv-ficticio.pdf' });
    expect(saved.filePath).toBe(`${userA}/${saved.id}.pdf`);
    expect(fake.objects.get(saved.filePath)).toEqual({ bytes, contentType: 'application/pdf' });
    expect(fake.rows[0].cv_text).toBe(newCv.text);
  });

  it('saves nothing when the session belongs to another account than the confirmed one', async () => {
    const fake = new FakeSupabase('user-b');
    expect(await kindOf(saveCv(fake.client, userA, newCv))).toBe('account-changed');
    expect(fake.log).toEqual([]);
    expect(fake.objects.size).toBe(0);
  });

  it('removes the row when the upload fails, so no half-saved CV remains', async () => {
    const fake = new FakeSupabase(userA);
    fake.failNext('upload');
    expect(await kindOf(saveCv(fake.client, userA, newCv))).toBe('request');
    expect(fake.log).toEqual(['insert', 'upload', 'delete']);
    expect(fake.rows).toEqual([]);
  });

  it('reports the account limit and never exposes server messages', async () => {
    const fake = new FakeSupabase(userA);
    for (let index = 0; index < 20; index++) fake.seed({ title: `CV ${index}` });
    const error = await saveCv(fake.client, userA, newCv).catch((cause: unknown) => cause);
    expect(error).toMatchObject({ kind: 'limit', message: 'limit' });
    expect(savedCvErrorMessage(error, 'save')).toMatch(/Ya tienes 20 CV guardados/);

    fake.failNext('select', { message: 'relation "cvs" internal detail' });
    const listError = await listSavedCvs(fake.client).catch((cause: unknown) => cause);
    expect(savedCvErrorMessage(listError, 'list')).not.toMatch(/internal|relation/);
  });

  it('rejects texts over the limit before any request', async () => {
    const fake = new FakeSupabase(userA);
    expect(await kindOf(saveCv(fake.client, userA, { ...newCv, text: 'a'.repeat(300_001) }))).toBe(
      'too-long',
    );
    expect(fake.log).toEqual([]);
  });
});

describe('managing saved CVs', () => {
  it('lists only rows returned for the session', async () => {
    const fake = new FakeSupabase(userA);
    fake.seed({ title: 'Mío' });
    fake.seed({ title: 'Ajeno', user_id: 'user-b' });
    expect((await listSavedCvs(fake.client)).map((cv) => cv.title)).toEqual(['Mío']);
  });

  it('reports a rename that changed no row as not found', async () => {
    const fake = new FakeSupabase(userA);
    const other = fake.seed({ title: 'Ajeno', user_id: 'user-b' });
    expect(await kindOf(renameSavedCv(fake.client, other.id, 'Nuevo'))).toBe('not-found');
    expect(other.title).toBe('Ajeno');
  });

  it('deletes the file before the row and keeps the row when the file cannot be removed', async () => {
    const fake = new FakeSupabase(userA);
    const saved = await saveCv(fake.client, userA, newCv);
    fake.log = [];

    fake.failNext('remove');
    expect(await kindOf(deleteSavedCv(fake.client, saved))).toBe('request');
    expect(fake.rows).toHaveLength(1);

    await deleteSavedCv(fake.client, saved);
    expect(fake.log).toEqual(['remove', 'remove', 'delete']);
    expect(fake.rows).toEqual([]);
    expect(fake.objects.size).toBe(0);
  });

  it('never leaves an orphan file: the row survives while its file still exists', async () => {
    const fake = new FakeSupabase(userA);
    const saved = await saveCv(fake.client, userA, newCv);

    // Borrar solo la fila, como haría una petición directa a la Data API, falla en el servidor.
    const direct = await fake.client.from('cvs').delete().eq('id', saved.id);
    expect(direct.error).toMatchObject({ message: 'cv_file_still_exists' });

    // Si Storage responde sin error pero no borra, la app informa del fallo y conserva el CV.
    fake.silentRemove = true;
    expect(await kindOf(deleteSavedCv(fake.client, saved))).toBe('request');
    expect(fake.rows).toHaveLength(1);
    expect(fake.objects.has(saved.filePath)).toBe(true);
  });
});
