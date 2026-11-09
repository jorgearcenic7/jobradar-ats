import { router } from 'expo-router';

import { HomeScreen } from '@/features/home/presentation/home-screen';

export default function HomeRoute() {
  return <HomeScreen onAnalyze={() => router.push('/analisis')} />;
}
