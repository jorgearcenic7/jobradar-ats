import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';

export type ResultsColumnsProps = { summary: ReactNode; requirements: ReactNode };

// En nativo Screen ya limita la anchura y separa los bloques de la página.
export function ResultsPage({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function ResultsColumns({ summary, requirements }: ResultsColumnsProps) {
  return (
    <View style={styles.column}>
      <View style={styles.column}>{summary}</View>
      <View style={styles.column}>{requirements}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: space[4],
    minWidth: 0,
  },
});
