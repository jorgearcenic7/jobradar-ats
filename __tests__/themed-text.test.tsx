import { render, screen } from '@testing-library/react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes, typography } from '@/shared/theme';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

describe.each(['light', 'dark'] as const)('ThemedText in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue(scheme);
  });

  it('defaults to body text in the main text color', async () => {
    await render(<ThemedText>Body</ThemedText>);

    expect(screen.getByText('Body')).toHaveStyle({ ...typography.body, color: palette.text });
  });

  it('takes its step and color from the tokens', async () => {
    await render(
      <ThemedText step="footnote" color="textSecondary">
        Note
      </ThemedText>,
    );

    expect(screen.getByText('Note')).toHaveStyle({
      ...typography.footnote,
      color: palette.textSecondary,
    });
  });
});

describe('ThemedText', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it('applies the caller style last', async () => {
    await render(
      <ThemedText step="callout" style={{ fontWeight: 600, textAlign: 'center' }}>
        Name
      </ThemedText>,
    );

    expect(screen.getByText('Name')).toHaveStyle({
      fontSize: typography.callout.fontSize,
      fontWeight: 600,
      textAlign: 'center',
    });
  });

  it('passes the remaining props to the text', async () => {
    await render(
      <ThemedText selectable testID="text">
        Copyable
      </ThemedText>,
    );

    expect(screen.getByTestId('text').props.selectable).toBe(true);
  });
});

describe('Heading', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it.each([
    [2, 'heading'],
    [3, 'headline'],
  ] as const)('marks level %i as a header with its level, on the %s step', async (level, step) => {
    await render(<Heading level={level}>Section</Heading>);

    const heading = screen.getByRole('header', { name: 'Section' });
    expect(heading.props['aria-level']).toBe(level);
    expect(heading).toHaveStyle({
      fontSize: typography[step].fontSize,
      color: palettes.light.text,
    });
  });

  it('accepts the same color and style overrides as ThemedText', async () => {
    await render(
      <Heading level={3} color="accentText" style={{ textAlign: 'center' }}>
        Section
      </Heading>,
    );

    expect(screen.getByRole('header', { name: 'Section' })).toHaveStyle({
      color: palettes.light.accentText,
      textAlign: 'center',
    });
  });
});
