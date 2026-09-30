import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { fiscalKeyComplete, hasProducts, PurchaseOrdersPage } from './PurchaseOrdersPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({
  useSnackbar: () => ({ notify: vi.fn() }),
}));

afterEach(() => vi.restoreAllMocks());

describe('PurchaseOrdersPage', () => {
  it('mantém a listagem direta sem navegação duplicada do fluxo', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 7 },
      permissions: ['purchases:read'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: {
      content: [], totalElements: 0, totalPages: 0, last: true,
    } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
          <PurchaseOrdersPage />
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Compras' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Fluxo de compras' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir para recebimentos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir para notas de entrada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ir para contas a pagar' })).not.toBeInTheDocument();
  });

  it('libera os dados somente com a chave fiscal completa e bloqueia depois do primeiro produto', () => {
    expect(fiscalKeyComplete({ fornecedorId: 2, numeroNota: '10', serieNota: '1' })).toBe(false);
    expect(fiscalKeyComplete({ fornecedorId: 2, numeroNota: '10', serieNota: '1', modeloNota: '55' })).toBe(true);
    expect(hasProducts({ itens: [] })).toBe(false);
    expect(hasProducts({ itens: [{ produtoId: 9 }] })).toBe(true);
  });

  it('oferece desconto somente por item', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 7 },
      permissions: ['purchases:read', 'purchases:manage', 'payments:read', 'logistics:read'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url) === '/api/fornecedores'
      ? { content: [{ id: 9, nome: 'Fornecedor Kaneko', condicaoPagamentoId: 4,
        transportadoraId: 5 }], totalElements: 1 }
      : String(url) === '/api/fornecedores/9'
        ? { id: 9, nome: 'Fornecedor Kaneko', condicaoPagamentoId: 4, transportadoraId: 5 }
        : String(url) === '/api/condicoes-pagamento/4'
          ? { id: 4, nome: '30/60 dias Demo' }
          : String(url) === '/api/transportadoras/5'
            ? { id: 5, nome: 'Transportes Kaneko Demo Ltda' }
            : { content: [], totalElements: 0, totalPages: 0, last: true } }));

    render(
      <MemoryRouter>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <PurchaseOrdersPage />
          </QueryClientProvider>
        </LocalizationProvider>
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Nova ordem' }));
    const dialog = screen.getByRole('dialog', { name: 'Nova ordem de compra' });

    expect(within(dialog).getByText('Custos da ordem')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Data da ordem')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Condição de pagamento')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Local previsto de entrega')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Responsável pelo frete')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Referência do fornecedor')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Observação interna')).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Desconto geral/i)).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('textbox', { name: 'Fornecedor' }));
    await user.click(await screen.findByText('Fornecedor Kaneko'));
    expect(await within(dialog).findByDisplayValue('30/60 dias Demo')).toBeInTheDocument();
    expect(await within(dialog).findByDisplayValue('Transportes Kaneko Demo Ltda')).toBeInTheDocument();
    expect(within(dialog).getAllByText('Herdado do fornecedor; você pode substituir.')).toHaveLength(2);
    await user.type(await screen.findByRole('textbox', { name: 'Número da nota' }), '123');
    await user.type(screen.getByRole('textbox', { name: 'Série' }), '1');
    await user.type(screen.getByRole('textbox', { name: 'Modelo' }), '55');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(within(dialog).getByRole('textbox', { name: 'Fornecedor' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: 'Número da nota' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: 'Série' })).toBeDisabled();
    expect(within(dialog).getByRole('textbox', { name: 'Modelo' })).toBeDisabled();
    expect(within(dialog).getByLabelText('Desconto do item')).toBeInTheDocument();

    const costsHeading = within(dialog).getByText('Custos da ordem');
    const totalsHeading = within(dialog).getByText('Totais dos itens');
    expect(costsHeading.compareDocumentPosition(totalsHeading)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Valor unitário/ }), {
      target: { value: '-3' },
    });
    expect(await within(dialog).findByText('O valor mínimo é 0.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();

    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Quantidade/ }), {
      target: { value: '11' },
    });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Valor unitário/ }), {
      target: { value: '12' },
    });
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Desconto do item/ }), {
      target: { value: '1111' },
    });
    expect(await within(dialog).findByText(
      'O desconto não pode exceder o total do item (R$ 132,00).',
    )).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeDisabled();
  }, 15_000);

  it('liga notas e contas ao registro exato, sem oferecer geração duplicada', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 },
      permissions: ['purchases:read', 'fiscal:read', 'fiscal:manage', 'finance:read'] } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/42')
      ? { id: 42, numero: 'OC-42', numeroNota: '42', serieNota: '1', modeloNota: '55', fornecedorNome: 'Fornecedor', status: 'RECEBIDA', itens: [], valorTotal: 100, version: 2 }
      : String(url).endsWith('/documents') ? {
        recebimentos: [], notas: [{ id: 81, numero: 'NF-81', recebimentoCompraId: 51, situacao: 'CONFIRMADA', valorTotal: 100 }],
        contasPagar: [{ id: 91, notaEntradaNumero: 'NF-81', numeroParcela: 1, totalParcelas: 1, valorTotal: 100, valorPago: 20, saldo: 75, situacao: 'PARCIAL', dataVencimento: '2026-09-25' },
          { id: 92, notaEntradaNumero: 'NF-81', numeroParcela: 2, totalParcelas: 2, valorTotal: 100, valorPago: 0, situacao: 'CANCELADA', dataVencimento: '2026-09-25' }],
        movimentosEstoque: [],
      } : String(url).endsWith('/receipts') ? [{ id: 51, localEstoqueNome: 'Depósito', recebidoEm: '2026-09-12T10:00:00Z', atorNome: 'Ana', itens: [] }]
        : { content: [], totalElements: 0 } }));
    render(<MemoryRouter initialEntries={['/app/ordens-compra?detail=42&recebimentoId=51']}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PurchaseOrdersPage /></QueryClientProvider></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Ver nota NF-81' })).toHaveAttribute('href', '/app/notas-entrada/81');
    expect(screen.getByRole('link', { name: /Parcela 1\/1/ })).toHaveAttribute('href', '/app/contas-pagar?detail=91');
    expect(screen.getByText(/Saldo R\$ 75,00/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo R\$ 0,00/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gerar nota de entrada' })).not.toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText('Recebimento selecionado #51')).toBeInTheDocument();
    const progress = screen.getByRole('region', { name: 'Andamento da compra' });
    expect(within(progress).getByText('Ordem registrada')).toBeInTheDocument();
    expect(within(progress).getByText('Recebimento concluído')).toBeInTheDocument();
    expect(within(progress).getByText('Nota registrada')).toBeInTheDocument();
    expect(within(progress).getByText('Conta gerada')).toBeInTheDocument();
  });
  it('abre a compra da URL fora da página atual e permite receber no detalhe', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 }, permissions: ['purchases:read', 'purchases:manage'] } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/42')
      ? { id: 42, numero: 'OC-42', numeroNota: '42', serieNota: '1', modeloNota: '55', fornecedorNome: 'Fornecedor exato', status: 'APROVADA', itens: [], valorTotal: 120, version: 2 }
      : String(url).endsWith('/receipts') ? [] : { content: [], totalElements: 0 } }));
    render(<MemoryRouter initialEntries={['/app/ordens-compra?detail=42']}><QueryClientProvider client={new QueryClient()}><PurchaseOrdersPage /></QueryClientProvider></MemoryRouter>);
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByRole('heading', { name: 'Compra · nota 42' })).toBeInTheDocument();
    expect(within(drawer).getByRole('button', { name: 'Receber mercadoria' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/v1/purchase-orders/42');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Receber mercadoria' }));
    expect(await screen.findByRole('button', { name: 'Receber toda a entrega' })).toBeInTheDocument();
    expect(await screen.findByText('Ao confirmar, todos os produtos e quantidades da compra entram no estoque. Se houver qualquer divergência, rejeite a entrega.')).toBeInTheDocument();
  });
  it('mostra os itens e o resumo financeiro nos detalhes da ordem', async () => {
    vi.mocked(useAuth).mockReturnValue({
      activeOrganization: { organizationId: 7 },
      permissions: ['purchases:read'],
    } as unknown as ReturnType<typeof useAuth>);
    vi.spyOn(api, 'get').mockResolvedValueOnce({ data: {
      content: [{
        id: 12,
        numero: 'OC-2026-001',
        numeroNota: '2026001',
        serieNota: '1',
        modeloNota: '55',
        fornecedorId: 3,
        fornecedorNome: 'Fornecedor Kaneko',
        status: 'PARCIALMENTE_RECEBIDA',
        dataEmissao: '2026-08-14',
        previsaoEntrega: '2026-08-20',
        moeda: 'BRL',
        subtotal: 100,
        valorFrete: 15,
        valorSeguro: 2,
        outrasDespesas: 3,
        valorDesconto: 5,
        valorTotal: 120,
        condicaoPagamentoId: 6,
        condicaoPagamentoNome: '30 dias',
        transportadoraId: 7,
        transportadoraNome: 'Transportadora Kaneko',
        localEstoqueEntregaId: 8,
        localEstoqueEntregaNome: 'Depósito central',
        compradorId: 2,
        compradorNome: 'Ana Compras',
        tipoFrete: 'FOB',
        referenciaFornecedor: 'PED-7788',
        observacao: 'Entregar no deposito central',
        observacaoInterna: 'Conferir lote',
        version: 2,
        itens: [{
          id: 21,
          sequencia: 1,
          produtoId: 9,
          produtoNome: 'Oleo 5W30',
          quantidadePedida: 10,
          quantidadeRecebida: 4,
          quantidadePendente: 6,
          valorUnitario: 10,
          valorDesconto: 0,
          valorTotal: 100,
        }],
      }],
      totalElements: 1,
      totalPages: 1,
    } }).mockImplementation(async (url) => ({ data: String(url).endsWith('/receipts') ? []
      : { recebimentos: [], notas: null, contasPagar: null, movimentosEstoque: null } }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter>
        <QueryClientProvider client={client}><PurchaseOrdersPage /></QueryClientProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    const orderRow = await screen.findByRole('row', { name: /2026001 · série 1 · modelo 55/ });
    await user.click(orderRow);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Compra · nota 2026001' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Dados da compra' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Entrega e condições' })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Totais da compra' })).toBeInTheDocument();
    const item = within(dialog).getByRole('article', { name: 'Item Oleo 5W30' });
    expect(within(item).getByText('Quantidade pedida')).toBeInTheDocument();
    expect(within(item).getByText('Quantidade recebida')).toBeInTheDocument();
    expect(within(item).getByText('Quantidade pendente')).toBeInTheDocument();
    expect(within(dialog).queryByRole('table')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Entregar no deposito central')).toBeInTheDocument();
    expect(within(dialog).getByText('R$ 120,00')).toBeInTheDocument();
    expect(within(dialog).getByText('30 dias')).toBeInTheDocument();
    expect(within(dialog).getByText('Transportadora Kaneko')).toBeInTheDocument();
    expect(within(dialog).getByText('Depósito central')).toBeInTheDocument();
    expect(within(dialog).getByText('Ana Compras')).toBeInTheDocument();
    expect(within(dialog).getByText('FOB (comprador paga)')).toBeInTheDocument();
    expect(within(dialog).getByText('PED-7788')).toBeInTheDocument();
    expect(within(dialog).getByText('Conferir lote')).toBeInTheDocument();
    expect(within(dialog).queryByText(/API atual/)).not.toBeInTheDocument();
  });
});
