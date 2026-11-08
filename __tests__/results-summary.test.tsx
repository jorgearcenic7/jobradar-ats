import { render, screen, userEvent } from '@testing-library/react-native';

import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { compareAnalyses } from '@/features/cv-match/domain/compare';
import type { Recommendation } from '@/features/cv-match/domain/types';
import { AnalysisResults } from '@/features/cv-match/presentation/analysis-results';
import { RecommendationList } from '@/features/cv-match/presentation/recommendation-list';
import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes } from '@/shared/theme';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const result = analyzeMatch(sampleCv, sampleOffer);
const rec = (message: string): Recommendation => ({ kind: 'missing', message });

describe('Results summary', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('puts the coverage, the counts and the ATS clarification first, with the method folded', async () => {
    await render(<AnalysisResults result={result} comparison={null} offerChanged={false} />);

    expect(screen.getByText(`${result.coverage.percentage} %`)).toBeOnTheScreen();
    expect(screen.getByRole('image', { name: /Respaldado: / })).toBeOnTheScreen();
    expect(screen.getByText(/^Respaldado: \d/)).toBeOnTheScreen();
    expect(screen.getByText(/No es una puntuación ATS ni una probabilidad/)).toBeOnTheScreen();
    expect(screen.queryByText(/Cada requisito suma 1 punto/)).not.toBeOnTheScreen();

    const method = screen.getByRole('button', { name: 'Cómo se calcula la cobertura' });
    expect(method).toBeCollapsed();
    await userEvent.setup().press(method);
    expect(screen.getByText(/Cada requisito suma 1 punto/)).toBeOnTheScreen();
  });

  it('orders the sections: summary, what to improve first, then the requirements', async () => {
    await render(<AnalysisResults result={result} comparison={null} offerChanged={false} />);

    const headers = screen.getAllByRole('header').map((h) => String(h.props.children));
    expect(headers[0]).toBe('Qué mejorar primero');
    expect(headers[1]).toBe('Requisitos de la oferta');
    expect(headers.slice(2).every((name) => name !== 'Qué mejorar primero')).toBe(true);
  });

  it('keeps the coverage and the points the engine computed', async () => {
    await render(<AnalysisResults result={result} comparison={null} offerChanged={false} />);

    const { earned, possible, evaluated } = result.coverage;
    const points = String(earned).replace('.', ',');
    expect(
      screen.getByText(new RegExp(`${points} de ${possible} puntos · ${evaluated} requisitos`)),
    ).toBeOnTheScreen();
  });

  it('says so when no requirement could be evaluated, with no bar', async () => {
    const empty = analyzeMatch(sampleCv, 'Hola, buscamos a alguien con ganas.');
    await render(<AnalysisResults result={empty} comparison={null} offerChanged={false} />);

    expect(empty.coverage.percentage).toBeNull();
    expect(
      screen.getByText('No se ha podido evaluar ningún requisito de esta oferta.'),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('image', { name: /Respaldado: / })).not.toBeOnTheScreen();
  });

  it('shows the comparison folded when changes exist, and says when there are none', async () => {
    const better = analyzeMatch(
      `${sampleCv}\n\nPERFIL\nTengo 4 años de experiencia con React.`,
      sampleOffer,
    );
    const comparison = compareAnalyses(result, better);
    await render(<AnalysisResults result={better} comparison={comparison} offerChanged={false} />);

    expect(
      screen.getByRole('header', { name: 'Cambios respecto al análisis anterior' }),
    ).toBeOnTheScreen();
    const toggle = screen.getByRole('button', { name: /de estado$/ });
    expect(toggle).toBeCollapsed();
    await userEvent.setup().press(toggle);
    expect(toggle).toBeExpanded();
  });

  it('shows no comparison when there is none, and a note when the offer changed', async () => {
    const { rerender } = await render(
      <AnalysisResults result={result} comparison={null} offerChanged={false} />,
    );
    expect(screen.queryByRole('header', { name: /Cambios respecto/ })).not.toBeOnTheScreen();

    await rerender(<AnalysisResults result={result} comparison={null} offerChanged />);
    expect(screen.getByText(/La oferta ha cambiado desde el análisis anterior/)).toBeOnTheScreen();
  });

  it('keeps the unevaluable requirements out of the percentage but listed', async () => {
    await render(<AnalysisResults result={result} comparison={null} offerChanged={false} />);

    expect(screen.getByText(/No evaluable: \d+ \(fuera del porcentaje\)/)).toBeOnTheScreen();
    expect(
      screen.getByRole('header', { name: /No evaluables, fuera del porcentaje/ }),
    ).toBeOnTheScreen();
  });
});

describe('Priority recommendations', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  const five = ['A uno.', 'B dos.', 'C tres.', 'D cuatro.', 'E cinco.'].map(rec);

  it('shows the first three and the rest only after «Ver todas», without repeating any', async () => {
    await render(<RecommendationList recommendations={five} />);
    const user = userEvent.setup();

    expect(screen.queryAllByText(/^[A-E] [a-z]+.$|^(Igual|Otra).$/)).toHaveLength(3);
    expect(screen.queryByText('D cuatro.')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Ver todas (5)' }));
    expect(screen.queryAllByText(/^[A-E] [a-z]+.$|^(Igual|Otra).$/)).toHaveLength(5);
    expect(screen.getAllByText('A uno.')).toHaveLength(1);

    await user.press(screen.getByRole('button', { name: 'Ver solo las 3 primeras' }));
    expect(screen.queryAllByText(/^[A-E] [a-z]+.$|^(Igual|Otra).$/)).toHaveLength(3);
  });

  it('keeps the engine order and does not offer more when there are three or fewer', async () => {
    await render(<RecommendationList recommendations={five.slice(0, 3)} />);

    expect(screen.queryAllByText(/^[A-E] [a-z]+\.$/).map((n) => n.props.children)).toEqual([
      'A uno.',
      'B dos.',
      'C tres.',
    ]);
    expect(screen.queryByRole('button', { name: /Ver todas/ })).not.toBeOnTheScreen();
  });

  it('shows identical messages once', async () => {
    await render(
      <RecommendationList recommendations={[rec('Igual.'), rec('Igual.'), rec('Otra.')]} />,
    );

    expect(screen.queryAllByText(/^[A-E] [a-z]+.$|^(Igual|Otra).$/)).toHaveLength(2);
  });

  it('says there are none when the list is empty', async () => {
    await render(<RecommendationList recommendations={[]} />);

    expect(screen.getByText('No hay recomendaciones para esta oferta.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /Ver todas/ })).not.toBeOnTheScreen();
  });

  it('keeps the honesty note and the 44 px target of the button', async () => {
    await render(<RecommendationList recommendations={five} />);

    expect(screen.getByText(/Nunca redactan experiencia por ti/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ver todas (5)' })).toHaveStyle({ minHeight: 44 });
  });

  it.each(['light', 'dark'] as const)('uses the %s theme colors', async (scheme) => {
    mockedUseColorScheme.mockReturnValue(scheme);
    await render(<RecommendationList recommendations={five} />);

    expect(screen.getByText('A uno.')).toHaveStyle({ color: palettes[scheme].text });
    expect(screen.getByText(/Nunca redactan/)).toHaveStyle({
      color: palettes[scheme].textSecondary,
    });
  });
});
