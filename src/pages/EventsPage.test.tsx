import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { useAuth } from '../auth/AuthContext';
import { EventsPage } from './EventsPage';
import { fromApiDateTime } from '../utils/dateTime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QuickCreateContext, type QuickCreateValue } from '../context/quickCreateCore';
import { servicosConfig } from '../resources/fornecedorConveniencia';

vi.mock('../workspace/OperationalWorkspaceContext', () => ({
  useOperationalWorkspace: vi.fn(),
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../components/SnackbarProvider', () => ({ useSnackbar: () => ({ notify: vi.fn() }) }));

afterEach(() => vi.restoreAllMocks());

function renderPage(path = '/app/eventos', quick: QuickCreateValue | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<MemoryRouter initialEntries={[path]}><QueryClientProvider client={client}>
    <QuickCreateContext.Provider value={quick}>
    <CurrentPath />
    <Routes>
      <Route path="/app/eventos" element={<EventsPage />} />
      <Route path="/app/eventos/:eventId" element={<EventsPage />} />
      <Route path="/app/patio" element={<h1>Operação do pátio</h1>} />
    </Routes>
    </QuickCreateContext.Provider>
  </QueryClientProvider></MemoryRouter>);
}

function CurrentPath() { return <output aria-label="Caminho atual">{useLocation().pathname}</output>; }

describe('EventsPage', () => {
  it('pede o pátio antes das datas se o usuário pode consultar e vincular pátios', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7, timeZone: 'America/Sao_Paulo' },
      permissions: ['events:read', 'events:create', 'facilities:manage', 'inventory:read', 'inventory:manage'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0 } });
    renderPage('/app/eventos?formulario=evento');
    expect(await screen.findByRole('combobox', { name: /Pátio do evento/ })).toBeVisible();
    expect(screen.queryByLabelText(/Início/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar evento' })).toBeDisabled();
    expect(get.mock.calls.some(([path]) => path.includes('/availability'))).toBe(false);
  });
  it('não usa um fuso arbitrário quando o contexto da organização ainda não o informa', () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['events:read', 'events:create', 'organizations:admin'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0 } });
    renderPage('/app/eventos?formulario=evento');
    expect(screen.getByRole('alert')).toHaveTextContent('O fuso da organização não está disponível');
    expect(screen.getByRole('button', { name: 'Criar evento' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar local' }));
    expect(screen.getByRole('alert')).toHaveTextContent('O fuso da organização não está disponível');
    expect(screen.getByRole('button', { name: 'Criar local' })).toBeDisabled();
  });

  it('abre o formulário de evento pelo atalho da home somente com permissão de criação', () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['events:read', 'events:create'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0 } });
    const page = renderPage('/app/eventos?formulario=evento');
    expect(screen.getByRole('textbox', { name: 'Nome do evento' })).toBeInTheDocument();
    page.unmount();
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['events:read'] } as ReturnType<typeof useAuth>);
    renderPage('/app/eventos?formulario=evento');
    expect(screen.queryByRole('textbox', { name: 'Nome do evento' })).not.toBeInTheDocument();
  });

  it('cadastra pelo seletor padrão, atualiza os resultados e só seleciona após um clique', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7, timeZone: 'America/Sao_Paulo' },
      permissions: ['events:read', 'events:create', 'catalog:read', 'catalog:manage'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    let created = false;
    vi.spyOn(api, 'get').mockImplementation(async (path) => ({ data: { totalPages: 1,
      content: path.endsWith('/service-options') && created ? [{ id: 5, name: 'Estacionamento cadastrado' }] : [],
      totalElements: path.endsWith('/service-options') && created ? 1 : 0,
    } }));
    const post = vi.spyOn(api, 'post');
    const openCreate = vi.fn(async () => { created = true; return 5; });
    renderPage('/app/eventos?formulario=evento', { configFor: (base) => base === '/api/servicos' ? servicosConfig : undefined,
      openCreate, openEdit: vi.fn() });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome do evento' }), { target: { value: 'Festival' } });
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar tipo de serviço' }));
    const dialog = await screen.findByRole('dialog', { name: 'Selecionar tipo de serviço' });
    expect(await within(dialog).findByText('Nenhum registro encontrado.')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cadastrar serviço' }));
    expect(openCreate).toHaveBeenCalledWith(servicosConfig);
    await within(dialog).findByRole('button', { name: 'Estacionamento cadastrado' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Fechar' }));
    expect(await screen.findByRole('textbox', { name: 'Tipo de serviço' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Nome do evento' })).toHaveValue('Festival');
    fireEvent.click(screen.getByRole('button', { name: 'Selecionar tipo de serviço' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Estacionamento cadastrado' }));
    expect(await screen.findByRole('textbox', { name: 'Tipo de serviço' })).toHaveValue('Estacionamento cadastrado');
    expect(screen.getByRole('button', { name: 'Criar evento' })).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  });

  it('redireciona link antigo para a subpágina e consulta o evento sem carregar a lista', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['events:read', 'events:create'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const evento = { id: 42, name: 'Festival', startsAt: '2026-08-04T18:00:00Z', timeZone: 'America/Manaus',
      status: 'RASCUNHO', reentryPolicy: null, version: 2 };
    const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/cobranca-patio') ? '' : evento }));
    renderPage('/app/eventos?evento=42');
    expect(await screen.findByRole('heading', { name: 'Preparar portaria' })).toBeInTheDocument();
    expect(screen.getByLabelText('Caminho atual')).toHaveTextContent('/app/eventos/42');
    expect(screen.queryByRole('heading', { name: 'Eventos e ofertas' })).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/v1/events/42', expect.anything());
    expect(get).not.toHaveBeenCalledWith('/api/v1/events', expect.anything());
    expect(get).toHaveBeenCalledWith('/api/v1/events/42/patio-operation-summary', expect.anything());
    expect(screen.queryByRole('button', { name: 'Iniciar portaria sem venda antecipada' })).not.toBeInTheDocument();
  });

  it('impede consulta direta sem leitura de eventos', () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['events:create'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const get = vi.spyOn(api, 'get');
    renderPage('/app/eventos/42');
    expect(screen.getByRole('alert')).toHaveTextContent('Evento indisponível neste contexto.');
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Ciclo de vida' })).not.toBeInTheDocument();
  });
  it('prioriza portaria e só apresenta produto e lote ao escolher venda antecipada', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 },
      permissions: ['events:read', 'events:create', 'pricing:read', 'pricing:manage', 'inventory:read'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0 } });
    renderPage();
    expect(screen.queryByRole('tab', { name: 'Produto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Lote de preço' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Configurar venda antecipada' }));
    expect(screen.getByRole('tab', { name: 'Produto' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Produto' }));
    expect(screen.queryByRole('link', { name: 'Voltar à portaria' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar à lista de eventos' }));
    expect(screen.getByRole('tab', { name: 'Evento', selected: true })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Produto' })).not.toBeInTheDocument();
  });
  it('volta à portaria real a partir do catálogo para quem tem acesso ao pátio', async () => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 7 },
      permissions: ['events:read', 'operations:checkout'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockResolvedValue({ data: { content: [], totalElements: 0, totalPages: 0 } });
    renderPage();
    const link = screen.getByRole('link', { name: 'Voltar à portaria' });
    expect(link).toHaveAttribute('href', '/app/patio');
    await userEvent.click(link);
    expect(await screen.findByRole('heading', { name: 'Operação do pátio' })).toBeInTheDocument();
    expect(screen.getByLabelText('Caminho atual')).toHaveTextContent('/app/patio');
  });
  it.each([true, false])('respeita a permissão de criar local pelo evento (admin=%s)', async (admin) => {
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2, timeZone: 'America/Manaus' },
      permissions: ['events:create', ...(admin ? ['organizations:admin'] : [])] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/installation-cities')
      ? { content: [{ id: 5, nome: 'Cascavel' }], totalElements: 1 }
      : url.endsWith('/service-options') ? { content: [{ id: 9, name: 'Estacionamento' }], totalElements: 1 }
      : { content: [], totalElements: 0 } }));
    const post = vi.spyOn(api, 'post').mockImplementation(async (url) => ({ data: url.endsWith('/venues')
      ? { id: 42, name: 'Centro de Eventos', version: 0 }
      : { id: 21, name: 'Festival', version: 0, status: 'RASCUNHO' } }));
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Novo evento' }));
    if (!admin) {
      expect(screen.queryByRole('button', { name: 'Cadastrar local' })).not.toBeInTheDocument();
      expect(post).not.toHaveBeenCalled();
      return;
    }
    await user.type(screen.getByRole('textbox', { name: 'Nome do evento' }), 'Festival');
    await user.click(screen.getByRole('button', { name: 'Selecionar tipo de serviço' }));
    await user.click(await screen.findByRole('button', { name: 'Estacionamento' }));
    await user.click(await screen.findByRole('button', { name: 'Cadastrar local' }));
    expect(screen.queryByLabelText(/Fuso horário/)).not.toBeInTheDocument();
    for (const [label, value] of [['Nome', 'Centro de Eventos'], ['Endereço', 'Rua A'], ['Bairro', 'Centro'], ['CEP', '85000-000']]) {
      await user.type(screen.getByRole('textbox', { name: label }), value);
    }
    await user.type(screen.getByRole('combobox', { name: 'Cidade' }), 'Cascavel');
    await user.click(await screen.findByRole('option', { name: 'Cascavel' }));
    await user.click(screen.getByRole('button', { name: 'Criar local' }));
    expect(post).toHaveBeenCalledWith('/api/v1/venues', expect.objectContaining({ timeZone: 'America/Manaus' }));
    expect(await screen.findByRole('textbox', { name: 'Nome do evento' })).toHaveValue('Festival');
    expect(screen.getByRole('textbox', { name: 'Tipo de serviço' })).toHaveValue('Estacionamento');
    expect(screen.getByRole('combobox', { name: 'Local do evento' })).toHaveValue('Centro de Eventos');
    expect(screen.getByLabelText(/^Início/)).toHaveValue('');
    expect(screen.getByLabelText(/^Fim/)).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Criar evento' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^Início/), { target: { value: '2026-08-04T14:00' } });
    fireEvent.change(screen.getByLabelText(/^Fim/), { target: { value: '2026-08-04T13:00' } });
    expect(screen.getByText('O fim deve ser posterior ao início.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Criar evento' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Novo evento' }));
    expect(post).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByLabelText(/^Fim/), { target: { value: '2026-08-04T19:00' } });
    await user.click(screen.getByRole('button', { name: 'Criar evento' }));
    expect(post).toHaveBeenCalledWith('/api/v1/events', expect.objectContaining({ name: 'Festival', venueId: 42, serviceId: 9 }), expect.anything());
  }, 15000);
  it('usa politica explicita ao atualizar evento legado sem politica', async () => {
    const remember = vi.fn();
    const evento = { id: 1, venueId: 1, name: 'Festival legado', startsAt: '2026-08-04T03:00:00Z',
      endsAt: '2026-08-04T06:00:00Z', timeZone: 'America/Sao_Paulo', status: 'RASCUNHO', reentryPolicy: null, version: 0 };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({
      data: url.endsWith('/cobranca-patio') ? { modo: 'ENTRADA', valor: '20.000000' }
        : url.endsWith('/patio-operation-summary') ? {
          preparacao: { localAtivo: true, alocacao: true, cobranca: true, politica: false, semVendaAntecipada: true, pronto: false,
            pendencias: ['Defina a política de reentrada.'] },
          operacao: { entradas: 0, abertos: 0, encerrados: 0, cancelados: 0, ocupacaoCredenciais: 0 },
          financeiro: null, fiscal: null,
        } : url.endsWith('/venues') ? { content: [], totalElements: 0 } : evento,
    }));
    vi.mocked(useAuth).mockReturnValue({ permissions: ['events:read', 'events:create'],
      activeOrganization: { organizationId: 2 } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [],
      remember,
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'patch').mockResolvedValueOnce({ data: {
      id: 1, venueId: 1, name: 'Festival legado', startsAt: '2026-08-04T03:00:00Z',
      endsAt: '2026-08-04T06:00:00Z', timeZone: 'America/Sao_Paulo', status: 'RASCUNHO',
      reentryPolicy: 'ENTRADA_UNICA', version: 1,
    } });

    renderPage('/app/eventos/1');
    await userEvent.click(await screen.findByRole('button', { name: 'Salvar configuração' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledOnce());
    expect(api.patch).toHaveBeenCalledWith('/api/v1/events/1', { reentryPolicy: 'ENTRADA_UNICA' },
      { headers: { 'If-Match': '"0"' } });
    await waitFor(() => expect(remember).toHaveBeenCalledWith('event', expect.objectContaining({ id: 1, version: 1 })));
    expect(screen.getByLabelText('Caminho atual')).toHaveTextContent('/app/eventos/1');
  });

  it('herda janela e quota da alocacao real ao configurar produto', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path) => ({ data: String(path) === '/api/v1/events'
      ? { content: [{ id: 1, name: 'Evento 1' }], totalElements: 1, totalPages: 1 }
      : [] }));
    vi.mocked(useAuth).mockReturnValue({
      permissions: ['pricing:manage', 'pricing:read', 'inventory:read', 'events:read'],
      activeOrganization: { organizationId: 1 },
    } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: (kind: string) => kind === 'allocation' ? [{
        id: 3,
        label: 'Evento 1 / Patio 1',
        version: 0,
        updatedAt: '',
        snapshot: {
          id: 3, eventId: 1, parkingFacilityId: 1,
          startsAt: '2026-08-04T03:34:00Z', endsAt: '2026-08-04T08:34:00Z',
          operationalCapacity: 10, sellableCapacity: 9, reservedCapacity: 1, version: 0,
        },
      }] : [],
      remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    renderPage();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/events', expect.any(Object)));
    await userEvent.click(screen.getByRole('button', { name: 'Configurar venda antecipada' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Produto' }));
    await userEvent.click(screen.getByRole('button', { name: 'Novo produto' }));
    await userEvent.click(screen.getByRole('combobox', { name: /Alocação/ }));
    await userEvent.click(screen.getByRole('option', { name: 'Evento 1 / Patio 1' }));

    expect(screen.getByRole('combobox', { name: 'Evento' })).toHaveValue('Evento 1');
    expect(screen.queryByRole('combobox', { name: 'Evento para listar produtos' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Cota/)).toHaveValue(9);
    expect(screen.getByLabelText(/Início do acesso/)).toHaveValue(fromApiDateTime('2026-08-04T03:34:00Z'));
    expect(screen.getByLabelText(/Fim do acesso/)).toHaveValue(fromApiDateTime('2026-08-04T08:34:00Z'));
  });

  it('abre alocação por URL, consulta o registro pela API e volta com o filtro do evento', async () => {
    const evento = { id: 1, name: 'Festival' };
    const allocation = { id: 3, eventId: 1, parkingFacilityId: 1, parkingFacilityName: 'Pátio Norte',
      startsAt: '2026-08-04T03:34:00Z', endsAt: '2026-08-04T08:34:00Z',
      operationalCapacity: 10, sellableCapacity: 9, reservedCapacity: 1, version: 2 };
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['events:read', 'inventory:read', 'inventory:manage'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/parking-allocations')
      ? [allocation] : { content: [evento], totalElements: 1, totalPages: 1 } }));
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: allocation });
    renderPage('/app/eventos?aba=alocacao&evento-catalogo=1&detalhe=3');
    expect(await screen.findByRole('heading', { name: /Pátio Norte/ })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Evento para listar alocações' })).not.toBeInTheDocument();
    const operational = screen.getByRole('spinbutton', { name: 'Capacidade operacional' });
    fireEvent.change(operational, { target: { value: '9' } });
    expect(screen.getByRole('button', { name: 'Atualizar capacidades' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: /Pátio Norte/ }));
    expect(patch).not.toHaveBeenCalled();
    fireEvent.change(operational, { target: { value: '10' } });
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar capacidades' }));
    expect(patch).toHaveBeenCalledWith('/api/v1/parking-allocations/3',
      { operationalCapacity: 10, sellableCapacity: 9, reservedCapacity: 1 }, { headers: { 'If-Match': '"2"' } });
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('tab', { name: 'Alocação', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Evento para listar alocações' })).toHaveValue('Festival');
  });

  it('permite consultar o produto e seus lotes sem conceder publicação ou criação ao leitor', async () => {
    const evento = { id: 1, name: 'Festival' };
    const product = { id: 4, name: 'Estacionamento coberto', category: 'COMUM', quota: 50, status: 'ATIVO',
      accessStartsAt: '2026-08-04T03:34:00Z', accessEndsAt: '2026-08-04T08:34:00Z', version: 1 };
    const tier = { id: 9, name: 'Primeiro lote', currency: 'BRL', price: '20.123456', quantity: 30, priority: 0,
      salesStartsAt: product.accessStartsAt, salesEndsAt: product.accessEndsAt };
    vi.mocked(useAuth).mockReturnValue({ activeOrganization: { organizationId: 2 },
      permissions: ['events:read', 'pricing:read'] } as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({ recent: () => [], remember: vi.fn() } as unknown as ReturnType<typeof useOperationalWorkspace>);
    const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/parking-products') ? [product]
      : url.endsWith('/price-tiers') ? [tier] : { content: [evento], totalElements: 1, totalPages: 1 } }));
    const opened = renderPage('/app/eventos?aba=produto&evento-catalogo=1&detalhe=4');
    expect(await screen.findByRole('heading', { name: product.name })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publicar produto' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByRole('button', { name: 'Novo produto' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Evento para listar produtos' })).toHaveValue('Festival');
    opened.unmount();

    renderPage('/app/eventos?aba=lote&evento-catalogo=1&produto-catalogo=4&detalhe=9');
    expect(await screen.findByRole('heading', { name: tier.name })).toBeInTheDocument();
    expect(screen.getByText(/20,123456/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/api/v1/parking-products/4/price-tiers');
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByRole('combobox', { name: 'Produto para listar lotes' })).toHaveValue(product.name);
    expect(screen.queryByRole('button', { name: 'Novo lote de preço' })).not.toBeInTheDocument();
  });

  it('mantem somente a consulta de disponibilidade para membro sem permissoes de configuracao', () => {
    vi.mocked(useAuth).mockReturnValue({ permissions: [] } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember: vi.fn(),
    } as unknown as ReturnType<typeof useOperationalWorkspace>);

    renderPage();

    expect(screen.getByRole('tab', { name: 'Disponibilidade' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Evento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Alocação' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Produto' })).not.toBeInTheDocument();
  });

  it('cria evento com contrato temporal e chave idempotente', async () => {
    const remember = vi.fn();
    const evento = { id: 12, venueId: 3, serviceId: 9, serviceName: 'Estacionamento', name: 'Festival Kaneko', startsAt: '2026-08-04T18:00:00Z',
      endsAt: '2026-08-04T23:00:00Z', timeZone: 'America/Manaus', status: 'RASCUNHO', reentryPolicy: 'ENTRADA_UNICA', version: 0 };
    vi.spyOn(api, 'get').mockImplementation(async (url, config) => ({ data:
      String(url).endsWith('/cobranca-patio') ? '' : String(url).endsWith('/events/12') ? evento
        : String(url).endsWith('/service-options')
        ? { content: [{ id: 9, name: 'Estacionamento' }], totalElements: 1, totalPages: 1 }
        : String(url).endsWith('/venues') && (config?.params.name === 'conven' || config?.params.id === 3)
        ? { content: [{ id: 3, name: 'Centro de Convenções' }], totalElements: 1, totalPages: 1 }
        : { content: [], totalElements: 0, totalPages: 0 } }));
    vi.mocked(useAuth).mockReturnValue({ permissions: ['events:read', 'events:create'], activeOrganization: { organizationId: 7,
      timeZone: 'America/Manaus' } } as unknown as ReturnType<typeof useAuth>);
    vi.mocked(useOperationalWorkspace).mockReturnValue({
      recent: () => [], remember,
    } as unknown as ReturnType<typeof useOperationalWorkspace>);
    vi.spyOn(api, 'post').mockResolvedValueOnce({ data: evento });

    renderPage('/app/eventos', { configFor: (base) => base === '/api/servicos' ? servicosConfig : undefined,
      openCreate: vi.fn(), openEdit: vi.fn() });
    const user = userEvent.setup();
    expect(screen.queryByLabelText(/Nome do evento/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Novo evento' }));
    expect(screen.getByRole('heading', { name: 'Novo evento' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Novo evento' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Novo evento' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Fuso horário/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Início/), { target: { value: '2026-08-04T14:00' } });
    fireEvent.change(screen.getByLabelText(/^Fim/), { target: { value: '2026-08-04T19:00' } });
    await user.type(screen.getByLabelText(/Nome do evento/), 'Festival Kaneko');
    expect(screen.queryByLabelText(/Código de referência/)).not.toBeInTheDocument();
    await user.type(screen.getByRole('combobox', { name: 'Local do evento' }), 'conven');
    await user.click(await screen.findByRole('option', { name: 'Centro de Convenções' }));
    const service = screen.getByRole('textbox', { name: 'Tipo de serviço' });
    expect(service).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Criar evento' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Novo evento' }));
    expect(api.post).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Selecionar tipo de serviço' }));
    expect(screen.queryByRole('button', { name: 'Cadastrar serviço' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Pesquisar tipo de serviço' }), { target: { value: 'esta' } });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/events/service-options',
      expect.objectContaining({ params: expect.objectContaining({ q: 'esta' }) })));
    await user.click(await screen.findByRole('button', { name: 'Estacionamento' }));
    await user.click(await screen.findByRole('button', { name: 'Criar evento' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    const [, payload, config] = vi.mocked(api.post).mock.calls[0];
    expect(payload).toMatchObject({ name: 'Festival Kaneko', venueId: 3, serviceId: 9, timeZone: 'America/Manaus',
      startsAt: '2026-08-04T18:00:00.000Z', endsAt: '2026-08-04T23:00:00.000Z' });
    expect(config?.headers).toHaveProperty('Idempotency-Key');
    expect(remember).toHaveBeenCalledWith('event', expect.objectContaining({ id: 12, version: 0 }));
    await waitFor(() => expect(screen.getByLabelText('Caminho atual')).toHaveTextContent('/app/eventos/12'));
    expect(await screen.findByText('Serviço: Estacionamento')).toBeVisible();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/events', expect.objectContaining({ params: expect.any(Object) })));
  });

  it('mantém a listagem separada e permite abrir o evento e voltar', async () => {
    const remember = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ permissions: ['events:read', 'events:create', 'events:publish'],
      activeOrganization: { organizationId: 7 } } as unknown as ReturnType<typeof useAuth>);
    const workspace = { recent: () => [], remember } as unknown as
      ReturnType<typeof useOperationalWorkspace>;
    vi.mocked(useOperationalWorkspace).mockReturnValue(workspace);
    const evento = { id: 42, venueId: 3, name: 'Festival Persistido', startsAt: '2026-08-20T18:00:00Z',
      endsAt: '2026-08-20T23:00:00Z', timeZone: 'America/Sao_Paulo', status: 'RASCUNHO', reentryPolicy: null, version: 0 };
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: url.endsWith('/patio-operation-summary')
      ? { preparacao: { localAtivo: true, alocacao: false, cobranca: false, politica: false, semVendaAntecipada: true, pronto: false, pendencias: [] },
        operacao: { entradas: 0, abertos: 0, encerrados: 0, cancelados: 0, ocupacaoCredenciais: 0 }, financeiro: null, fiscal: null }
      : url.endsWith('/cobranca-patio') ? '' : url.endsWith('/events/42') ? evento : { content: [evento], totalElements: 1, totalPages: 1 } }));

    renderPage();

    expect(screen.queryByRole('heading', { name: 'Ciclo de vida' })).not.toBeInTheDocument();
    const [eventCard] = await screen.findAllByRole('button', { name: 'Abrir detalhes de Festival Persistido' });
    await userEvent.click(eventCard);
    expect(await screen.findByRole('heading', { name: 'Festival Persistido', level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Executar operação' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Opções avançadas' }));
    expect(await screen.findByRole('heading', { name: 'Ciclo de vida' })).toBeInTheDocument();
    expect(screen.getByText('Rascunho', { exact: true })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Eventos e ofertas' })).not.toBeInTheDocument();
    expect(remember).toHaveBeenCalledWith('event', expect.objectContaining({ id: 42, version: 0 }));
    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(await screen.findByRole('heading', { name: 'Eventos e ofertas' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ciclo de vida' })).not.toBeInTheDocument();
  });
});
