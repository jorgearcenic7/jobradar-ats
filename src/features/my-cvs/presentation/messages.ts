import { savedCvLimits } from '../domain/saved-cv';
import { SavedCvError } from '../infrastructure/cv-library';

type Action = 'list' | 'save' | 'rename' | 'delete' | 'open';

const requestMessages: Record<Action, string> = {
  list: 'No se han podido cargar tus CV. Comprueba tu conexión y vuelve a intentarlo.',
  save: 'No se ha podido guardar el CV. Comprueba tu conexión y vuelve a intentarlo.',
  rename: 'No se ha podido cambiar el nombre. Vuelve a intentarlo.',
  delete: 'No se ha podido eliminar el CV. Vuelve a intentarlo.',
  open: 'No se ha podido abrir el CV. Vuelve a intentarlo.',
};

/** Mensaje para el usuario; nunca incluye el texto que devuelve el servidor. */
export function savedCvErrorMessage(error: unknown, action: Action): string {
  const kind = error instanceof SavedCvError ? error.kind : 'request';
  switch (kind) {
    case 'limit':
      return `Ya tienes ${savedCvLimits.maxCvs} CV guardados, el máximo. Elimina alguno para guardar otro.`;
    case 'account-changed':
      return 'La sesión ha cambiado de cuenta. No se ha guardado nada; revisa la cuenta y vuelve a confirmar.';
    case 'not-found':
      return 'Este CV ya no está en tu cuenta. Actualiza la lista.';
    case 'too-long':
      return 'El texto de este CV es demasiado largo para guardarlo.';
    case 'request':
      return requestMessages[action];
  }
}
