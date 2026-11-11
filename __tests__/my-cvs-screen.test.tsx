import { act, renderHook, screen, userEvent, within } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import MyCvsRoute from '@/app/mis-cv';
import { useAuth } from '@/features/auth/auth-provider';
import { getAuthClient } from '@/features/auth/client';
import { useCvImport } from '@/features/cv-import';
import { pickCvFile } from '@/features/cv-import/infrastructure/pick-cv-file';
import { peekCvSelection } from '@/features/my-cvs';

import { buildTextPdf } from '../jest/cv-fixtures';
import { FakeSupabase } from '../jest/fake-supabase';
import { pickedFile } from '../jest/real-cv-readers';
import { analysisRoutes } from '../jest/render-analysis';

// «Mis CV» con el PDF.js real sobre un documento ficticio. Se simulan la sesión, el selector de
// archivos y Supabase; el aislamiento real entre cuentas se prueba con el script SQL.
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: jest.fn() }));
jest.mock('@/features/auth/client', () => ({ getAuthClient: jest.fn() }));
jest.mock('@/features/cv-import/infrastructure/pick-cv-file', () => ({
  canPickCvFile: true,
  pickCvFile: jest.fn(),
}));
/*
En el navegador, PDF.js transfiere el `ArrayBuffer` recibido a su worker y deja vacío el original
(`byteLength` 0). El lector real de Jest no usa worker, así que aquí se reproduce la transferencia
antes de leer: sin ella no se vería que el archivo guardado debe ser una copia.
*/
jest.mock('@/features/cv-import/infrastructure/cv-readers', () => {
  const { realCvReaders } = jest.requireActual('../jest/real-cv-readers');
  return {
    cvReaders: {
      ...realCvReaders,
      openPdf: (bytes: Uint8Array) =>
        realCvReaders.openPdf(new Uint8Array((bytes.buffer as ArrayBuffer).transfer())),
    },
  };
});

jest.setTimeout(60_000);

const email = 'ana.ficticia@example.test';
const pdf = buildTextPdf([
  [
    [50, 780, 'Ana Ficticia Ruiz'],
    [50, 740, 'EXPERIENCIA'],
    [50, 726, '- Desarrollé una aplicación ficticia con React y TypeScript.'],
  ],
]);

const routes = {
  ...analysisRoutes,
  'mis-cv': MyCvsRoute,
  acceso: () => <Text>Pantalla de acceso</Text>,
};

let fake: FakeSupabase;

function signIn(userId: string | null) {
  jest.mocked(useAuth).mockReturnValue({
    session: userId ? ({ user: { id: userId, email } } as never) : null,
    loading: false,
    configured: true,
    error: null,
  });
}

beforeEach(() => {
  fake = new FakeSupabase('user-a');
  signIn('user-a');
  jest.mocked(getAuthClient).mockReturnValue(fake.client);
});

async function renderMyCvs() {
  await renderRouter(routes, { initialUrl: '/mis-cv' });
  return userEvent.setup();
}

type User = ReturnType<typeof userEvent.setup>;

async function importPdf(user: User) {
  jest.mocked(pickCvFile).mockResolvedValueOnce({
    kind: 'picked',
    // Una copia por prueba: la lectura deja vacío el buffer que recibe.
    file: pickedFile('cv-ana-ficticia.pdf', pdf.slice()),
  });
  await user.press(screen.getByRole('button', { name: 'Seleccionar PDF o Word' }));
  return screen.findByRole('button', { name: 'Guardar en Mis CV' });
}

it('is only available with a session', async () => {
  signIn(null);
  await renderMyCvs();
  expect(screen).toHavePathname('/acceso');
});

it('shows the account and the empty list', async () => {
  await renderMyCvs();
  expect(screen.getByText(new RegExp(`Sesión iniciada como ${email}`))).toBeOnTheScreen();
  expect(await screen.findByText('Todavía no has guardado ningún CV')).toBeOnTheScreen();
  expect(screen.getByRole('link', { name: 'Mis CV' }).props['aria-current']).toBe('page');
});

