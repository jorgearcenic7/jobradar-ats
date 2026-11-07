import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';
import { iconSize, type ThemeColor } from '@/shared/theme';

type PlatformSymbols = { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol };

/**
 * Icon catalog: SF Symbols on iOS, Material Symbols on Android and web. Outlined SF Symbols are
 * used to match the outlined Material font that `expo-symbols` loads. Add names only when a
 * screen needs them.
 */
export const iconSymbols = {
  add: { ios: 'plus', android: 'add', web: 'add' },
  arrowForward: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  checkCircle: { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' },
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  error: { ios: 'exclamationmark.circle', android: 'error', web: 'error' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
} as const satisfies Record<string, PlatformSymbols>;

export type IconName = keyof typeof iconSymbols;

export type IconProps = {
  name: IconName;
  size?: keyof typeof iconSize;
  color?: ThemeColor;
  /** Makes the icon informative and names it for assistive technologies. Without it, the icon is decorative. */
  label?: string;
};

export function Icon({ name, size = 'md', color = 'text', label }: IconProps) {
  const theme = useTheme();
  // Hide only the icon itself, never its parent: siblings keep their own accessibility.
  const accessibility = label
    ? ({ accessible: true, role: 'img', accessibilityLabel: label } as const)
    : ({
        accessible: false,
        importantForAccessibility: 'no-hide-descendants',
        accessibilityElementsHidden: true,
        'aria-hidden': true,
      } as const);

  return (
    <SymbolView
      name={iconSymbols[name]}
      size={iconSize[size]}
      tintColor={theme[color]}
      {...accessibility}
    />
  );
}
