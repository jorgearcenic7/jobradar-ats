/*
Tarjeta del CV elegido: nombre, formato, páginas, caracteres extraídos y estado de la lectura, con
la acción para cambiar de archivo.

Solo muestra lo que la importación conoce de verdad. Mientras se lee no hay formato ni recuento,
y un archivo que no se pudo leer no tiene caracteres; esos datos se omiten en lugar de rellenarse.
*/
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { formatCount } from '@/shared/format';
import { radius, space } from '@/shared/theme';
import { Badge, type BadgeTone } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

import type { DetectedFormat } from '../domain/types';

export type FileCardProps = {
  fileName: string;
  /** Formato identificado por el contenido; `null` mientras se lee. */
  format: DetectedFormat | null;
  pageCount: number | null;
  /** Caracteres del texto extraído; `null` si todavía no hay texto o no se pudo leer. */
  characterCount: number | null;
  /** Resultado de la lectura; sin él, la tarjeta indica que el archivo se está leyendo. */
  status: { tone: BadgeTone; label: string } | null;
  /** El usuario ha corregido el texto extraído, que es el que se analizará. */
  corrected?: boolean;
  onReplace: () => void;
  replaceDisabled?: boolean;
};

const formatNames: Partial<Record<DetectedFormat, string>> = { pdf: 'PDF', docx: 'Word' };

function describe({ format, pageCount, characterCount }: FileCardProps) {
  const pages = pageCount ? `${pageCount} ${pageCount === 1 ? 'página' : 'páginas'}` : null;
  const characters =
    characterCount !== null
      ? `${formatCount(characterCount)} ${characterCount === 1 ? 'carácter' : 'caracteres'}`
      : null;
  return [format && formatNames[format], pages, characters].filter(Boolean).join(' · ');
}

export function FileCard(props: FileCardProps) {
  const { fileName, status, corrected = false, onReplace, replaceDisabled = false } = props;
  const theme = useTheme();
  const reading = status === null;
  const failed = status?.tone === 'danger';
  const details = reading ? 'Leyendo en este dispositivo…' : describe(props);

  return (
    <View
      aria-busy={reading}
      // En la web, el marco de Preparar hace «aterrizar» la tarjeta cuando termina la lectura.
      dataSet={{ fileCard: reading ? 'reading' : 'read' }}
      style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.main}>
        <View
          style={[
            styles.tile,
            { backgroundColor: theme[failed ? 'dangerSubtle' : 'accentSubtle'] },
          ]}>
          <Icon name="document" size="lg" color={failed ? 'danger' : 'onAccentSubtle'} />
        </View>
        <View style={styles.meta}>
          {/* Dos líneas como máximo: el nombre completo sigue disponible para los lectores de pantalla. */}
          <ThemedText step="callout" numberOfLines={2} style={styles.name}>
            {fileName}
          </ThemedText>
          {details ? (
            <ThemedText step="footnote" color="textSecondary">
              {details}
            </ThemedText>
          ) : null}
          {status ? <Badge tone={status.tone} label={status.label} /> : null}
          {corrected ? (
            <ThemedText step="footnote" color="textSecondary">
              Con tus correcciones: se analizará el texto corregido.
            </ThemedText>
          ) : null}
        </View>
      </View>
      <Button
        label="Cambiar archivo"
        variant="secondary"
        onPress={onReplace}
        disabled={replaceDisabled}
        loading={reading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    // En pantallas estrechas o con texto ampliado, la acción pasa debajo de los datos.
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space[3],
    padding: space[3],
    paddingLeft: space[4],
    borderWidth: 1,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 220,
    minWidth: 0,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: space[1],
  },
  name: {
    fontWeight: 600,
  },
});