it('uploads nothing until the user confirms the destination account', async () => {
  const user = await renderMyCvs();
  await screen.findByText('Todavía no has guardado ningún CV');
  await user.press(await importPdf(user));

  expect(screen.getByText(/Se guardarán el archivo «cv-ana-ficticia.pdf»/)).toHaveTextContent(
    new RegExp(`en la cuenta ${email}`),
  );
  await user.press(screen.getByRole('button', { name: 'Cancelar' }));
  expect(fake.log).not.toContain('insert');

  const title = screen.getByLabelText('Nombre del CV');
  expect(title.props.value).toBe('cv-ana-ficticia');
  await user.clear(title);
  await user.type(title, 'CV Frontend');
  await user.press(screen.getByRole('button', { name: 'Guardar en Mis CV' }));
  await user.press(screen.getByRole('button', { name: 'Sí, guardar' }));

  expect(await screen.findByText(/«CV Frontend» se ha guardado en Mis CV/)).toBeOnTheScreen();
  const [row] = fake.rows;
  expect(row).toMatchObject({ title: 'CV Frontend', file_name: 'cv-ana-ficticia.pdf' });
  expect(row.cv_text).toMatch(/aplicación ficticia con React/);
  // Se envían el tamaño y los bytes reales del PDF, aunque PDF.js vaciara el buffer al leerlo.
  expect(row.byte_size).toBe(pdf.byteLength);
  expect(fake.objects.get(row.file_path)?.bytes).toEqual(pdf);
  // La tarjeta es un grupo con el nombre del CV (rol «group» en la web).
  expect(
    within(screen.getByLabelText('CV Frontend')).getByText(/^PDF · 1 página/),
  ).toBeOnTheScreen();
});

it('refuses to save when the session switched account after the confirmation', async () => {
  fake.sessionUserId = 'user-b';
  const user = await renderMyCvs();
  await user.press(await importPdf(user));
  await user.press(screen.getByRole('button', { name: 'Sí, guardar' }));
  expect(await screen.findByText(/La sesión ha cambiado de cuenta/)).toBeOnTheScreen();
  expect(fake.log).not.toContain('insert');
  expect(fake.objects.size).toBe(0);
});

it('opens a saved CV in the analyzer through memory only', async () => {
  fake.seed({ title: 'CV Mío', cv_text: 'Texto ficticio guardado del CV.' });
  const user = await renderMyCvs();
  await user.press(await screen.findByRole('button', { name: 'Analizar' }));

  expect(screen).toHavePathname('/analisis');
  expect(screen.getByLabelText('Texto del CV').props.value).toBe('Texto ficticio guardado del CV.');
  expect(screen.getByText(/Texto de «CV Mío», de Mis CV/)).toBeOnTheScreen();
  expect(peekCvSelection()).toBeNull();
});

it('renames and deletes only after an explicit confirmation', async () => {
  fake.seed({ title: 'CV Antiguo' });
  const user = await renderMyCvs();
  const card = await screen.findByLabelText('CV Antiguo');

  await user.press(within(card).getByRole('button', { name: 'Renombrar' }));
  const field = within(card).getByLabelText('Nuevo nombre');
  await user.clear(field);
  await user.type(field, 'CV Nuevo');
  await user.press(within(card).getByRole('button', { name: 'Guardar nombre' }));
  expect(await screen.findByLabelText('CV Nuevo')).toBeOnTheScreen();
  expect(fake.rows[0].title).toBe('CV Nuevo');

  await user.press(screen.getByRole('button', { name: 'Eliminar' }));
  expect(fake.log).not.toContain('remove');
  await user.press(screen.getByRole('button', { name: 'Sí, eliminar' }));
  expect(await screen.findByText('Todavía no has guardado ningún CV')).toBeOnTheScreen();
  expect(fake.rows).toEqual([]);
});

it('explains a failed list without server details and retries', async () => {
  fake.failNext('select', { message: 'internal detail' });
  fake.seed({ title: 'CV Recuperado' });
  const user = await renderMyCvs();
  expect(await screen.findByText(/No se han podido cargar tus CV/)).toBeOnTheScreen();
  expect(screen.queryByText(/internal detail/)).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByLabelText('CV Recuperado')).toBeOnTheScreen();
});

it('keeps the original bytes only when asked to', async () => {
  const { result } = await renderHook(() => useCvImport());
  expect(result.current.original).toBeNull();
  jest.mocked(pickCvFile).mockResolvedValueOnce({
    kind: 'picked',
    file: pickedFile('cv.pdf', pdf.slice()),
  });
  await act(() => result.current.pick());
  expect(result.current.state.kind).toBe('imported');
  expect(result.current.original).toBeNull();
});
