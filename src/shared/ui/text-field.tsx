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
  useWindowDimensions,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatCount } from '@/shared/format';
import { layout, radius, space, typography, useAppFont } from '@/shared/theme';
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
  | 'placeholder'
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
  /**
   * Lets the text span several lines. The field grows with it up to a maximum height and then
   * scrolls inside, so long pasted texts are kept whole without taking over the screen.
   */
  multiline?: boolean;
  /**
   * Solo con `multiline`: deja crecer el campo bastante más antes de desplazarse por dentro, para
   * revisar un texto largo con comodidad. Solo cambia la zona visible; el texto nunca se recorta.
   */
  expanded?: boolean;
  /** Solo con `multiline`: líneas visibles cuando el campo está vacío. Por defecto, 6. */
  minLines?: number;
  /** Muestra en vivo cuántos caracteres hay, a la derecha de la ayuda, sin ningún límite. */
  showCount?: boolean;
  /**
   * Shows a counter against this number of characters. It never truncates: going over is only
   * shown, and the caller decides whether that is an error.
   */
  characterLimit?: number;
};

// Hydration status never changes after mount, so there is nothing to subscribe to.
const subscribe = () => () => {};

// Multiline heights in lines of body text: room to read a few paragraphs, while the label and
// the text being edited stay visible above the keyboard on a small iPhone.
const MIN_LINES = 6;
const MAX_LINES = 12;
// The fewest lines the field shows when the screen cap below would leave it smaller.
const FLOOR_LINES = 3;
// iOS and Android: the most of the window height the field may take.
const MAX_WINDOW_SHARE = 0.45;
// Vertical padding and the 1 px border on each side.
const INPUT_CHROME = space[3] * 2 + 2;
/*
Campo ampliado: hasta 28 líneas, sin pasar del 75 % de la ventana, para que la etiqueta o el botón
que lo reduce sigan a la vista. Nunca queda por debajo de la altura máxima normal. Solo se activa
tras una acción del usuario, así que el HTML del servidor, que no conoce la ventana, no lo usa.
*/
const EXPANDED_MAX_LINES = 28;
const EXPANDED_WINDOW_SHARE = 0.75;

