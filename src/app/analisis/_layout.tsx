import { Stack } from 'expo-router';

import { AnalysisSessionProvider } from '@/features/cv-match/presentation/analysis-session';
import { AnalysisExitGuard } from '@/features/cv-match/presentation/analysis-exit-guard';

// Preparar y Resultados comparten la sesión del analizador, que vive mientras esta pila esté
// montada: se conserva al ir y volver entre ellas y se pierde al salir del analizador o recargar.
export default function AnalysisLayout() {
  return (
    <AnalysisSessionProvider>
      <AnalysisExitGuard />
      <Stack screenOptions={{ headerShown: false }} />
    </AnalysisSessionProvider>
  );
}
