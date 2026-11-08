/*
Protege la salida del flujo, sin trasladar ni ampliar la vida de AnalysisSessionProvider.
Se monta en su layout, fuera de la pila interna, para permitir Preparar ↔ Resultados.
*/
import { usePreventRemove } from 'expo-router';
import { useState } from 'react';

import { useAnalysisSession } from './analysis-session';
import { confirmAnalysisExit } from './confirm-analysis-exit';

export function AnalysisExitGuard() {
  const { pastedCv, cvImport, match } = useAnalysisSession();
  const [leaving, setLeaving] = useState(false);
  const hasData = Boolean(
    pastedCv.trim() ||
    match.offerText.trim() ||
    match.result ||
    match.cvReplaced ||
    (cvImport.state.kind !== 'empty' && cvImport.state.kind !== 'unavailable'),
  );

  usePreventRemove(hasData && !leaving, ({ repeat }) => {
    confirmAnalysisExit(
      'Al salir del analizador se perderán el CV, la oferta y los resultados de esta sesión. No se guardan. ¿Quieres salir?',
      () => {
        setLeaving(true);
        repeat();
      },
    );
  });

  return null;
}
