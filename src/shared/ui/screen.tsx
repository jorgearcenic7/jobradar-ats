import type { CSSProperties, ReactNode, Ref } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { layout, space } from '@/shared/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Scrolls vertically so content stays reachable with enlarged text. Disable when the root is a list. */
  scroll?: boolean;
  /** Layout adjustments for the content area, merged last. */
  style?: StyleProp<ViewStyle>;
  /**
   * Cabecera a todo el ancho, por encima del contenido y dentro del desplazamiento. Aplica ella
   * misma el área segura superior y los márgenes laterales.
   */
  header?: ReactNode;
  /** Pie a todo el ancho, al final del contenido. Aplica él mismo el área segura inferior. */
  footer?: ReactNode;
  /** El contenedor de desplazamiento, para llevar la vista a una sección (solo con `scroll`). */
  scrollRef?: Ref<ScrollViewInstance>;
};

/**
 * Root container for a screen: full-bleed background, safe areas and the app margins.
 * Safe areas are applied here, or by the `header` and `footer` it receives, never by screens.
 */
export function Screen({ children, scroll = true, style, header, footer, scrollRef }: ScreenProps) {
  const theme = useTheme();
  // Native insets come from Expo Router's provider. On web they are always zero, so the
  // wrapper below applies the browser's `env(safe-area-inset-*)` values through CSS instead.
  const insets = useSafeAreaInsets();
  const background = { backgroundColor: theme.background };
  const content = [
    styles.content,
    {
      // La cabecera y el pie ya cubren su área segura; el contenido solo deja su propio aire.
      paddingTop: (header ? 0 : insets.top) + space[4],
      paddingBottom: (footer ? 0 : insets.bottom) + space[6],
      paddingLeft: insets.left + layout.screenPadding,
      paddingRight: insets.right + layout.screenPadding,
    },
    style,
  ];
  // Sin cabecera ni pie, el contenido es el propio contenedor del desplazamiento.
  const framed = Boolean(header || footer);

  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={[styles.fill, background]}
      contentContainerStyle={framed ? styles.frame : content}
      // Insets are already in the padding; the system must not add its own on iOS.
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled">
      {framed ? (
        <>
          {header}
          <View style={content}>{children}</View>
          {footer}
        </>
      ) : (
        children
      )}
    </ScrollView>
  ) : (
    <View style={[styles.fill, background]}>
      {header}
      <View style={[styles.fill, content]}>{children}</View>
      {footer}
    </View>
  );

  if (process.env.EXPO_OS === 'web') {
    // Only the env() insets come from `.screen-safe-area` in `src/global.css`, since React Native
    // Web views don't accept class names. The layout stays inline so it is already right in the
    // server HTML, before that stylesheet loads.
    return (
      <div className="screen-safe-area" style={{ ...webContainer, ...background }}>
        {body}
      </div>
    );
  }

  return body;
}

const webContainer: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flex: '1 1 0%',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  frame: {
    flexGrow: 1,
  },
  content: {
    flexGrow: 1,
    gap: space[4],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
});
