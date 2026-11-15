/*
Atracción magnética de un control hacia el puntero, solo web (Inicio y la acción «Analizar»).

El contenedor no se mueve: recibe el puntero con un área algo mayor que el control. Lo que se
desplaza es su primer hijo, a través de las variables `--mx` y `--my`; el CSS las aplica con
`translate` (y a la etiqueta, un poco menos, para dar profundidad), así que no choca con la
escala de la pulsación. El control nunca se escapa de debajo del puntero ni parpadea en el borde.

Solo con ratón o trackpad (`hover: hover` y `pointer: fine`) y sin «reducir movimiento». En
pantallas táctiles no hay nada que seguir: allí responde la pulsación, en el CSS.
*/
import { useCallback, useRef } from 'react';

// Desplazamiento máximo en píxeles: se nota, pero el control sigue en su sitio.
const MAX_SHIFT = 10;

export function useMagnetic(strength = 0.3) {
  const cleanup = useRef<(() => void) | null>(null);

  return useCallback(
    (wrapper: HTMLElement | null) => {
      cleanup.current?.();
      cleanup.current = null;
      if (!wrapper) return;
      const canFollow = window.matchMedia(
        '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
      );
      if (!canFollow.matches) return;
      const target = wrapper.firstElementChild as HTMLElement | null;
      if (!target) return;

      let x = 0;
      let y = 0;
      let targetX = 0;
      let targetY = 0;
      let frame = 0;
      let last = 0;

      const tick = (now: number) => {
        const dt = Math.min(48, now - (last || now)) / 1000;
        last = now;
        // Amortiguado sin rebote (unos 40 ms): sigue al puntero sin retraso visible y vuelve sin oscilar.
        const follow = 1 - Math.exp(-dt * 26);
        x += (targetX - x) * follow;
        y += (targetY - y) * follow;
        target.style.setProperty('--mx', `${x.toFixed(2)}px`);
        target.style.setProperty('--my', `${y.toFixed(2)}px`);
        if (Math.abs(targetX - x) > 0.05 || Math.abs(targetY - y) > 0.05) {
          frame = requestAnimationFrame(tick);
        } else {
          frame = 0;
        }
      };
      const wake = () => {
        if (!frame) {
          last = 0;
          frame = requestAnimationFrame(tick);
        }
      };
      const clamp = (value: number) => Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, value));
      const onMove = (event: PointerEvent) => {
        const rect = wrapper.getBoundingClientRect();
        targetX = clamp((event.clientX - (rect.left + rect.width / 2)) * strength);
        targetY = clamp((event.clientY - (rect.top + rect.height / 2)) * strength);
        wake();
      };
      const onLeave = () => {
        targetX = 0;
        targetY = 0;
        wake();
      };

      wrapper.addEventListener('pointermove', onMove);
      wrapper.addEventListener('pointerleave', onLeave);
      cleanup.current = () => {
        wrapper.removeEventListener('pointermove', onMove);
        wrapper.removeEventListener('pointerleave', onLeave);
        if (frame) cancelAnimationFrame(frame);
        target.style.removeProperty('--mx');
        target.style.removeProperty('--my');
      };
    },
    [strength],
  );
}
