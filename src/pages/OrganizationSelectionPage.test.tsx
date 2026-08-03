import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../auth/AuthContext';
import { rememberLastOrganizationId } from '../auth/organizationPreference';
import { OrganizationSelectionPage } from './OrganizationSelectionPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));

describe('OrganizationSelectionPage', () => {
  beforeEach(() => localStorage.clear());

  it('destaca a organizacao recente e permite pesquisar sem alterar o tenant', async () => {
    rememberLastOrganizationId(2);
    const selectOrganization = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      organizations: [
        { organizationId: 1, legalName: 'Kaneko Norte' },
        { organizationId: 2, legalName: 'Kaneko Sul', tradeName: 'Operacao Sul' },
      ],
      selectOrganization,
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth>);

    render(<OrganizationSelectionPage />);
    expect(screen.getByText('Usada recentemente')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Pesquisar organizacao'), 'norte');
    expect(screen.getByText('Kaneko Norte')).toBeInTheDocument();
    expect(screen.queryByText('Operacao Sul')).not.toBeInTheDocument();
    expect(selectOrganization).not.toHaveBeenCalled();
  });
});
