import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { OutboundNoteDocumentPage } from './OutboundNoteDocumentPage';

const state = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  activeOrganization: { organizationId: 2 }, permissions: state.permissions,
}) }));

const note = {
  id: 9, version: 3, numero: 'S9', modelo: '55', serie: '1', clienteNome: 'Ana',
  situacao: 'PENDENTE', cronogramaDefinido: true, localEstoqueNome: 'Loja',
  valorTotal: 10, valorProdutos: 10, valorFrete: 0, valorSeguro: 0, outrasDespesas: 0, valorDesconto: 0,
  itens: [{ id: 1, produtoNome: 'Produto A', quantidade: 1, valorUnitario: 10, valorDesconto: 0,
    valorTotal: 10, rateioFrete: 0, rateioSeguro: 0, rateioOutras: 0 }],
};
const readPermissions = ['fiscal:read', 'finance:read', 'stock:read'];

function setup(overrides: Record<string, unknown> = {}) {
  const data = {
    nota: { ...note, ...overrides },
    parcelas: [{ numeroParcela: 1, valor: 10, dataVencimento: '2026-11-12', formaPagamentoNome: 'Boleto' }],
    contasReceber: [{ id: 18, numeroParcela: 1, totalParcelas: 1, valorTotal: 10, valorRecebido: 0, situacao: 'PENDENTE' }],
    movimentosEstoque: [{ id: 23, produto: 'Produto A', localEstoque: 'Loja', tipo: 'BAIXA',
      saldoAnterior: 8, saldoPosterior: 7, delta: -1 }],
  };
  vi.spyOn(api, 'get').mockResolvedValue({ data });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter initialEntries={['/app/notas-saida/9']}>
    <QueryClientProvider client={client}>
      <Routes><Route path="/app/notas-saida/:id" element={<OutboundNoteDocumentPage />} /></Routes>
    </QueryClientProvider>
  </MemoryRouter>);
  return data;
}

afterEach(() => vi.restoreAllMocks());

describe('Conferência da Nota de Saída', () => {
  it('bloqueia confirmação até a conferência e envia a versão exibida', async () => {
    state.permissions = [...readPermissions, 'fiscal:manage'];
    setup();
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 9, situacao: 'CONFIRMADA' } });
    expect(await screen.findByText(/Boleto/)).toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Confirmar saída' });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Conferi/ }));
    fireEvent.click(button);
    const dialog = await screen.findByRole('alertdialog', { name: /Confirmar esta saída/ });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar saída' }));
    await vi.waitFor(() => expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-saida/9/confirmacao', null, {
      headers: { 'If-Match': '"3"' },
    }));
  });

  it('exige salvar rascunho antigo antes de confirmar', async () => {
    state.permissions = [...readPermissions, 'fiscal:manage'];
    setup({ cronogramaDefinido: false });
    expect(await screen.findByText(/Salve o rascunho novamente/)).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar saída' })).not.toBeInTheDocument();
  });

  it('mostra os títulos e movimentos da nota de saída confirmada', async () => {
    state.permissions = [...readPermissions, 'fiscal:manage'];
    setup({ situacao: 'CONFIRMADA' });
    expect(await screen.findByRole('heading', { name: 'Lançamentos da nota' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Parcela 1/ })).toHaveAttribute('href', '/app/contas-receber?detail=18');
    expect(screen.getByRole('link', { name: /Produto A/ })).toHaveAttribute('href', '/app/estoque?tab=razao&detail=23');
    expect(screen.queryByRole('heading', { name: 'Parcelas previstas' })).not.toBeInTheDocument();
  });

  it('oculta reversão sem as três permissões', async () => {
    state.permissions = [...readPermissions, 'fiscal:manage', 'finance:manage'];
    setup({ situacao: 'CONFIRMADA' });
    await screen.findByRole('heading', { name: 'Nota de Saída S9' });
    expect(screen.queryByRole('button', { name: 'Reverter nota' })).not.toBeInTheDocument();
  });

  it('não permite confirmar rascunho sem acesso às parcelas', async () => {
    state.permissions = ['fiscal:read', 'fiscal:manage', 'stock:read'];
    setup();
    expect(await screen.findByText(/exige acesso de leitura às parcelas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar saída' })).not.toBeInTheDocument();
  });

  it('reverte saída confirmada com motivo e revisão, sem apagar histórico', async () => {
    state.permissions = [...readPermissions, 'fiscal:manage', 'finance:manage', 'stock:manage'];
    setup({ situacao: 'CONFIRMADA' });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 9, situacao: 'CANCELADA', revertidaEm: '2026-11-05' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Reverter nota' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reverter nota internamente' });
    const button = within(dialog).getByRole('button', { name: 'Registrar reversão' });
    expect(button).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Motivo da reversão' }), { target: { value: '  Saída incorreta  ' } });
    fireEvent.click(button);
    await vi.waitFor(() => expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-saida/9/reversao', { motivo: 'Saída incorreta' }, {
      headers: { 'If-Match': '"3"' },
    }));
  });
});
