import { render, screen, userEvent } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

import { SafeArea } from '../jest/safe-area';

const title = 'Comprueba qué respalda tu CV';

describe('HomeScreen', () => {
  it('introduces the product with one main heading and its identity', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });
    expect(screen.getByRole('header', { name: title })).toBeOnTheScreen();
    expect(screen.getByText('JobRadar ATS')).toBeOnTheScreen();
    expect(screen.getAllByRole('header').map((h) => h.props['aria-level'] ?? 1)).toEqual([1, 2, 2]);
  });

  it('explains the three steps and the current local processing limits', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });
    for (const step of ['Añade tu CV', 'Pega la oferta', 'Consulta los resultados']) {
      expect(screen.getByText(step)).toBeOnTheScreen();
    }
    expect(
      screen.getByText(/Tus textos no se envían ni se guardan de forma permanente/),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('No predice la decisión de un ATS ni de la empresa.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        process.env.EXPO_OS === 'web'
          ? 'Un PDF con texto o un Word (.docx), o pega el texto directamente.'
          : 'Pega el texto de tu CV. La importación de archivos en iOS y Android está pendiente.',
      ),
    ).toBeOnTheScreen();
  });

  it('offers a single enabled primary action with an accessible touch target', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });
    const action = screen.getByRole('button', { name: 'Analizar mi CV' });
    expect(action).toBeEnabled();
    expect(action).toHaveStyle({ minHeight: 44, minWidth: 44 });
    expect(screen.queryByText(/Último análisis|Aplicación en construcción/)).not.toBeOnTheScreen();
  });

  it('opens and closes the methodology with the scoring, limits and session privacy information', async () => {
    await render(<HomeScreen />, { wrapper: SafeArea });
    const toggle = screen.getByRole('button', { name: 'Cómo se calcula la cobertura' });
    const user = userEvent.setup();
    expect(toggle).toBeCollapsed();
    expect(screen.queryByText(/Cada requisito suma 1 punto/)).not.toBeOnTheScreen();
    await user.press(toggle);
    expect(toggle).toBeExpanded();
    expect(
      screen.getByText(
        'Recomendaciones que nunca inventan experiencia, titulaciones ni habilidades.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/Los obligatorios cuentan el doble; los no evaluables quedan fuera/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/No se leen PDF escaneados/)).toBeOnTheScreen();
    expect(screen.getByText(/Se pierden al salir del analizador o recargar/)).toBeOnTheScreen();
    await user.press(toggle);
    expect(toggle).toBeCollapsed();
    expect(screen.queryByText(/Cada requisito suma 1 punto/)).not.toBeOnTheScreen();
  });
});
