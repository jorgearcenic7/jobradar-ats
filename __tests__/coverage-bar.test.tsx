import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { computeCoverage } from '@/features/cv-match/domain/coverage';
import type { RequirementAssessment, RequirementStatus } from '@/features/cv-match/domain/types';
import { CoverageBar } from '@/features/cv-match/presentation/coverage-bar';
import { CoverageSummary } from '@/features/cv-match/presentation/coverage-summary';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes } from '@/shared/theme';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);
const includeHiddenElements = { includeHiddenElements: true } as const;

function assessment(
  id: string,
  status: RequirementStatus,
  { points, weight }: { points: number; weight: number } = {
    points: status === 'supported' ? 1 : status === 'mentioned' ? 0.5 : 0,
    weight: 1,
  },
): RequirementAssessment {
  return {
    requirement: {
      id,
      kind: 'concept',
      conceptId: id,
      label: id,
      importance: weight === 2 ? 'required' : 'preferred',
      sources: [`Requisito ficticio ${id}.`],
    },
    status,
    reason: 'Motivo ficticio.',
    evidence: [],
    contribution: status === 'not-evaluable' ? null : { points, weight },
  };
}

// La cobertura sale del cálculo real, para que el resumen reciba los mismos datos que en la app.
const coverageOf = computeCoverage;

