import { router } from 'expo-router';

import { CvMatchScreen } from '@/features/cv-match/presentation/cv-match-screen';

// Cada análisis correcto abre Resultados como una pantalla nueva, para que Atrás vuelva a Preparar.
function showResults() {
  router.push('/analisis/resultados');
}

export default function PrepareRoute() {
  return <CvMatchScreen onShowResults={showResults} />;
}
