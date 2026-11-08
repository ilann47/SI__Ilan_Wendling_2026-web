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

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<ColorModeProvider><MemoryRouter initialEntries={['/app']}><QueryClientProvider client={client}>
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
      referencia: '2026-09-12', total: 1, limitePorGrupo: 5, grupos: [{
        tipo: 'CONTA_PAGAR_VENCIDA', total: 1, itens: [
          { id: 42, titulo: 'Conta vencida', caminho: '/app/contas-pagar?detail=42', data: '2026-08-01', valor: 100 },
        ],
      }],
    } : { totalAPagar: 0, totalAReceber: 0, vencidoAPagar: 0, vencidoAReceber: 0, aPagar: [], aReceber: [] } }));
    setup();
    expect(await screen.findByRole('link', { name: /Conta vencida/ })).toHaveAttribute('href', '/app/contas-pagar?detail=42');
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
});
