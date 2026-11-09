/*
CSS decide la distribución sin consultar la ventana en el render: servidor y cliente montan
el mismo árbol y redimensionar no desmonta filtros ni desplegables. Los tokens se pasan como
variables para no duplicar sus valores en la hoja de estilos.
*/
import type { CSSProperties, ReactNode } from 'react';

import { layout, space } from '@/shared/theme';

import type { ResultsColumnsProps } from './results-layout';

import './results-layout.css';

const variables: CSSProperties & Record<`--${string}`, string> = {
  '--results-single-width': `${layout.maxContentWidth - layout.screenPadding * 2}px`,
  '--results-page-gap': `${space[6]}px`,
  '--results-section-gap': `${space[4]}px`,
};

export function ResultsPage({ children }: { children: ReactNode }) {
  return (
    <div className="analysis-results-page" style={variables}>
      {children}
    </div>
  );
}

export function ResultsColumns({ summary, requirements }: ResultsColumnsProps) {
  return (
    <div className="analysis-results-columns">
      <div className="analysis-results-column">{summary}</div>
      <div className="analysis-results-column">{requirements}</div>
    </div>
  );
}
