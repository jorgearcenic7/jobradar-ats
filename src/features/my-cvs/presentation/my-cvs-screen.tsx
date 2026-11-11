/*
«Mis CV» (`/mis-cv`): los CV que el usuario decide guardar en su cuenta.

Solo existe con sesión: sin ella, o sin Supabase configurado, redirige a Acceder. Todo el
contenido se monta con la clave del usuario, de modo que un cambio de cuenta descarta el
documento importado, las confirmaciones pendientes y la lista de la cuenta anterior.

Guardar es siempre voluntario y explícito. El análisis sigue siendo local: «Analizar» solo
descarga el texto guardado y lo lleva al analizador, que funciona igual que sin cuenta.
*/
import { Link, Redirect, router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/auth/auth-provider';
import { CvFileField, useCvImport } from '@/features/cv-import';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { layout, space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { Notice } from '@/shared/ui/notice';
import { Screen } from '@/shared/ui/screen';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

import { savedCvLimits, type SavedCv } from '../domain/saved-cv';
import { selectCvForAnalysis } from './cv-selection';
import { SaveCvPanel } from './save-cv-panel';
import { SavedCvItem } from './saved-cv-item';
import { useMyCvs } from './use-my-cvs';

function MyCvsContent({ userId, email }: { userId: string; email: string }) {
  const library = useMyCvs(userId);
  const cvImport = useCvImport({ keepOriginal: true });
  const { list } = library;
  const count = list.status === 'ready' ? list.items.length : null;

  const analyze = async (cv: SavedCv) => {
    const text = await library.loadText(cv);
    selectCvForAnalysis({ title: cv.title, text });
    router.push('/analisis');
  };

  return (
    <>
      <Notice tone="info" title="Cuenta">
        {`Sesión iniciada como ${email}. Los CV que guardes aquí se guardan en esta cuenta y solo tú puedes verlos.`}
      </Notice>
      <Link href="/privacidad">
        <ThemedText step="footnote" color="primary">
          Qué se guarda, dónde y cómo eliminarlo
        </ThemedText>
      </Link>

      <Card style={styles.section}>
        <Heading level={2} step="headline">
          Añadir un CV
        </Heading>
        <ThemedText step="callout" color="textSecondary">
          Elige un PDF o un Word. Se lee en tu dispositivo y no se guarda hasta que lo confirmes.
        </ThemedText>
        <CvFileField cvImport={cvImport} />
        <SaveCvPanel
          cvImport={cvImport}
          email={email}
          atLimit={count !== null && count >= savedCvLimits.maxCvs}
          onSave={library.save}
        />
      </Card>

      <View style={styles.section}>
        <View style={styles.listHeading}>
          <Heading level={2} step="headline">
            CV guardados
          </Heading>
          {count !== null ? (
            <ThemedText step="footnote" color="textSecondary">
              {`${count} de ${savedCvLimits.maxCvs}`}
            </ThemedText>
          ) : null}
        </View>
        <View aria-live="polite">
          {list.status === 'loading' ? (
            <ActivityIndicator accessibilityLabel="Cargando tus CV" />
          ) : list.status === 'error' ? (
            <Notice
              tone="danger"
              actions={<Button label="Reintentar" variant="secondary" onPress={library.reload} />}>
              {list.message}
            </Notice>
          ) : list.items.length === 0 ? (
            <EmptyState
              icon="document"
              title="Todavía no has guardado ningún CV"
              description="Los CV que guardes aparecerán aquí para analizarlos desde cualquier dispositivo."
            />
          ) : (
            <View style={styles.list}>
              {list.items.map((cv) => (
                <SavedCvItem
                  key={cv.id}
                  cv={cv}
                  onAnalyze={analyze}
                  onRename={library.rename}
                  onDelete={library.remove}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </>
  );
}

export function MyCvsScreen() {
  const { session, loading, configured } = useAuth();
  if (!loading && (!configured || !session)) return <Redirect href="/acceso" />;

  return (
    <Screen header={<AppNavigation section="my-cvs" />}>
      <View style={styles.container}>
        <View style={styles.intro}>
          <ThemedText step="title" accessibilityRole="header">
            Mis CV
          </ThemedText>
          <ThemedText color="textTertiary">
            Guarda tus CV para analizarlos desde cualquier dispositivo. El análisis sigue haciéndose
            en tu dispositivo, y sin cuenta puedes analizar igual.
          </ThemedText>
        </View>
        {session ? (
          <MyCvsContent
            key={session.user.id}
            userId={session.user.id}
            email={session.user.email ?? 'sin email'}
          />
        ) : (
          <ActivityIndicator accessibilityLabel="Cargando sesión" />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: layout.maxContentWidth,
    alignSelf: 'center',
    gap: space[6],
    paddingTop: space[6],
  },
  intro: {
    gap: space[2],
  },
  section: {
    gap: space[4],
  },
  listHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space[2],
  },
  list: {
    gap: space[3],
  },
});
