import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import { AnalysisResults } from '@/features/cv-match/presentation/analysis-results';
import { displayLabel } from '@/features/cv-match/presentation/labels';
import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes } from '@/shared/theme';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);
const result = analyzeMatch(sampleCv, sampleOffer);
const filters = [
  ['all', 'Todos'],
  ['missing', 'No acreditados'],
  ['mentioned', 'Sin evidencia suficiente'],
  ['supported', 'Respaldados'],
] as const;
const groupOrder = ['supported', 'mentioned', 'missing', 'not-evaluable'] as const;
const chip = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label} \\(`) });
const rows = () =>
  screen
    .queryAllByRole('button')
    .filter((button) => button.props.accessibilityLabel?.includes(' · '));
const rowNames = () => rows().map((row) => row.props.accessibilityLabel);
const nameFor = (item: (typeof result.requirements)[number]) =>
  `${displayLabel(item.requirement.label)}. `;
const renderResults = (value = result) =>
  render(<AnalysisResults result={value} comparison={null} offerChanged={false} />);

describe('Requirement filters', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('counts real assessments, includes unevaluable items in All and selects only All initially', async () => {
    await renderResults();
    expect(screen.getByLabelText('Filtrar requisitos por estado')).toBeOnTheScreen();
    for (const [value, label] of filters) {
      const count = result.requirements.filter(
        (item) => value === 'all' || item.status === value,
      ).length;
      expect(chip(label)).toHaveAccessibleName(`${label} (${count})`);
      expect(chip(label).props['aria-pressed']).toBe(value === 'all');
      expect(chip(label).props.accessibilityState.selected).toBe(value === 'all');
    }
    expect(rows()).toHaveLength(result.requirements.length);
  });

  it.each(filters)(
    'shows the exact content for %s in the original group and requirement order',
    async (value, label) => {
      await renderResults();
      await userEvent.setup().press(chip(label));
      const expected = groupOrder.flatMap((status) =>
        result.requirements.filter(
          (item) =>
            item.status === status &&
            (value === 'all' || status === value || status === 'not-evaluable'),
        ),
      );
      expect(rows()).toHaveLength(expected.length);
      expect(rowNames().map((name) => name.split('. ')[0])).toEqual(
        expected.map((item) => displayLabel(item.requirement.label)),
      );
      expect(chip(label).props['aria-pressed']).toBe(true);
    },
  );

  it('switches in both directions with only one active filter and recovers every requirement', async () => {
    await renderResults();
    const user = userEvent.setup();
    const initial = rowNames();
    for (const label of ['Respaldados', 'No acreditados', 'Sin evidencia suficiente', 'Todos']) {
      await user.press(chip(label));
      expect(filters.filter(([, text]) => chip(text).props['aria-pressed'])).toEqual([
        filters.find(([, text]) => text === label),
      ]);
    }
    expect(rowNames()).toEqual(initial);
  });

  it('keeps unevaluable items in their own group under every filter, with usable disclosures', async () => {
    await renderResults();
    const item = result.requirements.find((r) => r.status === 'not-evaluable')!;
    const user = userEvent.setup();
    await user.press(screen.getByRole('button', { name: new RegExp(`^${nameFor(item)}`) }));
    for (const [, label] of filters) {
      await user.press(chip(label));
      expect(
        screen.getByRole('header', { name: /No evaluables, fuera del porcentaje/ }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: new RegExp(`^${nameFor(item)}`) })).toBeExpanded();
      expect(screen.getByText(item.reason)).toBeOnTheScreen();
    }
  });

  it('shows a clear empty filter and a working return to All while preserving unevaluable items', async () => {
    const missingOnly = analyzeMatch(
      'PERFIL\nPersona ficticia.',
      'REQUISITOS\nReact.\nCapacidad para organizar tu propio trabajo en remoto.',
    );
    await renderResults(missingOnly);
    await userEvent.setup().press(chip('Respaldados'));
    expect(chip('Respaldados')).toHaveAccessibleName('Respaldados (0)');
    expect(screen.getByText('No hay requisitos con este estado')).toBeOnTheScreen();
    expect(rows()).toHaveLength(
      missingOnly.requirements.filter((r) => r.status === 'not-evaluable').length,
    );
    await userEvent.setup().press(screen.getByRole('button', { name: 'Ver todos los requisitos' }));
    expect(chip('Todos').props['aria-pressed']).toBe(true);
    expect(rows()).toHaveLength(missingOnly.requirements.length);
    expect(screen.queryByText('No hay requisitos con este estado')).not.toBeOnTheScreen();
  });

  it('keeps the original empty offer state and does not duplicate empty messages after filtering', async () => {
    await renderResults(analyzeMatch(sampleCv, 'Hola.'));
    expect(chip('Todos')).toHaveAccessibleName('Todos (0)');
    expect(screen.getByText('No se ha reconocido ningún requisito en la oferta')).toBeOnTheScreen();
    await userEvent.setup().press(chip('No acreditados'));
    expect(
      screen.queryByText('No se ha reconocido ningún requisito en la oferta'),
    ).not.toBeOnTheScreen();
    expect(screen.getByText('No hay requisitos con este estado')).toBeOnTheScreen();
  });

  it('keeps an open visible requirement open, resets it when hidden, and restores its evidence on demand', async () => {
    await renderResults();
    const item = result.requirements.find(
      (r) => r.status === 'supported' && r.evidence.length > 0,
    )!;
    const toggle = () => screen.getByRole('button', { name: new RegExp(`^${nameFor(item)}`) });
    const user = userEvent.setup();
    await user.press(toggle());
    await user.press(chip('Respaldados'));
    expect(toggle()).toBeExpanded();
    await user.press(chip('No acreditados'));
    expect(
      screen.queryByRole('button', { name: new RegExp(`^${nameFor(item)}`) }),
    ).not.toBeOnTheScreen();
    await user.press(chip('Todos'));
    expect(toggle()).toBeCollapsed();
    await user.press(toggle());
    expect(screen.getByText(item.reason)).toBeOnTheScreen();
    for (const evidence of item.evidence.slice(0, 3)) {
      expect(screen.getAllByText(evidence.text).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(`«${item.requirement.sources[0]}»`)).toBeOnTheScreen();
  });

  it('leaves coverage, recommendations and the engine result untouched across all filters', async () => {
    const before = JSON.stringify(result);
    await renderResults();
    const percentage = screen.getByText(`${result.coverage.percentage} %`);
    const points = screen.getByText(/de \d+ puntos · \d+ requisitos/);
    const recommendations = result.recommendations.slice(0, 3).map((r) => r.message);
    for (const [, label] of filters) {
      await userEvent.setup().press(chip(label));
      expect(percentage).toBeOnTheScreen();
      expect(points).toBeOnTheScreen();
      for (const message of recommendations) expect(screen.getByText(message)).toBeOnTheScreen();
      expect(JSON.stringify(result)).toBe(before);
    }
  });

  it.each(['light', 'dark'] as const)(
    'uses %s tokens, a visible focus ring and 44 px touch targets',
    async (scheme) => {
      mockedUseColorScheme.mockReturnValue(scheme);
      await renderResults();
      for (const [, label] of filters) {
        expect(chip(label)).toHaveStyle({ minHeight: 44, minWidth: 44, maxWidth: '100%' });
      }
      expect(chip('Todos')).toHaveStyle({
        borderColor: palettes[scheme].primary,
        backgroundColor: palettes[scheme].surfaceSelected,
      });
      expect(screen.getByText(/^Todos \(/)).toHaveStyle({ color: palettes[scheme].text });
      await fireEvent(chip('No acreditados'), 'focus', { target: { matches: () => true } });
      expect(chip('No acreditados')).toHaveStyle({
        outlineWidth: 2,
        outlineColor: palettes[scheme].focusRing,
      });
      await userEvent.setup().press(chip('No acreditados'));
      expect(chip('No acreditados').props['aria-pressed']).toBe(true);
    },
  );
});
