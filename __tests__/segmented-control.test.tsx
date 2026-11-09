import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { layout, palettes } from '@/shared/theme';
import { SegmentedControl, type SegmentedOption } from '@/shared/ui/segmented-control';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

type Mode = 'file' | 'paste' | 'example';

const options: readonly SegmentedOption<Mode>[] = [
  { value: 'file', label: 'Archivo', icon: 'uploadFile' },
  { value: 'paste', label: 'Pegar texto', icon: 'contentPaste' },
  { value: 'example', label: 'Ejemplo' },
];

// Padre controlado mínimo: guarda el valor como lo haría una pantalla.
function Controlled({ onChange }: { onChange?: (value: Mode) => void }) {
  const [value, setValue] = useState<Mode>('file');
  return (
    <SegmentedControl
      accessibilityLabel="Cómo quieres añadir tu CV"
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

// Simula una tecla tal como la entrega React Native Web a `onKeyDown`.
async function pressKey(name: string, key: string) {
  const preventDefault = jest.fn();
  await fireEvent(screen.getByRole('radio', { name }), 'keyDown', { key, preventDefault });
  return preventDefault;
}

/*
El contenedor no es un elemento accesible por sí mismo (eso agruparía las opciones en iOS), así
que las consultas por rol no lo devuelven: se busca por su propiedad `role`.
*/
function radioGroup() {
  const root = screen.root!;
  return [root, ...root.queryAll(() => true)].find((node) => node.props.role === 'radiogroup');
}

describe('SegmentedControl', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('is a named radio group with one checked option', async () => {
    await render(<Controlled />);

    expect(radioGroup()?.props['aria-label']).toBe('Cómo quieres añadir tu CV');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'Archivo' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pegar texto' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ejemplo' })).not.toBeChecked();
  });

  it('asks the parent to select the pressed option', async () => {
    const onChange = jest.fn();
    await render(<Controlled onChange={onChange} />);

    await userEvent.setup().press(screen.getByRole('radio', { name: 'Pegar texto' }));

    expect(onChange).toHaveBeenCalledWith('paste');
    expect(screen.getByRole('radio', { name: 'Pegar texto' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Archivo' })).not.toBeChecked();
  });

  it('is controlled: without a new value from the parent nothing changes', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        accessibilityLabel="Modo"
        options={options}
        value="file"
        onChange={onChange}
      />,
    );

    await userEvent.setup().press(screen.getByRole('radio', { name: 'Ejemplo' }));

    expect(onChange).toHaveBeenCalledWith('example');
    expect(screen.getByRole('radio', { name: 'Archivo' })).toBeChecked();
  });

  it('moves the selection with the arrow keys, wrapping at the ends', async () => {
    const onChange = jest.fn();
    await render(<Controlled onChange={onChange} />);

    expect(await pressKey('Archivo', 'ArrowRight')).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith('paste');
    expect(screen.getByRole('radio', { name: 'Pegar texto' })).toBeChecked();

    await pressKey('Pegar texto', 'ArrowDown');
    expect(onChange).toHaveBeenLastCalledWith('example');

    await pressKey('Ejemplo', 'ArrowRight');
    expect(onChange).toHaveBeenLastCalledWith('file');

    await pressKey('Archivo', 'ArrowLeft');
    expect(onChange).toHaveBeenLastCalledWith('example');

    await pressKey('Ejemplo', 'ArrowUp');
    expect(onChange).toHaveBeenLastCalledWith('paste');
  });

  it('jumps to the first and last options with Home and End', async () => {
    const onChange = jest.fn();
    await render(<Controlled onChange={onChange} />);

    await pressKey('Archivo', 'End');
    expect(onChange).toHaveBeenLastCalledWith('example');
    await pressKey('Ejemplo', 'Home');
    expect(onChange).toHaveBeenLastCalledWith('file');
  });

  it('leaves other keys to the browser', async () => {
    const onChange = jest.fn();
    await render(<Controlled onChange={onChange} />);

    const preventDefault = await pressKey('Archivo', 'Tab');

    expect(preventDefault).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('gives every option the minimum touch target and lets labels wrap', async () => {
    await render(<Controlled />);

    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveStyle({
        minHeight: layout.minTouchTarget,
        minWidth: layout.minTouchTarget,
        flex: 1,
      });
    }
    expect(screen.getByText('Pegar texto')).toHaveStyle({ flexShrink: 1 });
  });
});

describe.each(['light', 'dark'] as const)('SegmentedControl in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it('marks the active option with surface, primary border and main text color', async () => {
    await render(<Controlled />);

    expect(radioGroup()).toHaveStyle({ backgroundColor: palette.neutralSubtle });
    expect(screen.getByRole('radio', { name: 'Archivo' })).toHaveStyle({
      backgroundColor: palette.surface,
      borderColor: palette.primary,
    });
    expect(screen.getByText('Archivo')).toHaveStyle({ color: palette.text, fontWeight: 600 });
  });

  it('keeps the other options on the group background, in the secondary text color', async () => {
    await render(<Controlled />);

    const inactive = screen.getByRole('radio', { name: 'Pegar texto' });
    expect(inactive).toHaveStyle({ borderColor: 'transparent' });
    expect(inactive).not.toHaveStyle({ backgroundColor: palette.surface });
    expect(screen.getByText('Pegar texto')).toHaveStyle({ color: palette.textSecondary });
  });
});
