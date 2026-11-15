/*
Inicio en la web: la dirección inmersiva de la v1.6. En iOS y Android se usa `home-screen.tsx`.

Tres movimientos, cada uno ligado a lo que hace JobRadar:
- Radar: la primera vista es el mecanismo. Un pulso recorre el campo y revela el estado de cada
  requisito del ejemplo; el puntero curva los anillos y un clic o un toque emite otra señal.
- Tres pasos: una escena fijada que se transforma con el desplazamiento. El CV aparece línea a
  línea, llegan los requisitos de la oferta y se trazan las evidencias que los unen.
- Cierre: un campo violeta con la acción, que lanza la onda de transición a Analizar.

Usa DOM y CSS propios en lugar de los componentes de React Native porque depende de canvas,
eventos de puntero y desplazamiento; la cabecera sí es la compartida, con las cuentas y «Mis CV».
Todo el ejemplo es ficticio y se etiqueta como tal. El contenido es legible sin animación: con
«reducir movimiento» la escena deja de estar fijada y el radar queda quieto con los estados ya
revelados.
*/
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { coverWithWave, type WaveOrigin } from '@/shared/motion/radar-wave';
import { useMagnetic } from '@/shared/motion/use-magnetic';
import { useReducedMotion } from '@/shared/motion/use-reduced-motion';
import { AppNavigation } from '@/shared/navigation/app-navigation';
import { themeVariablesCss } from '@/shared/theme';

import { exampleRequirements, statusLabels } from './example-data';
import { LogoMark } from './logo-mark';
import { createRadarField, type RadarField, type RadarLayout } from './radar-field';
import { StepsScene } from './steps-scene';

import './home-screen.css';

const themeCss = themeVariablesCss('.im-home');

const steps = [
  {
    title: 'Añade tu CV',
    text: 'Un PDF con texto o un Word (.docx), o pega el texto. Se lee en tu dispositivo.',
  },
  {
    title: 'Pega la oferta',
    text: 'Completa, sin recortar: los requisitos se leen de su propio texto.',
  },
  {
    title: 'Consulta qué respalda',
    text: 'Cada requisito, con la frase de tu CV que lo demuestra o con lo que te falta.',
  },
];

// Anchura del contenido en escritorio; el CSS usa la misma (`--content`).
const CONTENT_WIDTH = 1440;
// Alto de la cabecera compartida: enlaces de 44 px, 6 px arriba y abajo y el borde.
const HEADER_HEIGHT = 57;

