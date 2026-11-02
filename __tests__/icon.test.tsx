import { render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { iconSize, palettes } from '@/shared/theme';
import { Icon, iconSymbols, type IconName } from '@/shared/ui/icon';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

// Jest runs as iOS, where SymbolView renders its native view with these props.
function renderedSymbol() {
  const symbol = screen.root;
  if (!symbol) throw new Error('Icon rendered nothing');
  return symbol;
}

describe('icon catalog', () => {
  it.each(Object.entries(iconSymbols))('maps %s on every platform', (_, symbols) => {
    expect(symbols.ios).toEqual(expect.any(String));
    expect(symbols.android).toEqual(expect.any(String));
    // Android and web both draw Material Symbols, so they share a name.
    expect(symbols.web).toBe(symbols.android);
  });
});

describe('Icon', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it.each(Object.keys(iconSymbols) as IconName[])('renders the iOS symbol for %s', async (name) => {
    await render(<Icon name={name} />);

    expect(renderedSymbol().props.name).toBe(iconSymbols[name].ios);
  });

  it.each(Object.entries(iconSize))('uses the %s size token', async (size, pixels) => {
    await render(<Icon name="info" size={size as keyof typeof iconSize} />);

    expect(renderedSymbol()).toHaveStyle({ width: pixels, height: pixels });
  });

  it('defaults to the medium size', async () => {
    await render(<Icon name="info" />);

    expect(renderedSymbol()).toHaveStyle({ width: iconSize.md, height: iconSize.md });
  });

  it('is decorative and hidden from assistive technologies without a label', async () => {
    await render(<Icon name="arrowForward" />);

    // On native, `aria-hidden` becomes these two props; the web attribute is checked in the browser.
    expect(renderedSymbol().props).toMatchObject({
      accessible: false,
      importantForAccessibility: 'no-hide-descendants',
      accessibilityElementsHidden: true,
    });
    expect(screen.queryByRole('img')).not.toBeOnTheScreen();
  });

  it('is an informative image with an accessible name when labelled', async () => {
    await render(<Icon name="warning" color="warning" label="Missing requirement" />);

    expect(screen.getByRole('img', { name: 'Missing requirement' })).toBeOnTheScreen();
    expect(renderedSymbol().props['aria-hidden']).toBeUndefined();
  });

  it('does not hide the content next to a decorative icon', async () => {
    await render(
      <View>
        <Icon name="checkCircle" />
        <Text>Requirement met</Text>
      </View>,
    );

    expect(screen.getByText('Requirement met')).toBeOnTheScreen();
  });
});

describe.each(['light', 'dark'] as const)('Icon colors in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue(scheme);
  });

  it('defaults to the text color', async () => {
    await render(<Icon name="info" />);

    expect(renderedSymbol().props.tintColor).toBe(palette.text);
  });

  it.each(['success', 'warning', 'danger', 'accentText'] as const)(
    'uses the %s semantic color',
    async (color) => {
      await render(<Icon name="info" color={color} />);

      expect(renderedSymbol().props.tintColor).toBe(palette[color]);
    },
  );
});
