/*
Cabecera de la app: marca y destinos. Resultados pertenece a Analizar y no añade una sección
independiente. «Mis CV» solo aparece con sesión.

En el móvil es una sola fila de unos 56 px. Para que quepa se ocultan la insignia «ATS» y la acción
«Analizar mi CV» (Inicio la repite justo debajo), y «Acceder» o «Mi cuenta» pasa a un botón de
icono con el mismo nombre accesible. Con cuatro destinos en una pantalla muy estrecha también se
oculta el nombre a la vista, pero no a los lectores de pantalla. En la web lo decide el CSS de
`header-layout.css` a partir de atributos `data-*`, sin consultar la ventana, para que el HTML
estático valga para cualquier pantalla; en iOS y Android se decide con el ancho de la ventana.

Va a todo el ancho, en el hueco `header` de `Screen`, así que aplica ella misma el área segura
superior y los márgenes. En la web queda fija arriba con un fondo translúcido.
*/
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/features/auth/auth-provider';
import { layout, radius, space, webTransition } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { focusRing, isKeyboardFocus } from '@/shared/ui/focus-ring';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

import { HeaderLayout, HeaderShell } from './header-layout';

const isWeb = process.env.EXPO_OS === 'web';
// Los mismos cortes que `header-layout.css`.
const compactWidth = 640;
const narrowWidth = 420;
// Con los enlaces de 44 px, la fila mide unos 56 px más el borde.
const headerPadding = 6;

export type AppNavigationProps = {
  /** `privacy` no es un destino de la cabecera: ningún enlace queda marcado. */
  section: 'home' | 'analysis' | 'my-cvs' | 'account' | 'privacy';
  /** Solo en Inicio: la acción «Analizar mi CV» en la cabecera. */
  onAnalyze?: () => void;
};

type NavItem = {
  key: string;
  href: Href;
  label: string;
  /** Solo la cuenta: `full` con texto, `compact` como icono. */
  variant?: 'full' | 'compact';
};

export function AppNavigation({ section, onAnalyze }: AppNavigationProps) {
  const theme = useTheme();
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [focused, setFocused] = useState<string | null>(null);

  const accountLabel = loading || session ? 'Mi cuenta' : 'Acceder';
  const destinations = session ? 4 : 3;
  // En la web se dibujan las dos versiones y el CSS muestra una; en nativo se elige aquí.
  const nativeCompact = !isWeb && width < compactWidth;
  const hideWordmark = !isWeb && destinations === 4 && width < narrowWidth;

  const items: NavItem[] = [
    { key: 'home', href: '/', label: 'Inicio' },
    { key: 'analysis', href: '/analisis', label: 'Analizar' },
    ...(session ? [{ key: 'my-cvs', href: '/mis-cv' as const, label: 'Mis CV' }] : []),
    ...(isWeb
      ? [
          { key: 'account', href: '/mi-cuenta' as const, label: accountLabel, variant: 'full' },
          { key: 'account', href: '/mi-cuenta' as const, label: accountLabel, variant: 'compact' },
        ]
      : [
          {
            key: 'account',
            href: '/mi-cuenta' as const,
            label: accountLabel,
            variant: nativeCompact ? 'compact' : 'full',
          },
        ]),
  ] as NavItem[];

  const brand = (
    <View style={styles.brand} dataSet={{ navItems: destinations }}>
      {/* Decorativo mientras el nombre está escrito al lado; si se oculta, el logo lo nombra. */}
      <View style={[styles.logoTile, { backgroundColor: theme.accentSubtle }]}>
        <Image
          source={require('../../../assets/images/logo.png')}
          style={[styles.logo, { tintColor: theme.logoMark }]}
          {...(hideWordmark
            ? { accessible: true, accessibilityLabel: 'JobRadar' }
            : { 'aria-hidden': true })}
          accessibilityIgnoresInvertColors
        />
      </View>
      {hideWordmark ? null : (
        <View dataSet={{ headerWordmark: true }}>
          <ThemedText step="headline">JobRadar</ThemedText>
        </View>
      )}
      {nativeCompact ? null : (
        <View
          dataSet={{ headerBadge: true }}
          style={[styles.badge, { backgroundColor: theme.accentSubtle }]}>
          <ThemedText step="caption" color="onAccentSubtle" style={styles.badgeText}>
            ATS
          </ThemedText>
        </View>
      )}
    </View>
  );

  const nav = (
    <View role="navigation" aria-label="Navegación principal" style={styles.links}>
      {items.map((item) => {
        const selected = item.key === section;
        const id = `${item.key}-${item.variant ?? 'full'}`;
        const compact = item.variant === 'compact';
        return (
          <Link key={id} href={item.href} dismissTo={section === 'analysis'} asChild>
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
              accessibilityState={isWeb ? undefined : { selected }}
              dataSet={{
                headerLink: true,
                ...(item.variant ? { headerAccount: item.variant } : {}),
              }}
              onFocus={(event) => setFocused(isKeyboardFocus(event) ? id : null)}
              onBlur={() => setFocused(null)}
              // `Link asChild` fusiona el estilo como un objeto: no admite listas ni funciones.
              style={StyleSheet.flatten([
                styles.link,
                compact && styles.iconLink,
                focused === id && { ...focusRing, outlineColor: theme.focusRing },
              ])}>
              {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
                <>
                  {/*
                  La sección actual se ve por el fondo y por el color del texto; el puntero, por el
                  mismo fondo, que aparece y desaparece con una transición corta.
                  */}
                  <View
                    pointerEvents="none"
                    style={[
                      styles.linkBackground,
                      linkTransition,
                      {
                        backgroundColor:
                          selected || pressed || hovered ? theme.neutralSubtle : 'transparent',
                      },
                    ]}
                  />
                  {compact ? (
                    <Icon name="account" color={selected ? 'text' : 'textSecondary'} />
                  ) : (
                    <ThemedText
                      step="callout"
                      color={selected ? 'text' : 'textSecondary'}
                      style={{ fontWeight: 500 }}>
                      {item.label}
                    </ThemedText>
                  )}
                </>
              )}
            </Pressable>
          </Link>
        );
      })}
    </View>
  );

  const action =
    onAnalyze && !nativeCompact ? (
      <Button label="Analizar mi CV" variant="dark" onPress={onAnalyze} />
    ) : null;

  return (
    <HeaderShell backgroundColor={theme.headerBackground} borderColor={theme.headerBorder}>
      <View
        style={[
          styles.inner,
          {
            paddingTop: insets.top + headerPadding,
            paddingLeft: insets.left + layout.screenPadding,
            paddingRight: insets.right + layout.screenPadding,
          },
        ]}>
        <HeaderLayout brand={brand} nav={nav} action={action} />
      </View>
    </HeaderShell>
  );
}

const linkTransition = webTransition(['background-color']);

const styles = StyleSheet.create({
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    paddingBottom: headerPadding,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexShrink: 0 },
  logoTile: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // El PNG tiene versiones @2x y @3x; el color lo pone `tintColor` según el tema.
  logo: { width: 24, height: 24 },
  badge: {
    paddingHorizontal: space[1] + 2,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  badgeText: { fontWeight: 600 },
  links: { flexDirection: 'row', alignItems: 'center', gap: space[1], minWidth: 0 },
  link: {
    minHeight: layout.minTouchTarget,
    minWidth: layout.minTouchTarget,
    paddingHorizontal: space[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  iconLink: { paddingHorizontal: 0 },
  linkBackground: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.sm,
  },
});
