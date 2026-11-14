/*
Bloque de Resultados que ofrece el análisis semántico opcional.

Es secundario: queda plegado mientras no se usa, con una línea que resume su estado, y se abre solo
mientras descarga, analiza, muestra su resultado o falla. Plegado o abierto, explica lo mismo y
ofrece las mismas acciones; su cabecera es un encabezado de sección con el botón dentro.

Antes de descargar nada explica qué hace, cuánto ocupa y que el CV no sale del dispositivo.
Mientras trabaja informa del progreso en una región que los lectores de pantalla anuncian. Al
terminar resume cuántos requisitos tienen posibles relaciones, que se muestran en cada
requisito separadas de las evidencias acreditadas. Si el dispositivo no lo admite, lo dice sin
bloquear nada.
*/
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { Notice } from '@/shared/ui/notice';
import { ThemedText } from '@/shared/ui/themed-text';

import type { SemanticErrorCode, SemanticState } from './use-semantic-review';

const errorMessages: Record<SemanticErrorCode, string> = {
  download: 'No se ha podido descargar el modelo. Comprueba la conexión y vuelve a intentarlo.',
  integrity:
    'Un archivo del modelo no coincide con el publicado y no se ha usado. Vuelve a intentarlo.',
  crashed:
    'El navegador ha detenido el modelo, probablemente por falta de memoria. El análisis habitual sigue disponible.',
  unknown: 'El análisis semántico ha fallado. El análisis habitual sigue disponible.',
};

/** «143 MB», con la misma unidad que los tamaños de archivo de la importación de CV. */
export function formatDownloadSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

type SemanticPanelProps = {
  state: SemanticState;
  onActivate: () => void;
  onRemove: () => void;
};

/** Una línea con el estado, visible también con el bloque plegado. */
function statusLine(state: SemanticState): string {
  switch (state.kind) {
    case 'checking':
    case 'unavailable':
      return 'No disponible en esta versión';
    case 'idle':
      return state.downloaded
        ? 'Opcional · modelo ya guardado'
        : 'Opcional · no cambia la cobertura';
    case 'loading':
      return 'Descargando el modelo…';
    case 'analyzing':
      return 'Buscando relaciones…';
    case 'ready': {
      const found = Object.keys(state.review).length;
      return found === 0
        ? 'Sin relaciones claras'
        : `${found} ${found === 1 ? 'requisito' : 'requisitos'} con posibles relaciones`;
    }
    case 'error':
      return 'No se ha podido completar';
  }
}

export function SemanticPanel({ state, onActivate, onRemove }: SemanticPanelProps) {
  // `null` mientras el usuario no lo pliega ni lo despliega: entonces decide el estado.
  const [open, setOpen] = useState<boolean | null>(null);

  // En la app nativa no existe esta función: no se anuncia algo que nunca estará disponible.
  if (state.kind === 'checking' || (state.kind === 'unavailable' && process.env.EXPO_OS !== 'web'))
    return null;

  const intro =
    'Busca en tu CV frases que expresen con otras palabras requisitos que JobRadar no ha podido acreditar. Son sugerencias para que las revises: no cambian la cobertura ni acreditan nada.';

  let body: ReactNode;
  switch (state.kind) {
    case 'unavailable':
      body = (
        <ThemedText step="footnote" color="textSecondary">
          {state.reason === 'unsupported'
            ? 'Este navegador no permite ejecutar el modelo. El análisis habitual funciona igual.'
            : `Esta versión de JobRadar no incluye el modelo. El análisis habitual funciona igual.${
                // En desarrollo, el modelo se prepara aparte una sola vez (ver metro.config.js).
                __DEV__ ? ' En desarrollo, ejecuta «npm run semantic:dev» y recarga la página.' : ''
              }`}
        </ThemedText>
      );
      break;
    case 'idle':
      body = (
        <>
          <ThemedText step="footnote" color="textSecondary">
            {state.downloaded
              ? 'El modelo ya está guardado en este dispositivo. Se ejecuta en él: el CV y la oferta no salen de tu dispositivo.'
              : `Usa un modelo de IA que se descarga una vez desde JobRadar (${formatDownloadSize(state.manifest.downloadBytes)}) y se ejecuta en tu dispositivo: el CV y la oferta no salen de él. En móviles necesita bastante memoria; con una conexión de datos, la descarga cuenta en tu tarifa.`}
          </ThemedText>
          <Button
            label={
              state.downloaded
                ? 'Buscar relaciones'
                : `Descargar y buscar (${formatDownloadSize(state.manifest.downloadBytes)})`
            }
            variant="secondary"
            onPress={onActivate}
          />
        </>
      );
      break;
    case 'loading':
      body = (
        <ThemedText step="footnote" color="textSecondary">
          {state.loaded >= state.total
            ? 'Preparando el modelo…'
            : `Descargando el modelo… ${Math.floor((state.loaded / Math.max(state.total, 1)) * 100)} %`}
        </ThemedText>
      );
      break;
    case 'analyzing':
      body = (
        <ThemedText step="footnote" color="textSecondary">
          Buscando relaciones en tu CV…
        </ThemedText>
      );
      break;
    case 'ready': {
      const found = Object.keys(state.review).length;
      body = (
        <>
          <ThemedText step="footnote">
            {state.queried === 0
              ? 'No hay requisitos que revisar: los que JobRadar no acredita son tecnologías concretas, años, idiomas o titulaciones, que solo se comprueban con las reglas habituales.'
              : found === 0
                ? `No se han encontrado relaciones claras para ${state.queried === 1 ? 'el requisito revisado' : `los ${state.queried} requisitos revisados`}.`
                : `${found} de ${state.queried} ${state.queried === 1 ? 'requisito revisado tiene' : 'requisitos revisados tienen'} posibles relaciones. Las verás en cada requisito como «Posible relación semántica».`}
          </ThemedText>
          <Button
            label="Borrar el modelo de este dispositivo"
            variant="secondary"
            onPress={onRemove}
          />
        </>
      );
      break;
    }
    case 'error':
      body = (
        <Notice tone="warning" actions={<Button label="Reintentar" onPress={onActivate} />}>
          {errorMessages[state.code]}
        </Notice>
      );
      break;
  }

  const active =
    state.kind === 'loading' ||
    state.kind === 'analyzing' ||
    state.kind === 'ready' ||
    state.kind === 'error';
  const status = statusLine(state);

  return (
    <Card style={styles.card}>
      <Disclosure
        headingLevel={2}
        accessibilityLabel={`Relaciones semánticas, experimental. ${status}`}
        expanded={open ?? active}
        onToggle={setOpen}
        header={
          <View style={styles.header}>
            <ThemedText step="callout" style={styles.title}>
              Relaciones semánticas · experimental
            </ThemedText>
            <ThemedText step="footnote" color="textSecondary">
              {status}
            </ThemedText>
          </View>
        }>
        <View style={styles.content}>
          <ThemedText step="footnote" color="textSecondary">
            {intro}
          </ThemedText>
          <View aria-live="polite" style={styles.body}>
            {body}
          </View>
        </View>
      </Disclosure>
    </Card>
  );
}

const styles = StyleSheet.create({
  // Sin relleno vertical propio: la cabecera del desplegable ya reserva sus 44 px.
  card: {
    paddingVertical: space[1],
  },
  header: {
    gap: 2,
  },
  title: {
    fontWeight: 600,
  },
  content: {
    gap: space[3],
    paddingBottom: space[3],
  },
  body: {
    gap: space[3],
    alignItems: 'flex-start',
  },
});
