import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { OutboundNoteEditorPage } from './OutboundNoteEditorPage';
import { OutboundNotesPage } from './OutboundNotesPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  activeOrganization: { organizationId: 2 }, user: { login: 'tester' },
  permissions: ['fiscal:read', 'fiscal:manage', 'customers:read', 'catalog:read', 'stock:read', 'payments:read'],
}) }));
vi.mock('../components/form/ReferenceSelect', () => ({
  ReferenceSelect: ({ label, value, disabled }: { label: string; value?: number; disabled?: boolean }) =>
    <input aria-label={label} readOnly value={value ?? ''} disabled={disabled} />,
}));
const note = {
  id: 17, version: 3, numero: 'N-17', serie: '1', modelo: '55', dataEmissao: '2026-11-05',
  clienteId: 1, localEstoqueId: 2, tipoFrete: 'CIF', situacao: 'PENDENTE', condicaoPagamentoId: 8,
  valorFrete: 2, valorSeguro: 0, outrasDespesas: 0, valorDesconto: 0,
  itens: [{ id: 1, produtoId: 5, quantidade: 3, valorUnitario: 1, valorDesconto: 1, percentualDesconto: 33.33 }],
};

function setup(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/app/notas-saida', element: <OutboundNotesPage /> },
    { path: '/app/notas-saida/nova', element: <OutboundNoteEditorPage /> },
    { path: '/app/notas-saida/:id/editar', element: <OutboundNoteEditorPage /> },
    { path: '/app/notas-saida/:id', element: <h1>Conferência da nota salva</h1> },
  ], { initialEntries: [path] });
  render(<LocalizationProvider dateAdapter={AdapterDayjs}><QueryClientProvider client={client}>
    <RouterProvider router={router} />
  </QueryClientProvider></LocalizationProvider>);
  return router;
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('Editor e rotas da Nota de Saída', () => {
  it('permite editar a saída direta e mantém o desconto monetário original', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: note });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { ...note, version: 4, numero: 'AJUSTADA' } });
    setup('/app/notas-saida/17/editar');
    const number = await screen.findByRole('textbox', { name: /Número da nota/ });
    expect(screen.getByRole('textbox', { name: 'Cliente' })).toBeEnabled();
    expect(screen.getByRole('textbox', { name: 'Produto' })).toBeEnabled();
    fireEvent.change(number, { target: { value: 'AJUSTADA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar e conferir' }));
    await screen.findByRole('heading', { name: 'Conferência da nota salva' });
    expect(put).toHaveBeenCalledExactlyOnceWith('/api/notas-saida/17', expect.objectContaining({
      numero: 'AJUSTADA', clienteId: 1,
      itens: [{ produtoId: 5, quantidade: 3, valorUnitario: 1, valorDesconto: 1 }],
    }), { headers: { 'If-Match': '"3"' } });
  });

  it('reconcilia a criação incerta com o mesmo corpo e chave', async () => {
    const body = { numero: 'N-17', clienteId: 1, localEstoqueId: 2, itens: [{ produtoId: 5, quantidade: 1, valorUnitario: 9 }] };
    const intent = { body, key: 'intent-17' };
    sessionStorage.setItem('kaneko.outbound.intent.2.tester', JSON.stringify(intent));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: note });
    setup('/app/notas-saida/nova');
    expect(screen.getByRole('textbox', { name: /Número da nota/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Reconciliar tentativa de gravação' }));
    await screen.findByRole('heading', { name: 'Conferência da nota salva' });
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-saida', body, { headers: { 'Idempotency-Key': 'intent-17' } });
    expect(sessionStorage.getItem('kaneko.outbound.intent.2.tester')).toBeNull();
  });

  it('preserva link de detalhe da nota sem carregar listagem', async () => {
    const get = vi.spyOn(api, 'get');
    const router = setup('/app/notas-saida?detail=17');
    await screen.findByRole('heading', { name: 'Conferência da nota salva' });
    expect(router.state.location.pathname).toBe('/app/notas-saida/17');
    expect(get).not.toHaveBeenCalled();
  });
});
