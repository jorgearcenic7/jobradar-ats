/*
Sección «La oferta» de la pantalla del analizador: el texto completo de la oferta, que es lo único
que recibe el motor, con un editor que se puede ampliar para revisarlo.

El texto vive en `useCvMatch`, fuera de esta sección; aquí solo se guarda si el editor está
ampliado. Ampliarlo o reducirlo cambia la zona visible del campo, nunca su contenido: el campo se
desplaza por dentro cuando el texto no cabe, y el análisis siempre recibe el texto entero.

No se añaden campos de empresa, puesto o ubicación porque el motor no los usa: lee los requisitos
del texto tal como se pega.
*/
import { useState, type Ref } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { formatCount } from '@/shared/format';
import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { Icon } from '@/shared/ui/icon';
import { TextField } from '@/shared/ui/text-field';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

export type OfferSectionProps = {
  value: string;
  onChange: (text: string) => void;
  /** Mensaje cuando el análisis no puede empezar por la oferta. */
  error?: string;
  /** Campo de la oferta, para llevar el foco a él si falta. */
  fieldRef: Ref<TextInputInstance>;
};

export function OfferSection({ value, onChange, error, fieldRef }: OfferSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasText = value.trim().length > 0;

  return (
    <View style={styles.section}>
      <Heading level={2}>La oferta</Heading>
      <TextField
        ref={fieldRef}
        label="Texto de la oferta"
        helperText="Pega la oferta completa, sin recortarla."
        error={error}
        value={value}
        onChangeText={onChange}
        multiline
        expanded={expanded && hasText}
        autoCorrect={false}
      />
      {hasText ? (
        <View style={styles.footer}>
          {/*
          Indica que ya hay texto que analizar y cuánto. No es una región en vivo: el recuento
          cambia con cada pulsación y anunciarlo sería ruido.
          */}
          <View style={styles.ready}>
            <Icon name="checkCircle" size="sm" color="success" />
            <ThemedText step="footnote" color="textSecondary" style={styles.readyText}>
              {`Lista para analizar · ${formatCount(value.length)} ${value.length === 1 ? 'carácter' : 'caracteres'}`}
            </ThemedText>
          </View>
          {/* La etiqueta cambia con el estado, así que no hace falta un estado «pulsado». */}
          <Button
            label={expanded ? 'Reducir el editor' : 'Ampliar el editor'}
            variant="secondary"
            onPress={() => setExpanded(!expanded)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space[3],
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
  },
  ready: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    flexShrink: 1,
    minWidth: 0,
  },
  readyText: {
    flexShrink: 1,
  },
});
