/*
Transición de Inicio a Analizar, solo web: una onda violeta crece desde el control pulsado hasta
cubrir la pantalla, la ruta cambia debajo y la pantalla nueva la descubre con un fundido.

La onda vive en un elemento propio de `document.body`, fuera del árbol de React, porque tiene que
sobrevivir al cambio de ruta. Nunca captura el puntero: si algo falla, la pantalla de debajo sigue
respondiendo, y un temporizador la retira aunque ninguna pantalla llegue a descubrirla.

Con «reducir movimiento» no hay onda: la navegación es inmediata.
*/
import { prefersReducedMotion } from './use-reduced-motion';

export type WaveOrigin = { x: number; y: number };
export type WaveColors = { fill: string; ring: string };

// Sale deprisa del control y frena al cubrir la pantalla, como un pulso de radar.
const COVER_MS = 560;
const REVEAL_MS = 320;
const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)';
// Margen generoso: la ruta nueva se monta en mucho menos, pero un equipo lento no debe quedarse tapado.
const FALLBACK_MS = 3000;

let active: { element: HTMLElement; fallback: number } | null = null;

const circle = (radius: number, { x, y }: WaveOrigin) => `circle(${radius}px at ${x}px ${y}px)`;

/**
 * Cubre la pantalla con la onda desde `origin` y se resuelve cuando la tapa del todo.
 * Devuelve `false` sin hacer nada si ya hay una onda en curso o el sistema pide menos movimiento.
 */
export async function coverWithWave(origin: WaveOrigin, colors: WaveColors) {
  if (active || prefersReducedMotion() || typeof document.body.animate !== 'function') {
    return false;
  }
  const element = document.createElement('div');
  element.setAttribute('aria-hidden', 'true');
  Object.assign(element.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '1000',
    overflow: 'hidden',
    pointerEvents: 'none',
    background: colors.fill,
    clipPath: circle(0, origin),
  });
  // Dos ecos que se abren desde el origen y acompañan a la onda.
  for (const delay of [0, 110]) {
    const echo = document.createElement('i');
    Object.assign(echo.style, {
      position: 'absolute',
      left: `${origin.x - 20}px`,
      top: `${origin.y - 20}px`,
      width: '40px',
      height: '40px',
      border: `2px solid ${colors.ring}`,
      borderRadius: '50%',
      opacity: '0',
    });
    element.append(echo);
    echo.animate(
      [
        { opacity: 0.7, transform: 'scale(0.2)' },
        { opacity: 0, transform: 'scale(22)' },
      ],
      { duration: 760, delay, easing: EASE_DRAWER, fill: 'forwards' },
    );
  }
  document.body.append(element);
  active = { element, fallback: window.setTimeout(revealWave, FALLBACK_MS) };

  const radius = Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
  const grow = element.animate(
    [{ clipPath: circle(0, origin) }, { clipPath: circle(radius, origin) }],
    {
      duration: COVER_MS,
      easing: EASE_DRAWER,
      fill: 'forwards',
    },
  );
  try {
    await grow.finished;
  } catch {
    // Cancelada por el navegador (pestaña oculta, por ejemplo): se navega igualmente.
  }
  return true;
}

/** Indica si una onda tapa la pantalla: la pantalla que llega anima su entrada solo entonces. */
export function isWaveCovering() {
  return active !== null;
}

/** Descubre la pantalla con un fundido y retira la onda. No hace nada si no hay ninguna. */
export function revealWave() {
  const wave = active;
  if (!wave) return;
  active = null;
  window.clearTimeout(wave.fallback);
  const fade = wave.element.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: REVEAL_MS,
    easing: 'ease-out',
    fill: 'forwards',
  });
  const remove = () => wave.element.remove();
  fade.finished.then(remove, remove);
}
