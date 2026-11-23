import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { ParkingFiscalDraftPage } from './ParkingFiscalDraftPage';
import { ServiceNotesPage } from './ServiceNotesPage';

const auth = vi.hoisted(() => ({
  activeOrganization: { organizationId: 2 },
  permissions: ['fiscal:read', 'fiscal:manage', 'service_orders:read'],
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../components/form/ResourceFormPage', () => ({
  ResourceFormPage: ({ title, onClose, onSubmit, onSaved }: {
    title: string; onClose: () => void;
    onSubmit: (values: Record<string, unknown>) => Promise<{ id: number }>;
    onSaved: (value: { id: number }) => void;
  }) => <><h1>{title}</h1><button onClick={onClose}>Cancelar</button>
    <button onClick={() => void onSubmit({ numero: '007', serie: 'A', modelo: 'SERV' }).then(onSaved)}>Salvar</button></>,
}));

const base = '/api/v1/patio/rascunhos-nfse';
const path = '/app/notas-servico';
const list = '/api/notas-servico/listagem';
const unifiedRows = [
  { id: 154, origem: 'ESTACIONAMENTO', referencia: 'PATIO-154', descricao: 'MMX1A23 · Festival noturno',
    valor: '10.000000', situacao: 'PENDENTE_EMISSAO', criadoEm: '2026-11-22T19:30:00-03:00' },
  { id: 154, origem: 'MANUAL', referencia: 'NS-154', descricao: 'Cliente da nota',
    valor: '21.000001', situacao: 'EMITIDA', criadoEm: '2026-11-22T18:30:00-03:00' },
];
const draft = {
  movimentacaoId: 154, ordemServicoId: 90, ordemServicoNumero: 'PATIO-154',
  eventoNome: 'Festival noturno', patioNome: 'Pátio central', placa: 'MMX1A23',
  valor: '10.000000', status: 'PENDENTE_EMISSAO', criadoEm: '2026-11-22T19:30:00-03:00',
  version: 2, tomador: null,
};
const payer = { documento: '52998224725', nome: 'Joana Silva' };

function LocationPath() {
  const current = useLocation();
  return <output aria-label="Rota">{current.pathname}{current.search}</output>;
}

function mount(url: string, permissions = ['fiscal:read', 'fiscal:manage', 'service_orders:read']) {
  auth.permissions = permissions;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<MemoryRouter initialEntries={[url]}><QueryClientProvider client={client}>
    <LocationPath />
    <Routes>
      <Route path={path} element={<ServiceNotesPage />} />
      <Route path={path + '/estacionamento/:movimentacaoId'} element={<ParkingFiscalDraftPage />} />
      <Route path={path + '/:id'} element={<p>Nota de serviço interna</p>} />
      <Route path="/" element={<p>Origem</p>} />
    </Routes>
  </QueryClientProvider></MemoryRouter>);
}

afterEach(() => vi.restoreAllMocks());

