/*
Estado de la lista de «Mis CV» de la cuenta de la sesión.

La pantalla monta este hook con la clave del usuario, así que al cambiar de cuenta empieza de
cero y nunca muestra los CV de la anterior. La lista solo está en memoria: no se guarda en el
dispositivo y se vuelve a pedir al servidor en cada visita.
*/
import { useEffect, useState } from 'react';

import { getAuthClient } from '@/features/auth/client';

import type { SavedCv } from '../domain/saved-cv';
import {
  deleteSavedCv,
  listSavedCvs,
  loadSavedCvText,
  renameSavedCv,
  saveCv,
  SavedCvError,
  type NewSavedCv,
} from '../infrastructure/cv-library';
import { savedCvErrorMessage } from './messages';

export type SavedCvList =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; items: SavedCv[] };

function authClient() {
  const client = getAuthClient();
  if (!client) throw new SavedCvError('request');
  return client;
}

export function useMyCvs(userId: string) {
  const [request, setRequest] = useState(0);
  // La lista recuerda a qué petición responde; mientras no coincida con la actual, se está cargando.
  const [loaded, setLoaded] = useState<{ request: number; list: SavedCvList } | null>(null);
  const list: SavedCvList =
    loaded && loaded.request === request ? loaded.list : { status: 'loading' };

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => listSavedCvs(authClient()))
      .then(
        (items) => {
          if (active) setLoaded({ request, list: { status: 'ready', items } });
        },
        (error: unknown) => {
          if (active) {
            setLoaded({
              request,
              list: { status: 'error', message: savedCvErrorMessage(error, 'list') },
            });
          }
        },
      );
    return () => {
      active = false;
    };
  }, [request]);

  const updateItems = (update: (items: SavedCv[]) => SavedCv[]) =>
    setLoaded((current) =>
      current?.list.status === 'ready'
        ? { ...current, list: { status: 'ready', items: update(current.list.items) } }
        : current,
    );

  return {
    list,
    reload: () => setRequest((value) => value + 1),
    /** Guarda en la cuenta `userId`; falla si la sesión ya es de otra. */
    save: async (cv: NewSavedCv) => {
      const saved = await saveCv(authClient(), userId, cv);
      updateItems((items) => [saved, ...items]);
      return saved;
    },
    rename: async (cv: SavedCv, title: string) => {
      await renameSavedCv(authClient(), cv.id, title);
      updateItems((items) => items.map((item) => (item.id === cv.id ? { ...item, title } : item)));
    },
    remove: async (cv: SavedCv) => {
      await deleteSavedCv(authClient(), cv);
      updateItems((items) => items.filter((item) => item.id !== cv.id));
    },
    loadText: (cv: SavedCv) => loadSavedCvText(authClient(), cv.id),
  };
}

export type MyCvs = ReturnType<typeof useMyCvs>;
