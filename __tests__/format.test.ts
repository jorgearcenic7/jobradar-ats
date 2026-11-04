import { formatCount } from '@/shared/format';

// Recuentos de caracteres tal como los muestra la interfaz.

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1000, '1.000'],
    [2450, '2.450'],
    [10_000, '10.000'],
    [123_456, '123.456'],
    [1_234_567, '1.234.567'],
  ])('formatea %d como «%s»', (count, expected) => {
    expect(formatCount(count)).toBe(expected);
  });

  it('agrupa también las cifras de cuatro dígitos, a diferencia de Intl en español', () => {
    expect(formatCount(2450)).toBe('2.450');
  });
});
