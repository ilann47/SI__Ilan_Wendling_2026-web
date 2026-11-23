import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { ColorModeProvider } from '../context/ColorModeContext';
import { AppLayout } from '../layout/AppLayout';
import { HubHomePage } from './HubHomePage';

const state = vi.hoisted(() => ({ mobile: false, permissions: ['stock:read'] }));
vi.mock('@mui/material', async (importOriginal) => ({
  ...await importOriginal<typeof import('@mui/material')>(),
  useMediaQuery: () => state.mobile,
}));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({
  user: { login: 'joao', perfil: 'USUARIO' },
  activeOrganization: { organizationId: 2, legalName: 'Kaneko' },
  organizations: [{ organizationId: 2, legalName: 'Kaneko' }],
  permissions: state.permissions, logout: vi.fn(), selectOrganization: vi.fn(),
}) }));

function setup(path = '/app') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<ColorModeProvider><MemoryRouter initialEntries={[path]}><QueryClientProvider client={client}>
    <Routes><Route path="/app" element={<AppLayout />}>
      <Route index element={<HubHomePage />} />
      <Route path="estoque" element={<h1>Estoque selecionado</h1>} />
    </Route></Routes>
  </QueryClientProvider></MemoryRouter></ColorModeProvider>);
  return userEvent.setup();
}

