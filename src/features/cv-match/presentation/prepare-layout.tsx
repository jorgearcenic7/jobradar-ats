/*
Marco visual de Preparar en iOS y Android: tarjetas para el CV, la oferta y la acción.

La web tiene su propia versión (`prepare-layout.web.tsx`), con la composición editorial y el
movimiento de la v1.6. La pantalla (`cv-match-screen.tsx`) es la misma en las dos: solo cambia
este marco, así que el formulario, las validaciones y el análisis no se duplican.
*/
import { useCallback, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';

type Children = { children: ReactNode };

// En nativo `Screen` ya limita la anchura y separa los bloques de la página.
export function PreparePage({ children }: Children) {
  return <>{children}</>;
}

/** Título de la pantalla; en la web recibe el foco al llegar desde Inicio. */
export function PrepareTitle({ children }: Children) {
  return <>{children}</>;
}

/** Las dos columnas del CV y la oferta; en la web, `scanning` muestra el barrido del análisis. */
export function PrepareColumns({ children }: Children & { scanning: boolean }) {
  // Dos columnas cuando caben, una debajo de otra en el móvil, sin consultar la ventana.
  return <View style={styles.columns}>{children}</View>;
}

export function PreparePanel({ children }: Children) {
  return <Card style={styles.panel}>{children}</Card>;
}

export function PrepareSubmitBar({ children }: Children) {
  return <Card style={styles.actionBar}>{children}</Card>;
}

/** Envuelve la acción «Analizar»; en la web la hace magnética. */
export function MagneticAction({ children }: Children) {
  return <>{children}</>;
}

/**
 * Lanza el análisis tras su animación. En nativo no hay animación: `run` llama al momento.
 */
export function usePrepareScan() {
  const run = useCallback((then: () => void) => then(), []);
  return { scanning: false, run };
}

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[4],
  },
  // Equivale a `repeat(auto-fit, minmax(min(100%, 420px), 1fr))`.
  panel: {
    flexBasis: 420,
    flexGrow: 1,
    maxWidth: '100%',
    minWidth: 0,
    padding: space[6],
  },
  actionBar: {
    gap: space[4],
    paddingVertical: space[4],
    paddingHorizontal: space[6],
  },
});
