import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stockApi, stockLocationApi, type StockMovement } from '../api/stock';
import { useAuth } from '../auth/AuthContext';
import { StockPage } from './StockPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));

const movement: StockMovement = { id: 7, produtoId: 1, produto: 'Produto teste', localEstoqueId: 3,
  localEstoque: 'Depósito', saldoEstoqueId: 5, tipo: 'RECEBIMENTO', delta: 1.123456, saldoAnterior: 0,
  saldoPosterior: 1.123456, origemTipo: 'NOTA_ENTRADA', origemChave: 'NFE-123', atorId: 8,
  ocorridoEm: '2026-11-22T10:00:00Z', createdAt: '2026-11-22T10:00:00Z' };
const local = { id: 1, nome: 'Depósito central', ativo: true, version: 4 };

function Path() {
  const { pathname, search } = useLocation();
  return <output aria-label="Endereço atual">{pathname}{search}</output>;
}

function mount(path: string) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}>
      <Path />
      <Routes>
        <Route path="/app/estoque" element={<StockPage />} />
        <Route path="/app/estoque/movimentos/:detailId" element={<StockPage />} />
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>);
}

describe('Navegação de estoque', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['stock:read', 'stock:manage'] } as ReturnType<typeof useAuth>);
    vi.spyOn(stockApi, 'movements').mockResolvedValue({ content: [movement], totalElements: 1 } as never);
    vi.spyOn(stockApi, 'movement').mockResolvedValue(movement);
    vi.spyOn(stockApi, 'origin').mockResolvedValue({ tipo: 'NOTA_ENTRADA', descricao: 'Nota de entrada',
      caminho: '/app/notas-entrada/9' } as never);
    vi.spyOn(stockLocationApi, 'list').mockResolvedValue({ content: [local], totalElements: 1 } as never);
    vi.spyOn(stockLocationApi, 'getVersioned').mockResolvedValue({ data: local, version: 4, etag: '"4"' });
  });
  afterEach(() => vi.restoreAllMocks());

  it('abre movimento em subpágina e mantém o filtro do razão ao voltar', async () => {
    mount('/app/estoque?tab=razao&tipo=RECEBIMENTO');
    const table = await screen.findByRole('table', { name: 'Razão de estoque' });
    fireEvent.click(within(table).getByRole('button', { name: 'Detalhe' }));
    expect(await screen.findByRole('heading', { name: 'Detalhe do movimento' })).toBeVisible();
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/app/estoque/movimentos/7?tab=razao&tipo=RECEBIMENTO');
    expect(await screen.findByText(/Seu acesso não permite consultar o documento de origem/)).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByRole('table', { name: 'Razão de estoque' })).toBeVisible();
    expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/app/estoque?tab=razao&tipo=RECEBIMENTO');
    expect(stockApi.movements).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'RECEBIMENTO' }));
  });

  it.each(['/app/estoque/movimentos/7', '/app/estoque?tab=razao&detail=7'])(
    'aceita o link direto %s e oferece voltar ao razão',
    async (path) => {
      mount(path);
      expect(await screen.findByText(/Produto: Produto teste/)).toBeVisible();
      expect(screen.getByLabelText('Endereço atual')).toHaveTextContent('/app/estoque/movimentos/7');
      fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(await screen.findByRole('table', { name: 'Razão de estoque' })).toBeVisible();
    },
  );

  it('abre criação e edição de local como páginas sem exibir a tabela', async () => {
    mount('/app/estoque?tab=locais');
    fireEvent.click(screen.getByRole('button', { name: 'Novo local' }));
    expect(screen.getByRole('heading', { name: 'Novo local de estoque' })).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    const table = await screen.findByRole('table', { name: 'Locais de estoque' });
    fireEvent.click(within(table).getByRole('button', { name: 'Editar' }));
    expect(await screen.findByRole('heading', { name: 'Editar local de estoque' })).toBeVisible();
    expect(await screen.findByRole('textbox', { name: /nome/i })).toHaveValue(local.nome);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(stockLocationApi.getVersioned).toHaveBeenCalledWith(local.id);
  });

  it('mantém controle de versão ao salvar edição e permite recarregar após conflito', async () => {
    const update = vi.spyOn(stockLocationApi, 'updateVersioned')
      .mockRejectedValueOnce({ response: { status: 412 } })
      .mockResolvedValue({ data: { ...local, nome: 'Novo depósito', version: 6 }, etag: '"6"', version: 6 });
    vi.mocked(stockLocationApi.getVersioned)
      .mockResolvedValueOnce({ data: local, etag: '"4"', version: 4 })
      .mockResolvedValue({ data: { ...local, nome: 'Depósito atualizado', version: 5 }, etag: '"5"', version: 5 });
    mount('/app/estoque?tab=locais&formulario=editar-local-1');

    const name = await screen.findByRole('textbox', { name: /nome/i });
    fireEvent.change(name, { target: { value: 'Novo depósito' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/Recarregue os dados antes de salvar novamente/)).toBeVisible();
    expect(name).toHaveValue('NOVO DEPÓSITO');
    expect(update).toHaveBeenCalledWith(local.id, { nome: 'NOVO DEPÓSITO', ativo: true }, 4);

    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    await waitFor(() => expect(name).toHaveValue('Depósito atualizado'));
    fireEvent.change(name, { target: { value: 'Novo depósito' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('table', { name: 'Locais de estoque' })).toBeVisible();
    expect(update).toHaveBeenLastCalledWith(local.id, { nome: 'NOVO DEPÓSITO', ativo: true }, 5);
  });

  it('não abre formulário local para usuário sem stock:manage', () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['stock:read'] } as ReturnType<typeof useAuth>);
    mount('/app/estoque?tab=locais&formulario=editar-local-1');
    expect(screen.queryByRole('heading', { name: 'Editar local de estoque' })).not.toBeInTheDocument();
    expect(stockLocationApi.getVersioned).not.toHaveBeenCalled();
  });
});
