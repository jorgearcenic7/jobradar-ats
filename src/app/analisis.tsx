import { router } from 'expo-router';

import { CvMatchScreen } from '@/features/cv-match/presentation/cv-match-screen';

// Provisional until the tab navigation of Phase 3: back to the home screen, also when the
// analysis was opened directly and there is nothing to go back to.
function goHome() {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}

export default function AnalysisRoute() {
  return <CvMatchScreen onGoHome={goHome} />;
}
