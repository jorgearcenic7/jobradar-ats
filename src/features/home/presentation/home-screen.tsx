/*
Inicio: explica qué hace el análisis y abre Preparar. No mantiene datos de la sesión.

Orden de lectura: el mensaje principal con sus dos acciones, un ejemplo ilustrativo de resultado,
los tres pasos, los límites del producto y una última llamada a la acción.
*/
import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View, type ScrollViewInstance, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { radius, space } from '@/shared/theme';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { Icon, type IconName } from '@/shared/ui/icon';
import { Screen } from '@/shared/ui/screen';
import { ThemedText } from '@/shared/ui/themed-text';

import { ExampleResultCard } from './example-result-card';
import { HomeFooter } from './home-footer';

const isWeb = process.env.EXPO_OS === 'web';

const steps: { title: string; description: string; icon: IconName }[] = [
  {
    title: 'Añade tu CV',
    description: isWeb
      ? 'Un PDF con texto o un Word (.docx), o pega el texto directamente.'
      : 'Pega el texto de tu CV. La importación de archivos en iOS y Android está pendiente.',
    icon: 'uploadFile',
  },
  {
    title: 'Pega la oferta',
    description: 'Completa, sin recortar: los requisitos se leen de su texto.',
    icon: 'contentPaste',
  },
  {
    title: 'Consulta los resultados',
    description: 'Revisa qué requisitos respalda tu CV, sus evidencias y qué puedes mejorar.',
    icon: 'search',
  },
];

const checks = [
  'PDF con texto o Word (.docx)',
  'O pega el texto directamente',
  'Nada se guarda ni se envía',
];

/*
Solo web: el titular crece con la ventana entre 40 y 68 px. React Native solo admite números en
estas propiedades, pero React Native Web pasa los textos tal cual al CSS; en iOS y Android se queda
el paso `display`, de 40 px.
*/
const heroTitleWeb = (
  isWeb ? { fontSize: 'clamp(40px, 7vw, 68px)', lineHeight: '1.04', letterSpacing: '-0.035em' } : {}
) as TextStyle;

