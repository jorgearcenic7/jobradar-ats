import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { layout, palettes, space, typography } from '@/shared/theme';
import { Button } from '@/shared/ui/button';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

function buttonStyle() {
  return StyleSheet.flatten(screen.getByRole('button').props.style);
}

describe('Button', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it('is a button named by its label', async () => {
    await render(<Button label="Save offer" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Save offer' })).toBeOnTheScreen();
    expect(screen.getByText('Save offer')).toHaveStyle(typography.headline);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save offer" onPress={onPress} />);

    // userEvent drives the real touch sequence through Pressable, as a person would.
    await userEvent.setup().press(screen.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the minimum touch target and lets the label grow without truncating it', async () => {
    await render(<Button label="Save offer" onPress={jest.fn()} />);

    expect(buttonStyle()).toMatchObject({
      minHeight: layout.minTouchTarget,
      minWidth: layout.minTouchTarget,
      paddingHorizontal: space[4],
    });
    expect(buttonStyle().height).toBeUndefined();
    expect(screen.getByText('Save offer').props.numberOfLines).toBeUndefined();
  });

  it('never grows wider than its container', async () => {
    await render(<Button label="Continue" icon="arrowForward" onPress={jest.fn()} />);

    expect(buttonStyle()).toMatchObject({ maxWidth: '100%' });
    expect(screen.getByText('Continue')).toHaveStyle({ minWidth: 0, flexShrink: 1 });
  });

  it('ignores presses and reports the state when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save offer" onPress={onPress} disabled />);

    // userEvent drives the real touch sequence through Pressable, as a person would.
    await userEvent.setup().press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save offer' })).toBeDisabled();
    // Neutral colors instead of a global opacity, so the label stays legible.
    expect(buttonStyle().opacity).toBeUndefined();
  });

  describe('while loading', () => {
    it('ignores presses and is announced as busy under the same name', async () => {
      const onPress = jest.fn();
      await render(<Button label="Save offer" onPress={onPress} loading />);

      // userEvent drives the real touch sequence through Pressable, as a person would.
      await userEvent.setup().press(screen.getByRole('button'));

      expect(onPress).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Save offer' })).toBeBusy();
    });

    it('stays enabled so keyboard and screen reader focus is not lost', async () => {
      await render(<Button label="Save offer" onPress={jest.fn()} loading />);

      expect(screen.getByRole('button')).toBeEnabled();
    });

    it('shows a centered spinner and keeps the hidden content in the layout', async () => {
      await render(<Button label="Save offer" onPress={jest.fn()} icon="checkCircle" loading />);

      const content = screen.getByText('Save offer', { includeHiddenElements: true }).parent!;
      expect(content).toHaveStyle({ opacity: 0 });
      expect(screen.getByRole('button').children).toHaveLength(2);
    });

    it('keeps the normal colors instead of looking disabled', async () => {
      await render(<Button label="Save offer" onPress={jest.fn()} loading />);

      expect(buttonStyle()).toMatchObject({ backgroundColor: palettes.light.primary });
      expect(buttonStyle().opacity).toBeUndefined();
    });
  });

  it('adds a decorative icon that does not change the accessible name', async () => {
    await render(<Button label="Continue" onPress={jest.fn()} icon="arrowForward" />);

    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
    expect(screen.queryByRole('img')).not.toBeOnTheScreen();
  });

  it('merges layout adjustments last without losing its colors', async () => {
    await render(
      <Button label="Save offer" onPress={jest.fn()} style={{ alignSelf: 'stretch' }} />,
    );

    expect(buttonStyle()).toMatchObject({
      alignSelf: 'stretch',
      backgroundColor: palettes.light.primary,
    });
  });
});

describe.each(['light', 'dark'] as const)('Button colors in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue(scheme);
  });

  it('draws the primary variant with brand colors', async () => {
    await render(<Button label="Analyze" onPress={jest.fn()} icon="checkCircle" />);

    expect(buttonStyle()).toMatchObject({
      backgroundColor: palette.primary,
      borderColor: palette.primary,
    });
    expect(screen.getByText('Analyze')).toHaveStyle({ color: palette.onPrimary });
  });

  it('draws the secondary variant on a surface with a control border', async () => {
    await render(<Button label="Cancel" onPress={jest.fn()} variant="secondary" />);

    expect(buttonStyle()).toMatchObject({
      backgroundColor: palette.surface,
      borderColor: palette.borderStrong,
    });
    expect(screen.getByText('Cancel')).toHaveStyle({ color: palette.text });
  });

  it.each(['primary', 'secondary'] as const)(
    'draws the disabled %s variant with neutral colors',
    async (variant) => {
      await render(
        <Button label="Unavailable" onPress={jest.fn()} variant={variant} icon="add" disabled />,
      );

      expect(buttonStyle()).toMatchObject({
        backgroundColor: palette.neutralSubtle,
        borderColor: palette.border,
      });
      expect(screen.getByText('Unavailable')).toHaveStyle({ color: palette.textSecondary });
    },
  );
});
