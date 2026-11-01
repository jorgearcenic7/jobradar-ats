import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

describe('HomeScreen', () => {
  it('renders the app title as a header', async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole('header', { name: 'JobRadar ATS' })).toBeOnTheScreen();
  });

  it('renders the under-construction message', async () => {
    await render(<HomeScreen />);

    expect(screen.getByText('Aplicación en construcción.')).toBeOnTheScreen();
  });
});
