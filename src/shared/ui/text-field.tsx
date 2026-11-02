import {
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { layout, radius, space, typography } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';

/** Keyboard and editing behavior passed straight to the native input. */
type KeyboardProps = Pick<
  TextInputProps,
  | 'inputMode'
  | 'autoComplete'
  | 'autoCapitalize'
  | 'autoCorrect'
  | 'enterKeyHint'
  | 'submitBehavior'
  | 'onSubmitEditing'
  | 'onFocus'
  | 'onBlur'
>;

export type TextFieldProps = KeyboardProps & {
  /** Visible text and accessible name. */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Persistent guidance. */
  helperText?: string;
  /** Message to show; its presence marks the field as invalid. The caller decides the rules and when. */
  error?: string;
  disabled?: boolean;
  /** Lets screens move focus, for example to the next field or to the first invalid one. */
  ref?: Ref<TextInputInstance>;
  /** Layout adjustments for the whole field (width, margins), merged last. */
  style?: StyleProp<ViewStyle>;
};

// Hydration status never changes after mount, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * Single-line text input with a visible label above it, and the error and guidance below it.
 */
export function TextField({
  label,
  value,
  onChangeText,
  helperText,
  error,
  disabled = false,
  ref,
  style,
  onFocus,
  onBlur,
  ...keyboardProps
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  // The label focuses the input, so the component keeps its own reference and hands the same
  // instance to the caller.
  const inputRef = useRef<TextInputInstance>(null);
  useImperativeHandle(ref, () => inputRef.current!, []);
  // On web, Expo Router's server and client trees give different useId values, so ids in the
  // server HTML would point to elements that no longer exist after the first update. Ids are
  // only rendered once hydrated; until then the field is still named by accessibilityLabel.
  const hasHydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const id = useId();
  const labelId = hasHydrated ? `${id}-label` : undefined;
  const helperId = hasHydrated ? `${id}-helper` : undefined;
  const errorId = hasHydrated ? `${id}-error` : undefined;

  const showFocus = focused && !disabled;
  const borderColor = disabled
    ? theme.border
    : error
      ? theme.danger
      : showFocus
        ? theme.primary
        : theme.borderStrong;

  // Web: the DOM links the messages through ids, in the order they are shown. React Native has
  // no equivalent on iOS or Android, so there the same messages are read as the input's hint.
  // Messages are full sentences, so they are joined with a space.
  const describedBy = [error && errorId, helperText && helperId].filter(Boolean).join(' ');
  const hint = [error && `Error: ${error}`, helperText].filter(Boolean).join(' ');

  return (
    <View style={[styles.field, style]}>
      {/* Pressing the label focuses the input, like an HTML label. It adds no tab stop on web. */}
      <Text
        nativeID={labelId}
        onPress={disabled ? undefined : () => inputRef.current?.focus()}
        style={[typography.headline, { color: theme.text }]}>
        {label}
      </Text>
      <View>
        <TextInput
          {...keyboardProps}
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          editable={!disabled}
          // Out of the tab order on web, like a disabled button.
          focusable={!disabled}
          // iOS reads accessibilityLabel; Android and web take the name from the visible label.
          accessibilityLabel={label}
          aria-labelledby={labelId}
          accessibilityHint={hint || undefined}
          aria-disabled={disabled}
          // React Native's types don't declare these two attributes, but JSX accepts hyphenated
          // names without a cast. React Native Web writes them to the DOM; iOS and Android ignore them.
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          selectionColor={theme.primary}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              borderColor,
              backgroundColor: disabled ? theme.neutralSubtle : theme.surface,
              color: disabled ? theme.textSecondary : theme.text,
            },
            // Focus thickens the border to 2 px with an inner shadow, which takes no layout space,
            // so the text never moves. High contrast modes drop shadows and recolor the transparent
            // outline instead, so focus stays visible there too (web).
            showFocus && { boxShadow: `inset 0 0 0 1px ${borderColor}`, ...styles.focusOutline },
          ]}
        />
        {/* Always mounted, so an error that appears later is announced (web and Android). */}
        <View aria-live="polite">
          {error ? (
            <View style={[styles.message, styles.error]}>
              {/* The icon is decorative: the text and the field's invalid state carry the meaning. */}
              <View style={styles.errorIcon}>
                <Icon name="error" size="sm" color="danger" />
              </View>
              <Text
                nativeID={errorId}
                selectable
                style={[typography.callout, styles.errorText, { color: theme.danger }]}>
                {error}
              </Text>
            </View>
          ) : null}
        </View>
        {helperText ? (
          <Text
            nativeID={helperId}
            style={[
              typography.callout,
              error ? styles.messageAfterError : styles.message,
              { color: theme.textSecondary },
            ]}>
            {helperText}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space[2],
  },
  // Messages use `callout` (15 px): instructions on how to fix the value must be easy to read.
  message: {
    paddingTop: space[2],
  },
  messageAfterError: {
    paddingTop: space[1],
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[1],
  },
  // Centers the 16 px icon on the first 22 px line of callout text.
  errorIcon: {
    marginTop: 3,
  },
  errorText: {
    flexShrink: 1,
    minWidth: 0,
  },
  input: {
    minHeight: layout.minTouchTarget,
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    // 17 px also keeps Safari on iPhone from zooming the page on focus (it does below 16 px).
    // No lineHeight: single-line inputs on iOS misplace the text when it is set.
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    // Web: replaces the browser's own focus ring, which would cover the border. A solid style
    // is needed: with the default `auto` style the browser draws its ring at any width.
    outlineStyle: 'solid',
    outlineWidth: 0,
  },
  focusOutline: {
    outlineWidth: 2,
    outlineColor: 'transparent',
  },
});
