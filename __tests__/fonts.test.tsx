import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '@/app/index';
import { ThemedText } from '@/components/themed-text';
import { DisplayFontContext, displayFontFamilies, displaySteps, typography } from '@/shared/theme';

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
  it.each(['title', 'subtitle'] as const)('sets the %s variant in Sora', async (type) => {
    await render(<ThemedText type={type}>Headline</ThemedText>, {
      wrapper: withDisplayFont(true),
    });

    expect(screen.getByText('Headline')).toHaveStyle({ fontFamily: 'Sora', fontWeight: 600 });
  });

  it.each(['default', 'small', 'smallBold', 'link', 'linkPrimary'] as const)(
    'keeps the %s variant on the system font',
    async (type) => {
      await render(<ThemedText type={type}>Body</ThemedText>, { wrapper: withDisplayFont(true) });

      expect(screen.getByText('Body')).not.toHaveStyle({ fontFamily: 'Sora' });
    },
  );

  it('sets the home screen title in Sora and its message in the system font', async () => {
    await render(<HomeScreen />, { wrapper: withDisplayFont(true) });

    expect(screen.getByRole('header', { name: 'JobRadar ATS' })).toHaveStyle({
      fontFamily: 'Sora',
    });
    expect(screen.getByText('Aplicación en construcción.')).not.toHaveStyle({
      fontFamily: 'Sora',
    });
  });
});

describe('ThemedText without Sora', () => {
  it.each(['title', 'subtitle'] as const)(
    'falls back to the system font for the %s variant',
    async (type) => {
      await render(<ThemedText type={type}>Headline</ThemedText>, {
        wrapper: withDisplayFont(false),
      });

      expect(screen.getByText('Headline')).not.toHaveStyle({ fontFamily: 'Sora' });
      expect(screen.getByText('Headline')).toHaveStyle({ fontWeight: 600 });
    },
  );
});
