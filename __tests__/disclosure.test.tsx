import { fireEvent, render, screen, userEvent, within } from '@testing-library/react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { layout, palettes, typography } from '@/shared/theme';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Disclosure } from '@/shared/ui/disclosure';
import { Icon, iconSymbols } from '@/shared/ui/icon';
import { ThemedText } from '@/shared/ui/themed-text';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const header = 'Revisar el texto extraído';
const content = 'Texto de un CV ficticio.';

// Jest se ejecuta como iOS, donde el icono es un SymbolView con su nombre y su color.
function chevron() {
  const [icon] = screen.root!.queryAll(
    (node) => node.props.name === iconSymbols.chevronDown.ios && 'tintColor' in node.props,
  );
  return icon;
}

function allNodes() {
  const root = screen.root!;
  return [root, ...root.queryAll(() => true)];
}

/** Guarda el estado como lo hará una pantalla: el padre decide y el bloque solo lo pide. */
function Controlled({ initiallyExpanded = false }: { initiallyExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <View>
      <Button label="Abrir desde fuera" onPress={() => setExpanded(true)} />
      <Disclosure header={header} expanded={expanded} onToggle={setExpanded}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>
    </View>
  );
}

describe('Disclosure', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('shows only its header while collapsed', async () => {
    await render(
      <Disclosure header={header} expanded={false} onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );

    const button = screen.getByRole('button', { name: header, expanded: false });
    expect(button).toBeOnTheScreen();
    expect(button.props.accessibilityLabel).toBe(header);
    expect(screen.queryByText(content)).not.toBeOnTheScreen();
  });

  it('shows its content after the header while expanded', async () => {
    await render(
      <Disclosure header={header} expanded onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );

    const button = screen.getByRole('button', { name: header, expanded: true });
    const text = screen.getByText(content);
    // El contenido va después de la cabecera y fuera del botón, en su orden de lectura.
    const nodes = allNodes();
    expect(nodes.indexOf(text)).toBeGreaterThan(nodes.indexOf(button));
    expect(within(button).queryByText(content)).toBeNull();
  });

  it('asks to expand and to collapse, without changing on its own', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(
      <Disclosure header={header} expanded={false} onToggle={onToggle}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );

    await user.press(screen.getByRole('button', { name: header }));
    expect(onToggle).toHaveBeenLastCalledWith(true);
    // Es controlado: sigue contraído hasta que el padre cambie `expanded`.
    expect(screen.queryByText(content)).not.toBeOnTheScreen();

    await rerender(
      <Disclosure header={header} expanded onToggle={onToggle}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );
    await user.press(screen.getByRole('button', { name: header }));
    expect(onToggle).toHaveBeenLastCalledWith(false);
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it('expands and collapses when the parent keeps the state', async () => {
    await render(<Controlled />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: header }));
    expect(screen.getByText(content)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: header })).toBeExpanded();

    await user.press(screen.getByRole('button', { name: header }));
    expect(screen.queryByText(content)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: header })).toBeCollapsed();
  });

  it('can be opened by its parent from elsewhere on the screen', async () => {
    await render(<Controlled />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir desde fuera' }));

    expect(screen.getByRole('button', { name: header, expanded: true })).toBeOnTheScreen();
    expect(screen.getByText(content)).toBeOnTheScreen();
  });

  it('keeps several instances independent', async () => {
    function Two() {
      const [first, setFirst] = useState(false);
      const [second, setSecond] = useState(false);
      return (
        <View>
          <Disclosure header="Primero" expanded={first} onToggle={setFirst}>
            <ThemedText>Contenido del primero</ThemedText>
          </Disclosure>
          <Disclosure header="Segundo" expanded={second} onToggle={setSecond}>
            <ThemedText>Contenido del segundo</ThemedText>
          </Disclosure>
        </View>
      );
    }
    await render(<Two />);

    await userEvent.setup().press(screen.getByRole('button', { name: 'Segundo' }));

    expect(screen.getByRole('button', { name: 'Primero' })).toBeCollapsed();
    expect(screen.queryByText('Contenido del primero')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Segundo' })).toBeExpanded();
    expect(screen.getByText('Contenido del segundo')).toBeOnTheScreen();
  });

  // React Native convierte `aria-expanded` en el estado nativo; en la web llega tal cual al DOM.
  it('exposes the expanded state to assistive technologies', async () => {
    const { rerender } = await render(
      <Disclosure header={header} expanded={false} onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ expanded: false });

    await rerender(
      <Disclosure header={header} expanded onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );
    expect(screen.getByRole('button').props.accessibilityState).toMatchObject({ expanded: true });
    // Sin `aria-controls`: el contenido contraído no existe y no habría a qué apuntar.
    expect(screen.getByRole('button').props['aria-controls']).toBeUndefined();
  });

  it('shows a text header in bold callout text, with a decorative indicator', async () => {
    await render(
      <Disclosure header={header} expanded={false} onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );

    expect(screen.getByText(header)).toHaveStyle({ ...typography.callout, fontWeight: 600 });
    expect(chevron().props.accessible).toBe(false);
  });

  it('turns the indicator over while expanded', async () => {
    // El contenedor más cercano al icono es el último de sus ancestros en el recorrido.
    const rotation = () =>
      StyleSheet.flatten(
        allNodes()
          .filter((node) => node.queryAll(() => true).includes(chevron()))
          .at(-1)?.props.style,
      )?.transform;
    const { rerender } = await render(
      <Disclosure header={header} expanded={false} onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );
    expect(rotation()).toBeUndefined();

    await rerender(
      <Disclosure header={header} expanded onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );
    expect(rotation()).toEqual([{ rotate: '180deg' }]);
  });

  it('has a comfortable touch target', async () => {
    await render(
      <Disclosure header={header} expanded={false} onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );

    expect(screen.getByRole('button')).toHaveStyle({
      minHeight: layout.minTouchTarget,
      minWidth: layout.minTouchTarget,
    });
  });

  it('shows the focus ring only for keyboard focus', async () => {
    await render(
      <Disclosure header={header} expanded={false} onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );
    const button = screen.getByRole('button');

    // En la web el destino del evento responde a `:focus-visible` solo con el teclado.
    await fireEvent(button, 'focus', { target: { matches: () => false } });
    expect(button).not.toHaveStyle({ outlineWidth: 2 });

    await fireEvent(button, 'focus', { target: { matches: () => true } });
    expect(button).toHaveStyle({ outlineWidth: 2, outlineColor: palettes.light.focusRing });

    await fireEvent(button, 'blur');
    expect(button).not.toHaveStyle({ outlineWidth: 2 });
  });

  it('takes its name from a custom header and keeps controls out of it', async () => {
    const onPress = jest.fn();
    await render(
      <Card>
        <Disclosure
          header={
            <View>
              <ThemedText step="headline">Docker</ThemedText>
              <Badge tone="danger" label="No acreditado" />
            </View>
          }
          accessibilityLabel="Docker: no acreditado"
          expanded
          onToggle={jest.fn()}>
          <View role="list">
            <ThemedText role="listitem">Primera evidencia ficticia.</ThemedText>
            <ThemedText role="listitem">Segunda evidencia ficticia.</ThemedText>
          </View>
          <Button label="Editar la oferta" onPress={onPress} variant="secondary" />
        </Disclosure>
      </Card>,
    );

    const header = screen.getByRole('button', { name: 'Docker: no acreditado' });
    expect(header).toBeExpanded();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    // El botón del contenido no queda dentro de la cabecera, que también es un botón.
    const contentButton = screen.getByRole('button', { name: 'Editar la oferta' });
    expect(within(header).queryByRole('button', { name: 'Editar la oferta' })).toBeNull();
    await userEvent.setup().press(contentButton);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses the explicit name of a custom header that contains an icon', async () => {
    await render(
      <Disclosure
        header={
          <View>
            <Icon name="info" />
            <ThemedText>Información metodológica</ThemedText>
          </View>
        }
        accessibilityLabel="Abrir información metodológica"
        expanded={false}
        onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );

    const button = screen.getByRole('button', { name: 'Abrir información metodológica' });
    expect(button.props.accessibilityLabel).toBe('Abrir información metodológica');
    expect(within(button).queryByRole('img')).toBeNull();
  });
});

describe.each(['light', 'dark'] as const)('Disclosure in the %s theme', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it('uses the theme colors and adds no surface of its own', async () => {
    await render(
      <Disclosure header={header} expanded onToggle={jest.fn()}>
        <ThemedText>{content}</ThemedText>
      </Disclosure>,
    );

    expect(screen.getByText(header)).toHaveStyle({ color: palette.text });
    expect(chevron().props.tintColor).toBe(palette.textSecondary);
    // Sin fondo ni borde: encaja en una `Card` o en una lista sin duplicarlos.
    const styles = allNodes().map((node) => StyleSheet.flatten(node.props.style) ?? {});
    expect(styles.filter((style) => style.backgroundColor !== undefined)).toEqual([]);
    expect(styles.filter((style) => style.borderWidth !== undefined)).toEqual([]);
  });
});
