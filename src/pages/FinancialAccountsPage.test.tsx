import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FinancialAccountsPage } from './FinancialAccountsPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));
afterEach(() => vi.restoreAllMocks());
const title = { id: 42, clienteNome: 'Cliente exato', situacao: 'PARCIAL', numeroParcela: 1,
  totalParcelas: 2, valorOriginal: 100, valorTotal: 100, valorRecebido: 40, saldo: 60,
  dataVencimento: '2030-10-15', origem: { tipo: 'NOTA_SAIDA', id: 7, numero: '7', url: '/app/notas-saida/7' } };

function setup(permissions = ['finance:read', 'fiscal:read'], url = '/app/contas-receber?detail=42&situacao=PARCIAL', tipo: 'pagar' | 'receber' = 'receber') {
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 }, permissions } as ReturnType<typeof useAuth>);
  vi.spyOn(api, 'get').mockImplementation(async (path) => ({ data: String(path).endsWith('/resumo')
    ? { quantidade: 30, valorOriginal: 3000, valorTotal: 3000, valorBaixado: 1000, saldo: 2000 }
    : String(path).endsWith('/baixas') ? [{ id: 1, valor: 40, data: '2030-09-01', atorNome: 'Operador', saldoAnterior: false }]
      : String(path).endsWith('/42') ? title : { content: [title], totalElements: 30, totalPages: 3 } }));
  const router = createMemoryRouter([{ path: '*', element: <FinancialAccountsPage tipo={tipo} /> }], { initialEntries: [url] });
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <LocalizationProvider dateAdapter={AdapterDayjs}><RouterProvider router={router} /></LocalizationProvider>
  </QueryClientProvider>);
  return router;
}

describe('Financeiro operacional', () => {
  it.each([
    ['pagar', 'suppliers:read', 'Fornecedor'],
    ['receber', 'customers:read', 'Cliente'],
  ] as const)('novo título a %s abre em página e mantém a lista ao voltar', async (tipo, permission, counterpart) => {
    const router = setup(['finance:read', 'finance:manage', permission], `/app/contas-${tipo}?situacao=PENDENTE`, tipo);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Novo lançamento' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Novo lançamento' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Selecionar ${counterpart.toLowerCase()}` })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    await user.type(screen.getByRole('spinbutton', { name: /Valor original/ }), '10');
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    const confirmation = await screen.findByRole('alertdialog', { name: 'Descartar alterações?' });
    await user.click(within(confirmation).getByRole('button', { name: 'Descartar lançamento' }));
    expect(await screen.findByRole('heading', { name: `Contas a ${tipo}` })).toBeInTheDocument();
    expect(router.state.location.search).toBe('?situacao=PENDENTE');
  });

  it('link direto de novo lançamento não ignora a permissão de cadastro', () => {
    setup(['finance:read', 'finance:manage'], '/app/contas-pagar?novo=1', 'pagar');
    expect(screen.getByText('Seu acesso não permite criar lançamentos nesta organização.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
  });

  it('envia uma baixa a pagar de um milionésimo sem arredondar', async () => {
    setup(['finance:read', 'finance:manage'], '/app/contas-pagar?detail=42', 'pagar');
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...title, saldo: 59.999999 } });
    const drawer = await screen.findByRole('region', { name: /Título 42/ });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Registrar pagamento' }));
    fireEvent.change(await screen.findByRole('spinbutton', { name: /valor/i }), { target: { value: '0.000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/contas-pagar/42/baixa',
      expect.objectContaining({ valor: 0.000001 }), expect.anything()));
  });

  it('rejeita a sétima casa e registra um recebimento de um milionésimo', async () => {
    setup(['finance:read', 'finance:manage']);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...title, saldo: 59.999999 } });
    const drawer = await screen.findByRole('region', { name: /Título 42/ });
    fireEvent.click(await within(drawer).findByRole('button', { name: 'Registrar recebimento' }));
    const valor = await screen.findByRole('spinbutton', { name: /valor/i });
    fireEvent.change(valor, { target: { value: '0.0000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }));
    expect(await screen.findByText(/até seis casas decimais/)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    fireEvent.change(valor, { target: { value: '0.000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/contas-receber/42/baixa',
      expect.objectContaining({ valor: 0.000001 }), expect.anything()));
  });

  it('consulta o detalhe em página e volta à listagem com os mesmos filtros', async () => {
    setup();
    const detail = await screen.findByRole('region', { name: /Título 42/ });
    expect(await within(detail).findByText('Operador')).toBeInTheDocument();
    expect(within(detail).getByRole('link', { name: 'Nota de saída 7' })).toHaveAttribute('href', '/app/notas-saida/7');
    expect(within(detail).queryByRole('button', { name: 'Registrar recebimento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Contas a receber' })).not.toBeInTheDocument();
    fireEvent.click(within(detail).getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('R$ 2.000,00')).toBeInTheDocument();
    expect((await screen.findAllByText('Parcial')).length).toBeGreaterThan(0);
    expect(screen.queryByText('PARCIAL')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/contas-receber/resumo', { params: { situacao: 'PARCIAL' } });
    expect(api.get).toHaveBeenCalledWith('/api/contas-receber', { params: { situacao: 'PARCIAL', page: 0, size: 10, sort: 'dataVencimento,asc' } });
  });

  it('restaura página, tamanho e ordenação ao voltar de um link direto', async () => {
    const router = setup(undefined, '/app/contas-receber?detail=42&situacao=PARCIAL&page=1&size=25&sort=valorTotal,desc');
    const detail = await screen.findByRole('region', { name: /Título 42/ });
    fireEvent.click(within(detail).getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByText('26–30 de 30')).toBeInTheDocument();
    expect(router.state.location.search).not.toContain('detail');
    expect(api.get).toHaveBeenCalledWith('/api/contas-receber', {
      params: expect.objectContaining({ page: 1, size: 25, sort: 'valorTotal,desc', situacao: 'PARCIAL' }),
    });
  });

  it('não envia um filtro de origem que não existe mais no contrato', async () => {
    setup(undefined, '/app/contas-receber?situacao=PARCIAL&origem=VENDA');
    expect(await screen.findByText('R$ 2.000,00')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/contas-receber/resumo', { params: { situacao: 'PARCIAL' } });
  });

  it('preserva chave e conteúdo para repetir baixa após falha de conexão', async () => {
    setup(['finance:read', 'finance:manage']);
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('Falha de conexão')).mockResolvedValueOnce({ data: { ...title, saldo: 0 } });
    const user = userEvent.setup();
    const drawer = await screen.findByRole('region', { name: /Título 42/ });
    await user.click(await within(drawer).findByRole('button', { name: 'Registrar recebimento' }));
    expect(await screen.findByText(/não executa uma transferência bancária/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar registro' }));
    expect(await screen.findByText(/Falha de conexão/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar registro' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
    expect(post.mock.calls[0][2]).toMatchObject({ headers: { 'Idempotency-Key': expect.any(String) } });
  });
});
