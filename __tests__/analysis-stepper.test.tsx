import { render, screen } from '@testing-library/react-native';

import { AnalysisStepper } from '@/features/cv-match/presentation/analysis-stepper';

function stepStates() {
  return screen.getAllByRole('listitem').map((item) => item.props.accessibilityLabel);
}

describe('AnalysisStepper', () => {
  it('marks only the first missing step as current', async () => {
    await render(<AnalysisStepper cvReady={false} offerReady={false} resultsReady={false} />);

    expect(stepStates()).toEqual([
      'Paso 1 de 3, Tu CV: en curso',
      'Paso 2 de 3, La oferta: pendiente',
      'Paso 3 de 3, Resultados: pendiente',
    ]);
  });

  it('keeps a step completed out of order and moves the current step forward', async () => {
    await render(<AnalysisStepper cvReady={false} offerReady resultsReady={false} />);
    expect(stepStates()).toEqual([
      'Paso 1 de 3, Tu CV: en curso',
      'Paso 2 de 3, La oferta: completado',
      'Paso 3 de 3, Resultados: pendiente',
    ]);

    await render(<AnalysisStepper cvReady offerReady resultsReady={false} />);
    expect(stepStates()).toEqual([
      'Paso 1 de 3, Tu CV: completado',
      'Paso 2 de 3, La oferta: completado',
      'Paso 3 de 3, Resultados: en curso',
    ]);
  });

  it('has no current step once the results match the data', async () => {
    await render(<AnalysisStepper cvReady offerReady resultsReady />);

    expect(stepStates().every((label) => label.endsWith('completado'))).toBe(true);
  });
});
