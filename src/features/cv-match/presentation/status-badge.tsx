import { StyleSheet, View } from 'react-native';

import type { RequirementStatus } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { radius, space, type ThemeColor } from '@/shared/theme';
import { ThemedText } from '@/shared/ui/themed-text';
import { Icon, type IconName } from '@/shared/ui/icon';

import { statusLabels } from './labels';

export const statusTones: Record<
  RequirementStatus,
  { icon: IconName; color: ThemeColor; background: ThemeColor }
> = {
  supported: { icon: 'checkCircle', color: 'success', background: 'successSubtle' },
  mentioned: { icon: 'warning', color: 'warning', background: 'warningSubtle' },
  missing: { icon: 'error', color: 'danger', background: 'dangerSubtle' },
  'not-evaluable': { icon: 'info', color: 'neutral', background: 'neutralSubtle' },
};

/** Status as icon plus text, never color alone. */
export function StatusBadge({ status }: { status: RequirementStatus }) {
  const theme = useTheme();
  const tone = statusTones[status];

  return (
    <View style={[styles.badge, { backgroundColor: theme[tone.background] }]}>
      <Icon name={tone.icon} size="sm" color={tone.color} />
      <ThemedText step="footnote" color={tone.color} style={styles.label}>
        {statusLabels[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space[1],
    paddingVertical: space[1],
    paddingHorizontal: space[2],
    borderRadius: radius.full,
  },
  label: {
    fontWeight: 600,
    flexShrink: 1,
  },
});
