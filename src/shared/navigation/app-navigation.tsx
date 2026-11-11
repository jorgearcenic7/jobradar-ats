/*
Cabecera de la app: marca, los destinos y el recordatorio de privacidad. Resultados
pertenece a Analizar y no añade una sección independiente. «Mis CV» solo aparece con sesión.

Va a todo el ancho, en el hueco `header` de `Screen`, así que aplica ella misma el área segura
superior y los márgenes. En la web queda fija arriba con un fondo translúcido.
*/
import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/features/auth/auth-provider';
import { layout, radius, space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

import { HeaderLayout, HeaderShell } from './header-layout';

export type AppNavigationProps = {
  /** `privacy` no es un destino de la cabecera: ningún enlace queda marcado. */
  section: 'home' | 'analysis' | 'my-cvs' | 'account' | 'privacy';
  /** Solo en Inicio: la acción «Analizar mi CV» en la cabecera. */
  onAnalyze?: () => void;
};

export function AppNavigation({ section, onAnalyze }: AppNavigationProps) {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const [focused, setFocused] = useState<string | null>(null);

  const brand = (
    <View style={styles.brand}>
      {/* Decorativo: el nombre de la app ya está escrito al lado. */}
      <Image
        source={require('../../../assets/images/logo.png')}
        style={[styles.logo, { borderColor: theme.border }]}
        aria-hidden
        accessibilityIgnoresInvertColors
      />
      <ThemedText step="headline">JobRadar</ThemedText>
      <View style={[styles.badge, { backgroundColor: theme.accentSubtle }]}>
        <ThemedText step="caption" color="onAccentSubtle" style={styles.badgeText}>
          ATS
        </ThemedText>
      </View>
    </View>
  );

  const nav = (
    <View role="navigation" aria-label="Navegación principal" style={styles.links}>
      {(
        [
          { key: 'home', href: '/', label: 'Inicio' },
          { key: 'analysis', href: '/analisis', label: 'Analizar' },
          ...(session ? [{ key: 'my-cvs', href: '/mis-cv', label: 'Mis CV' } as const] : []),
          {
            key: 'account',
            href: '/mi-cuenta',
            label: loading || session ? 'Mi cuenta' : 'Acceder',
          },
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
                // La sección actual se ve por el fondo y por el color del texto.
                selected && { backgroundColor: theme.neutralSubtle },
                focused === item.key && { ...focusRing, outlineColor: theme.focusRing },
              ])}>
              <ThemedText
                step="callout"
                color={selected ? 'text' : 'textSecondary'}
                style={{ fontWeight: 500 }}>
                {item.label}
              </ThemedText>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );

  const note = (
    <View style={styles.privacy}>
      <Icon name="lock" size="xs" color="textTertiary" />
      <ThemedText step="footnote" color="textTertiary">
        El análisis ocurre en tu dispositivo
      </ThemedText>
    </View>
  );
  const action = onAnalyze ? (
    <Button label="Analizar mi CV" variant="dark" onPress={onAnalyze} />
  ) : null;

  return (
    <HeaderShell backgroundColor={theme.headerBackground} borderColor={theme.headerBorder}>
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + space[2],
            paddingLeft: insets.left + layout.screenPadding,
            paddingRight: insets.right + layout.screenPadding,
          },
        ]}>
        <HeaderLayout brand={brand} nav={nav} note={note} action={action} />
      </View>
    </HeaderShell>
  );
}

const styles = StyleSheet.create({
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingBottom: space[2],
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // El PNG tiene versiones @2x y @3x para pantallas de alta densidad.
  logo: { width: 32, height: 32, borderRadius: radius.sm, borderWidth: 1 },
  badge: {
    paddingHorizontal: space[1] + 2,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  badgeText: { fontWeight: 600 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1], maxWidth: '100%' },
  link: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: space[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space[1] + 2 },
});
