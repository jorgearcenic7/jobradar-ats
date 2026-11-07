import { palettes, type ThemeColor } from '@/shared/theme';

// WCAG 2.2 relative luminance and contrast ratio for #RRGGBB colors.
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

type Pair = [foreground: ThemeColor, background: ThemeColor];

// Text and icons that carry meaning: WCAG 1.4.3 requires 4.5:1.
const textPairs: Pair[] = [
  ['text', 'background'],
  ['text', 'surface'],
  ['text', 'surfaceRaised'],
  ['text', 'surfaceSelected'],
  ['textSecondary', 'background'],
  ['textSecondary', 'surface'],
  ['textTertiary', 'background'],
  ['textTertiary', 'surface'],
  ['accentText', 'background'],
  ['accentText', 'surface'],
  ['onPrimary', 'primary'],
  ['onPrimary', 'primaryPressed'],
  ['onAccentSubtle', 'accentSubtle'],
  ['success', 'successSubtle'],
  ['warning', 'warningSubtle'],
  ['danger', 'dangerSubtle'],
  ['neutral', 'neutralSubtle'],
  // Disabled buttons and text fields keep their text legible.
  ['textSecondary', 'neutralSubtle'],
  ['danger', 'background'],
  ['danger', 'surface'],
  // Título y mensaje de `Notice` sobre el fondo de cada tono.
  ['text', 'accentSubtle'],
  ['text', 'successSubtle'],
  ['text', 'warningSubtle'],
  ['text', 'dangerSubtle'],
];

// Boundaries of interactive controls and focus indicators: WCAG 1.4.11 requires 3:1.
const controlPairs: Pair[] = [
  ['primary', 'background'],
  ['primary', 'surface'],
  ['borderStrong', 'background'],
  ['borderStrong', 'surface'],
  // Border of a text field with an error.
  ['danger', 'background'],
  ['danger', 'surface'],
  ['focusRing', 'background'],
  ['focusRing', 'surface'],
];

// Purely decorative separators are exempt from 1.4.11 and must never be the only cue.
// The floor only guards against a border that disappears into its background.
const decorativePairs: Pair[] = [
  ['border', 'background'],
  ['border', 'surface'],
];

describe.each(['light', 'dark'] as const)('%s palette contrast', (scheme) => {
  const palette = palettes[scheme];

  it.each(textPairs)('text %s on %s meets 4.5:1', (foreground, background) => {
    expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(controlPairs)('control %s on %s meets 3:1', (foreground, background) => {
    expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(3);
  });

  it.each(decorativePairs)('decorative %s on %s stays visible', (foreground, background) => {
    expect(contrast(palette[foreground], palette[background])).toBeGreaterThanOrEqual(1.2);
  });
});

it('computes the WCAG reference ratio for black on white', () => {
  expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
});
