import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from '@/app/index';
import { AppFontContext, appFontFamilies, typography } from '@/shared/theme';
import * as webFonts from '@/shared/theme/font-files.web';
import { Button } from '@/shared/ui/button';
import { TextField } from '@/shared/ui/text-field';
import { Heading, ThemedText } from '@/shared/ui/themed-text';

// Jest corre como iOS y no transforma WOFF2: la variante web solo necesita un identificador de recurso.
jest.mock('../assets/fonts/Inter-Regular.woff2', () => 1);
jest.mock('../assets/fonts/Inter-Medium.woff2', () => 2);
jest.mock('../assets/fonts/Inter-SemiBold.woff2', () => 3);
jest.mock('../assets/fonts/Inter-Bold.woff2', () => 4);

// The safe area provider is a test harness only: in the app, Expo Router renders it.
function withAppFont(available: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}>
        <AppFontContext value={available}>{children}</AppFontContext>
      </SafeAreaProvider>
    );
  };
}

const steps = Object.keys(typography) as (keyof typeof typography)[];

// Archivo de Inter que corresponde a cada peso de la escala.
const familyFor: Record<number, string> = {
  400: 'Inter-Regular',
  500: 'Inter-Medium',
  600: 'Inter-SemiBold',
  700: 'Inter-Bold',
};

describe('Inter on iOS and Android', () => {
  it('registers one family per weight, each with its own file and no declared weight', () => {
    expect(appFontFamilies.map(({ fontFamily }) => fontFamily)).toEqual(Object.values(familyFor));
    for (const family of appFontFamilies) {
      expect(family.fontDefinitions).toHaveLength(1);
      expect(family.fontDefinitions[0].weight).toBeUndefined();
    }
  });

  it('never goes below 12 px in the type scale', () => {
    for (const step of steps) {
      expect(typography[step].fontSize).toBeGreaterThanOrEqual(12);
    }
  });
});

describe('Inter on the web', () => {
  it('registers a single family with the four weights', () => {
    expect(webFonts.appFontFamilies).toHaveLength(1);
    expect(webFonts.appFontFamilies[0].fontFamily).toBe('Inter');
    expect(webFonts.appFontFamilies[0].fontDefinitions.map(({ weight }) => weight)).toEqual([
      400, 500, 600, 700,
    ]);
  });

  it('keeps fontWeight and the system fallbacks in the style', () => {
    expect(webFonts.interStyle(600)).toEqual({
      fontFamily: `Inter, -apple-system, 'Segoe UI', system-ui, sans-serif`,
      fontWeight: 600,
    });
  });
});

describe('Text with Inter available', () => {
  it.each(steps)('sets the %s step in the file of its weight', async (step) => {
    await render(<ThemedText step={step}>Texto</ThemedText>, { wrapper: withAppFont(true) });

    expect(screen.getByText('Texto')).toHaveStyle({
      fontFamily: familyFor[typography[step].fontWeight],
      // El archivo ya tiene el peso: ninguna plataforma debe sintetizar una negrita encima.
      fontWeight: 'normal',
    });
  });

  it('follows a weight set by the caller, rounding down to the closest file', async () => {
    await render(
      <>
        <ThemedText style={{ fontWeight: 600 }}>Seis</ThemedText>
        <ThemedText style={{ fontWeight: 'bold' }}>Negrita</ThemedText>
        <ThemedText style={{ fontWeight: 800 }}>Extra</ThemedText>
        <ThemedText style={{ fontWeight: 300 }}>Ligero</ThemedText>
      </>,
      { wrapper: withAppFont(true) },
    );

    expect(screen.getByText('Seis')).toHaveStyle({ fontFamily: 'Inter-SemiBold' });
    expect(screen.getByText('Negrita')).toHaveStyle({ fontFamily: 'Inter-Bold' });
    expect(screen.getByText('Extra')).toHaveStyle({ fontFamily: 'Inter-Bold' });
    expect(screen.getByText('Ligero')).toHaveStyle({ fontFamily: 'Inter-Regular' });
  });

  it('sets nested text by its own weight', async () => {
    await render(
      <ThemedText step="callout">
        Pide <ThemedText style={{ fontWeight: 600 }}>React</ThemedText>
      </ThemedText>,
      { wrapper: withAppFont(true) },
    );

    expect(screen.getByText('React')).toHaveStyle({ fontFamily: 'Inter-SemiBold' });
  });

  it('sets headings in their weight', async () => {
    await render(
      <>
        <Heading level={2}>Results</Heading>
        <Heading level={3}>Group</Heading>
      </>,
      { wrapper: withAppFont(true) },
    );

    expect(screen.getByText('Results')).toHaveStyle({ fontFamily: 'Inter-SemiBold' });
    expect(screen.getByText('Group')).toHaveStyle({ fontFamily: 'Inter-SemiBold' });
  });

  it('sets button labels and text fields in their weights', async () => {
    await render(
      <>
        <Button label="Analizar" onPress={jest.fn()} />
        <TextField label="Oferta" value="" onChangeText={jest.fn()} helperText="Pégala entera." />
      </>,
      { wrapper: withAppFont(true) },
    );

    expect(screen.getByText('Analizar')).toHaveStyle({ fontFamily: 'Inter-SemiBold' });
    expect(screen.getByText('Oferta')).toHaveStyle({ fontFamily: 'Inter-Medium' });
    expect(screen.getByLabelText('Oferta')).toHaveStyle({
      fontFamily: 'Inter-Regular',
      fontWeight: 'normal',
    });
    expect(screen.getByText('Pégala entera.')).toHaveStyle({ fontFamily: 'Inter-Regular' });
  });

  it('sets the home screen title and message in Inter', async () => {
    await render(<HomeScreen />, { wrapper: withAppFont(true) });

    expect(screen.getByRole('header', { name: 'Comprueba qué respalda tu CV' })).toHaveStyle({
      fontFamily: 'Inter-Bold',
    });
    expect(screen.getByText(/^Compara tu CV con una oferta/)).toHaveStyle({
      fontFamily: 'Inter-Regular',
    });
  });
});

describe('Text without Inter', () => {
  it.each(['display', 'title', 'body'] as const)(
    'falls back to the system font for the %s step, keeping its weight',
    async (step) => {
      await render(<ThemedText step={step}>Texto</ThemedText>, {
        wrapper: withAppFont(false),
      });

      expect(screen.getByText('Texto')).not.toHaveStyle({
        fontFamily: familyFor[typography[step].fontWeight],
      });
      expect(screen.getByText('Texto')).toHaveStyle({ fontWeight: typography[step].fontWeight });
    },
  );
});