/*
Radar a la derecha del titular en escritorio, dentro del mismo contenido centrado de 1440 px: en
pantallas más anchas no se separa del texto. En el móvil ocupa la franja libre entre la etiqueta
del ejemplo y el titular (`copyTop`), y encoge los anillos si esa franja es baja, para que los
requisitos nunca pisen el texto.
*/
const radarLayout = (width: number, height: number, copyTop: number | null) => {
  if (width >= 900) {
    const content = Math.min(width, CONTENT_WIDTH);
    return {
      cx: (width - content) / 2 + content * 0.7,
      cy: height * 0.47,
      step: Math.max(46, Math.min(64, content / 24)),
    };
  }
  // La cabecera y la línea de la etiqueta del ejemplo.
  const top = HEADER_HEIGHT + 36;
  const band = Math.max(180, (copyTop ?? height * 0.5) - top - 8);
  /*
  Hacia arriba, el requisito más lejano está a 3,4 anillos (4,3 a 52°). Hacia abajo, el más bajo
  queda a 2,7 anillos y su estado ocupa dos líneas (unos 48 px). Se elige el paso que respeta los dos.
  */
  const half = band / 2;
  const step = Math.max(18, Math.min(36, (half - 14) / 3.5, (half - 48) / 2.75));
  // Centrado: a 390 px, la etiqueta de la derecha («Python») deja aire con el borde.
  return { cx: width * 0.5, cy: top + band / 2, step };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const centerOf = (element: Element): WaveOrigin => {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/*
Enlace interno sin recargar la página: el clic normal navega con Expo Router y los clics con
modificadores (nueva pestaña, por ejemplo) quedan en manos del navegador.
*/
const navigateTo = (href: Href) => (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  router.push(href);
};

export function HomeScreen({ onAnalyze }: { onAnalyze: () => void }) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<RadarField | null>(null);
  const storyRef = useRef<HTMLElement>(null);
  const lastHoverPing = useRef(0);
  const lastPointer = useRef<{ origin: WaveOrigin; time: number } | null>(null);
  const leaving = useRef(false);
  const [layout, setLayout] = useState<RadarLayout | null>(null);
  const [found, setFound] = useState<ReadonlySet<string>>(() => new Set());
  // Cuenta las señales que salen del centro, para repetir el impulso de la J en cada una.
  const [pulses, setPulses] = useState(0);
  const heroMagnet = useMagnetic();
  const closeMagnet = useMagnetic();

  // El radar se crea una vez por vista y emite su primer pulso al asentarse la página.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const field = createRadarField(canvas, {
      layout: (width, height) => radarLayout(width, height, copyRef.current?.offsetTop ?? null),
      targets: exampleRequirements,
      onLayout: setLayout,
      onReach: (id) =>
        setFound((current) => (current.has(id) ? current : new Set(current).add(id))),
      reducedMotion,
    });
    fieldRef.current = field;
    const first = window.setTimeout(
      () => {
        field?.ping();
        setPulses((count) => count + 1);
      },
      reducedMotion ? 0 : 450,
    );
    return () => {
      window.clearTimeout(first);
      field?.destroy();
      fieldRef.current = null;
    };
  }, [reducedMotion]);

  /*
  El desplazamiento se traduce en variables CSS, sin renderizar React en cada fotograma:
  `--hero` aleja el titular y el radar, y `--p1`…`--p3` avanzan los tres pasos de la escena.
  */
  useEffect(() => {
    if (!scrollRoot || reducedMotion) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = scrollRoot.clientHeight;
      heroRef.current?.style.setProperty(
        '--hero',
        clamp01(scrollRoot.scrollTop / viewport).toFixed(3),
      );
      const story = storyRef.current;
      if (!story) return;
      /*
      La escena empieza a avanzar cuando su parte superior está a media pantalla, no al fijarse:
      así nunca se ve vacía al llegar y el recorrido total es más corto.
      */
      const lead = viewport * 0.5;
      const travel = story.offsetHeight - viewport + lead;
      const progress = clamp01(
        (scrollRoot.scrollTop - story.offsetTop + lead) / Math.max(1, travel),
      );
      const stepProgress = progress * 3;
      story.style.setProperty('--p', progress.toFixed(3));
      for (const step of [1, 2, 3]) {
        story.style.setProperty(`--p${step}`, clamp01(stepProgress - (step - 1)).toFixed(3));
      }
      story.dataset.step = String(Math.min(2, Math.floor(stepProgress)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    scrollRoot.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      scrollRoot.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollRoot, reducedMotion]);

  /*
  Abre Analizar tras cubrir la pantalla con la onda. Una segunda pulsación durante la onda se
  ignora; con «reducir movimiento» la onda no se juega y se navega al momento.
  */
  const startAnalysis = async (origin: WaveOrigin) => {
    if (leaving.current) return;
    leaving.current = true;
    try {
      await coverWithWave(origin, { fill: theme.primary, ring: theme.onPrimary });
      onAnalyze();
    } finally {
      leaving.current = false;
    }
  };

  const analyzeFrom = (event: MouseEvent<HTMLButtonElement>) =>
    void startAnalysis(centerOf(event.currentTarget));

  /*
  La acción de la cabecera es un botón de React Native, que no entrega la posición del clic: la
  onda sale del último punto pulsado si es de ese mismo gesto y, con el teclado, de la esquina de
  la cabecera donde está el botón.
  */
  const analyzeFromHeader = () => {
    const recent = lastPointer.current;
    const origin =
      recent && performance.now() - recent.time < 1000
        ? recent.origin
        : { x: window.innerWidth - 96, y: HEADER_HEIGHT / 2 };
    void startAnalysis(origin);
  };

  const canvasPoint = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null;
  };

  // Un clic o un toque en el campo (no en un control) emite una señal desde ese punto.
  const pingAt = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a, button')) return;
    const point = canvasPoint(event);
    if (point) fieldRef.current?.ping(point);
  };

  // Pasar sobre la acción principal lanza una señal desde el centro, como mucho cada 1,2 s.
  const pingFromCenter = () => {
    const now = performance.now();
    if (now - lastHoverPing.current < 1200) return;
    lastHoverPing.current = now;
    fieldRef.current?.ping();
    setPulses((count) => count + 1);
  };

  const showSteps = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    storyRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    storyRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  return (
    <div
      className="im-home screen-safe-area"
      onPointerDownCapture={(event) => {
        lastPointer.current = {
          origin: { x: event.clientX, y: event.clientY },
          time: performance.now(),
        };
      }}>
      <style>{themeCss}</style>
      <div ref={setScrollRoot} className="im-scroll">
        <AppNavigation section="home" onAnalyze={analyzeFromHeader} />
        <main>
          <section
            ref={heroRef}
            className="im-hero"
            aria-labelledby="im-hero-title"
            onClick={pingAt}
            onPointerMove={(event) => fieldRef.current?.setPointer(canvasPoint(event))}
            onPointerLeave={() => fieldRef.current?.setPointer(null)}
            // Con el dedo la lente se retira al soltar o cuando el gesto pasa a ser un desplazamiento.
            onPointerUp={(event) => {
              if (event.pointerType !== 'mouse') fieldRef.current?.setPointer(null);
            }}
            onPointerCancel={() => fieldRef.current?.setPointer(null)}>
            <canvas ref={canvasRef} className="im-radar" aria-hidden />
            <div className="im-blips" aria-hidden>
              {layout ? (
                <span
                  key={pulses}
                  className="im-radar-core"
                  style={{ left: layout.cx, top: layout.cy } as CSSProperties}>
                  <LogoMark />
                </span>
              ) : null}
              {layout
                ? exampleRequirements.map((item) => {
                    const angle = (item.angle * Math.PI) / 180;
                    const style = {
                      left: layout.cx + item.ring * layout.step * Math.cos(angle),
                      top: layout.cy + item.ring * layout.step * Math.sin(angle),
                    } as CSSProperties;
                    return (
                      <span
                        key={item.id}
                        className="im-blip"
                        data-status={item.status}
                        data-found={found.has(item.id)}
                        style={style}>
                        <i />
                        <b>{item.name}</b>
                        <small>{statusLabels[item.status]}</small>
                      </span>
                    );
                  })
                : null}
            </div>
            <p className="im-sr-only">
              Ejemplo ilustrativo de cuatro requisitos de una oferta: dos respaldados por el CV, uno
              sin evidencia suficiente y uno no acreditado.
            </p>

            {/* En pantallas estrechas la pista táctil va en la misma línea, para dejar sitio al radar. */}
            <p className="im-example-tag" aria-hidden>
              Ejemplo ilustrativo · <span className="im-tag-role">Desarrollador/a backend</span>
              <span className="im-tag-touch">toca el radar</span>
            </p>

            <div ref={copyRef} className="im-hero-copy">
              <h1 id="im-hero-title" className="im-display">
                Comprueba qué <em>respalda</em> tu&nbsp;CV
              </h1>
              <p className="im-lead">
                Compara tu CV con una oferta, requisito a requisito, y descubre qué puedes demostrar
                con evidencias y qué te falta.
              </p>
              <div className="im-actions">
                <span className="im-magnet" ref={heroMagnet}>
                  <button
                    type="button"
                    className="im-primary"
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') pingFromCenter();
                    }}
                    onClick={analyzeFrom}>
                    <span data-magnetic-label>Analizar mi CV</span>
                    <Arrow />
                  </button>
                </span>
                <a className="im-text-link" href="#como-funciona" onClick={showSteps}>
                  Cómo funciona
                </a>
              </div>
              <p className="im-note">
                El análisis se hace en tu dispositivo: tu CV y la oferta no se envían.
              </p>
            </div>
            <p className="im-hint" aria-hidden>
              <span className="im-hint-pointer">
                Mueve el cursor sobre el radar · clic para una señal
              </span>
              <span className="im-hint-touch">Toca el radar para emitir una señal</span>
            </p>
          </section>

          <section
            ref={storyRef}
            id="como-funciona"
            className="im-story"
            data-step="0"
            aria-labelledby="im-steps-title">
            <div className="im-story-stage">
              <div className="im-story-text">
                <h2 id="im-steps-title" tabIndex={-1}>
                  Tres pasos, sin registro
                </h2>
                <div className="im-story-progress" aria-hidden>
                  <span />
                </div>
                <ol>
                  {steps.map((step, index) => (
                    <li key={step.title} data-index={index}>
                      <span className="im-step-number" aria-hidden>
                        {index + 1}
                      </span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <figure className="im-scene" aria-label="Ejemplo ilustrativo del análisis">
                <StepsScene variant="wide" />
                <StepsScene variant="narrow" />
                <figcaption>
                  Ejemplo ilustrativo: un CV ficticio frente a cuatro requisitos de una oferta.
                  Python y Scrum quedan respaldados, el inglés C1 aparece sin evidencia y AWS no
                  está en el CV.
                </figcaption>
              </figure>
            </div>
          </section>

          <section className="im-truth" aria-labelledby="im-truth-title">
            <h2 id="im-truth-title" className="im-statement">
              Analiza tu CV con criterios habituales de los ATS.{' '}
              <span>Y te enseña qué puedes demostrar.</span>
            </h2>
            <div className="im-truth-side">
              <ul className="im-facts">
                <li>Tu CV y la oferta se analizan en tu dispositivo.</li>
                <li>
                  Las recomendaciones nunca inventan experiencia, titulaciones ni habilidades.
                </li>
                <li>Lo que JobRadar no sabe interpretar, lo marca como no evaluable.</li>
              </ul>
              <details className="im-method">
                <summary>
                  Cómo se calcula la cobertura
                  <Chevron />
                </summary>
                <div className="im-method-body">
                  <p>
                    Cada requisito suma 1 punto si está respaldado, 0,5 si aparece sin evidencia
                    suficiente y 0 si no está acreditado. Los obligatorios cuentan el doble; los no
                    evaluables quedan fuera del porcentaje.
                  </p>
                  <p>
                    Solo se reconocen los requisitos que JobRadar sabe interpretar. No se leen PDF
                    escaneados: puedes pegar su texto.
                  </p>
                  <p>
                    Los textos y resultados viven solo en la sesión del analizador. Se pierden al
                    salir del analizador o recargar.
                  </p>
                </div>
              </details>
            </div>
          </section>

          <section className="im-close" aria-labelledby="im-close-title">
            <svg className="im-close-rings" viewBox="0 0 100 100" aria-hidden>
              {[8, 16, 24, 32, 40, 48].map((radius) => (
                <circle key={radius} cx="50" cy="50" r={radius} />
              ))}
            </svg>
            <h2 id="im-close-title">¿Tu CV está a la altura de la oferta?</h2>
            <span className="im-magnet" ref={closeMagnet}>
              <button type="button" className="im-primary is-inverse" onClick={analyzeFrom}>
                <span data-magnetic-label>Analizar mi CV</span>
                <Arrow />
              </button>
            </span>
          </section>
        </main>

        <footer className="im-footer">
          <span>© JobRadar ATS</span>
          <span className="im-footer-note">
            El análisis se hace en tu dispositivo. Tus textos no se envían ni se guardan.
          </span>
          <a href="/privacidad" onClick={navigateTo('/privacidad')}>
            Privacidad
          </a>
        </footer>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="im-arrow" viewBox="0 0 20 20" aria-hidden>
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="im-chevron" viewBox="0 0 20 20" aria-hidden>
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}
