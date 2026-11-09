import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaProvider, type EdgeInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { layout, palettes, space } from '@/shared/theme';
import { Screen } from '@/shared/ui/screen';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };
// Portrait iPhone with a Dynamic Island and a home indicator.
const IPHONE_INSETS: EdgeInsets = { top: 59, right: 0, bottom: 34, left: 0 };

// Test harness only: the app relies on the provider that Expo Router already renders.
function withInsets(insets: EdgeInsets) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets }}>
        {children}
      </SafeAreaProvider>
    );
  };
}

// Screen's outermost host view; `screen.root` is the test harness provider.
function screenRoot() {
  const root = screen.root?.children[0];
  if (!root || typeof root === 'string') throw new Error('Screen rendered no host view');
  return root;
}

// Flattened style of the content area. Jest's ScrollView mock keeps it in
// `contentContainerStyle`; without scroll it is the view that wraps the children.
function contentStyle() {
  const root = screenRoot();
  return StyleSheet.flatten(
    root.type === 'RCTScrollView'
      ? root.props.contentContainerStyle
      : screen.getByText('Child').parent!.props.style,
  );
}

describe.each(['light', 'dark'] as const)('Screen in %s mode', (scheme) => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue(scheme);
  });

  it.each([true, false])(
    'fills the screen with the background color (scroll: %s)',
    async (scroll) => {
      await render(
        <Screen scroll={scroll}>
          <Text>Child</Text>
        </Screen>,
        { wrapper: withInsets(NO_INSETS) },
      );

      expect(screenRoot()).toHaveStyle({ flex: 1, backgroundColor: palettes[scheme].background });
    },
  );
});

describe('Screen', () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue('light');
  });

  it('adds the native safe areas to the app margins', async () => {
    await render(
      <Screen>
        <Text>Child</Text>
      </Screen>,
      { wrapper: withInsets(IPHONE_INSETS) },
    );

    expect(contentStyle()).toMatchObject({
      paddingTop: IPHONE_INSETS.top + space[4],
      paddingBottom: IPHONE_INSETS.bottom + space[6],
      paddingLeft: layout.screenPadding,
      paddingRight: layout.screenPadding,
    });
  });

  it('adds horizontal safe areas too, for landscape notches', async () => {
    await render(
      <Screen>
        <Text>Child</Text>
      </Screen>,
      { wrapper: withInsets({ top: 0, right: 59, bottom: 21, left: 59 }) },
    );

    expect(contentStyle()).toMatchObject({
      paddingLeft: 59 + layout.screenPadding,
      paddingRight: 59 + layout.screenPadding,
    });
  });

  it('keeps the content within the maximum width, centered and growing to fill the height', async () => {
    await render(
      <Screen>
        <Text>Child</Text>
      </Screen>,
      { wrapper: withInsets(NO_INSETS) },
    );

    expect(contentStyle()).toMatchObject({
      flexGrow: 1,
      width: '100%',
      maxWidth: layout.maxContentWidth,
      alignSelf: 'center',
      gap: space[4],
    });
  });

  it('scrolls by default, without system insets and keeping taps while the keyboard is open', async () => {
    await render(
      <Screen>
        <Text>Child</Text>
      </Screen>,
      { wrapper: withInsets(NO_INSETS) },
    );

    expect(screenRoot().props).toMatchObject({
      contentInsetAdjustmentBehavior: 'never',
      automaticallyAdjustKeyboardInsets: true,
      keyboardShouldPersistTaps: 'handled',
    });
  });

  it('renders without a scroll container when scroll is disabled', async () => {
    await render(
      <Screen scroll={false}>
        <Text>Child</Text>
      </Screen>,
      { wrapper: withInsets(IPHONE_INSETS) },
    );

    expect(screenRoot().type).toBe('View');
    expect(contentStyle()).toMatchObject({
      flex: 1,
      paddingTop: IPHONE_INSETS.top + space[4],
      maxWidth: layout.maxContentWidth,
    });
  });

  it('merges layout adjustments last', async () => {
    await render(
      <Screen style={{ justifyContent: 'center', gap: space[6] }}>
        <Text>Child</Text>
      </Screen>,
      { wrapper: withInsets(NO_INSETS) },
    );

    expect(contentStyle()).toMatchObject({ justifyContent: 'center', gap: space[6] });
  });

  it('keeps every child reachable when content is long', async () => {
    const sections = Array.from({ length: 30 }, (_, index) => `Section ${index + 1}`);

    await render(
      <Screen>
        <Text accessibilityRole="header">Child</Text>
        {sections.map((section) => (
          <Text key={section}>{section}</Text>
        ))}
      </Screen>,
      { wrapper: withInsets(IPHONE_INSETS) },
    );

    expect(screen.getByRole('header', { name: 'Child' })).toBeOnTheScreen();
    expect(screen.getByText('Section 30')).toBeOnTheScreen();
  });
});
