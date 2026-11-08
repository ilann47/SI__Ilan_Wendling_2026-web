import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { InboundNoteDocumentPage } from './InboundNoteDocumentPage';
import type { InboundNotePreview } from '../api/inboundNotes';
const state = vi.hoisted(() => ({ permissions: ['fiscal:read'] }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ activeOrganization: { organizationId: 2 }, permissions: state.permissions }) }));
afterEach(() => vi.restoreAllMocks());
function setup(situacao = 'PENDENTE', previa?: InboundNotePreview) {
  vi.spyOn(api, 'get').mockResolvedValue({ data: {
    nota: { id: 9, version: 1, numero: 'N9', serie: '3', modelo: '55', fornecedorNome: 'Distribuidora', situacao,
      itens: [], valorTotal: 10, valorDesconto: 0 },
    contasPagar: [{ id: 77, valorTotal: 10 }], movimentosEstoque: [{
      id: 88, produto: 'Produto restrito', localEstoque: 'Depósito', delta: 5,
      saldoAnterior: 10, saldoPosterior: 15, ocorridoEm: '2026-10-18T10:00:00Z',
    }],
    previa,
  } });
  render(<MemoryRouter initialEntries={['/app/notas-entrada/9']}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Routes><Route path="/app/notas-entrada/:id" element={<InboundNoteDocumentPage />} /></Routes></QueryClientProvider></MemoryRouter>);
}
describe('Detalhe da Nota e acesso aos efeitos', () => {
  it('mostra identidade e bloqueia vínculos residuais sem leitura do módulo', async () => {
    state.permissions = ['fiscal:read']; setup();
    expect(await screen.findByRole('heading', { name: 'Nota N9' })).toBeInTheDocument();
    expect(screen.getByText('Série 3 · modelo 55 · Distribuidora')).toBeInTheDocument();
    expect(screen.getByText('Seu perfil não permite consultar contas a pagar.')).toBeInTheDocument();
    expect(screen.getByText('Seu perfil não permite consultar o estoque.')).toBeInTheDocument();
    expect(screen.queryByText('Produto restrito')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Parcela|Ver documento anterior/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar/ })).not.toBeInTheDocument();
  });
  it('confirmada não oferece edição, cancelamento ou exclusão mesmo ao gestor', async () => {
    state.permissions = ['fiscal:read', 'fiscal:manage']; setup('CONFIRMADA');
    await screen.findByRole('heading', { name: 'Nota N9' });
    expect(screen.queryByRole('button', { name: /Cancelar|Excluir|Confirmar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
  });
  it('oferece reversão interna somente com os três acessos e envia a versão', async () => {
    state.permissions = ['fiscal:read', 'fiscal:manage', 'finance:manage', 'stock:manage', 'stock:read'];
    setup('CONFIRMADA');
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 9, situacao: 'CANCELADA', revertidaEm: '2026-11-05' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Reverter nota' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reverter nota internamente' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Motivo da reversão' }), { target: { value: '  Entrada indevida  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Registrar reversão' }));
    await waitFor(() => expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-entrada/9/reversao', { motivo: 'Entrada indevida' }, {
      headers: { 'If-Match': '"1"' },
    }));
  });
  it('mostra saldo anterior, entrada e saldo posterior no lançamento de estoque', async () => {
    state.permissions = ['fiscal:read', 'stock:read']; setup('CONFIRMADA');
    await screen.findByRole('heading', { name: 'Lançamentos gerados' });
    expect(screen.getByText(/Saldo anterior: 10,000/)).toHaveTextContent(
      'Saldo anterior: 10,000 · Entrada: 5,000 · Saldo posterior: 15,000',
    );
  });
  it('mostra o custo médio registrado no item de uma nota confirmada', async () => {
    state.permissions = ['fiscal:read'];
    setup('CONFIRMADA', {
      nota: { id: 9, version: 1, numero: 'N9', serie: '3', modelo: '55', fornecedorId: 1, fornecedorNome: 'Distribuidora', situacao: 'CONFIRMADA', tipoFrete: 'SEM', dataEmissao: '2026-10-17', localEstoqueId: 2, localEstoqueNome: 'Loja',
        itens: [{ id: 1, sequencia: 1, produtoId: 5, produtoNome: 'Água', unidadeMedida: 'UN', quantidade: 5, valorUnitario: 30, valorDesconto: 0, percentualDesconto: 0, valorTotal: 150, rateioFrete: 0, rateioSeguro: 0, rateioOutras: 0, custoPrecoFinal: 30, custoTotal: 150 }],
        valorProdutos: 150, valorFrete: 0, valorSeguro: 0, outrasDespesas: 0, valorDesconto: 0, valorTotal: 150, createdAt: '', updatedAt: '' },
      parcelas: [], valorCustoTotal: 150, valorObrigacao: 150, diferencaDescontoGeral: 0,
      custosMedios: [{ sequencia: 1, produtoId: 5, saldoAnterior: 10, custoMedioAnterior: 20, quantidadeEntrada: 5, custoUnitarioEntrada: 30, custoMedioPosterior: 23.33, aplicaAoEstoque: true, projecao: false }],
    });
    expect(await screen.findByText('R$ 20,00 → R$ 23,33')).toBeInTheDocument();
    const costDetails = screen.getByRole('button', { name: 'Ver cálculo do custo médio de Água' });
    expect(costDetails).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(costDetails);
    await waitFor(() => expect(costDetails).toHaveAttribute('aria-expanded', 'true'));
    expect(await screen.findByText('Custo médio registrado')).toBeInTheDocument();
    expect(screen.getByText('R$ 23,33')).toBeInTheDocument();
    expect(screen.queryByText(/estimado/)).not.toBeInTheDocument();
  });
  it('organiza o documento confirmado como documento ERP compacto sem repetir a identidade fiscal', async () => {
    state.permissions = ['fiscal:read', 'finance:read', 'stock:read'];
    setup('CONFIRMADA', {
      nota: { id: 9, version: 1, numero: 'N9', serie: '3', modelo: '55', fornecedorId: 1, fornecedorNome: 'Distribuidora', situacao: 'CONFIRMADA', tipoFrete: 'CIF', dataEmissao: '2026-10-17', dataChegada: '2026-10-18', localEstoqueId: 2, localEstoqueNome: 'Loja',
        itens: [{ id: 1, sequencia: 1, produtoId: 5, produtoNome: 'Água', unidadeMedida: 'UN', quantidade: 5, valorUnitario: 30, valorDesconto: 0, percentualDesconto: 0, valorTotal: 150, rateioFrete: 5, rateioSeguro: 0, rateioOutras: 0, custoPrecoFinal: 31, custoTotal: 155 }],
        valorProdutos: 150, valorFrete: 5, valorSeguro: 0, outrasDespesas: 0, valorDesconto: 0, valorTotal: 155, createdAt: '', updatedAt: '' },
      parcelas: [{ numeroParcela: 1, totalParcelas: 1, valor: 155, dataVencimento: '2026-11-17', formaPagamentoId: null, formaPagamentoNome: 'Boleto' }],
      valorCustoTotal: 155, valorObrigacao: 155, diferencaDescontoGeral: 0, custosMedios: [],
    });
    expect(await screen.findByRole('heading', { name: 'Nota N9' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dados da nota' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Itens e custos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Totais' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lançamentos gerados' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resumo financeiro' })).not.toBeInTheDocument();
    expect(screen.getByText('Nota confirmada · somente leitura')).toBeInTheDocument();
    expect(screen.getAllByText(/Distribuidora/)).toHaveLength(1);
    expect(screen.queryByText('Nota N9 · série 3 · modelo 55 · Distribuidora')).not.toBeInTheDocument();
  });
  it('cancelada com prévia preserva composição e vínculos sem anunciar efeitos futuros', async () => {
    state.permissions = ['fiscal:read', 'fiscal:manage', 'finance:read', 'stock:read'];
    setup('CANCELADA', {
      nota: { id: 9, version: 1, numero: 'N9', serie: '3', modelo: '55', fornecedorId: 1, fornecedorNome: 'Distribuidora', situacao: 'CANCELADA', tipoFrete: 'SEM', dataEmissao: '2026-10-17',
        itens: [], valorProdutos: 12, valorFrete: 0, valorSeguro: 0, outrasDespesas: 0, valorDesconto: 2, valorTotal: 10, createdAt: '', updatedAt: '' },
      parcelas: [{ numeroParcela: 1, totalParcelas: 1, valor: 10, dataVencimento: '2026-10-17', formaPagamentoId: null, formaPagamentoNome: null }],
      valorCustoTotal: 12, valorObrigacao: 10, diferencaDescontoGeral: 2, custosMedios: [],
    });
    await screen.findByRole('heading', { name: 'Nota N9' });
    expect(screen.getByText('Composição do rascunho cancelado')).toBeInTheDocument();
    expect(screen.getByText('Cronograma do rascunho cancelado')).toBeInTheDocument();
    expect(screen.getByText('Valor registrado no rascunho cancelado').parentElement).toHaveTextContent('10,00');
    expect(screen.getByText(/Esta nota não permite confirmação nem novos lançamentos/)).toBeInTheDocument();
    expect(screen.getByText(/vencimento registrado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Parcela/ })).toHaveAttribute('href', '/app/contas-pagar?detail=77');
    expect(screen.getByRole('link', { name: /Produto restrito/ })).toHaveAttribute('href', '/app/estoque?tab=razao&detail=88');
    expect(screen.queryByRole('button', { name: 'Ver origem histórica' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver documento anterior/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Parcelas previstas|Obrigação a pagar:|serão lançadas|serão gerados|uma obrigação com vencimento na emissão|reduz o valor a pagar/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancelar|Excluir|Confirmar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Editar/ })).not.toBeInTheDocument();
  });
});
