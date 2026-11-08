/*
Sesión del analizador: el estado que comparten Preparar (`/analisis`) y Resultados
(`/analisis/resultados`).

Vive en el layout de `/analisis`, así que se conserva al ir y volver entre las dos pantallas y con
los botones Atrás y Adelante. Se pierde al salir del analizador, al recargar la página o al cerrar
la app: el CV, la oferta y el análisis solo están en memoria. Nunca van a la URL, al almacenamiento
del dispositivo, a los registros ni a ningún servicio.

Reúne los hooks existentes sin duplicar su lógica: `useCvImport` para el archivo, `useCvMatch`
para la oferta, la validación y el resultado, y el texto pegado con la modalidad elegida.
*/
import { createContext, use, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { TextInputInstance } from 'react-native';

import { useCvImport, type CvImport } from '@/features/cv-import';

import type { CvMode } from './cv-section';
import { sampleCv } from './sample-texts';
import { useCvMatch, type CvInput } from './use-cv-match';

export type AnalysisSession = {
  cvImport: CvImport;
  cvMode: CvMode;
  setCvMode: (mode: CvMode) => void;
  pastedCv: string;
  setPastedCv: (text: string) => void;
  match: ReturnType<typeof useCvMatch>;
  /** Mensaje cuando el análisis no puede empezar por el CV. */
  cvError: string | undefined;
  /** Campos de Preparar, para llevar el foco al primero que falte. */
  cvRef: RefObject<TextInputInstance | null>;
  offerRef: RefObject<TextInputInstance | null>;
  loadSample: () => void;
};

function fileCvInput(cvImport: CvImport): CvInput {
  const input = cvImport.analysisInput;
  return {
    text: input?.canAnalyze ? input.text : null,
    sourceKey: `file-${cvImport.documentId ?? 'none'}`,
  };
}

/** Why the CV stops the analysis, worded for the way the CV is being provided. */
function cvErrorMessage(mode: CvMode, cvImport: CvImport) {
  if (mode === 'paste') return 'Pega el texto de tu CV para analizarlo.';
  const { state } = cvImport;
  if (state.kind !== 'imported') return 'Selecciona tu CV o pega su texto para analizarlo.';
  if (state.cv.status === 'failed') {
    return 'No se ha podido leer este CV. Selecciona otro archivo o pega el texto.';
  }
  return 'Este CV no tiene texto que se pueda analizar. Escríbelo en «Revisar el texto extraído», pégalo o selecciona otro archivo.';
}

const AnalysisSessionContext = createContext<AnalysisSession | null>(null);

export function AnalysisSessionProvider({ children }: { children: ReactNode }) {
  const cvRef = useRef<TextInputInstance>(null);
  const offerRef = useRef<TextInputInstance>(null);
  const cvImport = useCvImport();
  // Uploading a PDF or DOCX is the main way in; pasting the text is the alternative, and the
  // only way where files cannot be imported yet (the native app).
  const [cvMode, setCvMode] = useState<CvMode>(cvImport.canPickFile ? 'file' : 'paste');
  const [pastedCv, setPastedCv] = useState('');
  const cv: CvInput =
    cvMode === 'paste' ? { text: pastedCv, sourceKey: 'paste' } : fileCvInput(cvImport);
  // El foco solo puede ir a un campo de Preparar montado; desde Resultados no hay ninguno.
  const match = useCvMatch(cv, (field) => (field === 'cv' ? cvRef : offerRef).current?.focus());

  const session: AnalysisSession = {
    cvImport,
    cvMode,
    setCvMode,
    pastedCv,
    setPastedCv,
    match,
    cvError: match.errors.includes('cv') ? cvErrorMessage(cvMode, cvImport) : undefined,
    cvRef,
    offerRef,
    loadSample: () => {
      setCvMode('paste');
      setPastedCv(sampleCv);
      match.loadSampleOffer();
    },
  };

  return <AnalysisSessionContext value={session}>{children}</AnalysisSessionContext>;
}

/** Estado del analizador; solo existe dentro del layout de `/analisis`. */
export function useAnalysisSession(): AnalysisSession {
  const session = use(AnalysisSessionContext);
  if (!session) throw new Error('useAnalysisSession must be used inside AnalysisSessionProvider');
  return session;
}
