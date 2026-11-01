import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes, radius, space } from '@/shared/theme';
import { Card } from '@/shared/ui/card';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

describe.each(['light', 'dark'] as const)('Card in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue(scheme);
  });

  it('draws a surface with a decorative border, token radius and padding', async () => {
    await render(
      <Card testID="card">
        <Text>Content</Text>
      </Card>,
    );

    expect(screen.getByTestId('card')).toHaveStyle({
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: space[4],
      gap: space[2],
    });
  });
});

describe('Card', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it('lets callers adjust layout without losing its surface', async () => {
    await render(<Card testID="card" style={{ marginTop: space[6], flex: 1 }} />);

    expect(screen.getByTestId('card')).toHaveStyle({
      marginTop: space[6],
      flex: 1,
      backgroundColor: palettes.light.surface,
    });
  });

  it('keeps each child reachable by assistive technologies', async () => {
    await render(
      <Card testID="card">
        <Text accessibilityRole="header">Frontend developer</Text>
        <Text>Acme, Madrid</Text>
      </Card>,
    );

    expect(screen.getByTestId('card').props.accessible).toBeUndefined();
    expect(screen.getByRole('header', { name: 'Frontend developer' })).toBeOnTheScreen();
    expect(screen.getByText('Acme, Madrid')).toBeOnTheScreen();
  });

  it('passes accessibility props through', async () => {
    await render(
      <Card testID="card" accessibilityLabel="Job posting summary" accessibilityRole="summary" />,
    );

    expect(screen.getByTestId('card').props).toMatchObject({
      accessibilityLabel: 'Job posting summary',
      accessibilityRole: 'summary',
    });
  });

  it('renders long content in full, without truncating it', async () => {
    const paragraphs = Array.from(
      { length: 40 },
      (_, index) =>
        `Requirement ${index + 1}: ${'experience with accessible interfaces '.repeat(6)}`,
    );

    await render(
      <Card>
        {paragraphs.map((paragraph) => (
          <Text key={paragraph}>{paragraph}</Text>
        ))}
      </Card>,
    );

    for (const paragraph of paragraphs) {
      expect(screen.getByText(paragraph).props.numberOfLines).toBeUndefined();
    }
  });
});
