import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';

export type HeaderLayoutProps = {
  brand: ReactNode;
  nav: ReactNode;
  /** Nota breve a la derecha; en la web se oculta en pantallas muy estrechas. */
  note: ReactNode;
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

// iOS y Android: una fila que pasa a la siguiente línea lo que no quepa.
export function HeaderLayout({ brand, nav, note, action }: HeaderLayoutProps) {
  return (
    <View style={styles.row}>
      {brand}
      {nav}
      <View style={styles.aside}>
        {note}
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
    columnGap: space[4],
    rowGap: space[2],
  },
});