/**
 * Text input with a visible label above it, and the error, guidance and optional counter below it.
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
  multiline = false,
  expanded = false,
  minLines = MIN_LINES,
  showCount = false,
  characterLimit,
  onFocus,
  onBlur,
  ...keyboardProps
}: TextFieldProps) {
  const theme = useTheme();
  const font = useAppFont();
  // Todo el campo usa Inter Regular salvo la etiqueta, en Medium.
  const regular = font?.(400);
  const windowSize = useWindowDimensions();
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
  const counterId = hasHydrated ? `${id}-counter` : undefined;
  const limitNoticeId = hasHydrated ? `${id}-limit` : undefined;

  const hasCounter = characterLimit !== undefined;
  const overLimit = hasCounter && value.length > characterLimit;
  // Read without thousand separators: a screen reader set to another language than the page could
  // take the dot for a decimal point.
  const counterDescription = hasCounter
    ? `${value.length} de ${characterLimit} caracteres.`
    : undefined;

  const showFocus = focused && !disabled;
  const borderColor = disabled
    ? theme.border
    : error
      ? theme.danger
      : showFocus
        ? theme.primary
        : theme.inputBorder;

  // Web: the DOM links the messages through ids, in the order they are shown. React Native has
  // no equivalent on iOS or Android, so there the same messages are read as the input's hint.
  // Messages are full sentences, so they are joined with a space.
  const describedBy = [
    error && errorId,
    helperText && helperId,
    hasCounter && counterId,
    overLimit && limitNoticeId,
  ]
    .filter(Boolean)
    .join(' ');
  const hint = [
    error && `Error: ${error}`,
    helperText,
    counterDescription,
    overLimit && 'Límite superado.',
  ]
    .filter(Boolean)
    .join(' ');

  // Multiline heights follow the user's text size. iOS and Android also cap them by the window,
  // so very large text keeps the field usable. On web both stay fixed: the browser zoom already
  // scales them, and the server, which renders the first HTML, doesn't know the window.
  const isWeb = process.env.EXPO_OS === 'web';
  const lineHeight = typography.body.lineHeight * (isWeb ? 1 : windowSize.fontScale);
  const linesHeight = (lines: number) => lines * lineHeight + INPUT_CHROME;
  const regularMaxHeight = isWeb
    ? linesHeight(MAX_LINES)
    : Math.max(
        Math.min(linesHeight(MAX_LINES), windowSize.height * MAX_WINDOW_SHARE),
        linesHeight(FLOOR_LINES),
      );
  const maxHeight = expanded
    ? Math.max(
        Math.min(linesHeight(EXPANDED_MAX_LINES), windowSize.height * EXPANDED_WINDOW_SHARE),
        regularMaxHeight,
      )
    : regularMaxHeight;
  const minHeight = Math.min(linesHeight(minLines), maxHeight);

  return (
    <View style={[styles.field, style]}>
      {/* Pressing the label focuses the input, like an HTML label. It adds no tab stop on web. */}
      <Text
        nativeID={labelId}
        onPress={disabled ? undefined : () => inputRef.current?.focus()}
        style={[
          typography.callout,
          styles.label,
          { color: theme.text },
          font?.(styles.label.fontWeight),
        ]}>
        {label}
      </Text>
      <View>
        <TextInput
          {...keyboardProps}
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
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
          placeholderTextColor={theme.textTertiary}
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
            regular,
            // No fixed height: React Native sizes a multiline input to its text between these bounds
            // and scrolls inside it beyond the maximum (not yet verified on devices). Browsers need
            // `field-sizing`; without it the field keeps its minimum height and scrolls. Nothing is
            // measured in JS.
            multiline && [styles.multiline, { minHeight, maxHeight }, isWeb && styles.growWithText],
            // Focus thickens the border to 2 px with an inner shadow, which takes no layout space,
            // so the text never moves. High contrast modes drop shadows and recolor the transparent
            // outline instead, so focus stays visible there too (web).
            showFocus && {
              // El halo de acento solo acompaña a un campo válido: con error manda el borde rojo.
              boxShadow: error
                ? `inset 0 0 0 1px ${borderColor}`
                : `inset 0 0 0 1px ${borderColor}, 0 0 0 3px ${theme.focusHalo}`,
              ...styles.focusOutline,
            },
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
                style={[typography.callout, styles.errorText, { color: theme.danger }, regular]}>
                {error}
              </Text>
            </View>
          ) : null}
        </View>
        {helperText || showCount ? (
          // La ayuda a la izquierda y el recuento a la derecha; con poco ancho, el recuento baja.
          <View style={[styles.helperRow, error ? styles.messageAfterError : styles.message]}>
            {helperText ? (
              <Text
                nativeID={helperId}
                style={[
                  typography.footnote,
                  styles.helper,
                  { color: theme.textSecondary },
                  regular,
                ]}>
                {helperText}
              </Text>
            ) : null}
            {showCount ? (
              // No es una región viva: anunciar el recuento en cada pulsación sería ruido.
              <Text
                style={[typography.footnote, styles.count, { color: theme.textTertiary }, regular]}>
                {`${formatCount(value.length)} ${value.length === 1 ? 'carácter' : 'caracteres'}`}
              </Text>
            ) : null}
          </View>
        ) : null}
        {hasCounter ? (
          <View
            style={[
              styles.counter,
              error || helperText ? styles.messageAfterError : styles.message,
            ]}>
            {/* Always mounted while there is a limit, so crossing it is announced once (web and
                Android). The count stays outside: it would be read on every keystroke. */}
            <View aria-live="polite" style={styles.limitNotice}>
              {overLimit ? (
                <View style={styles.error}>
                  <View style={styles.errorIcon}>
                    <Icon name="error" size="sm" color="danger" />
                  </View>
                  <Text
                    nativeID={limitNoticeId}
                    style={[
                      typography.callout,
                      styles.errorText,
                      { color: theme.danger },
                      regular,
                    ]}>
                    Límite superado
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              nativeID={counterId}
              accessibilityLabel={counterDescription}
              style={[
                typography.callout,
                styles.count,
                { color: overLimit ? theme.danger : theme.textSecondary },
                regular,
              ]}>
              {`${formatCount(value.length)} / ${formatCount(characterLimit)}`}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: space[2],
  },
  // Los errores usan `callout` (15 px): cómo corregir el valor debe leerse bien. La ayuda
  // persistente, `footnote` (13 px), como el resto de metadatos.
  label: {
    fontWeight: 500,
  },
  helperRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    columnGap: space[4],
  },
  helper: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
  },
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
  // Its own line, at the end. The notice wraps above the count when both don't fit.
  counter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    columnGap: space[3],
  },
  limitNotice: {
    flexShrink: 1,
    minWidth: 0,
  },
  // Same-width digits, so the count doesn't shift while typing.
  count: {
    fontVariant: ['tabular-nums'],
    marginLeft: 'auto',
  },
  input: {
    minHeight: layout.minTouchTarget,
    padding: space[3],
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    // 16 px also keeps Safari on iPhone from zooming the page on focus (it does below 16 px).
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
  // Line heights are needed to size the field in lines. Android centers multiline text unless told.
  multiline: {
    lineHeight: typography.body.lineHeight,
    textAlignVertical: 'top',
  },
  // Web only: lets the browser size the field to its text (see `web-text-style.d.ts`).
  growWithText: {
    fieldSizing: 'content',
  },
});
