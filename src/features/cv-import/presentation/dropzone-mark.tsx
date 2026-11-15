/*
Marca de la zona de subida en iOS y Android: el icono de archivo sobre su casilla de acento.

La web dibuja en su lugar la diana del radar (`dropzone-mark.web.tsx`), que reacciona al arrastrar.
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';

export type DropzoneMarkProps = {
  /** Un archivo está encima de la zona (solo web). */
  dragging: boolean;
  /** El puntero está encima o se está pulsando. */
  active: boolean;
  invalid: boolean;
};

export function DropzoneMark(_props: DropzoneMarkProps) {
  const theme = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: theme.accentSubtle }]}>
      <Icon name="uploadFile" size="lg" color="onAccentSubtle" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 48,
    height: 48,
    marginBottom: space[2],
    borderRadius: radius.icon,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
