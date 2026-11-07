import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { StatusBadge } from '@/features/cv-match/presentation/status-badge';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes, typography } from '@/shared/theme';
import { Badge, badgeTones, type BadgeTone } from '@/shared/ui/badge';
import { iconSymbols } from '@/shared/ui/icon';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

// Nodos con un fondo concreto: el contenedor de la insignia.
function nodesWithBackground(color: string) {
  // `queryAll` no incluye la raíz, que aquí es el propio contenedor.
  const root = screen.root!;
  return [root, ...root.queryAll(() => true)].filter(
    (node) => StyleSheet.flatten(node.props.style)?.backgroundColor === color,
  );
}

// Iconos dibujados, por su nombre de SF Symbols (Jest se ejecuta como iOS).
function symbolNamed(name: string) {
  return screen.root!.queryAll((node) => node.props.name === name && 'tintColor' in node.props);
}

const tones = Object.keys(badgeTones) as BadgeTone[];

describe('Badge', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('shows its label as text, so the state never depends on color alone', async () => {
    await render(<Badge tone="success" label="Respaldado" />);

    expect(screen.getByText('Respaldado')).toHaveStyle({ ...typography.footnote, fontWeight: 600 });
    expect(symbolNamed(iconSymbols.checkCircle.ios)).toHaveLength(1);
  });

  it('keeps the icon decorative: assistive technologies read only the label', async () => {
    await render(<Badge tone="danger" label="No acreditado" />);

    const [icon] = symbolNamed(iconSymbols.error.ios);
    expect(icon.props.accessible).toBe(false);
  });

  it.each(tones)('gives the %s tone its own icon', async (tone) => {
    await render(<Badge tone={tone} label="Estado" />);

    expect(symbolNamed(iconSymbols[badgeTones[tone].icon].ios)).toHaveLength(1);
  });
});

describe.each(['light', 'dark'] as const)('Badge in the %s theme', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it.each(tones)('draws the %s tone with its semantic colors', async (tone) => {
    const { color, background } = badgeTones[tone];
    await render(<Badge tone={tone} label="Estado" />);

    expect(nodesWithBackground(palette[background])).toHaveLength(1);
    expect(screen.getByText('Estado')).toHaveStyle({ color: palette[color] });
    expect(symbolNamed(iconSymbols[badgeTones[tone].icon].ios)[0].props.tintColor).toBe(
      palette[color],
    );
  });
});

// El analizador traduce sus estados a tonos sin cambiar sus nombres.
describe('StatusBadge', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it.each([
    ['supported', 'Respaldado', 'successSubtle'],
    ['mentioned', 'Sin evidencia suficiente', 'warningSubtle'],
    ['missing', 'No acreditado', 'dangerSubtle'],
    ['not-evaluable', 'No evaluable', 'neutralSubtle'],
  ] as const)('shows the %s status through the shared Badge', async (status, label, background) => {
    await render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(nodesWithBackground(palettes.light[background])).toHaveLength(1);
  });
});
