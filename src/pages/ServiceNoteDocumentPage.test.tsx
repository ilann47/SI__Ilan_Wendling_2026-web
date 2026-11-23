import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { ServiceNoteDocumentPage } from './ServiceNoteDocumentPage';

vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  activeOrganization: { organizationId: 2 },
  permissions: ['fiscal:read', 'fiscal:manage', 'finance:read', 'service_orders:read'],
}) }));

const note = {
  id: 21, version: 3, numero: 'NS-21', modelo: '55', serie: '1', clienteNome: 'Cliente Kaneko',
  dataEmissao: '2026-09-20', situacao: 'PENDENTE', ordemServicoId: 18, cronogramaDefinido: true,
  valorServico: 120, valorDesconto: 20, valorIss: 6, valorTotal: 100,
  itens: [{ sequencia: 1, descricao: 'Lavagem', quantidade: 2, valorUnitario: 60, valorDesconto: 0, valorTotal: 120 }],
  parcelas: [{ numeroParcela: 1, totalParcelas: 1, dataVencimento: '2026-09-30', formaPagamentoNome: 'PIX', valor: 100 }],
};
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter initialEntries={['/app/notas-servico/21']}><QueryClientProvider client={client}>
    <Routes><Route path="/app/notas-servico/:id" element={<ServiceNoteDocumentPage />} /></Routes>
  </QueryClientProvider></MemoryRouter>);
}
afterEach(() => vi.restoreAllMocks());

describe('conferência da Nota de Serviço', () => {
  it('mantém a sexta casa visível na quantidade, no ISS e no valor da parcela', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: { ...note,
      valorIss: 0.000002, aliquotaIss: 0.000003,
      itens: [{ ...note.itens[0], quantidade: 1.000001 }],
      parcelas: [{ ...note.parcelas[0], valor: 2.000004 }],
    }, contasReceber: [] } });
    mount();
    expect(await screen.findByText('1,000001')).toBeInTheDocument();
    expect(screen.getByText(/ISS destacado: R\$\s*0,000002/)).toBeInTheDocument();
    expect(screen.getByText(/0,000003%/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*2,000004/)).toBeInTheDocument();
  });

  it('exibe serviços e parcelas, exige revisão e emite a mesma versão', async () => {
    let emitted = false;
    vi.spyOn(api, 'get').mockImplementation(async () => ({ data: {
      nota: emitted ? { ...note, version: 4, situacao: 'EMITIDA' } : note,
      contasReceber: emitted ? [{ id: 61, numeroParcela: 1, totalParcelas: 1, dataVencimento: '2026-09-30',
        valorOriginal: 100, valorRecebido: 0, situacao: 'PENDENTE' }] : [],
    } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async () => { emitted = true; return { data: note }; });
    mount();
    expect(await screen.findByText('Lavagem')).toBeInTheDocument();
    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ordem de serviço' })).toHaveAttribute('href', '/app/ordens-servico?detail=18');
    const emit = screen.getByRole('button', { name: 'Emitir internamente' });
    expect(emit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Conferi os serviços e as parcelas' }));
    fireEvent.click(emit);
    const dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar emissão interna' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/notas-servico/21/emissao', null,
      { headers: { 'If-Match': '"3"' } }));
    expect(await screen.findByRole('link', { name: 'Parcela 1/1' })).toHaveAttribute('href', '/app/contas-receber?detail=61');
  });

  it('não emite um rascunho antigo sem cronograma salvo', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { nota: { ...note, cronogramaDefinido: false, parcelas: [] }, contasReceber: [] } });
    mount();
    expect(await screen.findByText(/Salve o rascunho novamente/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Emitir internamente' })).not.toBeInTheDocument();
  });

  it('consulta a mesma nota depois de uma emissão com resultado incerto e não reenvia a cobrança', async () => {
    let emitted = false;
    const get = vi.spyOn(api, 'get').mockImplementation(async () => ({ data: {
      nota: emitted ? { ...note, version: 4, situacao: 'EMITIDA' } : note, contasReceber: [],
    } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async () => {
      emitted = true;
      throw new Error('Conexão interrompida');
    });
    mount();
    const emit = await screen.findByRole('button', { name: 'Emitir internamente' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Conferi os serviços e as parcelas' }));
    fireEvent.click(emit);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar emissão interna' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar situação' }));
    expect(await screen.findByText('Emitida')).toBeInTheDocument();
    expect(get.mock.calls.map(([url]) => url)).toEqual(['/api/notas-servico/21/detalhes', '/api/notas-servico/21/detalhes']);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('pede motivo e envia o cancelamento com a versão exibida', async () => {
    let canceled = false;
    vi.spyOn(api, 'get').mockImplementation(async () => ({ data: {
      nota: canceled ? { ...note, version: 4, situacao: 'CANCELADA', motivoCancelamento: 'Duplicidade' } : note,
      contasReceber: [],
    } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async () => { canceled = true; return { data: note }; });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar nota' }));
    const dialog = screen.getByRole('dialog', { name: 'Cancelar nota de serviço' });
    const submit = within(dialog).getByRole('button', { name: 'Registrar cancelamento' });
    expect(submit).toBeDisabled();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Motivo do cancelamento' }),
      { target: { value: 'Duplicidade' } });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    expect(await screen.findByText(/Motivo: Duplicidade/)).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/api/notas-servico/21/cancelamento', { motivo: 'Duplicidade' },
      { headers: { 'If-Match': '"3"' } });
  });
});
