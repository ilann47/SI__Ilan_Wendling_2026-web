import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { productBlockers } from '../features/blockers/blockers';
import { BlockersPage } from './BlockersPage';

describe('BlockersPage', () => {
  it('mantem o catalogo oficial completo e sem acao executavel', () => {
    expect(productBlockers).toHaveLength(13);
    expect(new Set(productBlockers.map((blocker) => blocker.id)).size).toBe(13);

    render(<BlockersPage />);

    expect(screen.getByText('13 de 13 bloqueios exibidos')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('filtra bloqueios por termo sem criar estado remoto', async () => {
    render(<BlockersPage />);
    await userEvent.type(screen.getByLabelText('Buscar bloqueio'), 'barreira');

    expect(screen.getByText('1 de 13 bloqueios exibidos')).toBeInTheDocument();
    expect(screen.getByText('BLK-011')).toBeInTheDocument();
  });
});
