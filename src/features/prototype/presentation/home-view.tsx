/*
Inicio del prototipo inmersivo (solo web).

Tres movimientos, cada uno ligado a lo que hace JobRadar:
- Radar: la primera vista es el mecanismo. Un pulso recorre el campo y revela el estado de cada
  requisito del ejemplo; el puntero curva los anillos y un clic o un toque emite otra señal.
- Tres pasos: una escena fijada que se transforma con el desplazamiento. El CV aparece línea a
  línea, llegan los requisitos de la oferta y se trazan las evidencias que los unen.
- Cierre: un campo violeta con la acción, que lanza la transición a Analizar.

Todo el contenido es legible sin animación. Con «reducir movimiento» la escena deja de estar
fijada y se muestra completa, y el radar queda quieto con los estados ya revelados.
*/
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import {
  exampleCvLines,
  exampleRequirements,
  shortStatusLabels,
  statusLabels,
} from './example-data';
import { LogoMark } from './logo-mark';
import { createRadarField, type RadarField, type RadarLayout } from './radar-field';
import { useMagnetic } from './use-magnetic';

export type Origin = { x: number; y: number };

type HomeViewProps = {
  /** Empieza la transición a Analizar desde el punto de la pantalla donde se pulsó. */
  onAnalyze: (origin: Origin) => void;
  /** Contenedor que se desplaza: el cuerpo de la página no lo hace en la app web. */
  scrollRoot: HTMLElement | null;
  reducedMotion: boolean;
};

