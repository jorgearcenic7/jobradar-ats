/*
Progreso del análisis en Preparar, versión web: el carril de etapas de la dirección inmersiva.

Mismas reglas que `analysis-stepper.tsx`, que es la versión de iOS y Android: refleja el estado
real de la sesión, solo el primer paso que falta está en curso y los completados llevan su marca
aunque se hayan hecho en otro orden. Un único indicador bajo el carril se desliza hasta el paso en
curso y, con todo completado, ocupa el carril entero.

No es una región viva: cada paso dice su estado en su nombre accesible. Los estilos están en
`prepare-layout.css`, con las variables del tema del marco de Preparar.
*/
import type { CSSProperties } from 'react';

import type { AnalysisStepperProps } from './analysis-stepper';

type StepState = 'done' | 'current' | 'pending';

const stateLabels: Record<StepState, string> = {
  done: 'completado',
  current: 'en curso',
  pending: 'pendiente',
};

const labels = ['Tu CV', 'La oferta', 'Resultados'];

export function AnalysisStepper({ cvReady, offerReady, resultsReady }: AnalysisStepperProps) {
  const completed = [cvReady, offerReady, resultsReady];
  const current = completed.indexOf(false);
  const allDone = current === -1;

  return (
    <ol
      className="prepare-stages"
      aria-label="Pasos del análisis"
      data-complete={allDone}
      style={{ '--stage': allDone ? 0 : current } as CSSProperties}>
      {labels.map((label, index) => {
        const state: StepState = completed[index]
          ? 'done'
          : index === current
            ? 'current'
            : 'pending';
        return (
          <li
            key={label}
            data-state={state}
            aria-label={`Paso ${index + 1} de ${labels.length}, ${label}: ${stateLabels[state]}`}>
            <span className="prepare-stage-number" aria-hidden>
              {state === 'done' ? <Check /> : index + 1}
            </span>
            <span className="prepare-stage-name" aria-hidden>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12.5 10 17.5 19 7" />
    </svg>
  );
}
