import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes, typography } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { iconSymbols } from '@/shared/ui/icon';
import { Notice, noticeTones, type NoticeTone } from '@/shared/ui/notice';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

function nodesWithBackground(color: string) {
  // `queryAll` no incluye la raíz, que aquí es el propio contenedor.
  const root = screen.root!;
  return [root, ...root.queryAll(() => true)].filter(
    (node) => StyleSheet.flatten(node.props.style)?.backgroundColor === color,
  );
}

function symbolNamed(name: string) {
  return screen.root!.queryAll((node) => node.props.name === name && 'tintColor' in node.props);
}

const tones = Object.keys(noticeTones) as NoticeTone[];

describe('Notice', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('shows the message in readable body text', async () => {
    await render(<Notice tone="info">Leyendo «cv.pdf» en este dispositivo…</Notice>);

    expect(screen.getByText('Leyendo «cv.pdf» en este dispositivo…')).toHaveStyle({
      ...typography.callout,
      color: palettes.light.text,
    });
  });

  it('shows an optional title in bold above the message', async () => {
    await render(
      <Notice tone="success" title="cv.pdf · PDF · 1 página">
        Texto extraído: 3.394 caracteres.
      </Notice>,
    );

    expect(screen.getByText('cv.pdf · PDF · 1 página')).toHaveStyle({
      ...typography.callout,
      fontWeight: 600,
    });
    expect(screen.getByText('Texto extraído: 3.394 caracteres.')).toBeOnTheScreen();
  });

  it('renders no title when there is none', async () => {
    await render(<Notice tone="warning">Revisa el texto antes de analizar.</Notice>);

    expect(
      screen.root!.queryAll((node) => StyleSheet.flatten(node.props.style)?.fontWeight === 600),
    ).toHaveLength(0);
  });

  it('places its actions below the message and keeps them usable', async () => {
    const onConfirm = jest.fn();
    await render(
      <Notice tone="warning" actions={<Button label="Leer las 25 páginas" onPress={onConfirm} />}>
        «largo.pdf» tiene 25 páginas.
      </Notice>,
    );

    await userEvent.setup().press(screen.getByRole('button', { name: 'Leer las 25 páginas' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  // El aviso no se anuncia por sí mismo: quien lo muestra decide si va en una región viva.
  it('is not a live region nor an alert by itself', async () => {
    await render(
      <Notice tone="danger">El archivo está dañado o incompleto y no se puede leer.</Notice>,
    );

    expect(screen.root!.queryAll((node) => node.props['aria-live'] !== undefined)).toHaveLength(0);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each(tones)('gives the %s tone a decorative icon of its own', async (tone) => {
    await render(<Notice tone={tone}>Mensaje</Notice>);

    const [icon] = symbolNamed(iconSymbols[noticeTones[tone].icon].ios);
    expect(icon.props.accessible).toBe(false);
  });
});

describe.each(['light', 'dark'] as const)('Notice in the %s theme', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it.each(tones)('draws the %s tone on its subtle background', async (tone) => {
    const { icon, iconColor, background } = noticeTones[tone];
    await render(
      <Notice tone={tone} title="Título">
        Mensaje
      </Notice>,
    );

    expect(nodesWithBackground(palette[background])).toHaveLength(1);
    expect(symbolNamed(iconSymbols[icon].ios)[0].props.tintColor).toBe(palette[iconColor]);
    expect(screen.getByText('Título')).toHaveStyle({ color: palette.text });
    expect(screen.getByText('Mensaje')).toHaveStyle({ color: palette.text });
  });
});
