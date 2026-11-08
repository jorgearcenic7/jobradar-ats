import { render, screen, userEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FileCard, type FileCardProps } from '@/features/cv-import/presentation/file-card';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { palettes } from '@/shared/theme';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: jest.fn() }));

const mockedUseColorScheme = jest.mocked(useColorScheme);

const imported: FileCardProps = {
  fileName: 'cv-ficticio.pdf',
  format: 'pdf',
  pageCount: 2,
  characterCount: 3394,
  status: { tone: 'success', label: 'Texto extraído' },
  onReplace: jest.fn(),
};

// Nodo con ese color de fondo que contiene el texto indicado.
function backgroundOf(color: string, containing?: RegExp) {
  const root = screen.root!;
  return [root, ...root.queryAll(() => true)].find(
    (node) =>
      StyleSheet.flatten(node.props.style)?.backgroundColor === color &&
      (!containing ||
        node.queryAll((child) => containing.test(String(child.props.children))).length > 0),
  );
}

describe('FileCard', () => {
  beforeEach(() => mockedUseColorScheme.mockReturnValue('light'));

  it('shows the name, the known details and the extraction status', async () => {
    await render(<FileCard {...imported} />);

    expect(screen.getByText('cv-ficticio.pdf')).toHaveStyle({ fontWeight: 600 });
    expect(screen.getByText('PDF · 2 páginas · 3.394 caracteres')).toBeOnTheScreen();
    expect(screen.getByText('Texto extraído')).toBeOnTheScreen();
  });

  it('uses the singular for one page and one character', async () => {
    await render(<FileCard {...imported} pageCount={1} characterCount={1} />);

    expect(screen.getByText('PDF · 1 página · 1 carácter')).toBeOnTheScreen();
  });

  it('leaves out the details that are not known instead of making them up', async () => {
    await render(<FileCard {...imported} format="docx" pageCount={null} />);
    expect(screen.getByText('Word · 3.394 caracteres')).toBeOnTheScreen();
  });

  it('shows no details for a file that could not be identified or read', async () => {
    await render(
      <FileCard
        {...imported}
        fileName="cv.doc"
        format="legacy-or-protected-word"
        pageCount={null}
        characterCount={null}
        status={{ tone: 'danger', label: 'No se ha podido leer' }}
      />,
    );

    expect(screen.getByText('cv.doc')).toBeOnTheScreen();
    expect(screen.getByText('No se ha podido leer')).toBeOnTheScreen();
    expect(screen.queryByText(/·|caracteres|página/)).not.toBeOnTheScreen();
  });

  it('shows a file being read as busy, with no details and the action waiting', async () => {
    await render(
      <FileCard {...imported} format={null} pageCount={null} characterCount={null} status={null} />,
    );

    expect(screen.getByText('Leyendo en este dispositivo…')).toBeOnTheScreen();
    expect(screen.queryByText(/caracteres/)).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cambiar archivo' })).toBeBusy();
  });

  it('says when the text to analyze is the user correction', async () => {
    await render(<FileCard {...imported} corrected />);

    expect(
      screen.getByText('Con tus correcciones: se analizará el texto corregido.'),
    ).toBeOnTheScreen();
  });

  it('asks to replace the file, unless the action is disabled', async () => {
    const onReplace = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(<FileCard {...imported} onReplace={onReplace} />);

    await user.press(screen.getByRole('button', { name: 'Cambiar archivo' }));
    expect(onReplace).toHaveBeenCalledTimes(1);

    await rerender(<FileCard {...imported} onReplace={onReplace} replaceDisabled />);
    expect(screen.getByRole('button', { name: 'Cambiar archivo' })).toBeDisabled();
  });
});

describe.each(['light', 'dark'] as const)('FileCard in %s mode', (scheme) => {
  const palette = palettes[scheme];

  beforeEach(() => mockedUseColorScheme.mockReturnValue(scheme));

  it('draws a surface with a decorative border and an accent document tile', async () => {
    await render(<FileCard {...imported} />);

    expect(backgroundOf(palette.surface, /^cv-ficticio\.pdf$/)).toHaveStyle({
      borderColor: palette.border,
      borderWidth: 1,
    });
    expect(backgroundOf(palette.accentSubtle)).toBeDefined();
    expect(screen.getByText('PDF · 2 páginas · 3.394 caracteres')).toHaveStyle({
      color: palette.textSecondary,
    });
  });

  it('tints the document tile with the danger tone when the file failed', async () => {
    await render(
      <FileCard
        {...imported}
        characterCount={null}
        status={{ tone: 'danger', label: 'No se ha podido leer' }}
      />,
    );

    expect(backgroundOf(palette.accentSubtle)).toBeUndefined();
    expect(backgroundOf(palette.dangerSubtle, /^No se ha podido leer$/)).toBeDefined();
  });
});
