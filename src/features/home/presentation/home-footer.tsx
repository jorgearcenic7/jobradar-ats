// Pie de Inicio a todo el ancho: aplica él mismo el área segura inferior, como pide `Screen`.
import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { layout, space } from '@/shared/theme';
import { ThemedText } from '@/shared/ui/themed-text';

export function HomeFooter() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.footer, { borderTopColor: theme.headerBorder }]}>
      <View
        style={[
          styles.inner,
          {
            paddingBottom: insets.bottom + space[6],
            paddingLeft: insets.left + layout.screenPadding,
            paddingRight: insets.right + layout.screenPadding,
          },
        ]}>
        <ThemedText step="footnote" color="textTertiary">
          © JobRadar ATS
        </ThemedText>
        <ThemedText step="footnote" color="textTertiary" style={styles.note}>
          El análisis se hace en tu dispositivo. Tus textos no se envían ni se guardan.
        </ThemedText>
        <Link href="/privacidad">
          <ThemedText step="footnote" color="textSecondary">
            Privacidad
          </ThemedText>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { borderTopWidth: 1, marginTop: space[16] },
  inner: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    columnGap: space[6],
    rowGap: space[2],
    paddingTop: space[6],
  },
  note: { flexShrink: 1 },
});
