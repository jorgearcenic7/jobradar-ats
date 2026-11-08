import { router } from 'expo-router';

import { ResultsScreen } from '@/features/cv-match/presentation/results-screen';

/*
Vuelve a Preparar. Si se llegó desde allí, retrocede en la pila (y en el historial del navegador);
si Resultados se abrió directamente, Preparar no está en la pila y la sustituye.
*/
function editInputs() {
  router.dismissTo('/analisis');
}

export default function ResultsRoute() {
  return <ResultsScreen onEdit={editInputs} />;
}
