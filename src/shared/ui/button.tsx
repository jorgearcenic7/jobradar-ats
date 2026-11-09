import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { layout, radius, space, typography, type ThemeColor } from '@/shared/theme';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { Icon, type IconName } from '@/shared/ui/icon';

export type ButtonProps = {
  /** Visible text and accessible name. */
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  /** Decorative leading icon; the label already names the action. */
  icon?: IconName;
  disabled?: boolean;
  /** Shows a spinner in place of the content and ignores presses, keeping the button's size. */
  loading?: boolean;
  /** Layout adjustments (width, margins), merged last. */
  style?: StyleProp<ViewStyle>;
};

type VariantColors = {
  background: ThemeColor;
  pressedBackground: ThemeColor;
  border: ThemeColor;
  content: ThemeColor;
};

const variants: Record<NonNullable<ButtonProps['variant']>, VariantColors> = {
  primary: {
    background: 'primary',
    pressedBackground: 'primaryPressed',
    border: 'primary',
    content: 'onPrimary',
  },
  secondary: {
    background: 'surface',
    pressedBackground: 'surfaceSelected',
    border: 'borderStrong',
    content: 'text',
  },
};

// Same look for every variant: neutral and without brand color, but still legible
// (textSecondary on neutralSubtle is above 6:1 in both themes).
const disabledColors: VariantColors = {
  background: 'neutralSubtle',
  pressedBackground: 'neutralSubtle',
  border: 'border',
  content: 'textSecondary',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const [focusVisible, setFocusVisible] = useState(false);
  const colors = disabled ? disabledColors : variants[variant];
  const content = theme[colors.content];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      // aria-* props reach both native accessibility states and the web DOM.
      aria-disabled={disabled}
      aria-busy={loading}
      disabled={disabled}
      // While loading the button ignores presses but stays focusable, so keyboard and
      // screen reader users don't lose their place when the action starts.
      onPress={loading ? undefined : onPress}
      onFocus={(event) => setFocusVisible(isKeyboardFocus(event))}
      onBlur={() => setFocusVisible(false)}
      // React Native Web también entrega `hovered`, que los tipos de React Native no declaran: en la
      // web el puntero encima ya muestra el color de pulsado. En iOS y Android llega sin definir.
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        {
          backgroundColor:
            theme[(pressed || hovered) && !loading ? colors.pressedBackground : colors.background],
          borderColor: theme[colors.border],
        },
        focusVisible && { ...focusRing, outlineColor: theme.focusRing },
        style,
      ]}>
      <View style={[styles.content, loading && styles.hidden]}>
        {icon ? <Icon name={icon} color={colors.content} /> : null}
        <Text style={[typography.headline, styles.label, { color: content }]}>{label}</Text>
      </View>
      {loading ? (
        // The busy state already announces the loading; the spinner is visual only.
        <View
          style={styles.spinner}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden>
          <ActivityIndicator color={content} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    // Never wider than its container, even with very large text or narrow screens.
    maxWidth: '100%',
    justifyContent: 'center',
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    // When space runs out the icon moves above the label before any word has to break.
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
  },
  label: {
    flexShrink: 1,
    // Lets the label wrap instead of pushing the button past its container.
    minWidth: 0,
    textAlign: 'center',
  },
  // The content stays in the layout so the button keeps its size while loading.
  hidden: {
    opacity: 0,
  },
  spinner: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
