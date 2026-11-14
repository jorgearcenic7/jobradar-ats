import { render, screen, userEvent } from '@testing-library/react-native';

import type { SemanticManifest } from '@/features/cv-match/infrastructure/semantic-engine-types';
import { SemanticPanel } from '@/features/cv-match/presentation/semantic-panel';
import type { SemanticState } from '@/features/cv-match/presentation/use-semantic-review';

// Solo importa el tamaño de la descarga; el resto del manifiesto no se muestra.
const manifest = { downloadBytes: 143 * 1024 * 1024 } as unknown as SemanticManifest;
const toggle = () => screen.getByRole('button', { name: /^Relaciones semánticas, experimental/ });

const renderPanel = (state: SemanticState) =>
  render(<SemanticPanel state={state} onActivate={jest.fn()} onRemove={jest.fn()} />);

describe('SemanticPanel', () => {
  it('stays folded while unused, as a section heading that still says its status', async () => {
    await renderPanel({ kind: 'idle', manifest, downloaded: false });

    expect(toggle()).toBeCollapsed();
    expect(toggle()).toHaveAccessibleName(
      'Relaciones semánticas, experimental. Opcional · no cambia la cobertura',
    );
    // El botón va dentro de un encabezado de nivel 2, que no se agrupa como un solo elemento.
    const heading = screen.root!.queryAll((node) => node.props.role === 'heading');
    expect(heading.map((node) => node.props['aria-level'])).toContain(2);
    expect(screen.queryByRole('button', { name: /Descargar y buscar/ })).not.toBeOnTheScreen();
  });

  it('keeps the same explanation and action one press away', async () => {
    await renderPanel({ kind: 'idle', manifest, downloaded: false });

    await userEvent.setup().press(toggle());

    expect(toggle()).toBeExpanded();
    expect(screen.getByText(/no cambian la cobertura ni acreditan nada/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Descargar y buscar (143 MB)' })).toBeOnTheScreen();
  });

  it.each([
    [{ kind: 'analyzing', manifest }, 'Buscando relaciones en tu CV…'],
    [{ kind: 'ready', manifest, review: {}, queried: 2 }, /No se han encontrado relaciones/],
  ] as const)('opens by itself while it works or has a result (%#)', async (state, text) => {
    await renderPanel(state as SemanticState);

    expect(toggle()).toBeExpanded();
    expect(screen.getByText(text)).toBeOnTheScreen();
  });

  it('respects a manual fold even while it is active', async () => {
    await renderPanel({ kind: 'analyzing', manifest });

    await userEvent.setup().press(toggle());

    expect(toggle()).toBeCollapsed();
    expect(toggle()).toHaveAccessibleName(
      'Relaciones semánticas, experimental. Buscando relaciones…',
    );
  });
});