describe('home do Hub', () => {
  beforeEach(() => {
    state.mobile = false;
    state.permissions = ['stock:read'];
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).includes('estoque-minimo')
      ? { total: 0, itens: [] }
      : String(url).includes('operational-pendencies') ? { referencia: '2026-09-12', total: 0, limitePorGrupo: 5, grupos: [] }
      : { content: [], totalElements: 0 } }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('separa o início do dia a dia e o de eventos, sem exigir evento para usar o pátio', async () => {
    state.permissions = ['events:read', 'events:create', 'facilities:manage', 'operations:read',
      'operations:manage', 'operations:checkout', 'customers:read', 'customers:manage'];
    const user = setup();
    const daily = screen.getByRole('button', { name: 'Estacionamento do dia a dia' });
    const events = screen.getByRole('button', { name: 'Estacionamento de eventos' });
    expect(api.get).not.toHaveBeenCalled();
    await user.click(daily);
    const guide = screen.getByRole('region', { name: 'Prepare o pátio comum' });
    expect(within(guide).getByRole('link', { name: 'Abrir Mensalistas' })).toHaveAttribute('href', '/app/mensalistas');
    expect(within(guide).getByRole('link', { name: 'Abrir Tarifas' })).toHaveAttribute('href', '/app/tarifas');
    expect(within(guide).getByRole('link', { name: 'Ir ao Pátio' })).toHaveAttribute('href', '/app/patio');
    expect(screen.queryByRole('link', { name: 'Criar primeiro evento' })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
    await user.click(events);
    expect(await screen.findByRole('link', { name: 'Criar primeiro evento' }))
      .toHaveAttribute('href', '/app/eventos?formulario=evento');
    expect(screen.queryByRole('region', { name: 'Prepare o pátio comum' })).not.toBeInTheDocument();
  });

  it('não oferece cadastros, caixa nem eventos a quem só gerencia instalações', () => {
    state.permissions = ['facilities:manage'];
    setup('/app?guia=eventos');
    const guide = screen.getByRole('region', { name: 'Prepare o pátio comum' });
    expect(within(guide).getByRole('link', { name: 'Abrir Instalações' })).toHaveAttribute('href', '/app/instalacoes');
    expect(within(guide).queryByRole('link', { name: 'Abrir Mensalistas' })).not.toBeInTheDocument();
    expect(within(guide).queryByRole('link', { name: 'Ir ao Pátio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Estacionamento de eventos' })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('mantém o atalho da listagem quando já há eventos e o usuário escolhe esse caminho', async () => {
    state.permissions = ['events:read', 'events:create', 'facilities:manage'];
    vi.mocked(api.get).mockResolvedValue({ data: { totalElements: 2, content: [{ id: 5, status: 'RASCUNHO' }] } });
    setup('/app?guia=eventos');
    expect(await screen.findByRole('link', { name: 'Abrir Eventos e ofertas' })).toHaveAttribute('href', '/app/eventos');
    expect(screen.queryByRole('link', { name: 'Criar primeiro evento' })).not.toBeInTheDocument();
  });

  it('ensina a abertura da portaria para a organização sem eventos e abre o formulário existente', async () => {
    state.permissions = ['events:read', 'events:create'];
    setup();
    expect(await screen.findByRole('heading', { name: 'Prepare sua primeira portaria' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Criar primeiro evento' }))
      .toHaveAttribute('href', '/app/eventos?formulario=evento');
    expect(screen.getByRole('listitem', { name: 'Pátio e capacidade' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Política de reentrada' })).toBeInTheDocument();
  });

  it('mostra a situação real de cada etapa e encaminha para o evento em configuração', async () => {
    state.permissions = ['events:read', 'events:create', 'events:publish', 'access:operate'];
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: String(url).endsWith('patio-operation-summary') ? {
      preparacao: { localAtivo: true, alocacao: true, cobranca: false, politica: false, pronto: false,
        pendencias: ['Defina o preço e o momento da cobrança.', 'Defina a política de reentrada.'] },
    } : { totalElements: 1, content: [{ id: 42, name: 'Festival', status: 'RASCUNHO', version: 2 }] } }));
    setup();
    expect(await screen.findByText('Próxima etapa: Preço e cobrança')).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Pátio e capacidade' })).getByText('Concluída')).toBeInTheDocument();
    expect(within(screen.getByRole('listitem', { name: 'Preço e cobrança' })).getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar preparação' })).toHaveAttribute('href', '/app/eventos/42');
    expect(screen.queryByRole('link', { name: 'Criar primeiro evento' })).not.toBeInTheDocument();
  });

  it('não consulta nem mostra a configuração para quem só tem permissão de leitura', () => {
    state.permissions = ['events:read', 'operations:checkout'];
    setup();
    expect(screen.queryByRole('heading', { name: 'Prepare sua primeira portaria' })).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('não confunde erro no catálogo com organização sem eventos', async () => {
    state.permissions = ['events:read', 'events:create'];
    vi.mocked(api.get).mockRejectedValue(new Error('consulta indisponível'));
    setup();
    expect(await screen.findByText('Não foi possível consultar a preparação da portaria.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Criar primeiro evento' })).not.toBeInTheDocument();
  });

  it('troca o guia pelo acesso ao Pátio quando a primeira portaria está aberta', async () => {
    state.permissions = ['events:read', 'events:create', 'operations:checkout'];
    vi.mocked(api.get).mockResolvedValue({ data: {
      totalElements: 1, content: [{ id: 42, name: 'Festival', status: 'EM_OPERACAO', version: 3 }],
    } });
    setup();
    expect(await screen.findByRole('link', { name: 'Ir ao Pátio' })).toHaveAttribute('href', '/app/patio');
    expect(screen.queryByRole('heading', { name: 'Prepare sua primeira portaria' })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('não abre o guia nem consulta detalhes em uma organização com mais de um evento', async () => {
    state.permissions = ['events:read', 'events:create'];
    vi.mocked(api.get).mockResolvedValue({ data: {
      totalElements: 2, content: [{ id: 42, name: 'Festival', status: 'RASCUNHO', version: 0 }],
    } });
    setup();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/events',
      expect.objectContaining({ params: expect.objectContaining({ size: 1 }) })));
    expect(screen.queryByRole('heading', { name: 'Prepare sua primeira portaria' })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('mantém a saudação e as pendências sem o bloco de atalhos nem o resumo', async () => {
    state.permissions = ['operations:read', 'fiscal:read', 'stock:read', 'finance:read', 'customers:read', 'organizations:admin'];
    setup();
    expect(screen.getByRole('heading', { name: /Olá, joao/, level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('O que você deseja fazer hoje?')).not.toBeInTheDocument();
    expect(screen.queryByText('Acesse as áreas usadas no dia a dia.')).not.toBeInTheDocument();
    expect(screen.queryByText('Outras áreas continuam disponíveis no menu superior.')).not.toBeInTheDocument();
    expect(screen.queryByText('Hub operacional Kaneko', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Abrir módulo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resumo do dia' })).not.toBeInTheDocument();
    expect(await screen.findByText('Nenhuma pendência nas consultas disponíveis')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Pendências' })).toHaveLength(1);
    expect(screen.queryByText('Pendências e atividades recentes')).not.toBeInTheDocument();
    expect(screen.queryByText('Nota → Conferência → Estoque e contas')).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.get).toHaveBeenCalledWith('/api/relatorios/estoque-minimo');
    expect(screen.queryByRole('button', { name: 'Abrir módulo Financeiro' })).not.toBeInTheDocument();
  });

  it('mantém as áreas permitidas no menu mesmo sem acesso a pendências', () => {
    state.permissions = ['customers:read', 'organizations:admin'];
    setup();

    expect(screen.getByRole('button', { name: 'Cadastros' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Administração' })).toBeInTheDocument();
    expect(screen.getByText('Não há consultas de pendências disponíveis para o seu acesso.')).toBeInTheDocument();
  });

  it.each([false, true])('menu superior continua navegável (mobile=%s)', async (mobile) => {
    state.mobile = mobile;
    const user = setup();
    await user.click(screen.getByRole('button', { name: mobile ? 'Abrir áreas e processos' : 'Estoque' }));
    const menu = await screen.findByRole(mobile ? 'dialog' : 'region', {
      name: mobile ? 'Áreas e processos' : 'Processos de Estoque',
    });
    if (mobile) await user.click(within(menu).getByRole('button', { name: 'Estoque' }));
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
    await user.click(within(menu).getByRole('link', { name: 'Posição de Estoque' }));
    expect(await screen.findByRole('heading', { name: 'Estoque selecionado' })).toBeInTheDocument();
  });

  it('não apresenta ausência de pendências quando a leitura falha', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('falha de leitura'));
    setup();
    await waitFor(() => expect(screen.getByText('Não foi possível consultar todas as pendências.')).toBeInTheDocument());
    expect(screen.queryByText('Nenhuma pendência nas consultas disponíveis')).not.toBeInTheDocument();
  });

  it('abre a nota exata e identifica o total completo das pendências', async () => {
    state.permissions = ['fiscal:read'];
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: String(url).includes('operational-pendencies')
      ? { referencia: '2026-09-12', total: 100, limitePorGrupo: 5, grupos: [{ tipo: 'NOTA_ENTRADA_PENDENTE', total: 100, itens: [
        { id: 42, titulo: 'Nota NF-42 aguardando confirmação', contraparte: 'Fornecedor A', caminho: '/app/notas-entrada/42', data: '2026-09-10', valor: 100 },
      ] }] } : { content: [], totalElements: 0 } }));
    setup();
    expect(await screen.findByRole('link', { name: /Nota NF-42 aguardando confirmação/ })).toHaveAttribute('href', '/app/notas-entrada/42');
    expect(screen.getByText(/Mostrando 1 de 100 pendências operacionais/)).toBeInTheDocument();
  });

  it('preserva o atalho de contas vencidas sem consultar indicadores financeiros', async () => {
    state.permissions = ['finance:read'];
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: String(url).includes('operational-pendencies') ? {
      referencia: '2026-09-12', total: 2, limitePorGrupo: 5, grupos: [{
        tipo: 'CONTA_PAGAR_VENCIDA', total: 1, itens: [
          { id: 42, titulo: 'Conta vencida', caminho: '/app/contas-pagar?detail=42', data: '2026-08-01', valor: 100 },
        ],
      }, {
        tipo: 'DESPESA_AVULSA_VENCIDA', total: 1, itens: [
          { id: 8, titulo: 'Despesa vencida removida', caminho: '/app/contas-pagar-avulsas?detail=8', valor: 20 },
        ],
      }],
    } : { totalAPagar: 0, totalAReceber: 0, vencidoAPagar: 0, vencidoAReceber: 0, aPagar: [], aReceber: [] } }));
    setup();
    expect(await screen.findByRole('link', { name: /Conta vencida/ })).toHaveAttribute('href', '/app/contas-pagar?detail=42');
    expect(screen.queryByRole('link', { name: /Despesa vencida removida/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Período financeiro' })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Contas vencidas incluem todo o histórico/)).toBeInTheDocument();
  });

  it('ignora pendências antigas de vendas e mantém o atalho para serviços sem nota', async () => {
    state.permissions = ['sales:read', 'service_orders:read'];
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: String(url).includes('operational-pendencies') ? {
      referencia: '2026-09-12', total: 2, limitePorGrupo: 5, grupos: [
        { tipo: 'VENDA_SEM_NOTA', total: 1, itens: [{ id: 7, titulo: 'Venda V-7 confirmada sem nota', contraparte: 'Maria', caminho: '/app/vendas-administrativas?detail=7' }] },
        { tipo: 'SERVICO_SEM_NOTA', total: 1, itens: [{ id: 8, titulo: 'Ordem OS-8 concluída sem nota', contraparte: 'Cliente restrito', caminho: '/app/ordens-servico?detail=8' }] },
      ],
    } : { content: [], totalElements: 0 } }));
    setup();
    expect(await screen.findByRole('link', { name: /Ordem OS-8 concluída sem nota/ })).toHaveAttribute('href', '/app/ordens-servico?detail=8');
    expect(screen.queryByRole('link', { name: /Venda V-7 confirmada sem nota/ })).not.toBeInTheDocument();
  });

  it('agrupa por categoria e expande os itens sem perder os links exatos', async () => {
    state.permissions = ['finance:read', 'fiscal:read'];
    vi.mocked(api.get).mockResolvedValue({ data: { total: 13, limitePorGrupo: 5, grupos: [
      { tipo: 'CONTA_PAGAR_VENCIDA', total: 12, itens: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, titulo: `Pagar Fornecedor com nome extenso ${i + 1}`, contraparte: `Fornecedor com nome extenso ${i + 1}`,
        caminho: `/app/contas-pagar?detail=${i + 1}`, valor: 105.20624, data: '2026-11-01',
      })) },
      { tipo: 'NOTA_ENTRADA_PENDENTE', total: 1, itens: [{ id: 42, titulo: 'Nota NF-42', contraparte: 'Fornecedor B', caminho: '/app/notas-entrada/42' }] },
    ] } });
    const user = setup();
    const group = await screen.findByRole('region', { name: 'Contas a pagar' });
    expect(within(group).getAllByRole('listitem')).toHaveLength(3);
    expect(within(group).getByText('3 de 12 pendências')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Notas de entrada' })).toBeVisible();
    expect(within(group).getByRole('link', { name: /Pagar Fornecedor com nome extenso 1/ })).toHaveAttribute('href', '/app/contas-pagar?detail=1');
    expect(within(group).getByRole('link', { name: 'Abrir listagem de Contas a pagar' })).toHaveAttribute('href', '/app/contas-pagar');
    await user.click(within(group).getByRole('button', { name: 'Ver mais de Contas a pagar' }));
    expect(within(group).getAllByRole('listitem')).toHaveLength(5);
    expect(within(group).getByText('5 de 12 pendências')).toBeVisible();
    expect(within(group).getByRole('link', { name: /Pagar Fornecedor com nome extenso 5/ })).toHaveAttribute('href', '/app/contas-pagar?detail=5');
    expect(api.get).toHaveBeenCalledTimes(1);
    await user.click(within(group).getByRole('button', { name: 'Ver menos de Contas a pagar' }));
    expect(within(group).getAllByRole('listitem')).toHaveLength(3);
  });

  it('separa valor e vencimento sem repetir o fornecedor presente no título', async () => {
    state.permissions = ['finance:read'];
    vi.mocked(api.get).mockResolvedValue({ data: { total: 1, limitePorGrupo: 5, grupos: [{
      tipo: 'CONTA_RECEBER_VENCIDA', total: 1, itens: [{ id: 17, titulo: 'Receber Cliente Exemplo', contraparte: 'Cliente Exemplo',
        caminho: '/app/contas-receber?detail=17', valor: 120.123456, data: '2026-11-01' }],
    }] } });
    setup();
    const group = await screen.findByRole('region', { name: 'Contas a receber' });
    expect(within(group).getByText('Receber Cliente Exemplo')).toBeVisible();
    expect(within(group).queryByText('Cliente Exemplo', { exact: true })).not.toBeInTheDocument();
    expect(within(group).getByText(/120,123456/)).toBeVisible();
    expect(within(group).getByText(/Venceu em/)).toBeVisible();
    expect(within(group).getByRole('link', { name: /Receber Cliente Exemplo/ })).toHaveAttribute('href', '/app/contas-receber?detail=17');
  });

  it('não cria categorias nem atalhos sem a permissão correspondente', async () => {
    state.permissions = ['service_orders:read'];
    vi.mocked(api.get).mockResolvedValue({ data: { total: 2, limitePorGrupo: 5, grupos: [
      { tipo: 'CONTA_PAGAR_VENCIDA', total: 1, itens: [{ id: 1, titulo: 'Fornecedor sigiloso', caminho: '/app/contas-pagar?detail=1' }] },
      { tipo: 'SERVICO_SEM_NOTA', total: 1, itens: [{ id: 8, titulo: 'OS-8 concluída', caminho: '/app/ordens-servico?detail=8' }] },
    ] } });
    setup();
    expect(await screen.findByRole('region', { name: 'Ordens de serviço' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Contas a pagar' })).not.toBeInTheDocument();
    expect(screen.queryByText('Fornecedor sigiloso')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Abrir listagem de Contas a pagar' })).not.toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
