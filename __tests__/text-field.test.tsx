import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { createRef, useState } from 'react';
import { StyleSheet, type TextInputInstance } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { layout, palettes, typography } from '@/shared/theme';
import { TextField, type TextFieldProps } from '@/shared/ui/text-field';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

function Field(props: Partial<TextFieldProps>) {
  return <TextField label="Job title" value="" onChangeText={jest.fn()} {...props} />;
}

function input() {
  return screen.getByLabelText('Job title');
}

function inputStyle() {
  return StyleSheet.flatten(input().props.style);
}

// Everything that places the text inside the field: focus must not change any of it.
function textLayout() {
  const { borderWidth, padding, paddingVertical, paddingHorizontal } = inputStyle();
  return { borderWidth, padding, paddingVertical, paddingHorizontal };
}

describe('TextField', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it('is named by its visible label, which stays readable on its own', async () => {
    await render(<Field />);

    const label = screen.getByText('Job title');
    expect(label).toBeOnTheScreen();
    expect(label).toHaveStyle(typography.headline);
    expect(input().props.accessibilityLabel).toBe('Job title');
    // Android and web resolve the name from the visible label through its id.
    expect(input().props['aria-labelledby']).toBe(label.props.nativeID);
  });

  it('shows the value it receives and reports every edit', async () => {
    function Controlled() {
      const [value, setValue] = useState('');
      return <TextField label="Job title" value={value} onChangeText={setValue} />;
    }
    await render(<Controlled />);

    await userEvent.setup().type(input(), 'Frontend developer');

    expect(input()).toHaveDisplayValue('Frontend developer');
  });

  it('keeps the minimum touch target and grows with the text size', async () => {
    await render(<Field />);

    expect(inputStyle()).toMatchObject({
      minHeight: layout.minTouchTarget,
      fontSize: typography.body.fontSize,
    });
    expect(inputStyle().height).toBeUndefined();
    expect(input().props.multiline).toBeFalsy();
    expect(screen.getByText('Job title').props.numberOfLines).toBeUndefined();
  });

  it('marks focus with the border without moving the text', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    await render(<Field onFocus={onFocus} onBlur={onBlur} />);
    const resting = textLayout();
    expect(inputStyle().boxShadow).toBeUndefined();

    await fireEvent(input(), 'focus');

    // The inner shadow adds a second pixel of border without taking layout space. The
    // transparent outline only shows when high contrast modes recolor it.
    expect(inputStyle()).toMatchObject({
      borderColor: palettes.light.primary,
      boxShadow: `inset 0 0 0 1px ${palettes.light.primary}`,
      outlineStyle: 'solid',
      outlineWidth: 2,
      outlineColor: 'transparent',
    });
    expect(textLayout()).toEqual(resting);
    expect(onFocus).toHaveBeenCalledTimes(1);

    await fireEvent(input(), 'blur');

    expect(inputStyle().borderColor).toBe(palettes.light.borderStrong);
    expect(inputStyle().boxShadow).toBeUndefined();
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  it('links the helper text to the field and shows it below in a legible size', async () => {
    await render(<Field helperText="As it appears in the offer." />);

    const helper = screen.getByText('As it appears in the offer.');
    expect(helper).toHaveStyle(typography.callout);
    expect(input().props['aria-describedby']).toBe(helper.props.nativeID);
    expect(input().props.accessibilityHint).toBe('As it appears in the offer.');
    expect(input().props['aria-invalid']).toBeUndefined();
  });

  describe('with an error', () => {
    it('marks the field as invalid and links the messages in the order they are shown', async () => {
      await render(<Field helperText="As it appears in the offer." error="Enter the job title." />);

      const helper = screen.getByText('As it appears in the offer.');
      const error = screen.getByText('Enter the job title.');
      expect(input().props['aria-invalid']).toBe(true);
      expect(input().props['aria-describedby']).toBe(
        `${error.props.nativeID} ${helper.props.nativeID}`,
      );
      // iOS and Android: the hint reads the error first.
      expect(input().props.accessibilityHint).toBe(
        'Error: Enter the job title. As it appears in the offer.',
      );
    });

    it('shows the label above the input, then the error right below it and the helper text last', async () => {
      await render(<Field helperText="As it appears in the offer." error="Enter the job title." />);

      const field = screen.getByText('Job title').parent!;
      const block = input().parent!;
      expect(field.children).toEqual([screen.getByText('Job title'), block]);
      const [first, region, last] = block.children;
      expect(first).toBe(input());
      expect(region).toContainElement(screen.getByText('Enter the job title.'));
      expect(last).toBe(screen.getByText('As it appears in the offer.'));
    });

    it('shows a selectable message with a decorative icon and a danger border', async () => {
      await render(<Field error="Enter the job title." />);

      const error = screen.getByText('Enter the job title.');
      expect(error).toHaveStyle({ ...typography.callout, color: palettes.light.danger });
      expect(error.props.selectable).toBe(true);
      expect(screen.queryByRole('img')).not.toBeOnTheScreen();
      expect(inputStyle()).toMatchObject({ borderWidth: 1, borderColor: palettes.light.danger });
      expect(inputStyle().boxShadow).toBeUndefined();
    });

    it('keeps the danger border while focused', async () => {
      await render(<Field error="Enter the job title." />);

      await fireEvent(input(), 'focus');

      expect(inputStyle()).toMatchObject({
        borderColor: palettes.light.danger,
        boxShadow: `inset 0 0 0 1px ${palettes.light.danger}`,
      });
    });

    it('announces a new message through a live region that is already mounted', async () => {
      await render(<Field />);
      const [region] = screen.root!.queryAll((node) => node.props['aria-live'] === 'polite');
      expect(region).toBeDefined();
      expect(region.children).toHaveLength(0);

      await screen.rerender(<Field error="Enter the job title." />);

      expect(screen.getByText('Enter the job title.')).toBeOnTheScreen();
      const [updated] = screen.root!.queryAll((node) => node.props['aria-live'] === 'polite');
      expect(updated).toBe(region);
      expect(updated.children).toHaveLength(1);
    });
  });

  it('describes nothing when there is no helper text or error', async () => {
    await render(<Field />);

    expect(input().props['aria-describedby']).toBeUndefined();
    expect(input().props.accessibilityHint).toBeUndefined();
  });

  it('cannot be edited or focused when disabled, and stays legible', async () => {
    await render(<Field value="Designer" disabled />);

    expect(input()).toBeDisabled();
    expect(input().props.editable).toBe(false);
    expect(input().props.focusable).toBe(false);
    expect(inputStyle()).toMatchObject({
      backgroundColor: palettes.light.neutralSubtle,
      borderColor: palettes.light.border,
      color: palettes.light.textSecondary,
    });

    await fireEvent(input(), 'focus');

    expect(inputStyle()).toMatchObject({ borderWidth: 1, borderColor: palettes.light.border });
    expect(inputStyle().boxShadow).toBeUndefined();
  });

  it('passes the keyboard settings to the input', async () => {
    const onSubmitEditing = jest.fn();
    await render(
      <Field
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect={false}
        enterKeyHint="next"
        submitBehavior="submit"
        onSubmitEditing={onSubmitEditing}
      />,
    );

    expect(input().props).toMatchObject({
      inputMode: 'email',
      autoComplete: 'email',
      autoCapitalize: 'none',
      autoCorrect: false,
      enterKeyHint: 'next',
      submitBehavior: 'submit',
    });

    await fireEvent(input(), 'submitEditing');

    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  });

  it('exposes the input so screens can move focus to it', async () => {
    const ref = createRef<TextInputInstance>();
    await render(<Field ref={ref} />);

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current!.focus).toBe('function');
    await act(async () => ref.current!.focus());
  });

  it('focuses the input when its label is pressed', async () => {
    const ref = createRef<TextInputInstance>();
    await render(<Field ref={ref} />);
    // React Native's Jest mock shares `focus` between inputs, so earlier calls are cleared.
    const focus = jest.spyOn(ref.current!, 'focus');
    focus.mockClear();

    await userEvent.setup().press(screen.getByText('Job title'));

    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('does not focus a disabled input from its label', async () => {
    await render(<Field disabled />);

    expect(screen.getByText('Job title').props.onPress).toBeUndefined();
  });

  it('merges layout adjustments on the whole field', async () => {
    await render(<Field style={{ marginTop: 8 }} />);

    const field = screen.getByText('Job title').parent!;
    expect(StyleSheet.flatten(field.props.style)).toMatchObject({ marginTop: 8 });
  });
});

describe.each(['light', 'dark'] as const)('TextField colors in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue(scheme);
  });

  it('draws the resting field on a surface with a control border', async () => {
    await render(<Field value="Designer" helperText="Optional." />);

    expect(inputStyle()).toMatchObject({
      backgroundColor: palette.surface,
      borderColor: palette.borderStrong,
      color: palette.text,
    });
    expect(input().props.selectionColor).toBe(palette.primary);
    expect(screen.getByText('Job title')).toHaveStyle({ color: palette.text });
    expect(screen.getByText('Optional.')).toHaveStyle({ color: palette.textSecondary });
  });

  it('draws the error message and border in the danger color', async () => {
    await render(<Field error="Enter the job title." />);

    expect(inputStyle()).toMatchObject({ borderColor: palette.danger });
    expect(screen.getByText('Enter the job title.')).toHaveStyle({ color: palette.danger });
  });
});
