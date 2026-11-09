import { renderRouter } from 'expo-router/testing-library';

import HomeScreen from '@/app/index';
import AnalysisLayout from '@/app/analisis/_layout';
import PrepareRoute from '@/app/analisis/index';
import ResultsRoute from '@/app/analisis/resultados';

// Inicio y el analizador con su layout real, para probar la sesión compartida entre Preparar y
// Resultados y la navegación entre ellas.
export const analysisRoutes = {
  index: HomeScreen,
  'analisis/_layout': AnalysisLayout,
  'analisis/index': PrepareRoute,
  'analisis/resultados': ResultsRoute,
};

export function renderAnalysis(initialUrl = '/analisis') {
  return renderRouter(analysisRoutes, { initialUrl });
}
