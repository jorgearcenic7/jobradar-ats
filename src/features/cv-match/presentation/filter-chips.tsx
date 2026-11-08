// Filtros del analizador: los recuentos y la selección los controla la lista de resultados.
import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { RequirementStatus } from '@/features/cv-match/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { layout, radius, space } from '@/shared/theme';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

export type RequirementFilter = 'all' | Exclude<RequirementStatus, 'not-evaluable'>;

const options = [
  { value: 'all', label: 'Todos' },
  { value: 'missing', label: 'No acreditados' },
  { value: 'mentioned', label: 'Sin evidencia suficiente' },
  { value: 'supported', label: 'Respaldados' },
] as const;

type FilterChipsProps = {
  counts: Record<RequirementFilter, number>;
  value: RequirementFilter;
  onChange: (value: RequirementFilter) => void;
  allRef: Ref<ComponentRef<typeof View>>;
};

export function FilterChips({ counts, value, onChange, allRef }: FilterChipsProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState<RequirementFilter | null>(null);

  return (
    <View role="group" aria-label="Filtrar requisitos por estado" style={styles.chips}>
      {options.map((option) => {
        const selected = value === option.value;
        const label = `${option.label} (${counts[option.value]})`;
        return (
          <Pressable
            key={option.value}
            ref={option.value === 'all' ? allRef : undefined}
            accessibilityRole="button"
            accessibilityLabel={label}
            aria-pressed={selected}
            accessibilityState={process.env.EXPO_OS === 'web' ? undefined : { selected }}
            onPress={() => onChange(option.value)}
            onFocus={(event) => setFocused(isKeyboardFocus(event) ? option.value : null)}
            onBlur={() => setFocused(null)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected || pressed ? theme.surfaceSelected : theme.surface,
                borderColor: selected ? theme.primary : theme.borderStrong,
              },
              focused === option.value && { ...focusRing, outlineColor: theme.focusRing },
            ]}>
            {/* Reserva el espacio de la marca para que la selección no mueva los filtros. */}
            <View style={{ opacity: selected ? 1 : 0 }}>
              <Icon name="checkCircle" size="sm" />
            </View>
            <ThemedText step="footnote" style={styles.label}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[2],
  },
  chip: {
    minWidth: layout.minTouchTarget,
    minHeight: layout.minTouchTarget,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderWidth: 2,
    borderRadius: radius.full,
  },
  label: {
    flexShrink: 1,
    fontWeight: 600,
  },
});
