import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../api/client';
import type { EventResponse } from '../../api/eventCatalog';
import { useAuth } from '../../auth/AuthContext';
import { EventPatioOperation, formatEventMoney } from './EventPatioOperation';
import type { EventPatioSummary } from '../../api/eventPatioSummary';

vi.mock('../../auth/AuthContext', () => ({ useAuth: vi.fn() }));
afterEach(() => vi.restoreAllMocks());
const event = { id: 8, venueId: 2, name: 'Festival', startsAt: new Date(Date.now() - 3600000).toISOString(),
  endsAt: new Date(Date.now() + 3600000).toISOString(), timeZone: 'America/Sao_Paulo', status: 'RASCUNHO', version: 4,
  reentryPolicy: 'ENTRADA_UNICA' } satisfies EventResponse;
const baseSummary: EventPatioSummary = { eventoId: 8, nome: 'Festival', status: 'RASCUNHO',
  preparacao: { localAtivo: true, alocacao: true, cobranca: true, politica: true, semVendaAntecipada: true, pronto: true, pendencias: [] },
  operacao: { entradas: 12, abertos: 2, encerrados: 9, cancelados: 1, ocupacaoCredenciais: 0 },
  financeiro: null, fiscal: null };
function mount(permissions: string[], summary = baseSummary, current = event as EventResponse, charge: unknown = '', initialFacilityId?: number) {
  vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 }, permissions } as ReturnType<typeof useAuth>);
  const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/patio-operation-summary') ? summary
    : url.endsWith('/parking-allocations') ? [] : url.endsWith('/cobranca-patio') ? charge
      : url.endsWith('/parking-facilities/42') ? { id: 42, active: true, operationalCapacity: 80 }
      : url.endsWith('/parking-facilities/42/availability') ? { operationalCapacity: 80, availableCapacity: 63, segments: [] }
      : { content: [{ id: 42, name: 'Pátio Norte' }], totalElements: 1 } }));
  const changed = vi.fn();
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <EventPatioOperation event={current} onChanged={changed} initialFacilityId={initialFacilityId} />
  </QueryClientProvider></MemoryRouter>);
  return { get, changed };
}
describe('Preparação da portaria e resumo do evento', () => {
  it('carrega o pátio escolhido no cadastro e usa o menor saldo no período, não o total do pátio', async () => {
    const { get } = mount(['events:read', 'inventory:read', 'inventory:manage', 'facilities:manage'],
      { ...baseSummary, preparacao: { ...baseSummary.preparacao, alocacao: false, pronto: false } }, event, '', 42);
    expect(await screen.findByText(/63 vagas disponíveis durante todo o evento/)).toBeVisible();
    expect(screen.getByRole('spinbutton', { name: 'Quantos carros podem entrar?' })).toHaveAttribute('max', '63');
    expect(get).toHaveBeenCalledWith('/api/v1/parking-facilities/42/availability', expect.objectContaining({
      params: expect.objectContaining({ startsAt: event.startsAt, endsAt: event.endsAt }),
    }));
  });
  it('reúne pátio, vagas, preço e reentrada no mesmo formulário de preparação', async () => {
    mount(['events:read', 'events:create', 'inventory:read', 'inventory:manage', 'facilities:manage'],
      { ...baseSummary, preparacao: { ...baseSummary.preparacao, alocacao: false, cobranca: false, politica: false, pronto: false } });
    expect(await screen.findByRole('form', { name: 'Configurar portaria' })).toContainElement(
      screen.getByRole('combobox', { name: 'Pátio do evento' }));
    expect(screen.getByLabelText(/Valor por carro/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Permitir reentrada?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar cobrança do pátio' })).not.toBeInTheDocument();
  });
  it('mostra pendências sem conceder configuração a quem só consulta', async () => {
    mount(['events:read'], { ...baseSummary, preparacao: { ...baseSummary.preparacao, politica: false, pronto: false,
      pendencias: ['Defina a política de reentrada.'] } });
    expect(await screen.findByText('Defina a política de reentrada.')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Permitir reentrada?' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gerenciar equipe' })).not.toBeInTheDocument();
  });
  it('mantém gestão de equipe protegida e fora da preparação', async () => {
    const post = vi.spyOn(api, 'post');
    mount(['events:read', 'events:create', 'organizations:admin'],
      { ...baseSummary, preparacao: { ...baseSummary.preparacao, politica: false, pronto: false } });
    expect(screen.queryByRole('link', { name: 'Gerenciar equipe' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: 'Opções avançadas' }));
    expect(screen.getByRole('link', { name: 'Gerenciar equipe' })).toHaveAttribute('href', '/app/administracao');
    expect(post).not.toHaveBeenCalled();
  });
  it('preserva seis casas e sinal da diferença sem converter para ponto flutuante', () => {
    expect(formatEventMoney('123456789012.123456')).toBe('R$ 123.456.789.012,123456');
    expect(formatEventMoney('-2.000001')).toBe('R$ -2,000001');
    expect(formatEventMoney('-0.000001')).toBe('R$ -0,000001');
    expect(formatEventMoney('0.000000')).toBe('R$ 0,00');
  });
  it('não consulta nem mostra ações sem leitura de eventos', () => {
    const { get } = mount(['operations:checkout']);
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByText('Preparar portaria')).not.toBeInTheDocument();
  });
  it('respeita as seções restritas e não oferece início sem as duas permissões', async () => {
    mount(['events:read', 'access:operate']);
    await screen.findByRole('form', { name: 'Configurar portaria' });
    expect(screen.queryByRole('button', { name: 'Revisar abertura' })).not.toBeInTheDocument();
    expect(screen.queryByText('Total líquido')).not.toBeInTheDocument();
    expect(screen.queryByText(/NFS-e pendentes:/)).not.toBeInTheDocument();
  });
  it('inicia pela ação explícita avulsa e a versão atual sem abrir vendas', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...event, status: 'EM_OPERACAO', version: 5 } });
    const { changed } = mount(['events:read', 'events:publish', 'access:operate']);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Revisar abertura' }));
    await screen.findByRole('alertdialog', { name: 'Abrir portaria?' });
    expect(post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Abrir portaria' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/events/8/patio-operation-start',
      { confirmed: true }, { headers: { 'If-Match': '"4"' } }));
    expect(changed).toHaveBeenCalledWith(expect.objectContaining({ status: 'EM_OPERACAO' }));
  });
  it('não oferece abertura antecipada e mantém a política que já foi configurada', async () => {
    mount(['events:read', 'events:create', 'events:publish', 'access:operate'], baseSummary,
      { ...event, startsAt: new Date(Date.now() + 86400000).toISOString(), endsAt: new Date(Date.now() + 90000000).toISOString(),
        reentryPolicy: 'REENTRADA_PERMITIDA' }, { modo: 'ENTRADA', valor: '20.000000' });
    expect(await screen.findByRole('combobox', { name: 'Permitir reentrada?' })).toHaveTextContent('Sim, permitir reentrada');
    expect(await screen.findByText(/Configuração salva\. A portaria está fechada.*A abertura é manual/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revisar abertura/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar configuração' })).not.toBeInTheDocument();
  });
  it('explica que um evento encerrado pelo horário não pode abrir', async () => {
    const post = vi.spyOn(api, 'post');
    mount(['events:read', 'events:publish', 'access:operate'], baseSummary,
      { ...event, startsAt: new Date(Date.now() - 7200000).toISOString(), endsAt: new Date(Date.now() - 3600000).toISOString() });
    expect(await screen.findByText(/O horário do evento já terminou/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Revisar abertura' })).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  it('mostra a recusa da API fora da confirmação e não sinaliza portaria aberta', async () => {
    vi.spyOn(api, 'post').mockRejectedValue(new Error('Pátio indisponível'));
    const { changed } = mount(['events:read', 'events:publish', 'access:operate']);
    await userEvent.click(await screen.findByRole('button', { name: 'Revisar abertura' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Abrir portaria' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByText('Pátio indisponível')).toBeVisible();
    expect(changed).not.toHaveBeenCalled();
  });
  it('grava o pátio no período do evento sem cotas comerciais', async () => {
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });
    mount(['events:read', 'inventory:read', 'inventory:manage', 'facilities:manage'],
      { ...baseSummary, preparacao: { ...baseSummary.preparacao, alocacao: false, pronto: false } });
    const user = userEvent.setup();
    await user.type(await screen.findByRole('combobox', { name: 'Pátio do evento' }), 'Norte');
    await user.click(await screen.findByRole('option', { name: 'Pátio Norte' }));
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Quantos carros podem entrar?' })).toBeEnabled());
    await user.type(screen.getByRole('spinbutton', { name: 'Quantos carros podem entrar?' }), '60');
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/v1/events/8/parking-allocations',
      { parkingFacilityId: 42, startsAt: event.startsAt, endsAt: event.endsAt, operationalCapacity: 60,
        sellableCapacity: 0, reservedCapacity: 0 }, expect.anything()));
  });
  it('impede exceder o limite do pátio e revalida ao selecionar um menor', async () => {
    const { get } = mount(['events:read', 'inventory:read', 'inventory:manage', 'facilities:manage'],
      { ...baseSummary, preparacao: { ...baseSummary.preparacao, alocacao: false, pronto: false } });
    const original = get.getMockImplementation()!;
    get.mockImplementation(async (url, config) => url.endsWith('/parking-facilities/43/availability')
      ? { data: { operationalCapacity: 80, availableCapacity: 10, segments: [] } }
      : url.endsWith('/parking-facilities') ? { data: { content: [{ id: 42, name: 'Pátio Norte' }, { id: 43, name: 'Pátio Sul' }], totalElements: 2 } }
        : original(url, config));
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 1 } });
    const user = userEvent.setup();
    const facility = await screen.findByRole('combobox', { name: 'Pátio do evento' });
    const capacity = screen.getByRole('spinbutton', { name: 'Quantos carros podem entrar?' });
    expect(capacity).toBeDisabled();
    await user.type(facility, 'Norte');
    await user.click(await screen.findByRole('option', { name: 'Pátio Norte' }));
    await waitFor(() => expect(capacity).toHaveAttribute('max', '63'));
    fireEvent.change(capacity, { target: { value: '100000' } });
    expect(capacity).toHaveValue(null);
    fireEvent.change(capacity, { target: { value: '60' } });
    await user.clear(facility);
    await user.type(facility, 'Sul');
    await user.click(await screen.findByRole('option', { name: 'Pátio Sul' }));
    await waitFor(() => expect(capacity).toHaveAttribute('max', '10'));
    expect(capacity).toHaveValue(60);
    expect(screen.getByRole('button', { name: 'Salvar configuração' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Configurar portaria' }));
    expect(post).not.toHaveBeenCalled();
    fireEvent.change(capacity, { target: { value: '10' } });
    await user.click(screen.getByRole('button', { name: 'Salvar configuração' }));
    expect(post).toHaveBeenCalledWith('/api/v1/events/8/parking-allocations',
      expect.objectContaining({ parkingFacilityId: 43, operationalCapacity: 10 }), expect.anything());
  });
  it('retoma o salvamento após falha de cobrança e só abre com confirmação e versão corrente', async () => {
    const user = userEvent.setup();
    const current = { ...event, reentryPolicy: null, startsAt: new Date(Date.now() - 3600000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString() };
    const missing = { ...baseSummary, preparacao: { ...baseSummary.preparacao, alocacao: false, cobranca: false, politica: false, pronto: false } };
    const { get } = mount(['events:read', 'events:create', 'inventory:read', 'inventory:manage', 'facilities:manage',
      'events:publish', 'access:operate'], missing, current);
    let ready = false;
    const original = get.getMockImplementation()!;
    get.mockImplementation(async (url, cfg) => url.endsWith('/patio-operation-summary') && ready
      ? { data: baseSummary } : original(url, cfg));
    const post = vi.spyOn(api, 'post').mockImplementation(async (url) => ({ data: url.endsWith('/parking-allocations')
      ? { id: 2, parkingFacilityName: 'Pátio Norte' } : { ...current, status: 'EM_OPERACAO', version: 6 } }));
    const put = vi.spyOn(api, 'put').mockRejectedValueOnce(new Error('Cobrança indisponível'))
      .mockResolvedValueOnce({ data: { modo: 'SAIDA', valor: '12.345678' } });
    const patch = vi.spyOn(api, 'patch').mockImplementation(async () => {
      ready = true;
      return { data: { ...current, version: 5, reentryPolicy: 'ENTRADA_UNICA' } };
    });
    await user.type(await screen.findByRole('combobox', { name: 'Pátio do evento' }), 'Norte');
    await user.click(await screen.findByRole('option', { name: 'Pátio Norte' }));
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Quantos carros podem entrar?' })).toBeEnabled());
    await user.type(screen.getByRole('spinbutton', { name: 'Quantos carros podem entrar?' }), '60');
    await user.type(screen.getByLabelText(/Valor por carro/), '12,345678');
    await user.click(screen.getByRole('combobox', { name: 'Quando cobrar' }));
    await user.click(screen.getByRole('option', { name: 'Na saída' }));
    await user.click(screen.getByRole('button', { name: 'Salvar e revisar abertura' }));
    expect(await screen.findByText(/As etapas já salvas/)).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
    expect(post).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Salvar e revisar abertura' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Abrir portaria?' });
    expect(dialog).toHaveTextContent('R$ 12,35 por carro, na saída');
    expect(put).toHaveBeenLastCalledWith('/api/v1/events/8/cobranca-patio', { modo: 'SAIDA', valor: '12.345678' });
    expect(post).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('/api/v1/events/8', { reentryPolicy: 'ENTRADA_UNICA' }, { headers: { 'If-Match': '"4"' } });
    await user.click(screen.getByRole('button', { name: 'Abrir portaria' }));
    expect(post).toHaveBeenLastCalledWith('/api/v1/events/8/patio-operation-start', { confirmed: true }, { headers: { 'If-Match': '"5"' } });
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('mostra fontes financeiras líquidas e pendências reais sem prometer emissão fiscal', async () => {
    const summary: EventPatioSummary = { ...baseSummary,
      financeiro: { dinheiro: '100.000001', pix: '30.000000', cartao: '0', total: '130.000001',
        turnosAbertos: 1, turnosFechados: 1, turnosMistos: 1, diferencaDinheiro: '-0.100001' },
      fiscal: { pendentes: 1, listaLimitada: false, itens: [{ movimentacaoId: 4, placa: 'ABC1D23',
        ordemServicoId: 5, ordemServicoNumero: 'OS-5', status: 'PENDENTE_EMISSAO', criadoEm: event.startsAt }] } };
    mount(['events:read', 'finance:read', 'fiscal:read', 'service_orders:read'], summary, { ...event, status: 'EM_OPERACAO' });
    expect(await screen.findByText('R$ 130,000001')).toBeInTheDocument();
    expect(screen.getByText(/A diferença é do turno inteiro/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consultar OS e pendência' })).toHaveAttribute('href', '/app/ordens-servico?detail=5');
    expect(screen.getByText(/Não são notas autorizadas/)).toBeInTheDocument();
  });
});
