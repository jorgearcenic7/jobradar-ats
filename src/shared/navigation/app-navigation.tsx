// Dos destinos reales. Resultados pertenece a Analizar y no añade una sección independiente.
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { layout, space } from '@/shared/theme';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { ThemedText } from '@/shared/ui/themed-text';

export function AppNavigation({ section }: { section: 'home' | 'analysis' }) {
  const theme = useTheme();
  const [focused, setFocused] = useState<string | null>(null);

  return (
    <View style={styles.header}>
      <ThemedText step="heading">
        JobRadar{' '}
        <ThemedText step="heading" color="accentText">
          ATS
        </ThemedText>
      </ThemedText>
      <View role="navigation" aria-label="Navegación principal" style={styles.links}>
        {(
          [
            { key: 'home', href: '/', label: 'Inicio' },
            { key: 'analysis', href: '/analisis', label: 'Analizar' },
          ] as const
        ).map((item) => {
          const selected = item.key === section;
          return (
            <Link key={item.key} href={item.href} dismissTo={section === 'analysis'} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={
                  item.key === 'home' && section === 'analysis' ? 'Volver al inicio' : item.label
                }
                accessibilityHint={
                  item.key === 'home' && section === 'analysis'
                    ? 'Salir del analizador descarta los datos de esta sesión.'
                    : undefined
                }
                aria-current={selected ? 'page' : undefined}
                accessibilityState={process.env.EXPO_OS === 'web' ? undefined : { selected }}
                onFocus={(event) => setFocused(isKeyboardFocus(event) ? item.key : null)}
                onBlur={() => setFocused(null)}
                style={StyleSheet.flatten([
                  styles.link,
                  { borderBottomColor: selected ? theme.primary : 'transparent' },
                  focused === item.key && { ...focusRing, outlineColor: theme.focusRing },
                ])}>
                <ThemedText
                  step="footnote"
                  color={selected ? 'accentText' : 'textSecondary'}
                  style={{ fontWeight: selected ? 700 : 500 }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  links: { flexDirection: 'row', gap: space[1] },
  link: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: space[2],
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
  },
});
