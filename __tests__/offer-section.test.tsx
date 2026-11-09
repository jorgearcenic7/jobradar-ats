import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import { OfferSection } from '@/features/cv-match/presentation/offer-section';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes, space, typography } from '@/shared/theme';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const chrome = space[3] * 2 + 2;

// Oferta ficticia de la longitud pedida, con líneas y saltos como una oferta pegada.
function longOffer(length: number) {
  const line = 'Requisitos\n- Experiencia ficticia con React y TypeScript.\n- Inglés B2.\n\n';
  return line.repeat(Math.ceil(length / line.length)).slice(0, length);
}

// Padre controlado, como `useCvMatch`: el texto vive fuera de la sección.
function Controlled({ initial = '', error }: { initial?: string; error?: string }) {
  const [value, setValue] = useState(initial);
  return <OfferSection value={value} onChange={setValue} error={error} fieldRef={null} />;
}

const field = () => screen.getByLabelText('Texto de la oferta');
const fieldStyle = () => StyleSheet.flatten(field().props.style);

describe('OfferSection', () => {
  const initialWindow = Dimensions.get('window');

  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
    Dimensions.set({ window: { ...initialWindow, height: 844, fontScale: 1 } });
  });

  afterAll(() => Dimensions.set({ window: initialWindow }));

  it('shows the heading, a labelled multiline field and its help', async () => {
    await render(<Controlled />);

    expect(screen.getByRole('header', { name: 'La oferta' }).props['aria-level']).toBe(2);
    expect(field().props.multiline).toBe(true);
    expect(
      screen.getByText('Pégala completa, sin recortar: los requisitos se leen de su texto.'),
    ).toBeOnTheScreen();
    expect(field().props.placeholder).toBe('Pega aquí la descripción completa del puesto…');
  });

  it('counts the characters from the start and offers no expansion while the offer is blank', async () => {
    await render(<Controlled />);
    expect(screen.getByText('0 caracteres')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ampliar el editor' })).not.toBeOnTheScreen();

    await fireEvent.changeText(field(), '   \n  ');
    expect(screen.queryByRole('button', { name: 'Ampliar el editor' })).not.toBeOnTheScreen();
  });

  it('updates the live count and offers the expansion once it has text', async () => {
    await render(<Controlled />);

    await fireEvent.changeText(field(), longOffer(3394));

    expect(screen.getByText('3.394 caracteres')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ampliar el editor' })).toBeOnTheScreen();
  });

  it('expands and reduces the editor without touching the text', async () => {
    const text = longOffer(50_000);
    await render(<Controlled initial={text} />);
    const user = userEvent.setup();
    expect(fieldStyle().maxHeight).toBe(12 * typography.body.lineHeight + chrome);

    await user.press(screen.getByRole('button', { name: 'Ampliar el editor' }));
    expect(fieldStyle().maxHeight).toBe(844 * 0.75);
    expect(field().props.value).toBe(text);

    await user.press(screen.getByRole('button', { name: 'Reducir el editor' }));
    expect(fieldStyle().maxHeight).toBe(12 * typography.body.lineHeight + chrome);
    expect(field().props.value).toBe(text);
    expect(field().props.maxLength).toBeUndefined();
  });

  it('keeps edits made while expanded', async () => {
    await render(<Controlled initial="Requisitos" />);
    const user = userEvent.setup();

    await user.press(screen.getByRole('button', { name: 'Ampliar el editor' }));
    await fireEvent.changeText(field(), 'Requisitos\n- Python ficticio.');
    await user.press(screen.getByRole('button', { name: 'Reducir el editor' }));

    expect(field().props.value).toBe('Requisitos\n- Python ficticio.');
  });

  it('returns to the regular size when the offer is emptied', async () => {
    await render(<Controlled initial="Requisitos" />);
    await userEvent.setup().press(screen.getByRole('button', { name: 'Ampliar el editor' }));

    await fireEvent.changeText(field(), '');

    expect(fieldStyle().maxHeight).toBe(12 * typography.body.lineHeight + chrome);
    expect(screen.queryByRole('button', { name: /el editor$/ })).not.toBeOnTheScreen();
  });

  it('shows a validation error next to the field and marks it invalid', async () => {
    await render(<Controlled error="Pega el texto de la oferta para analizarla." />);

    expect(screen.getByText('Pega el texto de la oferta para analizarla.')).toHaveStyle({
      color: palettes.light.danger,
    });
    expect(field().props['aria-invalid']).toBe(true);
    expect(fieldStyle().borderColor).toBe(palettes.light.danger);
  });

  it('keeps the expand button at the minimum touch target', async () => {
    await render(<Controlled initial="Requisitos" />);

    expect(screen.getByRole('button', { name: 'Ampliar el editor' })).toHaveStyle({
      minHeight: 44,
      minWidth: 44,
    });
  });
});

describe.each(['light', 'dark'] as const)('OfferSection in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it('uses the theme colors for the field and the character count', async () => {
    await render(<Controlled initial="Requisitos" />);

    expect(fieldStyle()).toMatchObject({
      backgroundColor: palette.surface,
      color: palette.text,
      borderColor: palette.inputBorder,
    });
    expect(screen.getByText('10 caracteres')).toHaveStyle({ color: palette.textTertiary });
  });
});