const steps = [
  {
    title: 'Añade tu CV',
    text: 'Un PDF con texto o un Word, o pega el texto. Se lee en tu dispositivo.',
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
  // Cabecera (64 px) y la línea de la etiqueta del ejemplo.
  const top = 100;
  const band = Math.max(180, (copyTop ?? height * 0.5) - top - 8);
  /*
  Hacia arriba, el requisito más lejano está a 3,4 anillos (4,3 a 52°). Hacia abajo, el más bajo
  queda a 2,7 anillos y su estado ocupa dos líneas (unos 48 px). Se elige el paso que respeta los dos.
  */
  const half = band / 2;
  const step = Math.max(18, Math.min(36, (half - 14) / 3.5, (half - 48) / 2.75));
  return { cx: width * 0.55, cy: top + band / 2, step };
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/*
Medidas de la escena en sus dos variantes: ancha (escritorio) y estrecha (móvil, con textos más
cortos y más grandes en proporción para que sigan siendo legibles al escalar el SVG).
*/
const scenes = {
  wide: {
    width: 640,
    height: 400,
    cvSize: 15,
    lineGap: 44,
    lineTop: 72,
    pathStart: 268,
    reqX: 400,
    reqTop: 92,
    reqGap: 76,
    nameSize: 20,
    statusSize: 13,
    labels: statusLabels,
  },
  narrow: {
    width: 360,
    height: 330,
    cvSize: 13.5,
    lineGap: 38,
    lineTop: 64,
    pathStart: 200,
    reqX: 244,
    reqTop: 78,
    reqGap: 64,
    nameSize: 15,
    statusSize: 11.5,
    labels: shortStatusLabels,
  },
} as const;

export function HomeView({ onAnalyze, scrollRoot, reducedMotion }: HomeViewProps) {
  const heroRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<RadarField | null>(null);
  const storyRef = useRef<HTMLElement>(null);
  const lastHoverPing = useRef(0);
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

  const analyzeFrom = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onAnalyze({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  };

  const showSteps = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    storyRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    storyRef.current?.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  };

  return (
    <main className="pr-home">
      <section
        ref={heroRef}
        className="pr-hero"
        aria-labelledby="pr-hero-title"
        onClick={pingAt}
        onPointerMove={(event) => fieldRef.current?.setPointer(canvasPoint(event))}
        onPointerLeave={() => fieldRef.current?.setPointer(null)}
        onPointerUp={(event) => {
          if (event.pointerType !== 'mouse') fieldRef.current?.setPointer(null);
        }}>
        <canvas ref={canvasRef} className="pr-radar" aria-hidden />
        <div className="pr-blips" aria-hidden>
          {layout ? (
            <span
              key={pulses}
              className="pr-radar-core"
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
                    className="pr-blip"
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
        <p className="pr-sr-only">
          Ejemplo ilustrativo de cuatro requisitos de una oferta: dos respaldados por el CV, uno sin
          evidencia suficiente y uno no acreditado.
        </p>

        {/* En pantallas estrechas la pista táctil va en la misma línea, para dejar sitio al radar. */}
        <p className="pr-example-tag" aria-hidden>
          Ejemplo ilustrativo · <span className="pr-tag-role">Desarrollador/a backend</span>
          <span className="pr-tag-touch">toca el radar</span>
        </p>

        <div ref={copyRef} className="pr-hero-copy">
          <h1 id="pr-hero-title" className="pr-display">
            Comprueba qué <em>respalda</em> tu&nbsp;CV.
          </h1>
          <p className="pr-lead">
            Compara tu CV con una oferta, requisito a requisito, y descubre qué puedes demostrar con
            evidencias y qué te falta.
          </p>
          <div className="pr-actions">
            <span className="pr-magnet" ref={heroMagnet}>
              <button
                type="button"
                className="pr-primary"
                onPointerEnter={pingFromCenter}
                onClick={analyzeFrom}>
                <span data-magnetic-label>Analizar mi CV</span>
                <Arrow />
              </button>
            </span>
            <a className="pr-text-link" href="#pr-steps" onClick={showSteps}>
              Cómo funciona
            </a>
          </div>
          <p className="pr-note">El análisis ocurre en tu dispositivo. Nada se envía.</p>
        </div>
        <p className="pr-hint" aria-hidden>
          <span className="pr-hint-pointer">
            Mueve el cursor sobre el radar · clic para una señal
          </span>
          <span className="pr-hint-touch">Toca el radar para emitir una señal</span>
        </p>
      </section>

      <section ref={storyRef} id="pr-steps" className="pr-story" data-step="0">
        <div className="pr-story-stage">
          <div className="pr-story-text">
            <h2 tabIndex={-1}>Tres pasos, sin registro</h2>
            <div className="pr-story-progress" aria-hidden>
              <span />
            </div>
            <ol>
              {steps.map((step, index) => (
                <li key={step.title} data-index={index}>
                  <span className="pr-step-number" aria-hidden>
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

          <figure className="pr-scene" aria-label="Ejemplo ilustrativo del análisis">
            <Scene variant="wide" />
            <Scene variant="narrow" />
            <figcaption>
              Ejemplo ilustrativo: un CV ficticio frente a cuatro requisitos de una oferta. Python y
              Scrum quedan respaldados, el inglés C1 aparece sin evidencia y AWS no está en el CV.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="pr-truth" aria-labelledby="pr-truth-title">
        <h2 id="pr-truth-title" className="pr-statement">
          Analiza tu CV con criterios habituales de los ATS.{' '}
          <span>Y te enseña qué puedes demostrar.</span>
        </h2>
        <ul className="pr-facts">
          <li>Tu CV y la oferta se analizan en tu dispositivo.</li>
          <li>Las recomendaciones nunca inventan experiencia, titulaciones ni habilidades.</li>
          <li>Lo que JobRadar no sabe interpretar, lo marca como no evaluable.</li>
        </ul>
      </section>

      <section className="pr-close" aria-labelledby="pr-close-title">
        <svg className="pr-close-rings" viewBox="0 0 100 100" aria-hidden>
          {[8, 16, 24, 32, 40, 48].map((radius) => (
            <circle key={radius} cx="50" cy="50" r={radius} />
          ))}
        </svg>
        <h2 id="pr-close-title">¿Tu CV está a la altura de la oferta?</h2>
        <span className="pr-magnet" ref={closeMagnet}>
          <button type="button" className="pr-primary is-inverse" onClick={analyzeFrom}>
            <span data-magnetic-label>Analizar mi CV</span>
            <Arrow />
          </button>
        </span>
      </section>

      <footer className="pr-footer">
        <span>© JobRadar ATS · Prototipo de dirección visual</span>
        <a href="/privacidad">Privacidad</a>
      </footer>
    </main>
  );
}

/*
CV ficticio frente a los requisitos de la oferta. El avance de cada paso llega como variables CSS
(`--p1`…`--p3`) desde el desplazamiento: las líneas del CV aparecen, llegan los requisitos y se
trazan las evidencias que los unen. Sin desplazamiento, la escena se muestra completa.
*/
function Scene({ variant }: { variant: keyof typeof scenes }) {
  const scene = scenes[variant];
  const lineY = (index: number) => scene.lineTop + index * scene.lineGap;
  const requirementY = (index: number) => scene.reqTop + index * scene.reqGap;
  return (
    <svg
      className={`pr-scene-svg is-${variant}`}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      aria-hidden>
      <text className="pr-scene-label" x="0" y="24">
        Tu CV
      </text>
      <text className="pr-scene-label" x={scene.reqX} y="24">
        La oferta
      </text>
      {exampleCvLines.map((line, index) => {
        const evidence = exampleRequirements.some((item) => item.evidenceLine === index);
        const heading = line === 'Experiencia' || line === 'Idiomas';
        return (
          <text
            key={line}
            className={`pr-cv-line${evidence ? ' is-evidence' : ''}${heading ? ' is-heading' : ''}`}
            x="0"
            y={lineY(index)}
            fontSize={heading ? scene.cvSize - 2 : scene.cvSize}
            style={{ '--i': index } as CSSProperties}>
            {line}
          </text>
        );
      })}
      {exampleRequirements.map((item, index) => {
        if (item.evidenceLine === null) return null;
        const from = lineY(item.evidenceLine) - scene.cvSize / 3;
        const to = requirementY(index) - scene.nameSize / 3;
        const middle = (scene.pathStart + scene.reqX) / 2;
        return (
          <path
            key={item.id}
            className="pr-link-path"
            data-status={item.status}
            pathLength={1}
            d={`M ${scene.pathStart} ${from} C ${middle} ${from}, ${middle} ${to}, ${scene.reqX - 8} ${to}`}
            style={{ '--i': index } as CSSProperties}
          />
        );
      })}
      {exampleRequirements.map((item, index) => (
        <g
          key={item.id}
          className="pr-requirement"
          data-status={item.status}
          style={{ '--i': index } as CSSProperties}>
          <circle cx={scene.reqX + 2} cy={requirementY(index) - scene.nameSize / 3} r="5" />
          <text x={scene.reqX + 16} y={requirementY(index)} fontSize={scene.nameSize}>
            {item.name}
          </text>
          <text
            className="pr-requirement-status"
            x={scene.reqX + 16}
            y={requirementY(index) + scene.statusSize + 8}
            fontSize={scene.statusSize}>
            {item.evidenceLine === null && variant === 'wide'
              ? 'No aparece en el CV'
              : scene.labels[item.status]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function Arrow() {
  return (
    <svg className="pr-arrow" viewBox="0 0 20 20" aria-hidden>
      <path d="M4 10h11M11 5.5 15.5 10 11 14.5" />
    </svg>
  );
}
