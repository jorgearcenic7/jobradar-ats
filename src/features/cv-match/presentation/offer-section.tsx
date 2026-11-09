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

import { space } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';
import { Heading } from '@/shared/ui/themed-text';

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
      <Heading level={2} step="headline">
        La oferta
      </Heading>
      <TextField
        ref={fieldRef}
        label="Texto de la oferta"
        placeholder="Pega aquí la descripción completa del puesto…"
        helperText="Pégala completa, sin recortar: los requisitos se leen de su texto."
        error={error}
        value={value}
        onChangeText={onChange}
        multiline
        minLines={8}
        showCount
        expanded={expanded && hasText}
        autoCorrect={false}
      />
      {hasText ? (
        // La etiqueta cambia con el estado, así que no hace falta un estado «pulsado».
        <Button
          label={expanded ? 'Reducir el editor' : 'Ampliar el editor'}
          variant="secondary"
          onPress={() => setExpanded(!expanded)}
          style={styles.expand}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space[4],
  },
  expand: {
    alignSelf: 'flex-start',
  },
});
