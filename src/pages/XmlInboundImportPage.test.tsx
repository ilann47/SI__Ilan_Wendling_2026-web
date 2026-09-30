import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type { InboundImport } from '../api/inboundImports';
import { useAuth } from '../auth/AuthContext';
import { XmlInboundImportPage } from './XmlInboundImportPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));
vi.mock('../components/form/ReferenceSelect', () => ({ ReferenceSelect: ({ label, onChange, disabled }: { label: string; onChange: (id: number) => void; disabled?: boolean }) =>
  <button disabled={disabled} onClick={() => onChange(label.startsWith('Fornecedor') ? 11 : label.startsWith('Local') ? 12 : 13)}>{label}</button> }));
afterEach(() => vi.restoreAllMocks());
const base: InboundImport = { id: 4, version: 0, status: 'IMPORTADA', documento: { chave: '123456789', numero: '123', serie: '1', modelo: '55', emitenteDocumento: '12345678000190', emitenteNome: 'Distribuidora teste', destinatarioDocumento: '98765432000190', emissao: '2026-09-12', frete: 0, seguro: 0, outrasDespesas: 0, total: 20, itens: [{ sequencia: 1, codigo: 'AGUA', descricao: 'Água mineral', unidade: 'UN', quantidade: 2, valorUnitario: 10, valorProdutos: 20, desconto: 0 }] }, itens: [], divergencias: [] };
function setup(permissions: string[], value = base) {
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 }, permissions } as unknown as ReturnType<typeof useAuth>);
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/importacoes/4') ? value
    : String(url).endsWith('/produtos/13') ? { id: 13, nome: 'Água', unidadeMedidaSigla: 'UN' }
      : String(url).endsWith('/purchase-orders/88') ? { id: 88, itens: [{ id: 321, produtoNome: 'Água', quantidadePendente: 2 }] }
        : String(url).endsWith('/receipts') ? []
      : { content: [], totalElements: 0, totalPages: 0 } }));
  render(<MemoryRouter initialEntries={['/app/notas-entrada/importar?importacao=4']}><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><XmlInboundImportPage /></QueryClientProvider></MemoryRouter>);
}
describe('XML de entrada', () => {
  it('exige confirmação explícita para registrar novo recebimento pela compra', async () => {
    const put = vi.spyOn(api, 'put').mockRejectedValue(new Error('Falha temporária'));
    setup(['fiscal:read', 'fiscal:manage', 'suppliers:read', 'catalog:read', 'stock:read', 'purchases:read'], {
      ...base, fornecedorId: 11, localEstoqueId: 12, ordemCompraId: 88,
      itens: [{ sequencia: 1, produtoId: 13, produtoNome: 'Água', unidadeDestino: 'UN', fatorConversao: 1,
        quantidade: 2, valorUnitario: 10, itemOrdemCompraId: 321 }],
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Salvar conciliação' }));
    expect(await screen.findByText(/Selecione o recebimento já registrado ou confirme explicitamente/)).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: 'Esta mercadoria ainda não foi recebida; registrar novo recebimento ao confirmar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar conciliação' }));
    expect(put).toHaveBeenCalledWith('/api/notas-entrada/importacoes/4/conciliacao', expect.objectContaining({ registrarNovoRecebimento: true, ordemCompraId: 88 }), { headers: { 'If-Match': '"0"' } });
  });
  it('exige salvar uma contagem alterada antes da confirmação final', async () => {
    setup(['fiscal:read', 'fiscal:manage'], { ...base, status: 'CONFERIDA', fornecedorId: 11, localEstoqueId: 12,
      itens: [{ sequencia: 1, produtoId: 13, produtoNome: 'Água', unidadeDestino: 'UN', fatorConversao: 1, quantidade: 2, valorUnitario: 10, quantidadeConferida: 2 }],
    });
    expect(await screen.findByRole('button', { name: 'Confirmar lançamentos' })).toBeInTheDocument();
    const input = screen.getByLabelText('Quantidade conferida — Água');
    await userEvent.clear(input);
    await userEvent.type(input, '1');
    expect(screen.queryByRole('button', { name: 'Confirmar lançamentos' })).not.toBeInTheDocument();
    expect(screen.getByText('Salve a contagem alterada antes de confirmar os lançamentos.')).toBeInTheDocument();
  });
  it('consulta documento persistido sem permitir gravação ao leitor', async () => {
    setup(['fiscal:read']);
    expect(await screen.findByRole('heading', { name: /Nota 123/ })).toBeInTheDocument();
    expect(screen.getByText('Água mineral')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Importar arquivo XML' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar conciliação' })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/api/notas-entrada/importacoes/4');
  });
  it('libera confirmação após salvar novamente a mesma contagem sem alterar a versão', async () => {
    const checked: InboundImport = { ...base, status: 'CONFERIDA', fornecedorId: 11, localEstoqueId: 12,
      itens: [{ sequencia: 1, produtoId: 13, produtoNome: 'Água', unidadeDestino: 'UN', fatorConversao: 1,
        quantidade: 2, valorUnitario: 10, quantidadeConferida: 2 }],
    };
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: checked });
    setup(['fiscal:read', 'fiscal:manage'], checked);
    const user = userEvent.setup();
    const input = await screen.findByLabelText('Quantidade conferida — Água');
    await user.clear(input);
    await user.type(input, '2');
    expect(screen.queryByRole('button', { name: 'Confirmar lançamentos' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar conferência física' }));
    expect(await screen.findByRole('button', { name: 'Confirmar lançamentos' })).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/api/notas-entrada/importacoes/4/conferencia',
      { itens: [{ sequencia: 1, quantidadeConferida: 2 }] }, { headers: { 'If-Match': '"0"' } });
  });
  it('preserva seleção ao falhar conciliação e não confirma lançamentos antecipados', async () => {
    const put = vi.spyOn(api, 'put').mockRejectedValue(new Error('Servidor temporariamente indisponível'));
    const post = vi.spyOn(api, 'post');
    setup(['fiscal:read', 'fiscal:manage', 'suppliers:read', 'stock:read', 'catalog:read']);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Fornecedor do documento' }));
    await user.click(screen.getByRole('button', { name: 'Local de estoque' }));
    await user.click(screen.getByRole('button', { name: 'Produto correspondente' }));
    await user.click(screen.getByRole('button', { name: 'Salvar conciliação' }));
    await screen.findByText(/Servidor temporariamente indisponível/);
    expect(put).toHaveBeenCalledWith('/api/notas-entrada/importacoes/4/conciliacao', expect.objectContaining({ fornecedorId: 11, localEstoqueId: 12,
      itens: [expect.objectContaining({ sequencia: 1, produtoId: 13, fatorConversao: 1, valorUnitario: 10 })] }), { headers: { 'If-Match': '"0"' } });
    await user.click(screen.getByRole('button', { name: 'Salvar conciliação' }));
    expect(put).toHaveBeenCalledTimes(2);
    expect(post).not.toHaveBeenCalled();
  });
});
