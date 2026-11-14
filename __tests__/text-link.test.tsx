import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes } from '@/shared/theme';
import { TextButton, TextLink } from '@/shared/ui/text-link';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

describe.each(['light', 'dark'] as const)('text actions in the %s theme', (scheme) => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it('renders a link in the accessible accent with a 44 px target', async () => {
    await render(<TextLink href="/analisis" label="Continuar sin cuenta" />);

    const link = screen.getByRole('link', { name: 'Continuar sin cuenta' });
    expect(StyleSheet.flatten(link.props.style).minHeight).toBeGreaterThanOrEqual(44);
    // `primary` no llega a 4,5:1 sobre las superficies oscuras; `accentText` sí.
    expect(screen.getByText('Continuar sin cuenta')).toHaveStyle({
      color: palettes[scheme].accentText,
    });
  });

  it('runs a text button and leaves it inert while disabled', async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(
      <TextButton label="Reenviar confirmación" onPress={onPress} />,
    );

    await user.press(screen.getByRole('button', { name: 'Reenviar confirmación' }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<TextButton label="Reenviar confirmación" onPress={onPress} disabled />);
    expect(screen.getByRole('button', { name: 'Reenviar confirmación' })).toBeDisabled();
    expect(screen.getByText('Reenviar confirmación')).toHaveStyle({
      color: palettes[scheme].textSecondary,
    });
  });
});
