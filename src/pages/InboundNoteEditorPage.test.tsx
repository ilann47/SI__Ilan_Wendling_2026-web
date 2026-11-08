import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { buildNotaEntradaPayload } from '../api/inboundNotes';
import { InboundNoteEditorPage } from './InboundNoteEditorPage';
import type { NotaEntradaResponse } from '../types';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ activeOrganization: { organizationId: 2 }, user: { login: 'tester' },
  permissions: ['fiscal:read', 'fiscal:manage', 'suppliers:read', 'stock:read', 'catalog:read', 'payments:read', 'logistics:read'] }) }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));
vi.mock('../components/form/ReferenceSelect', () => ({ ReferenceSelect: ({ label, value }: { label: string; value: number }) => <span>{label}: {value}</span> }));
const note: NotaEntradaResponse = { id: 17, version: 3, numero: 'NF-17', serie: '1', modelo: '55', fornecedorId: 1, fornecedorNome: 'Distribuidora', localEstoqueId: 2, localEstoqueNome: 'Loja', dataEmissao: '2026-10-16', dataChegada: '2026-10-16', tipoFrete: 'CIF',
  valorProdutos: 20, valorFrete: 0, valorSeguro: 0, outrasDespesas: 0, valorDesconto: 2, valorTotal: 18, observacao: 'Entregar na doca', observacaoInterna: 'Conferir lacre', situacao: 'PENDENTE', createdAt: '', updatedAt: '',
  itens: [{ id: 1, sequencia: 1, produtoId: 5, produtoNome: 'Água', unidadeMedida: 'UN', codigoProdutoFornecedor: 'A5', quantidade: 2, valorUnitario: 10, valorDesconto: 0, percentualDesconto: 0, valorTotal: 20, rateioFrete: 0, rateioSeguro: 0, rateioOutras: 0, custoPrecoFinal: 10, custoTotal: 20 }] };
const preview = { nota: { ...note, id: null, version: null }, parcelas: [{ numeroParcela: 1, totalParcelas: 1, valor: 18, dataVencimento: '2026-10-16', formaPagamentoId: null, formaPagamentoNome: null }], valorCustoTotal: 20, valorObrigacao: 18, diferencaDescontoGeral: 2,
  custosMedios: [{ sequencia: 1, produtoId: 5, saldoAnterior: 10, custoMedioAnterior: 20, quantidadeEntrada: 2, custoUnitarioEntrada: 10, custoMedioPosterior: 18.33, aplicaAoEstoque: true, projecao: true }] };
function setup(path = '/app/notas-entrada/17/editar', direction = -1) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/app/notas-entrada', element: <h1>Lista de notas</h1> },
    { path: '/app/notas-entrada/nova', element: <InboundNoteEditorPage /> },
    { path: '/app/notas-entrada/:id/editar', element: <InboundNoteEditorPage /> },
    { path: '/app/notas-entrada/:id', element: <h1>Documento confirmado</h1> },
  ], { initialEntries: direction === -1 ? ['/app/notas-entrada', path] : [path, '/app/notas-entrada'], initialIndex: direction === -1 ? 1 : 0 });
  render(<LocalizationProvider dateAdapter={AdapterDayjs}><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></LocalizationProvider>);
  return Object.assign(userEvent.setup(), { router });
}
beforeEach(() => { sessionStorage.clear(); vi.spyOn(api, 'get').mockResolvedValue({ data: note }); });
afterEach(() => vi.restoreAllMocks());

