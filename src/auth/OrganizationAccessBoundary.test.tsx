import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationAccessBoundary } from './OrganizationAccessBoundary';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../pages/OrganizationSelectionPage', () => ({
  OrganizationSelectionPage: ({ onSelectionStart }: { onSelectionStart?: () => void }) => <button onClick={onSelectionStart}>Seletor de organizacao</button>,
}));

describe('OrganizationAccessBoundary', () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

  it('abre caixa no pátio só após selecionar e permite voltar ao início pelo logo', async () => {
    function Content() {
      const location = useLocation();
      const navigate = useNavigate();
      return <><span data-testid="current-path">{location.pathname}</span><button onClick={() => navigate('/app')}>Logo</button></>;
    }
    vi.mocked(useAuth).mockReturnValue({ requiresOrganizationSelection: true, permissions: [] } as unknown as ReturnType<typeof useAuth>);
    const tree = <MemoryRouter initialEntries={['/app']}><OrganizationAccessBoundary><Content /></OrganizationAccessBoundary></MemoryRouter>;
    const view = render(tree);
    expect(screen.queryByTestId('current-path')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seletor de organizacao' }));
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 }, requiresOrganizationSelection: false,
      permissions: ['operations:checkout'] } as unknown as ReturnType<typeof useAuth>);
    view.rerender(tree);
    // Force the mocked context consumer update without remounting the boundary state.
    view.rerender(<MemoryRouter initialEntries={['/app']}><OrganizationAccessBoundary><Content /></OrganizationAccessBoundary></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/app/patio'));
    fireEvent.click(screen.getByRole('button', { name: 'Logo' }));
    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/app$/));
  });

  it('nao abre a aplicacao legada quando o usuario nao possui organizacao', () => {
    vi.mocked(useAuth).mockReturnValue({
      isContextLoading: false,
      requiresOrganizationSelection: false,
      hasNoOrganizationAccess: true,
    } as unknown as ReturnType<typeof useAuth>);

    render(<OrganizationAccessBoundary><span>Area tenant</span></OrganizationAccessBoundary>);

    expect(screen.getByText('Seletor de organizacao')).toBeInTheDocument();
    expect(screen.queryByText('Area tenant')).not.toBeInTheDocument();
  });

  it('exige escolha quando ha mais de uma organizacao acessivel', () => {
    vi.mocked(useAuth).mockReturnValue({
      isContextLoading: false,
      requiresOrganizationSelection: true,
      hasNoOrganizationAccess: false,
    } as unknown as ReturnType<typeof useAuth>);

    render(<OrganizationAccessBoundary><span>Area tenant</span></OrganizationAccessBoundary>);

    expect(screen.getByText('Seletor de organizacao')).toBeInTheDocument();
  });
});