describe('Lista unificada e rascunhos de Notas de Serviço', () => {
  it('mistura as origens, sem abas, e pagina e busca com uma só consulta', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { content: unifiedRows, totalElements: 14, totalPages: 2 } });
    const post = vi.spyOn(api, 'post');
    mount(path);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'PATIO-154' })).toHaveAttribute('href', path + '/estacionamento/154');
    expect(screen.getByRole('link', { name: 'NS-154' })).toHaveAttribute('href', path + '/154');
    expect(screen.getByRole('columnheader', { name: 'Origem' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Situação' })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith(list, { params: expect.objectContaining({ page: 0, size: 10 }) });
    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await waitFor(() => expect(get).toHaveBeenCalledWith(list, { params: expect.objectContaining({ page: 1, size: 10 }) }));
    fireEvent.change(screen.getByPlaceholderText('Buscar por número, OS, placa, evento ou cliente'), { target: { value: 'MMX1A23' } });
    await waitFor(() => expect(get).toHaveBeenCalledWith(list, { params: expect.objectContaining({ busca: 'MMX1A23', page: 0, size: 10 }) }));
    expect(post).not.toHaveBeenCalled();
  });

  it('aceita filtros de links antigos e só mostra criação com todas as permissões necessárias', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0 } });
    mount(path + '?aba=internas&numero=007&situacao=PENDENTE&clienteId=14');
    await waitFor(() => expect(get).toHaveBeenCalledWith(list, { params: expect.objectContaining({ busca: '007', situacao: 'PENDENTE', clienteId: 14 }) }));
    expect(screen.queryByRole('button', { name: 'Nova nota de serviço' })).not.toBeInTheDocument();
  });

  it('mantém o formulário manual em subpágina e salva no endpoint original', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: unifiedRows, totalElements: 2 } });
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 23 } });
    mount(path + '?origem=MANUAL&situacao=PENDENTE', ['fiscal:read', 'fiscal:manage', 'customers:read', 'catalog:read']);
    fireEvent.click(await screen.findByRole('button', { name: 'Nova nota de serviço' }));
    expect(await screen.findByRole('heading', { name: 'Nova nota de serviço' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText('Nota de serviço interna')).toBeVisible();
    expect(post).toHaveBeenCalledExactlyOnceWith('/api/notas-servico', { numero: '007', serie: 'A', modelo: 'SERV' });
    expect(screen.getByLabelText('Rota')).toHaveTextContent(path + '/23?origem=MANUAL&situacao=PENDENTE');
  });

  it('abre os links com detail legado na nota interna', async () => {
    mount(path + '?detail=21');
    expect(await screen.findByText('Nota de serviço interna')).toBeVisible();
  });

  it('permite consultar o rascunho sem edição ou emissão e sem link de OS sem autorização', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: { ...draft, servicoId: 5, servicoNome: 'Estacionamento noturno' } });
    mount(path + '/estacionamento/154', ['fiscal:read']);
    expect(await screen.findByRole('heading', { name: 'Rascunho de NFS-e — PATIO-154' })).toBeVisible();
    expect(screen.getByText('Tomador não informado')).toBeVisible();
    expect(screen.getByText('Estacionamento noturno')).toBeVisible();
    expect(screen.getByText(/R\$\s*10,00/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /Editar|Emitir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver ordem de serviço' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('Rota')).toHaveTextContent(/^\/app\/notas-servico$/);
  });

  it('edita e remove a identificação com a versão do rascunho, sem iniciar emissão ou cobrança', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({ data: draft });
    const put = vi.spyOn(api, 'put')
      .mockResolvedValueOnce({ data: { ...draft, tomador: payer, version: 3 } })
      .mockResolvedValueOnce({ data: { ...draft, version: 4 } });
    const post = vi.spyOn(api, 'post');
    mount(path + '/estacionamento/154');
    const edit = () => fireEvent.click(screen.getByRole('button', { name: 'Editar tomador' }));
    await screen.findByRole('button', { name: 'Editar tomador' });
    expect(screen.getByRole('link', { name: 'Ver ordem de serviço' })).toHaveAttribute('href', '/app/ordens-servico?detail=90');
    edit();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Identificar tomador' }));
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: /CPF|CNPJ/i }), { target: { value: payer.documento } });
    fireEvent.change(screen.getByRole('textbox', { name: /Nome|Razão/i }), { target: { value: payer.nome } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(put).toHaveBeenNthCalledWith(1, base + '/154/tomador', { tomador: payer }, { headers: { 'If-Match': '"2"' } }));
    expect(await screen.findByText(payer.nome)).toBeVisible();
    edit();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Identificar tomador' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    await waitFor(() => expect(put).toHaveBeenNthCalledWith(2, base + '/154/tomador', { tomador: null }, { headers: { 'If-Match': '"3"' } }));
    expect(await screen.findByText('Tomador não informado')).toBeVisible();
    expect(post).not.toHaveBeenCalled();
  });

  it('não consulta rascunhos sem leitura fiscal', () => {
    const get = vi.spyOn(api, 'get');
    mount(path + '/estacionamento/154', ['operations:checkout']);
    expect(screen.getByText(/não permite consultar/)).toBeVisible();
    expect(get).not.toHaveBeenCalled();
  });

  it('pede para recarregar após conflito em vez de salvar por cima de outra alteração', async () => {
    vi.spyOn(api, 'get')
      .mockResolvedValueOnce({ data: { ...draft, tomador: payer } })
      .mockResolvedValueOnce({ data: { ...draft, tomador: { ...payer, nome: 'Maria Souza' }, version: 4 } });
    const put = vi.spyOn(api, 'put').mockRejectedValue({ response: { status: 412 } });
    mount(path + '/estacionamento/154');
    fireEvent.click(await screen.findByRole('button', { name: 'Editar tomador' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Nome|Razão/i }), { target: { value: 'Joana Souza' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rascunho' }));
    expect(await screen.findByText(/O rascunho mudou/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar rascunho' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Recarregar dados' }));
    expect(await screen.findByDisplayValue('Maria Souza')).toBeVisible();
    expect(put).toHaveBeenCalledTimes(1);
  });
});
