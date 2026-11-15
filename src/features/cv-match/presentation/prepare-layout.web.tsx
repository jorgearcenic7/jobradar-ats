/*
Marco visual de Preparar en la web: la composición editorial y el movimiento de la v1.6.

Solo cambia la presentación de `cv-match-screen.tsx`, que es la misma pantalla que en iOS y
Android: sin tarjetas, con un titular grande, el carril de etapas, el CV y la oferta en dos
columnas y la acción magnética al pie. Los campos, la importación y las validaciones son los
componentes de siempre; `prepare-layout.css` solo ajusta su aspecto dentro de este marco.

Movimiento:
- Llegada: si la onda de Inicio tapa la pantalla, los bloques entran en orden de lectura, el foco
  pasa al título y la onda se retira. Al abrir la ruta directamente no se anima nada.
- Análisis: un barrido recorre el CV y la oferta una vez antes de abrir Resultados. El análisis
  ya está hecho cuando empieza; el barrido solo acompaña el cambio de pantalla.
Con «reducir movimiento» no hay llegada ni barrido.
*/
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { isWaveCovering, revealWave } from '@/shared/motion/radar-wave';
import { useMagnetic } from '@/shared/motion/use-magnetic';
import { useReducedMotion } from '@/shared/motion/use-reduced-motion';
import { themeVariablesCss } from '@/shared/theme';

import './prepare-layout.css';

type Children = { children: ReactNode };

const themeCss = themeVariablesCss('.prepare-page');
// Lo que dura la animación `prepare-scan` del CSS.
const SCAN_MS = 640;
// La entrada más tardía termina antes: después ya no se anima lo que aparezca (avisos, por ejemplo).
const ARRIVAL_MS = 900;

export function PreparePage({ children }: Children) {
  const pageRef = useRef<HTMLDivElement>(null);

  /*
  La entrada se marca en el DOM y no en el estado: es solo presentación y así no obliga a otro
  render justo al montar.
  */
  useEffect(() => {
    const page = pageRef.current;
    if (!page || !isWaveCovering()) return;
    page.dataset.arrival = 'true';
    page.querySelector<HTMLElement>('.prepare-title')?.focus({ preventScroll: true });
    // La onda se retira cuando la pantalla nueva ya está pintada debajo.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(revealWave);
    });
    const settle = window.setTimeout(() => delete page.dataset.arrival, ARRIVAL_MS);
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(settle);
      revealWave();
    };
  }, []);

  return (
    <div ref={pageRef} className="prepare-page">
      <style>{themeCss}</style>
      {children}
    </div>
  );
}

/** Recibe el foco al llegar desde Inicio, como el título de una página nueva. */
export function PrepareTitle({ children }: Children) {
  return (
    <div className="prepare-title" tabIndex={-1}>
      {children}
    </div>
  );
}

export function PrepareColumns({ children, scanning }: Children & { scanning: boolean }) {
  return (
    <div className="prepare-inputs" data-scanning={scanning}>
      {children}
      <span className="prepare-scan" aria-hidden>
        <i />
      </span>
    </div>
  );
}

export function PreparePanel({ children }: Children) {
  return <div className="prepare-panel">{children}</div>;
}

export function PrepareSubmitBar({ children }: Children) {
  return <div className="prepare-submit">{children}</div>;
}

export function MagneticAction({ children }: Children) {
  const magnet = useMagnetic();
  return (
    <span className="prepare-magnet" ref={magnet}>
      {children}
    </span>
  );
}

/**
 * Lanza el barrido y llama a `then` al terminar; una segunda llamada durante el barrido se ignora.
 * Con «reducir movimiento», `then` se llama al momento.
 */
export function usePrepareScan() {
  const reducedMotion = useReducedMotion();
  const [scanning, setScanning] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = useCallback(
    (then: () => void) => {
      if (reducedMotion) {
        then();
        return;
      }
      if (timer.current) return;
      setScanning(true);
      timer.current = window.setTimeout(() => {
        timer.current = 0;
        setScanning(false);
        then();
      }, SCAN_MS);
    },
    [reducedMotion],
  );

  return { scanning, run };
}
