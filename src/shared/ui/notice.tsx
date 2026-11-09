/*
Aviso dentro de la pantalla: un recuadro con el fondo suave de su tono, un icono y el mensaje,
con un título opcional y acciones opcionales debajo.

Sirve para informar del estado de algo (un documento que se está leyendo, unos resultados que
ya no corresponden a los datos) o de un problema que impide seguir. No sustituye al error de un
campo concreto, que va debajo del campo, como en `TextField`.

El aviso no se anuncia por sí mismo a los lectores de pantalla. Una región `aria-live` creada
a la vez que su contenido no siempre se anuncia, y convertir cada aviso en una alerta resulta
intrusivo. Quien lo muestra decide: lo coloca dentro de una región `aria-live="polite"` que esté
siempre montada, como hacen el campo del CV y la pantalla del analizador.
*/
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space, type ThemeColor } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

export type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

/** Icono y colores de cada tono. Los pares de color tienen el contraste comprobado por tests. */
export const noticeTones: Record<
  NoticeTone,
  { icon: IconName; iconColor: ThemeColor; background: ThemeColor }
> = {
  info: { icon: 'info', iconColor: 'onAccentSubtle', background: 'accentSubtle' },
  success: { icon: 'checkCircle', iconColor: 'success', background: 'successSubtle' },
  warning: { icon: 'warning', iconColor: 'warning', background: 'warningSubtle' },
  danger: { icon: 'error', iconColor: 'danger', background: 'dangerSubtle' },
};

export type NoticeProps = {
  tone: NoticeTone;
  /** Primera línea en negrita, solo cuando el aviso necesita un resumen o un nombre. */
  title?: string;
  /** El mensaje, siempre en texto: el icono y el color nunca son la única pista. */
  children: string;
  /** Botones que resuelven el aviso, colocados debajo del mensaje. */
  actions?: ReactNode;
};

export function Notice({ tone, title, children, actions }: NoticeProps) {
  const theme = useTheme();
  const { icon, iconColor, background } = noticeTones[tone];

  return (
    <View style={[styles.notice, { backgroundColor: theme[background] }]}>
      <View style={styles.icon}>
        <Icon name={icon} color={iconColor} />
      </View>
      <View style={styles.body}>
        {title ? (
          <ThemedText step="callout" style={styles.title}>
            {title}
          </ThemedText>
        ) : null}
        <ThemedText step="callout">{children}</ThemedText>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  // Centra el icono de 20 px en la primera línea de texto, de 22 px.
  icon: {
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: space[1],
  },
  title: {
    fontWeight: 600,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    marginTop: space[2],
  },
});
