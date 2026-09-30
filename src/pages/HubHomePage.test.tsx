import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { ColorModeProvider } from '../context/ColorModeContext';
import { AppLayout } from '../layout/AppLayout';
import { HubHomePage } from './HubHomePage';

const state = vi.hoisted(() => ({ mobile: false, permissions: ['stock:read', 'purchases:read'] }));
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

describe('home com resumo integrado', () => {
  beforeEach(() => {
    state.mobile = false;
    state.permissions = ['stock:read', 'purchases:read'];
    vi.spyOn(api, 'get').mockImplementation(async (url) => ({ data: String(url).includes('estoque-minimo')
      ? { total: 0, itens: [] }
      : String(url).includes('operational-pendencies') ? { referencia: '2026-09-12', total: 0, limitePorGrupo: 5, grupos: [] }
      : { content: [], totalElements: 0 } }));
  });
  afterEach(() => vi.restoreAllMocks());

  it('mantém o Hub e pendências acima do resumo, sem duplicar leituras', async () => {
    setup();
    const home = screen.getByRole('heading', { name: 'O que você deseja fazer hoje?', level: 1 });
    const summary = screen.getByRole('heading', { name: 'Resumo do dia', level: 2 });
    expect(home.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(await screen.findByText('Nenhuma pendência nas consultas disponíveis')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Pendências' })).toHaveLength(1);
    expect(screen.queryByText('Pendências e atividades recentes')).not.toBeInTheDocument();
    expect(screen.getByText('Ordem → Recebimento → Nota → Conta')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('button', { name: 'Abrir módulo Financeiro' })).not.toBeInTheDocument();
  });

  it.each([false, true])('cartão reutiliza o menu existente (mobile=%s)', async (mobile) => {
    state.mobile = mobile;
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir módulo Estoque' }));
    const menu = await screen.findByRole(mobile ? 'dialog' : 'region', {
      name: mobile ? 'Áreas e processos' : 'Processos de Estoque',
    });
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

  it('abre a compra exata e identifica o total completo das pendências', async () => {
    state.permissions = ['purchases:read'];
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: String(url).includes('operational-pendencies')
      ? { referencia: '2026-09-12', total: 100, limitePorGrupo: 5, grupos: [{ tipo: 'COMPRA_RECEBER', total: 100, itens: [
        { id: 42, titulo: 'Ordem OC-42 aguarda recebimento', contraparte: 'Fornecedor A', caminho: '/app/ordens-compra?detail=42', data: '2026-09-10', valor: 100 },
      ] }] } : { content: [], totalElements: 0 } }));
    setup();
    expect(await screen.findByRole('link', { name: /Ordem OC-42 aguarda recebimento/ })).toHaveAttribute('href', '/app/ordens-compra?detail=42');
    expect(screen.getByText(/Mostrando 1 de 100 pendências operacionais/)).toBeInTheDocument();
  });

  it('período muda somente indicadores e não esconde contas vencidas antigas', async () => {
    state.permissions = ['finance:read'];
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: String(url).includes('operational-pendencies')
      ? { referencia: '2026-09-12', total: 0, limitePorGrupo: 5, grupos: [] }
      : { totalAPagar: 0, totalAReceber: 0, vencidoAPagar: 0, vencidoAReceber: 0, aPagar: [], aReceber: [] } }));
    const user = setup();
    await screen.findByText('Nenhuma pendência nas consultas disponíveis');
    await user.click(screen.getByRole('combobox', { name: 'Período financeiro' }));
    await user.click(screen.getByRole('option', { name: 'Hoje' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(3));
    const [, config] = vi.mocked(api.get).mock.calls.at(-1)!;
    expect(config?.params.inicio).toBe(config?.params.fim);
    expect(screen.getByText(/Contas vencidas incluem todo o histórico/)).toBeInTheDocument();
  });

  it('vendas e serviços sem nota abrem documentos exatos e respeitam permissões', async () => {
    state.permissions = ['sales:read'];
    vi.mocked(api.get).mockImplementation(async (url) => ({ data: String(url).includes('operational-pendencies') ? {
      referencia: '2026-09-12', total: 2, limitePorGrupo: 5, grupos: [
        { tipo: 'VENDA_SEM_NOTA', total: 1, itens: [{ id: 7, titulo: 'Venda V-7 confirmada sem nota', contraparte: 'Maria', caminho: '/app/vendas-administrativas?detail=7' }] },
        { tipo: 'SERVICO_SEM_NOTA', total: 1, itens: [{ id: 8, titulo: 'Ordem OS-8 concluída sem nota', contraparte: 'Cliente restrito', caminho: '/app/ordens-servico?detail=8' }] },
      ],
    } : { content: [], totalElements: 0 } }));
    setup();
    expect(await screen.findByRole('link', { name: /Venda V-7 confirmada sem nota/ })).toHaveAttribute('href', '/app/vendas-administrativas?detail=7');
    expect(screen.queryByText('Cliente restrito')).not.toBeInTheDocument();
  });
});
