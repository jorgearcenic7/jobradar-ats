import { useRef, useState, useSyncExternalStore } from 'react';

import { importCvFile } from '../application/import-cv';
import { analysisInput, discardCorrection, reviseText } from '../domain/imported-cv';
import type { CvReaders, PickResult } from '../domain/readers';
import type { AnalysisInput, ImportedCv } from '../domain/types';

/** What the platform provides. The module's public API assembles it from the infrastructure. */
export type CvImportDependencies = {
  /** Whether this platform can pick and read CV files at all. */
  canPickFile: boolean;
  pickFile: () => Promise<PickResult>;
  readers: CvReaders;
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
export function useCvImportWith({ canPickFile, pickFile, readers }: CvImportDependencies) {
  const [state, setState] = useState<CvFileState>({ kind: 'empty' });
  const documents = useRef(0);
  const pending = useRef<{
    confirm: () => Promise<ImportedCv>;
    cancel: () => Promise<void>;
  } | null>(null);
  // What to restore when the user backs out of a long PDF.
  const beforeConfirmation = useRef<CvFileState>({ kind: 'empty' });

  const showImported = (cv: ImportedCv) => {
    documents.current += 1;
    setState({ kind: 'imported', cv, documentId: documents.current });
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

    const previous = state;
    setState({ kind: 'reading', fileName: picked.file.name });
    const outcome = await importCvFile(picked.file, readers);
    if (outcome.kind === 'imported') showImported(outcome.cv);
    else if (outcome.kind === 'too-large') {
      setState({
        kind: 'too-large',
        fileName: outcome.fileName,
        byteSize: outcome.byteSize,
        maxBytes: outcome.maxBytes,
      });
    } else {
      pending.current = { confirm: outcome.confirm, cancel: outcome.cancel };
      beforeConfirmation.current = previous;
      setState({
        kind: 'needs-confirmation',
        fileName: outcome.fileName,
        pageCount: outcome.pageCount,
        pageLimit: outcome.pageLimit,
      });
    }
  };

  const confirmLongPdf = async () => {
    if (state.kind !== 'needs-confirmation' || !pending.current) return;
    const { confirm } = pending.current;
    pending.current = null;
    setState({ kind: 'reading', fileName: state.fileName });
    showImported(await confirm());
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
    confirmLongPdf,
    cancelLongPdf,
    reviseText: (text: string) => updateCv((cv) => reviseText(cv, text)),
    discardCorrection: () => updateCv(discardCorrection),
    /** Text for the analysis, or why there is none. */
    analysisInput: input,
    documentId: state.kind === 'imported' ? state.documentId : null,
  };
}

export type CvImport = ReturnType<typeof useCvImportWith>;