describe('CoverageBar', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('shows a complete contribution when every requirement is supported', async () => {
    await render(
      <CoverageBar
        assessments={[
          assessment('react', 'supported', { points: 1, weight: 2 }),
          assessment('typescript', 'supported'),
        ]}
      />,
    );

    expect(
      screen.getByRole('image', {
        name: /Respaldado: 3 de 3 puntos.*Sin evidencia suficiente: 0 de 0 puntos.*No acreditado: 0 de 0 puntos/,
      }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('coverage-earned-supported', includeHiddenElements)).toHaveStyle({
      width: '100%',
    });
  });

  it('keeps all possible points visible when none are earned', async () => {
    await render(
      <CoverageBar
        assessments={[
          assessment('react', 'missing', { points: 0, weight: 2 }),
          assessment('typescript', 'missing'),
        ]}
      />,
    );

    expect(
      screen.getByText('No acreditado: 0 de 3 puntos', includeHiddenElements),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('coverage-segment-missing', includeHiddenElements)).toHaveStyle({
      flexGrow: 3,
    });
    expect(screen.queryByTestId('coverage-earned-missing', includeHiddenElements)).toBeNull();
  });

  it('uses possible points for segment widths in a mixture of states', async () => {
    await render(
      <CoverageBar
        assessments={[
          assessment('react', 'supported', { points: 1, weight: 2 }),
          assessment('docker', 'mentioned', { points: 0.5, weight: 2 }),
          assessment('python', 'missing'),
        ]}
      />,
    );

    expect(screen.getByTestId('coverage-segment-supported', includeHiddenElements)).toHaveStyle({
      flexGrow: 2,
    });
    expect(screen.getByTestId('coverage-segment-mentioned', includeHiddenElements)).toHaveStyle({
      flexGrow: 2,
    });
    expect(screen.getByTestId('coverage-segment-missing', includeHiddenElements)).toHaveStyle({
      flexGrow: 1,
    });
  });

  it('shows only the earned share inside a partially contributing category', async () => {
    await render(
      <CoverageBar
        assessments={[
          assessment('docker', 'mentioned', { points: 0.5, weight: 2 }),
          assessment('python', 'mentioned', { points: 0.5, weight: 1 }),
        ]}
      />,
    );

    expect(
      screen.getByText('Sin evidencia suficiente: 1,5 de 3 puntos', includeHiddenElements),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('coverage-earned-mentioned', includeHiddenElements)).toHaveStyle({
      width: '50%',
    });
  });

  it('supports decimal contributions without rounding them into a new score', async () => {
    await render(
      <CoverageBar
        assessments={[assessment('docker', 'mentioned', { points: 0.5, weight: 1.5 })]}
      />,
    );

    expect(
      screen.getByText('Sin evidencia suficiente: 0,75 de 1,5 puntos', includeHiddenElements),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('coverage-earned-mentioned', includeHiddenElements)).toHaveStyle({
      width: '50%',
    });
  });

  it('leaves non-evaluable requirements outside every segment and accessible description', async () => {
    await render(
      <CoverageBar
        assessments={[assessment('react', 'supported'), assessment('remote-work', 'not-evaluable')]}
      />,
    );

    expect(screen.getByTestId('coverage-segment-supported', includeHiddenElements)).toHaveStyle({
      flexGrow: 1,
    });
    expect(
      screen.queryByTestId('coverage-segment-not-evaluable', includeHiddenElements),
    ).toBeNull();
    expect(screen.getByRole('image').props.accessibilityLabel).not.toContain('No evaluable');
  });

  it('handles zero evaluable requirements without dividing by zero', async () => {
    await render(<CoverageBar assessments={[assessment('remote-work', 'not-evaluable')]} />);

    expect(
      screen.getByRole('image', {
        name: 'Distribución de puntos de cobertura. No hay requisitos evaluables.',
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('coverage-segment-supported', includeHiddenElements)).toBeNull();
    expect(screen.queryByTestId('coverage-segment-mentioned', includeHiddenElements)).toBeNull();
    expect(screen.queryByTestId('coverage-segment-missing', includeHiddenElements)).toBeNull();
  });
});

describe.each(['light', 'dark'] as const)('CoverageBar in the %s theme', (scheme) => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it('uses the semantic state colors for possible and earned points', async () => {
    await render(
      <CoverageBar
        assessments={[
          assessment('react', 'supported'),
          assessment('docker', 'mentioned'),
          assessment('python', 'missing'),
        ]}
      />,
    );

    expect(screen.getByTestId('coverage-segment-supported', includeHiddenElements)).toHaveStyle({
      backgroundColor: palettes[scheme].successTrack,
    });
    expect(screen.getByTestId('coverage-earned-supported', includeHiddenElements)).toHaveStyle({
      backgroundColor: palettes[scheme].successDot,
    });
    expect(screen.getByTestId('coverage-segment-mentioned', includeHiddenElements)).toHaveStyle({
      backgroundColor: palettes[scheme].warningTrack,
    });
    expect(screen.getByTestId('coverage-earned-mentioned', includeHiddenElements)).toHaveStyle({
      backgroundColor: palettes[scheme].warningDot,
    });
    expect(screen.getByTestId('coverage-segment-missing', includeHiddenElements)).toHaveStyle({
      backgroundColor: palettes[scheme].dangerTrack,
    });
  });
});

describe('CoverageSummary integration', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('adds the segmented bar while preserving percentage, counts and methodology', async () => {
    const assessments = [
      assessment('react', 'supported', { points: 1, weight: 2 }),
      assessment('docker', 'mentioned', { points: 0.5, weight: 2 }),
      assessment('python', 'missing'),
      assessment('remote-work', 'not-evaluable'),
    ];

    await render(<CoverageSummary coverage={coverageOf(assessments)} assessments={assessments} />);

    expect(screen.getByText('60\u00a0%')).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: /Respaldado: 2 de 2 puntos/ })).toBeOnTheScreen();
    expect(screen.getByLabelText('Respaldado: 1')).toBeOnTheScreen();
    expect(screen.getByLabelText('No evaluable: 1 (fuera del porcentaje)')).toBeOnTheScreen();
    expect(
      screen.getByText(/Calculado con criterios habituales de evaluaci.n ATS/),
    ).toBeOnTheScreen();
  });

  it('warns when the percentage covers only a small part of the offer', async () => {
    const assessments = [
      assessment('react', 'supported', { points: 1, weight: 2 }),
      assessment('remote-work', 'not-evaluable'),
      assessment('license', 'not-evaluable'),
      assessment('shifts', 'not-evaluable'),
    ];

    await render(<CoverageSummary coverage={coverageOf(assessments)} assessments={assessments} />);

    expect(screen.getByText('Cobertura parcial: solo una parte de la oferta')).toBeOnTheScreen();
    expect(
      screen.getByText(
        /El porcentaje solo se calcula con 1 de los 4 elementos detectados en la oferta: 3 no se han podido evaluar/,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(/No lo tomes como el resultado de toda la oferta/)).toBeOnTheScreen();
  });

  it('preserves the existing empty message and omits an uninformative bar', async () => {
    const assessments = [assessment('remote-work', 'not-evaluable')];

    await render(<CoverageSummary coverage={coverageOf(assessments)} assessments={assessments} />);

    expect(
      screen.getByText(/No se ha podido evaluar ning.n requisito de esta oferta/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('image', { name: /Distribución de puntos/ })).toBeNull();
  });

  it('does not claim there are unevaluated requirements when the offer only has one', async () => {
    const assessments = [assessment('excel', 'supported', { points: 1, weight: 2 })];
    await render(<CoverageSummary coverage={coverageOf(assessments)} assessments={assessments} />);
    expect(screen.getByText(/Es una muestra pequeña de requisitos/)).toBeOnTheScreen();
    expect(screen.queryByText(/revisa abajo los requisitos sin evaluar/)).toBeNull();
  });
});
