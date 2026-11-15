/*
Prototipo navegable de la nueva dirección visual (ruta `/prototipo`, solo web).

No sustituye ninguna pantalla: vive en su propia ruta para revisar el movimiento real de Inicio y
de la transición a Analizar. Usa elementos DOM y CSS propios en lugar de los componentes de React
Native porque la dirección depende de canvas, eventos de puntero y desplazamiento.

La transición entre vistas es una onda: un círculo violeta crece desde el control pulsado hasta
cubrir la pantalla, cambia la vista debajo y se desvanece. Con «reducir movimiento» es un fundido
breve. Los colores salen de la paleta del tema (`palettes`), así que el prototipo sigue los
modos claro y oscuro del sistema sin repetir valores.
*/
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { palettes, type Palette } from '@/shared/theme';

import { AnalyzeView } from './analyze-view';
import { HomeView, type Origin } from './home-view';
import { LogoMark } from './logo-mark';

import './prototype.css';

const tokens = (p: Palette) =>
  [
    `--bg:${p.background}`,
    `--surface:${p.surface}`,
    `--text:${p.text}`,
    `--text-2:${p.textSecondary}`,
    `--text-3:${p.textTertiary}`,
    `--border:${p.border}`,
    `--divider:${p.divider}`,
    `--input:${p.inputBorder}`,
    `--accent:${p.primary}`,
    `--accent-press:${p.primaryPressed}`,
    `--on-accent:${p.onPrimary}`,
    `--accent-text:${p.accentText}`,
    `--accent-subtle:${p.accentSubtle}`,
    `--ok:${p.successDot}`,
    `--ok-text:${p.success}`,
    `--warn:${p.warningDot}`,
    `--warn-text:${p.warning}`,
    `--bad:${p.dangerDot}`,
    `--bad-text:${p.danger}`,
    `--focus:${p.focusRing}`,
    `--logo:${p.logoMark}`,
    `--radar-ring:${p.borderStrong}`,
    `--radar-accent:${p.primary}`,
  ].join(';');

const themeCss = `.pr-root{${tokens(palettes.light)}}@media (prefers-color-scheme: dark){.pr-root{${tokens(palettes.dark)}}}`;

type View = 'home' | 'analyze';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function PrototypeScreen() {
  const { etapa } = useLocalSearchParams<{ etapa?: string }>();
  const [view, setView] = useState<View>(etapa === 'analizar' ? 'analyze' : 'home');
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  const go = useCallback(
    async (next: View, origin: Origin) => {
      const wave = waveRef.current;
      if (busy.current || !wave || !scrollRoot) return;
      busy.current = true;
      // Cambia la vista bajo la onda y espera a que se pinte antes de descubrirla.
      const swap = async () => {
        setView(next);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        scrollRoot.scrollTop = 0;
      };
      try {
        if (reducedMotion) {
          const out = scrollRoot.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 120,
            fill: 'forwards',
          });
          await out.finished;
          await swap();
          out.cancel();
          await scrollRoot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 }).finished;
          return;
        }
        const { innerWidth: width, innerHeight: height } = window;
        const radius = Math.hypot(
          Math.max(origin.x, width - origin.x),
          Math.max(origin.y, height - origin.y),
        );
        wave.style.setProperty('--x', `${origin.x}px`);
        wave.style.setProperty('--y', `${origin.y}px`);
        wave.hidden = false;
        // La onda sale deprisa del control y frena al cubrir la pantalla, como un pulso de radar.
        const grow = wave.animate(
          [
            { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` },
            { clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)` },
          ],
          { duration: 560, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' },
        );
        await grow.finished;
        await swap();
        const fade = wave.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 320,
          easing: 'ease-out',
          fill: 'forwards',
        });
        await fade.finished;
        wave.hidden = true;
        grow.cancel();
        fade.cancel();
      } finally {
        busy.current = false;
      }
    },
    [reducedMotion, scrollRoot],
  );

  return (
    <div className="pr-root" data-view={view}>
      <style>{themeCss}</style>
      <div ref={setScrollRoot} className="pr-scroll">
        <header className="pr-topbar">
          <a className="pr-brand" href="/" aria-label="JobRadar, volver a la app actual">
            <span className="pr-logo" aria-hidden>
              <LogoMark />
            </span>
            JobRadar
          </a>
          <span className="pr-badge">Prototipo de dirección visual</span>
          <a className="pr-topbar-link" href="/">
            App actual
          </a>
        </header>
        {view === 'home' ? (
          <HomeView
            scrollRoot={scrollRoot}
            reducedMotion={reducedMotion}
            onAnalyze={(origin) => void go('analyze', origin)}
          />
        ) : (
          <AnalyzeView reducedMotion={reducedMotion} onBack={(origin) => void go('home', origin)} />
        )}
      </div>
      <div ref={waveRef} className="pr-wave" hidden aria-hidden>
        <i />
        <i />
      </div>
    </div>
  );
}