export function HomeScreen({ onAnalyze }: { onAnalyze: () => void }) {
  const theme = useTheme();
  const [methodOpen, setMethodOpen] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const stepsRef = useRef<ComponentRef<typeof View>>(null);
  const stepsTitleRef = useRef<ComponentRef<typeof View>>(null);

  // Lleva la vista a «Cómo funciona» y, en la web, también el foco, como un enlace a un ancla.
  const showSteps = () => {
    if (isWeb) {
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const section = stepsRef.current as unknown as HTMLElement | null;
      section?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      (stepsTitleRef.current as unknown as HTMLElement | null)?.focus({ preventScroll: true });
      return;
    }
    const scroll = scrollRef.current;
    const content = scroll?.getInnerViewRef();
    if (!content) return;
    stepsRef.current?.measureLayout(content, (_x, y) => scroll?.scrollTo({ y, animated: true }));
  };

  return (
    <Screen
      scrollRef={scrollRef}
      header={<AppNavigation section="home" onAnalyze={onAnalyze} />}
      footer={<HomeFooter />}
      style={styles.content}>
      <View style={styles.hero}>
        <View style={[styles.pill, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <View style={[styles.pillBadge, { backgroundColor: theme.accentSubtle }]}>
            <ThemedText step="caption" color="onAccentSubtle" style={styles.strong}>
              Privado
            </ThemedText>
          </View>
          <ThemedText step="footnote" color="textSecondary" style={styles.pillText}>
            Tu CV no sale de tu dispositivo
          </ThemedText>
        </View>

        <ThemedText
          step="display"
          accessibilityRole="header"
          style={[styles.centered, styles.heroTitle, heroTitleWeb]}>
          Comprueba qué{' '}
          <ThemedText step="display" color="accentText" style={heroTitleWeb}>
            respalda
          </ThemedText>{' '}
          tu CV
        </ThemedText>
        <ThemedText step="body" color="textTertiary" style={[styles.centered, styles.lead]}>
          Compara tu CV con una oferta, requisito a requisito, y descubre qué puedes demostrar con
          evidencias y qué te falta.
        </ThemedText>

        <View style={styles.actions}>
          <Button
            label="Analizar mi CV"
            icon="arrowForward"
            iconPosition="end"
            size="large"
            onPress={onAnalyze}
          />
          <Button label="Cómo funciona" variant="secondary" size="large" onPress={showSteps} />
        </View>

        <View role="list" style={styles.checks}>
          {checks.map((check) => (
            <View key={check} role="listitem" style={styles.check}>
              <Icon name="check" size="xs" color="accentText" />
              <ThemedText step="footnote" color="textTertiary">
                {check}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <ExampleResultCard />

      <View ref={stepsRef} style={styles.section}>
        <View style={styles.sectionHeading}>
          <ThemedText step="caption" color="accentText" style={[styles.eyebrow, styles.centered]}>
            CÓMO FUNCIONA
          </ThemedText>
          <View ref={stepsTitleRef} tabIndex={-1} style={styles.focusTarget}>
            <ThemedText
              step="section"
              accessibilityRole="header"
              aria-level={2}
              style={styles.centered}>
              Tres pasos, sin registro
            </ThemedText>
          </View>
        </View>
        <View role="list" style={styles.stepGrid}>
          {steps.map((step, index) => (
            <Card key={step.title} role="listitem" style={styles.step}>
              <View style={styles.stepTop}>
                <View style={[styles.iconSquare, { backgroundColor: theme.accentSubtle }]}>
                  <Icon name={step.icon} color="onAccentSubtle" />
                </View>
                {/* El orden ya lo da la lista; el número es solo visual. */}
                <ThemedText
                  step="footnote"
                  color="textTertiary"
                  style={styles.stepNumber}
                  aria-hidden
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants">
                  {String(index + 1).padStart(2, '0')}
                </ThemedText>
              </View>
              <ThemedText step="headline">{step.title}</ThemedText>
              <ThemedText step="callout" color="textSecondary">
                {step.description}
              </ThemedText>
            </Card>
          ))}
        </View>
      </View>

      <Card style={styles.limits}>
        <View style={styles.limitRow}>
          <Icon name="info" color="textSecondary" />
          <ThemedText step="callout" color="textSecondary" style={styles.flexText}>
            JobRadar explica qué requisitos respalda tu CV con pruebas. No predice la decisión de un
            ATS ni de la empresa.
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />
        <Disclosure
          header="Cómo se calcula la cobertura"
          expanded={methodOpen}
          onToggle={setMethodOpen}>
          <View style={styles.method}>
            <ThemedText step="callout">
              Recomendaciones que nunca inventan experiencia, titulaciones ni habilidades.
            </ThemedText>
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
      </Card>

      <View
        style={[
          styles.cta,
          { backgroundColor: theme.ctaBackground, borderColor: theme.ctaBackground },
        ]}>
        <ThemedText
          step="section"
          color="ctaText"
          accessibilityRole="header"
          aria-level={2}
          style={[styles.centered, styles.ctaTitle]}>
          ¿Tu CV está a la altura de la oferta?
        </ThemedText>
        <ThemedText step="body" color="ctaTextSecondary" style={styles.centered}>
          Compruébalo ahora, sin que tus datos salgan de tu dispositivo.
        </ThemedText>
        <Button
          label="Analizar mi CV"
          icon="arrowForward"
          iconPosition="end"
          variant="light"
          size="large"
          onPress={onAnalyze}
          style={styles.ctaButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space[16] },
  centered: { textAlign: 'center' },
  strong: { fontWeight: 600 },
  // 104 px arriba y 72 abajo, descontando el aire de `Screen` y el hueco entre bloques.
  hero: {
    alignItems: 'center',
    gap: space[6],
    paddingTop: 104 - space[4],
    paddingBottom: 72 - space[16],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    maxWidth: '100%',
    padding: space[1],
    paddingRight: space[3],
    borderWidth: 1,
    borderRadius: radius.full,
  },
  pillBadge: { paddingHorizontal: space[2], paddingVertical: 2, borderRadius: radius.full },
  pillText: { flexShrink: 1 },
  // A 68 px parte la frase en «Comprueba qué respalda» y «tu CV».
  heroTitle: { maxWidth: 820 },
  lead: { maxWidth: 580, fontSize: 19, lineHeight: 29 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space[3],
  },
  checks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: space[6],
    rowGap: space[2],
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  // La cabecera fija de la web no tapa el título al llegar desde «Cómo funciona».
  section: { gap: space[8], scrollMarginTop: 96 } as object,
  sectionHeading: { alignItems: 'center', gap: space[2] },
  eyebrow: { fontWeight: 600, letterSpacing: 1 },
  // El título recibe el foco por programa; no se dibuja un anillo porque no es interactivo.
  focusTarget: { maxWidth: '100%', outlineStyle: 'solid', outlineWidth: 0 },
  stepGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[4] },
  step: { flexBasis: 260, flexGrow: 1, minWidth: 0, gap: space[2], padding: space[6] },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[2],
  },
  iconSquare: {
    width: 40,
    height: 40,
    borderRadius: radius.icon,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: { fontVariant: ['tabular-nums'], fontWeight: 500 },
  limits: { gap: space[3], padding: space[6] },
  limitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  flexText: { flex: 1, minWidth: 0 },
  divider: { height: 1 },
  method: { gap: space[3], paddingBottom: space[2] },
  cta: {
    alignItems: 'center',
    gap: space[4],
    paddingVertical: space[16],
    paddingHorizontal: space[6],
    borderWidth: 1,
    borderRadius: radius.xxl,
    borderCurve: 'continuous',
  },
  ctaTitle: { fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  ctaButton: { marginTop: space[2] },
});
