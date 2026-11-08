// Inicio explica el análisis disponible y abre Preparar; no mantiene datos de la sesión.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { palettes, radius, space } from '@/shared/theme';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { Icon } from '@/shared/ui/icon';
import { Screen } from '@/shared/ui/screen';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

const steps = [
  {
    title: 'Añade tu CV',
    description:
      process.env.EXPO_OS === 'web'
        ? 'Un PDF con texto o un Word (.docx), o pega el texto directamente.'
        : 'Pega el texto de tu CV. La importación de archivos en iOS y Android está pendiente.',
  },
  {
    title: 'Pega la oferta',
    description: 'Completa, sin recortar: los requisitos se leen de su texto.',
  },
  {
    title: 'Consulta los resultados',
    description: 'Revisa qué requisitos respalda tu CV, sus evidencias y qué puedes mejorar.',
  },
];

export function HomeScreen({ onAnalyze }: { onAnalyze: () => void }) {
  const theme = useTheme();
  const [methodOpen, setMethodOpen] = useState(false);
  // El bloque de marca mantiene texto claro sobre marino también en el tema claro.
  const brand = palettes.dark;

  return (
    <Screen style={styles.content}>
      <AppNavigation section="home" />
      <Card
        style={[
          styles.hero,
          {
            backgroundColor: theme === brand ? theme.accentSubtle : brand.surface,
            borderColor: brand.border,
          },
        ]}>
        <View style={styles.message}>
          <ThemedText step="display" accessibilityRole="header" style={{ color: brand.text }}>
            Comprueba qué respalda tu CV antes de enviarlo
          </ThemedText>
          <ThemedText step="callout" style={{ color: brand.textSecondary }}>
            Compara tu CV con una oferta, requisito a requisito, y descubre qué pruebas le faltan.
          </ThemedText>
        </View>
        <View style={styles.actions}>
          <Button label="Analizar mi CV" icon="arrowForward" onPress={onAnalyze} />
          <ThemedText step="footnote" style={{ color: brand.textSecondary }}>
            El análisis se hace en tu dispositivo. Tus textos no se envían ni se guardan de forma
            permanente.
          </ThemedText>
        </View>
      </Card>
      <View style={styles.columns}>
        <View style={styles.steps}>
          <Heading level={2}>Cómo funciona</Heading>
          <View role="list" style={styles.stepList}>
            {steps.map((step, index) => (
              <View role="listitem" key={step.title} style={styles.step}>
                <View style={[styles.number, { backgroundColor: theme.accentSubtle }]}>
                  <ThemedText step="headline" color="onAccentSubtle">
                    {index + 1}
                  </ThemedText>
                </View>
                <View style={styles.stepText}>
                  <ThemedText step="headline">{step.title}</ThemedText>
                  <ThemedText step="callout" color="textSecondary">
                    {step.description}
                  </ThemedText>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.expectations}>
          <Heading level={2}>Qué puedes esperar</Heading>
          <View style={styles.benefit}>
            <Icon name="checkCircle" color="accentText" />
            <ThemedText step="callout" style={styles.flexText}>
              Un recuento explicado de los requisitos que tu CV respalda con pruebas.
            </ThemedText>
          </View>
          <View style={styles.benefit}>
            <Icon name="checkCircle" color="accentText" />
            <ThemedText step="callout" style={styles.flexText}>
              Recomendaciones que nunca inventan experiencia, titulaciones ni habilidades.
            </ThemedText>
          </View>
          <View style={styles.benefit}>
            <Icon name="info" color="textSecondary" />
            <ThemedText step="callout" color="textSecondary" style={styles.flexText}>
              No predice la decisión de un ATS ni de la empresa.
            </ThemedText>
          </View>
          <Disclosure
            header="Cómo se calcula la cobertura"
            expanded={methodOpen}
            onToggle={setMethodOpen}>
            <View style={styles.method}>
              <ThemedText step="callout" color="textSecondary">
                Cada requisito suma 1 punto si está respaldado, 0,5 si aparece sin evidencia
                suficiente y 0 si no está acreditado. Los obligatorios cuentan el doble; los no
                evaluables quedan fuera del porcentaje. Es una heurística, no una puntuación ATS ni
                una probabilidad de contratación.
              </ThemedText>
              <ThemedText step="callout" color="textSecondary">
                Solo se reconocen los requisitos que JobRadar sabe interpretar. No se leen PDF
                escaneados: puedes pegar su texto.
              </ThemedText>
              <ThemedText step="callout" color="textSecondary">
                Los textos y resultados viven solo en la sesión del analizador. Se pierden al salir
                del analizador o recargar.
              </ThemedText>
            </View>
          </Disclosure>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 1120, gap: space[8] },
  hero: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[6],
    padding: space[6],
    alignItems: 'center',
  },
  message: { flexBasis: 480, flexGrow: 1, maxWidth: '100%', minWidth: 0, gap: space[4] },
  actions: { flexBasis: 320, flexGrow: 1, maxWidth: '100%', minWidth: 0, gap: space[3] },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: space[8] },
  steps: { flexBasis: 480, flexGrow: 1, maxWidth: '100%', minWidth: 0, gap: space[4] },
  stepList: { gap: space[6] },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  number: {
    minWidth: space[8],
    minHeight: space[8],
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space[1],
  },
  stepText: { flex: 1, minWidth: 0, gap: space[1] },
  expectations: { flexBasis: 320, flexGrow: 1, maxWidth: '100%', minWidth: 0, gap: space[3] },
  benefit: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  flexText: { flex: 1, minWidth: 0 },
  method: { gap: space[3] },
});
