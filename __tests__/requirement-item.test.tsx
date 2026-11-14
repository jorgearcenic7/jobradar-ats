import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';

import { analyzeMatch } from '@/features/cv-match/domain/analyze-match';
import type { RequirementAssessment } from '@/features/cv-match/domain/types';
import { RequirementItem } from '@/features/cv-match/presentation/requirement-item';
import { sampleCv, sampleOffer } from '@/features/cv-match/presentation/sample-texts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes } from '@/shared/theme';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);
const { requirements } = analyzeMatch(sampleCv, sampleOffer);
const byStatus = (status: RequirementAssessment['status']) =>
  requirements.find((item) => item.status === status && item.evidence.length > 0) ??
  requirements.find((item) => item.status === status)!;

const header = (name: RegExp | string) => screen.getByRole('button', { name });

describe('RequirementItem', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it.each(['supported', 'mentioned', 'missing', 'not-evaluable'] as const)(
    'starts folded and shows the name, status, importance and points (%s)',
    async (status) => {
      const item = byStatus(status);
      await render(<RequirementItem assessment={item} />);

      const toggle = header(/./);
      expect(toggle).toBeCollapsed();
      expect(toggle.props.accessibilityLabel.toLowerCase()).toContain(
        item.requirement.label.slice(0, 8).toLowerCase(),
      );
      expect(toggle.props.accessibilityLabel).toMatch(
        /Respaldado|Sin evidencia suficiente|No acreditado|No evaluable/,
      );
      expect(toggle.props.accessibilityLabel).toMatch(
        /Aporta [\d,]+ de \d puntos?|Fuera del porcentaje/,
      );
      // Los detalles no están montados mientras está plegado.
      expect(screen.queryByText(item.reason)).not.toBeOnTheScreen();
      expect(screen.queryByText('En la oferta')).not.toBeOnTheScreen();
    },
  );

  it('leaves the status text to its group title but keeps it in the accessible name', async () => {
    const item = byStatus('supported');
    await render(<RequirementItem assessment={item} />);

    // El título del grupo ya dice el estado; la fila solo lleva su icono.
    expect(screen.queryByText('Respaldado')).not.toBeOnTheScreen();
    expect(header(/./).props.accessibilityLabel).toContain('. Respaldado. ');
  });

  it('draws a separator only when it follows another row of its group', async () => {
    const item = byStatus('supported');
    // La fila no es un elemento accesible por sí misma: se busca por su rol de lista.
    // `queryAll` no incluye la raíz, que aquí es la propia fila.
    const row = () =>
      [screen.root!, ...screen.root!.queryAll(() => true)].find(
        (node) => node.props.role === 'listitem',
      );
    const { rerender } = await render(<RequirementItem assessment={item} />);
    expect(row()).not.toHaveStyle({ borderTopWidth: 1 });

    await rerender(<RequirementItem assessment={item} separated />);
    expect(row()).toHaveStyle({
      borderTopWidth: 1,
      borderTopColor: palettes.light.divider,
    });
  });

  it('shows the whole explanation, the CV evidence and the offer source when expanded', async () => {
    const item = byStatus('supported');
    await render(<RequirementItem assessment={item} />);

    await userEvent.setup().press(header(/./));

    expect(header(/./)).toBeExpanded();
    expect(screen.getByText(item.reason)).toBeOnTheScreen();
    expect(screen.getByText('En tu CV')).toBeOnTheScreen();
    for (const evidence of item.evidence.slice(0, 3)) {
      expect(screen.getAllByText(evidence.text).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('En la oferta')).toBeOnTheScreen();
    expect(screen.getByText(`«${item.requirement.sources[0]}»`)).toBeOnTheScreen();
  });

  it('keeps the content when folded and unfolded again', async () => {
    const item = byStatus('supported');
    await render(<RequirementItem assessment={item} />);
    const user = userEvent.setup();

    await user.press(header(/./));
    await user.press(header(/./));
    expect(screen.queryByText(item.reason)).not.toBeOnTheScreen();
    await user.press(header(/./));
    expect(screen.getByText(item.reason)).toBeOnTheScreen();
  });

  it('shows no CV block when there is no evidence, but keeps the offer source', async () => {
    const item = requirements.find((r) => r.evidence.length === 0)!;
    await render(<RequirementItem assessment={item} />);

    await userEvent.setup().press(header(/./));

    expect(screen.queryByText('En tu CV')).not.toBeOnTheScreen();
    expect(screen.getByText('En la oferta')).toBeOnTheScreen();
  });

  it('says how many more phrases there are beyond the three shown', async () => {
    const base = byStatus('supported');
    const evidence = Array.from({ length: 5 }, (_, i) => ({
      ...base.evidence[0],
      text: `Frase ${i}.`,
    }));
    await render(<RequirementItem assessment={{ ...base, evidence }} />);

    await userEvent.setup().press(header(/./));

    expect(screen.getByText('Frase 2.')).toBeOnTheScreen();
    expect(screen.queryByText('Frase 3.')).not.toBeOnTheScreen();
    expect(screen.getByText('Y 2 frases más con el mismo requisito.')).toBeOnTheScreen();
  });

  it('opens with Enter-like presses and keeps the 44 px target', async () => {
    await render(<RequirementItem assessment={byStatus('missing')} />);

    expect(header(/./)).toHaveStyle({ minHeight: 44 });
    await fireEvent.press(header(/./));
    expect(header(/./)).toBeExpanded();
  });

  it.each(['light', 'dark'] as const)('uses the %s theme colors for the quotes', async (scheme) => {
    mockedUseColorScheme.mockReturnValue(scheme);
    const item = byStatus('supported');
    await render(<RequirementItem assessment={item} />);
    await userEvent.setup().press(header(/./));

    expect(screen.getByText(item.reason)).toHaveStyle({ color: palettes[scheme].text });
    expect(screen.getByText('En la oferta')).toHaveStyle({ color: palettes[scheme].textSecondary });
  });
});

describe('Several requirements', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('open and close independently', async () => {
    const [first, second] = [byStatus('supported'), byStatus('missing')];
    await render(
      <>
        <RequirementItem assessment={first} />
        <RequirementItem assessment={second} />
      </>,
    );
    const toggles = screen.getAllByRole('button');

    await userEvent.setup().press(toggles[0]);
    expect(toggles[0]).toBeExpanded();
    expect(toggles[1]).toBeCollapsed();

    await userEvent.setup().press(toggles[1]);
    expect(toggles[0]).toBeExpanded();
    expect(toggles[1]).toBeExpanded();
    expect(screen.getByText(first.reason)).toBeOnTheScreen();
    expect(screen.getByText(second.reason)).toBeOnTheScreen();
  });
});
