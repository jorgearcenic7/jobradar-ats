/*
Preferencia «reducir movimiento» del sistema, solo web.

Empieza en `false` también en el servidor: el HTML estático no anima nada por sí mismo, y el
primer efecto ya lee el valor real antes de que empiece cualquier animación.
*/
import { useEffect, useState } from 'react';

const query = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.(query).matches === true;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}
