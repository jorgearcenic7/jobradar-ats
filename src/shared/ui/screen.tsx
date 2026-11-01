import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { layout, space } from '@/shared/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Scrolls vertically so content stays reachable with enlarged text. Disable when the root is a list. */
  scroll?: boolean;
  /** Layout adjustments for the content area, merged last. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Root container for a screen: full-bleed background, safe areas and the app margins.
 * Safe areas are applied only here, so screens never add their own insets.
 */
export function Screen({ children, scroll = true, style }: ScreenProps) {
  const theme = useTheme();
  // Native insets come from Expo Router's provider. On web they are always zero, so the
  // wrapper below applies the browser's `env(safe-area-inset-*)` values through CSS instead.
  const insets = useSafeAreaInsets();
  const background = { backgroundColor: theme.background };
  const content = [
    styles.content,
    {
      paddingTop: insets.top + space[4],
      paddingBottom: insets.bottom + space[6],
      paddingLeft: insets.left + layout.screenPadding,
      paddingRight: insets.right + layout.screenPadding,
    },
    style,
  ];

  const body = scroll ? (
    <ScrollView
      style={[styles.fill, background]}
      contentContainerStyle={content}
      // Insets are already in the padding; the system must not add its own on iOS.
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, background]}>
      <View style={[styles.fill, content]}>{children}</View>
    </View>
  );

  if (process.env.EXPO_OS === 'web') {
    // `.screen-safe-area` lives in `src/global.css`; React Native Web views don't accept class names.
    return (
      <div className="screen-safe-area" style={background}>
        {body}
      </div>
    );
  }

  return body;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: space[4],
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
  },
});
