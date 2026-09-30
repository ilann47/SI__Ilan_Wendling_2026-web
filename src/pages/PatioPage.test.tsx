import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PatioPage } from './PatioPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));
vi.mock('../components/form/ReferenceSelect', () => ({
  ReferenceSelect: () => <div>Seletor de veículo</div>,
}));

describe('Operação do pátio', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 } } as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: {
      resumo: { totalVeiculos: 1, avulsos: 1, mensalistas: 0 },
      itens: [{ movimentacaoId: 7, placa: 'ABC1D23', modelo: 'Corolla', tipo: 'AVULSO',
        dataEntrada: '2026-09-28T10:00:00Z', minutosPermanencia: 30 }],
    } } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it('exige confirmação antes de registrar a saída', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { valorCobrado: 25 } } as never);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><PatioPage /></QueryClientProvider>);

    fireEvent.click(await screen.findByRole('button', { name: 'Registrar saída' }));
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Confirmar saída' })).toHaveTextContent('ABC1D23');

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar saída' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/movimentacoes/7/saida'));
  });
});
