import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '@/app/index';
import { DisplayFontContext, displayFontFamilies, displaySteps, typography } from '@/shared/theme';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

// The safe area provider is a test harness only: in the app, Expo Router renders it.
function withDisplayFont(available: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}>
        <DisplayFontContext value={available}>{children}</DisplayFontContext>
      </SafeAreaProvider>
    );
  };
}

describe('Sora font family', () => {
  it('loads exactly the SemiBold (600) and Bold (700) faces', () => {
    expect(displayFontFamilies).toHaveLength(1);
    expect(displayFontFamilies[0].fontFamily).toBe('Sora');
    expect(displayFontFamilies[0].fontDefinitions.map(({ weight }) => weight)).toEqual([600, 700]);
  });

  it('uses weight 600 for headlines and 700 for figures', () => {
    expect(displaySteps).toEqual(['display', 'metric', 'title', 'heading']);
    for (const step of displaySteps) {
      expect(typography[step].fontWeight).toBe(step === 'metric' ? 700 : 600);
    }
  });
});

describe('ThemedText with Sora available', () => {
  it.each(['display', 'title', 'heading'] as const)('sets the %s step in Sora', async (step) => {
    await render(<ThemedText step={step}>Headline</ThemedText>, {
      wrapper: withDisplayFont(true),
    });

    expect(screen.getByText('Headline')).toHaveStyle({ fontFamily: 'Sora', fontWeight: 600 });
  });

  it('sets figures in Sora Bold', async () => {
    await render(<ThemedText step="metric">50 %</ThemedText>, { wrapper: withDisplayFont(true) });

    expect(screen.getByText('50 %')).toHaveStyle({ fontFamily: 'Sora', fontWeight: 700 });
  });

  it.each(['headline', 'body', 'callout', 'footnote', 'caption'] as const)(
    'keeps the %s step on the system font',
    async (step) => {
      await render(<ThemedText step={step}>Body</ThemedText>, { wrapper: withDisplayFont(true) });

      expect(screen.getByText('Body')).not.toHaveStyle({ fontFamily: 'Sora' });
    },
  );

  it('sets second-level headings in Sora and third-level ones in the system font', async () => {
    await render(
      <>
        <Heading level={2}>Results</Heading>
        <Heading level={3}>Group</Heading>
      </>,
      { wrapper: withDisplayFont(true) },
    );

    expect(screen.getByText('Results')).toHaveStyle({ fontFamily: 'Sora' });
    expect(screen.getByText('Group')).not.toHaveStyle({ fontFamily: 'Sora' });
  });

  it('sets the home screen title in Sora and its message in the system font', async () => {
    await render(<HomeScreen />, { wrapper: withDisplayFont(true) });

    expect(
      screen.getByRole('header', { name: 'Comprueba qué respalda tu CV antes de enviarlo' }),
    ).toHaveStyle({
      fontFamily: 'Sora',
    });
    expect(
      screen.getByText(
        'Compara tu CV con una oferta, requisito a requisito, y descubre qué pruebas le faltan.',
      ),
    ).not.toHaveStyle({
      fontFamily: 'Sora',
    });
  });
});

describe('ThemedText without Sora', () => {
  it.each(['display', 'title', 'heading'] as const)(
    'falls back to the system font for the %s step',
    async (step) => {
      await render(<ThemedText step={step}>Headline</ThemedText>, {
        wrapper: withDisplayFont(false),
      });

      expect(screen.getByText('Headline')).not.toHaveStyle({ fontFamily: 'Sora' });
      expect(screen.getByText('Headline')).toHaveStyle({ fontWeight: 600 });
    },
  );
});
