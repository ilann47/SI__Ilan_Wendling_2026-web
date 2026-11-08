import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { FacilitiesPage } from './FacilitiesPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../workspace/OperationalWorkspaceContext', () => ({ useOperationalWorkspace: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));
vi.mock('../components/form/ReferenceSelect', () => ({
  ReferenceSelect: ({ label }: { label: string }) => <label>{label}<input /></label>,
}));

describe('FacilitiesPage', () => {
  it('reserva cadastro de local para administracao organizacional', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);

    render(<FacilitiesPage />);

    expect(screen.queryByRole('tab', { name: 'Locais' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pátios' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Setores' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Vagas' })).toBeInTheDocument();
  });

  it('abre cadastros curtos no dialogo padrao em vez de exibir formulario solto', async () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: ['facilities:manage'] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);

    render(<FacilitiesPage />);

    expect(screen.queryByRole('textbox', { name: 'Nome' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Novo pátio' }));

    expect(screen.getByRole('dialog', { name: 'Novo pátio' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar pátio' })).toBeInTheDocument();
  });
});
