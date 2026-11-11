import { useRef, useState, useSyncExternalStore } from 'react';

import { importCvFile } from '../application/import-cv';
import { analysisInput, discardCorrection, reviseText } from '../domain/imported-cv';
import type { CvReaders, DroppedFile, PickedFile, PickResult } from '../domain/readers';
import type { AnalysisInput, ImportedCv } from '../domain/types';

/** What the platform provides. The module's public API assembles it from the infrastructure. */
export type CvImportDependencies = {
  /** Whether this platform can pick and read CV files at all. */
  canPickFile: boolean;
  pickFile: () => Promise<PickResult>;
  readers: CvReaders;
};

export type CvImportOptions = {
  /**
   * Conserva en memoria los bytes del archivo importado para que el usuario pueda guardarlo
   * después en «Mis CV». El analizador no lo activa: allí el archivo se descarta tras leerlo.
   */
  keepOriginal?: boolean;
};

export type CvFileState =
  | { kind: 'empty' }
  | { kind: 'reading'; fileName: string }
  | { kind: 'unavailable' }
  | { kind: 'too-large'; fileName: string; byteSize: number; maxBytes: number }
  | { kind: 'needs-confirmation'; fileName: string; pageCount: number; pageLimit: number }
  | {
      kind: 'imported';
      cv: ImportedCv;
      /** Changes with every new document, so results of another document are not shown as its own. */
      documentId: number;
      /** Bytes del archivo leído; solo con `keepOriginal`. */
      original: Uint8Array | null;
    };

// Hydration status never changes after mount, so there is nothing to subscribe to.
const subscribe = () => () => {};

/** False in the server HTML and until hydration, when buttons do not respond yet. */
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/**
 * State of the CV file import. The document and its text stay in memory: nothing is
 * stored or sent anywhere, and the original file is never modified.
 */
export function useCvImportWith(
  { canPickFile, pickFile, readers }: CvImportDependencies,
  { keepOriginal = false }: CvImportOptions = {},
) {
  const [state, setState] = useState<CvFileState>({ kind: 'empty' });
  const documents = useRef(0);
  const pending = useRef<{
    confirm: () => Promise<ImportedCv>;
    cancel: () => Promise<void>;
    original: Uint8Array | null;
  } | null>(null);
  // What to restore when the user backs out of a long PDF.
  const beforeConfirmation = useRef<CvFileState>({ kind: 'empty' });

  const showImported = (cv: ImportedCv, original: Uint8Array | null) => {
    documents.current += 1;
    setState({ kind: 'imported', cv, documentId: documents.current, original });
  };

  // Elegido con el selector o soltado en la zona de subida, el archivo sigue el mismo camino.
  const importPicked = async (file: PickedFile) => {
    const previous = state;
    setState({ kind: 'reading', fileName: file.name });
    /*
    Los bytes se capturan al leerlos, sin una segunda lectura del archivo. Se guarda una copia:
    PDF.js transfiere a su worker el buffer que recibe y lo deja vacío (`byteLength` 0), así que
    conservar el mismo objeto enviaría a «Mis CV» un tamaño 0 y un archivo vacío.
    */
    let original: Uint8Array | null = null;
    const tracked: PickedFile = keepOriginal
      ? {
          ...file,
          readBytes: async () => {
            const bytes = await file.readBytes();
            original = bytes.slice();
            return bytes;
          },
        }
      : file;
    const outcome = await importCvFile(tracked, readers);
    if (outcome.kind === 'imported') showImported(outcome.cv, original);
    else if (outcome.kind === 'too-large') {
      setState({
        kind: 'too-large',
        fileName: outcome.fileName,
        byteSize: outcome.byteSize,
        maxBytes: outcome.maxBytes,
      });
    } else {
      pending.current = { confirm: outcome.confirm, cancel: outcome.cancel, original };
      beforeConfirmation.current = previous;
      setState({
        kind: 'needs-confirmation',
        fileName: outcome.fileName,
        pageCount: outcome.pageCount,
        pageLimit: outcome.pageLimit,
      });
    }
  };

  const pick = async () => {
    // The browser does not report a cancelled picker, so nothing changes until a file
    // arrives: a cancelled selection leaves the current CV in place.
    const picked = await pickFile();
    if (picked.kind === 'cancelled') return;
    if (picked.kind === 'unavailable') {
      setState({ kind: 'unavailable' });
      return;
    }
    await importPicked(picked.file);
  };

  /*
  Solo web: un archivo arrastrado hasta la zona de subida. Se lee con los mismos lectores y límites
  que uno elegido; el formato se reconoce por el contenido, no por la extensión ni el tipo MIME.
  */
  const importDropped = async (file: DroppedFile) => {
    if (!canPickFile) return;
    await importPicked({
      name: file.name,
      size: file.size,
      mimeType: file.type || null,
      readBytes: async () => new Uint8Array(await file.arrayBuffer()),
    });
  };

  const confirmLongPdf = async () => {
    if (state.kind !== 'needs-confirmation' || !pending.current) return;
    const { confirm, original } = pending.current;
    pending.current = null;
    setState({ kind: 'reading', fileName: state.fileName });
    showImported(await confirm(), original);
  };

  const cancelLongPdf = async () => {
    const current = pending.current;
    pending.current = null;
    setState(beforeConfirmation.current);
    await current?.cancel();
  };

  const updateCv = (update: (cv: ImportedCv) => ImportedCv) => {
    if (state.kind === 'imported') setState({ ...state, cv: update(state.cv) });
  };

  const input: AnalysisInput | null = state.kind === 'imported' ? analysisInput(state.cv) : null;

  return {
    /** False in the native app, where importing files is not implemented yet. */
    canPickFile,
    state,
    pick,
    importDropped,
    confirmLongPdf,
    cancelLongPdf,
    reviseText: (text: string) => updateCv((cv) => reviseText(cv, text)),
    discardCorrection: () => updateCv(discardCorrection),
    /** Text for the analysis, or why there is none. */
    analysisInput: input,
    documentId: state.kind === 'imported' ? state.documentId : null,
    /** Bytes del archivo importado, o `null` sin `keepOriginal` o sin documento. */
    original: state.kind === 'imported' ? state.original : null,
  };
}

export type CvImport = ReturnType<typeof useCvImportWith>;
