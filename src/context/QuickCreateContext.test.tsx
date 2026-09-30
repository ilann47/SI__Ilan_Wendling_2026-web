import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { QuickCreateProvider } from './QuickCreateContext';

vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
function mount(kind: 'Cliente' | 'Fornecedor' | 'Local de estoque', allowed = true) {
  const basePath = kind === 'Cliente' ? '/api/clientes'
    : kind === 'Fornecedor' ? '/api/fornecedores' : '/api/v1/stock-locations';
  const permission = kind === 'Cliente' ? 'customers'
    : kind === 'Fornecedor' ? 'suppliers' : 'stock';
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
    permissions: [`${permission}:read`, ...(allowed ? [`${permission}:manage`] : [])] } as unknown as ReturnType<typeof useAuth>);
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).endsWith('/41')
    ? { id: 41, nome: 'Cadastro criado' } : { content: [], totalElements: 0 } }));
  const submit = vi.fn(); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<LocalizationProvider dateAdapter={AdapterDayjs}><QueryClientProvider client={client}><QuickCreateProvider>
    <ResourceFormDialog open title="Documento em preenchimento" onClose={vi.fn()} onSubmit={submit}
      fields={[{ name: 'numero', label: 'Número do documento', type: 'text' },
        { name: 'pessoaId', label: kind, type: 'reference', reference: { basePath, labelField: 'nome' } },
        { name: 'itens', label: 'Itens', type: 'subitems', subFields: [{ name: 'descricao', label: 'Produto', type: 'text' },
          { name: 'quantidade', label: 'Quantidade', type: 'number' }] },
        { name: 'observacao', label: 'Observação da compra/venda', type: 'text' }]}
      initialValues={{ numero: 'DOC-18', itens: [{ descricao: 'Produto preservado', quantidade: 3 }], observacao: 'Manter preenchimento' }} />
  </QuickCreateProvider></QueryClientProvider></LocalizationProvider>);
  return { submit, basePath };
}
async function openCreate(kind: string) {
  fireEvent.click(screen.getByRole('textbox', { name: kind }));
  fireEvent.click(await screen.findByRole('button', { name: `Cadastrar ${kind.toLowerCase()}` }));
  return screen.getAllByRole('dialog').find((dialog) => within(dialog).queryByText(`Novo ${kind.toLowerCase()}`))!;
}
describe('cadastro no contexto do documento', () => {
  it('edita um fornecedor diretamente na lista sem perder o documento em preenchimento', async () => {
    const { submit, basePath } = mount('Fornecedor');
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === basePath) return { data: {
        content: [{ id: 7, nome: 'Fornecedor antigo', documento: '11222333000181' }],
        totalElements: 1,
      } } as never;
      if (String(url).endsWith('/7')) return { data: {
        id: 7,
        nome: 'Fornecedor antigo',
        documento: '11222333000181',
        tipo: 'JURIDICA',
        ativo: true,
        emails: [],
        telefones: [],
      } } as never;
      return { data: { content: [], totalElements: 0 } } as never;
    });
    const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { id: 7, nome: 'Fornecedor atualizado' } });

    fireEvent.click(screen.getByRole('textbox', { name: 'Fornecedor' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Fornecedor antigo' }));

    const editDialog = await screen.findByRole('dialog', { name: /Editar fornecedor/ });
    const name = within(editDialog).getByRole('textbox', { name: 'Nome' });
    expect(name).toHaveValue('Fornecedor antigo');
    fireEvent.change(name, { target: { value: 'Fornecedor atualizado' } });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(put).toHaveBeenCalledWith(basePath + '/7', expect.objectContaining({
      nome: 'FORNECEDOR ATUALIZADO',
      documento: '11222333000181',
    })));
    expect(screen.getByRole('heading', { name: 'Selecionar fornecedor' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('DOC-18')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Produto preservado')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog', { name: 'Selecionar fornecedor' }))
      .getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Selecionar fornecedor' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      numero: 'DOC-18',
      itens: [{ descricao: 'Produto preservado', quantidade: 3 }],
      observacao: 'Manter preenchimento',
    })));
  });

  it('preserva o ETag ao editar um cadastro versionado pelo seletor', async () => {
    const { basePath } = mount('Local de estoque');
    vi.mocked(api.get).mockImplementation(async (url) => {
      if (url === basePath) return { data: {
        content: [{ id: 9, nome: 'Depósito antigo', ativo: true, version: 3 }],
        totalElements: 1,
      } } as never;
      if (String(url).endsWith('/9')) return {
        data: { id: 9, nome: 'Depósito antigo', ativo: true, version: 3 },
        headers: { etag: '"3"' },
      } as never;
      return { data: { content: [], totalElements: 0 } } as never;
    });
    const put = vi.spyOn(api, 'put').mockResolvedValue({
      data: { id: 9, nome: 'Depósito atualizado', ativo: true, version: 4 },
      headers: { etag: '"4"' },
    });

    fireEvent.click(screen.getByRole('textbox', { name: 'Local de estoque' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Depósito antigo' }));
    const editDialog = await screen.findByRole('dialog', { name: /Editar local de estoque/ });
    fireEvent.change(within(editDialog).getByRole('textbox', { name: 'Nome' }), {
      target: { value: 'Depósito atualizado' },
    });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(put).toHaveBeenCalledWith(
      `${basePath}/9`,
      expect.objectContaining({ nome: 'DEPÓSITO ATUALIZADO', ativo: true }),
      { headers: { 'If-Match': '"3"' } },
    ));
  });

  it('cadastra e seleciona local de estoque sem perder a ordem em preenchimento', async () => {
    const { submit, basePath } = mount('Local de estoque');
    const post = vi.spyOn(api, 'post').mockResolvedValueOnce({
      data: { id: 41, nome: 'Depósito principal', ativo: true, version: 0 },
      headers: { etag: '"0"' },
    });

    const dialog = await openCreate('Local de estoque');
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Depósito principal' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByDisplayValue('Cadastro criado')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Selecionar local de estoque' })).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('Produto preservado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      numero: 'DOC-18',
      pessoaId: 41,
      itens: [{ descricao: 'Produto preservado', quantidade: 3 }],
      observacao: 'Manter preenchimento',
    })));
    expect(post).toHaveBeenCalledWith(basePath, expect.objectContaining({
      nome: 'DEPÓSITO PRINCIPAL',
      ativo: true,
    }));
  });

  it.each(['Cliente', 'Fornecedor'] as const)('cancela cadastro de %s sem perder documento e itens', async (kind) => {
    mount(kind); const dialog = await openCreate(kind);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Cadastro não salvo' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fechar' }));
    expect(screen.getByDisplayValue('DOC-18')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Produto preservado')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Manter preenchimento')).toBeInTheDocument();
  });
  it.each(['Cliente', 'Fornecedor'] as const)('erro/sucesso de %s preserva dados e seleciona novo cadastro', async (kind) => {
    const { submit, basePath } = mount(kind);
    const post = vi.spyOn(api, 'post').mockRejectedValueOnce({ response: { status: 409, data: { detail: 'Documento já cadastrado.' } } })
      .mockResolvedValueOnce({ data: { id: 41, nome: 'Cadastro criado' } });
    const dialog = await openCreate(kind);
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Nome' }), { target: { value: 'Cadastro criado' } });
    fireEvent.change(within(dialog).getByRole('textbox', { name: kind === 'Cliente' ? /CPF \/ CNPJ/ : /CNPJ \/ CPF/ }),
      { target: { value: kind === 'Cliente' ? '93541134780' : '11222333000181' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByText('Documento já cadastrado.')).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue('CADASTRO CRIADO')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByDisplayValue('Cadastro criado')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(`Novo ${kind.toLowerCase()}`)).not.toBeInTheDocument());
    expect(screen.getByDisplayValue('Produto preservado')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(submit).toHaveBeenCalledWith(expect.objectContaining({ numero: 'DOC-18', pessoaId: 41,
      itens: [{ descricao: 'Produto preservado', quantidade: 3 }], observacao: 'Manter preenchimento' })));
    expect(post.mock.calls.every((call) => call[0] === basePath)).toBe(true);
  });
  it.each(['Cliente', 'Fornecedor'] as const)('sem gerenciamento não oferece criar %s', async (kind) => {
    mount(kind, false); fireEvent.click(screen.getByRole('textbox', { name: kind }));
    expect(await screen.findByText('Nenhum registro encontrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: `Cadastrar ${kind.toLowerCase()}` })).not.toBeInTheDocument();
  });
});