describe('Nota editável, revisão e confirmação por ID', () => {
  it('sinaliza emissão futura no campo e não solicita revisão ou gravação', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { ...note, dataEmissao: '2099-01-01', dataChegada: null } });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: preview });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: note });
    const user = setup();
    await screen.findByDisplayValue('NF-17');
    await user.click(screen.getByRole('button', { name: 'Conferir valores e parcelas' }));
    expect(await screen.findByText('A data de emissão não pode ser futura.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(post).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it('confere parcelas/custo do servidor e confirma a versão salva sem outro create', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: preview }).mockResolvedValueOnce({ data: { ...note, situacao: 'CONFIRMADA' } });
    const user = setup();
    await screen.findByDisplayValue('NF-17');
    expect(screen.queryByRole('button', { name: 'Confirmar entrada' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Conferir valores e parcelas' }));
    expect(await screen.findByText(/Custo de aquisição:/)).toHaveTextContent('20,00');
    expect(screen.getByText(/Obrigação a pagar:/)).toHaveTextContent('18,00');
    expect(screen.getByText('R$ 20,00 → R$ 18,33')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver cálculo do custo médio de Água' }));
    expect(screen.getByText('Saldo atual')).toBeInTheDocument();
    expect(screen.getByText('10,000 UN')).toBeInTheDocument();
    expect(screen.getByText('Custo médio atual')).toBeInTheDocument();
    expect(screen.getByText('R$ 20,00')).toBeInTheDocument();
    expect(screen.getByText('Custo desta entrada')).toBeInTheDocument();
    expect(screen.getByText('R$ 10,00')).toBeInTheDocument();
    expect(screen.getByText('Custo médio após entrada (estimado)')).toBeInTheDocument();
    expect(screen.getByText('R$ 18,33')).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Confirmar entrada' });
    expect(confirm).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /Conferi o documento/ }));
    await user.click(confirm);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar entrada' }));
    await screen.findByRole('heading', { name: 'Documento confirmado' });
    expect(post).toHaveBeenLastCalledWith('/api/notas-entrada/17/confirmacao', null, { headers: { 'If-Match': '"3"' } });
    expect(post.mock.calls.some(([url]) => url === '/api/notas-entrada')).toBe(false);
  }, 15000);

  it('mantém ações disponíveis e recolhe observações complementares', async () => {
    const user = setup();
    await screen.findByDisplayValue('NF-17');
    expect(screen.getByRole('toolbar', { name: 'Ações da Nota de Entrada' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Observação interna' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Observações e informações complementares' }));
    expect(screen.getByRole('textbox', { name: 'Observação' })).toHaveValue('Entregar na doca');
    expect(screen.getByRole('textbox', { name: 'Observação interna' })).toHaveValue('Conferir lacre');
  });
  it('rascunho antigo sem snapshot pode salvar a mesma composição e revisar a nova versão', async () => {
    const message = 'Salve o rascunho antes de revisar ou confirmar esta nota.';
    const post = vi.spyOn(api, 'post')
      .mockRejectedValueOnce({ response: { status: 409, data: { detail: message } } })
      .mockResolvedValueOnce({ data: preview });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ...note, version: 4 } });
    const user = setup();
    await screen.findByDisplayValue('NF-17');
    await user.click(screen.getByRole('button', { name: 'Conferir valores e parcelas' }));
    await screen.findByText(message);
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(screen.queryByText(message)).not.toBeInTheDocument());
    expect(put).toHaveBeenCalledExactlyOnceWith('/api/notas-entrada/17',
      buildNotaEntradaPayload({ ...note, itens: note.itens.map((item) => ({ ...item, percentualDesconto: '' })) }),
      { headers: { 'If-Match': '"3"' } });
    await user.click(screen.getByRole('button', { name: 'Conferir valores e parcelas' }));
    await screen.findByText('Conferência da entrada');
    expect(post).toHaveBeenLastCalledWith('/api/notas-entrada/17/previa', expect.any(Object), { headers: { 'If-Match': '"4"' } });
    expect(post.mock.calls.some(([url]) => url === '/api/notas-entrada')).toBe(false);
  });
  it('qualquer alteração invalida a conferência e PUT obsoleto preserva os dados', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: preview });
    const put = vi.spyOn(api, 'put').mockRejectedValue({ response: { status: 412, data: { detail: 'O rascunho foi alterado por outro operador.' } } });
    const user = setup();
    await screen.findByDisplayValue('NF-17');
    await user.click(screen.getByRole('button', { name: 'Conferir valores e parcelas' }));
    await screen.findByText('Conferência da entrada');
    fireEvent.change(screen.getByRole('textbox', { name: /Número da nota/ }), { target: { value: 'CORRIGIDA' } });
    expect(screen.queryByRole('button', { name: 'Confirmar entrada' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await screen.findByText('O rascunho foi alterado por outro operador.');
    expect(screen.getByDisplayValue('CORRIGIDA')).toBeInTheDocument();
    expect(put).toHaveBeenCalledWith('/api/notas-entrada/17', expect.objectContaining({ numero: 'CORRIGIDA' }), { headers: { 'If-Match': '"3"' } });
  });
  it('falha de confirmação exige GET e nova revisão, sem repetir POST automaticamente', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: preview }).mockRejectedValueOnce(new Error('timeout'));
    const user = setup();
    await screen.findByDisplayValue('NF-17');
    await user.click(screen.getByRole('button', { name: 'Conferir valores e parcelas' }));
    await user.click(await screen.findByRole('checkbox', { name: /Conferi o documento/ }));
    await user.click(screen.getByRole('button', { name: 'Confirmar entrada' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Confirmar entrada' }));
    await screen.findByText(/O resultado da tentativa anterior precisa ser reconciliado/);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Conferir valores e parcelas' })).toBeDisabled());
    expect(post).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('button', { name: 'Recarregar rascunho' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Conferir valores e parcelas' })).toBeEnabled());
    expect(post).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith('/api/notas-entrada/17');
  });
  it('retoma uma criação incerta com exatamente a mesma chave e corpo', async () => {
    const body = buildNotaEntradaPayload({ ...note });
    sessionStorage.setItem('kaneko.inbound.intent.2.tester', JSON.stringify({ key: 'intent-1', body }));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: note });
    const user = setup('/app/notas-entrada/nova');
    expect(screen.getByRole('textbox', { name: /Número da nota/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Reconciliar tentativa de gravação' }));
    await screen.findByText('Editar rascunho NF-17');
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-entrada', body, { headers: { 'Idempotency-Key': 'intent-1' } });
    expect(sessionStorage.getItem('kaneko.inbound.intent.2.tester')).toBeNull();
  });
  it.each([400, 404, 409, 422])('rejeição definitiva %s libera correção, sem repetir a tentativa rejeitada', async (status) => {
    const body = buildNotaEntradaPayload({ ...note });
    sessionStorage.setItem('kaneko.inbound.intent.2.tester', JSON.stringify({ key: 'intent-2', body }));
    const post = vi.spyOn(api, 'post').mockRejectedValue({ response: { status, data: { detail: status === 404 ? 'Produto não encontrado.' : 'Requisição rejeitada.' } } });
    const user = setup('/app/notas-entrada/nova');
    await user.click(screen.getByRole('button', { name: 'Reconciliar tentativa de gravação' }));
    await screen.findByText(status === 404 ? 'Produto não encontrado.' : 'Requisição rejeitada.');
    expect(screen.getByRole('textbox', { name: /Número da nota/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeInTheDocument();
    expect(sessionStorage.getItem('kaneko.inbound.intent.2.tester')).toBeNull();
    expect(post).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, 401, 403, 500])('replay não resolvido mantém os campos e o intento fixos (status=%s)', async (status) => {
    const body = buildNotaEntradaPayload({ ...note });
    sessionStorage.setItem('kaneko.inbound.intent.2.tester', JSON.stringify({ key: 'intent-uncertain', body }));
    const post = vi.spyOn(api, 'post').mockRejectedValue(status ? { response: { status } } : new Error('timeout'));
    const user = setup('/app/notas-entrada/nova');
    await user.click(screen.getByRole('button', { name: 'Reconciliar tentativa de gravação' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('textbox', { name: /Número da nota/ })).toBeDisabled();
    expect(JSON.parse(sessionStorage.getItem('kaneko.inbound.intent.2.tester')!)).toEqual({ key: 'intent-uncertain', body });
  });
  it.each([-1, 1])('protege descarte ao navegar pelo histórico do roteador (delta=%s)', async (direction) => {
    const user = setup('/app/notas-entrada/17/editar', direction);
    await screen.findByDisplayValue('NF-17');
    fireEvent.change(screen.getByRole('textbox', { name: /Número da nota/ }), { target: { value: 'ALTERADA' } });
    await act(async () => { await user.router.navigate(direction); });
    const dialog = await screen.findByRole('alertdialog', { name: 'Sair do formulário?' });
    expect(user.router.state.location.pathname).toBe('/app/notas-entrada/17/editar');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('ALTERADA')).toBeInTheDocument();
    await act(async () => { await user.router.navigate(direction); });
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Sair' }));
    expect(await screen.findByRole('heading', { name: 'Lista de notas' })).toBeInTheDocument();
  });
});
