import { router } from 'expo-router';

import { CvMatchScreen } from '@/features/cv-match/presentation/cv-match-screen';

// Provisional until the tab navigation of Phase 3: back to the home screen, also when the
// analysis was opened directly and there is nothing to go back to.
function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

// Cada análisis correcto abre Resultados como una pantalla nueva, para que Atrás vuelva a Preparar.
function showResults() {
  router.push('/analisis/resultados');
}

export default function PrepareRoute() {
  return <CvMatchScreen onGoHome={goHome} onShowResults={showResults} />;
}
