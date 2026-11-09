import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { iconSize, layout, palettes, typography } from '@/shared/theme';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { iconSymbols } from '@/shared/ui/icon';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const title = 'Todavía no hay ninguna oferta';
const description = 'Pega el texto de una oferta para analizarla con tu CV.';

function allNodes() {
  // `queryAll` no incluye la raíz, que aquí es el propio contenedor.
  const root = screen.root!;
  return [root, ...root.queryAll(() => true)];
}

function nodesWithBackground(color: string) {
  return allNodes().filter(
    (node) => StyleSheet.flatten(node.props.style)?.backgroundColor === color,
  );
}

// Jest se ejecuta como iOS, donde el icono es un SymbolView con su nombre y su color.
function symbolNamed(name: string) {
  return screen.root!.queryAll((node) => node.props.name === name && 'tintColor' in node.props);
}

describe('EmptyState', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('identifies its title as a heading, at level 2 by default', async () => {
    await render(<EmptyState title={title} description={description} />);

    const heading = screen.getByRole('header', { name: title });
    expect(heading.props['aria-level']).toBe(2);
    expect(heading).toHaveStyle({ ...typography.heading, textAlign: 'center' });
  });

  it('places its title at level 3 inside a section', async () => {
    await render(<EmptyState title={title} description={description} level={3} />);

    const heading = screen.getByRole('header', { name: title });
    expect(heading.props['aria-level']).toBe(3);
    expect(heading).toHaveStyle(typography.headline);
  });

  it('explains the situation in readable, centered body text', async () => {
    await render(<EmptyState title={title} description={description} />);

    expect(screen.getByText(description)).toHaveStyle({
      ...typography.callout,
      color: palettes.light.textSecondary,
      textAlign: 'center',
    });
  });

  it('shows no icon unless it is given one', async () => {
    await render(<EmptyState title={title} description={description} />);

    expect(screen.root!.queryAll((node) => 'tintColor' in node.props)).toHaveLength(0);
    expect(nodesWithBackground(palettes.light.accentSubtle)).toHaveLength(0);
  });

  it('draws an optional icon as decoration, hidden from screen readers', async () => {
    await render(<EmptyState icon="info" title={title} description={description} />);

    const [icon] = symbolNamed(iconSymbols.info.ios);
    expect(icon.props.accessible).toBe(false);
    expect(icon).toHaveStyle({ width: iconSize.lg, height: iconSize.lg });
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows no button without an action', async () => {
    await render(<EmptyState title={title} description={description} />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('runs its action from a button with a comfortable touch target', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        title={title}
        description={description}
        action={{ label: 'Pegar una oferta', onPress }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Pegar una oferta' });
    expect(button).toHaveStyle({
      minHeight: layout.minTouchTarget,
      minWidth: layout.minTouchTarget,
    });
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is read in order: title, description and action', async () => {
    await render(
      <EmptyState
        icon="info"
        title={title}
        description={description}
        action={{ label: 'Pegar una oferta', onPress: jest.fn() }}
      />,
    );

    const nodes = allNodes();
    const positions = [
      screen.getByRole('header', { name: title }),
      screen.getByText(description),
      screen.getByRole('button', { name: 'Pegar una oferta' }),
    ].map((node) => nodes.indexOf(node));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  // Describe la pantalla tal como está; no es un cambio que haya que anunciar.
  it('is not a live region nor an alert', async () => {
    await render(<EmptyState icon="info" title={title} description={description} />);

    expect(screen.root!.queryAll((node) => node.props['aria-live'] !== undefined)).toHaveLength(0);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('has no surface of its own, so it sits inside a card', async () => {
    await render(
      <Card>
        <EmptyState title={title} description={description} />
      </Card>,
    );

    expect(nodesWithBackground(palettes.light.surface)).toHaveLength(1);
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
  });
});

describe.each(['light', 'dark'] as const)('EmptyState in the %s theme', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it('uses the theme colors for every part', async () => {
    await render(
      <EmptyState
        icon="info"
        title={title}
        description={description}
        action={{ label: 'Pegar una oferta', onPress: jest.fn() }}
      />,
    );

    expect(screen.getByRole('header', { name: title })).toHaveStyle({ color: palette.text });
    expect(screen.getByText(description)).toHaveStyle({ color: palette.textSecondary });
    // El icono va sobre un círculo suave con el mismo par de color comprobado en el test de contraste.
    expect(nodesWithBackground(palette.accentSubtle)).toHaveLength(1);
    expect(symbolNamed(iconSymbols.info.ios)[0].props.tintColor).toBe(palette.onAccentSubtle);
    expect(screen.getByRole('button', { name: 'Pegar una oferta' })).toHaveStyle({
      backgroundColor: palette.primary,
    });
  });
});
