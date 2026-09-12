import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrganizationAccessBoundary } from './OrganizationAccessBoundary';
import { useAuth } from './AuthContext';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../pages/OrganizationSelectionPage', () => ({
  OrganizationSelectionPage: () => <span>Seletor de organizacao</span>,
}));

describe('OrganizationAccessBoundary', () => {
  beforeEach(() => vi.mocked(useAuth).mockReset());

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
