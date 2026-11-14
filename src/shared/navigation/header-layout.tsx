import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';

export type HeaderLayoutProps = {
  brand: ReactNode;
  nav: ReactNode;
  action?: ReactNode;
};

export type HeaderShellProps = {
  backgroundColor: string;
  borderColor: string;
  children: ReactNode;
};

// En iOS y Android la cabecera se desplaza con el contenido.
export function HeaderShell({ backgroundColor, borderColor, children }: HeaderShellProps) {
  return (
    <View style={[styles.shell, { backgroundColor, borderBottomColor: borderColor }]}>
      {children}
    </View>
  );
}

/*
iOS y Android: una fila con la marca a la izquierda y la navegación a la derecha. La navegación ya
llega compacta en pantallas estrechas; si aun así no cupiera, pasa a la línea siguiente.
*/
export function HeaderLayout({ brand, nav, action }: HeaderLayoutProps) {
  return (
    <View style={styles.row}>
      {brand}
      <View style={styles.aside}>
        {nav}
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderBottomWidth: 1,
  },
  aside: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    flexShrink: 1,
    gap: space[4],
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: space[3],
    rowGap: space[2],
  },
});
