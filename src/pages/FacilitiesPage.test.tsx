import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { FacilitiesPage } from './FacilitiesPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));

describe('FacilitiesPage', () => {
  it('reserva cadastro de local para administracao organizacional', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);

    render(<FacilitiesPage />);

    expect(screen.queryByRole('tab', { name: 'Locais' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Patios' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Setores' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Vagas' })).toBeInTheDocument();
  });
});
