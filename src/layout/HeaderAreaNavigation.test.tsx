import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ColorModeProvider } from '../context/ColorModeContext';
import { createTheme } from '@mui/material/styles';
import { HeaderAreaNavigation } from './HeaderAreaNavigation';
import type { Perfil } from '../auth/AuthContext';

const state = vi.hoisted(() => ({ permissions: ['stock:read', 'fiscal:read'], mobile: false, perfil: 'USUARIO' as Perfil }));
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ permissions: state.permissions, user: { perfil: state.perfil } }) }));
vi.mock('@mui/material', async (importOriginal) => ({
  ...await importOriginal<typeof import('@mui/material')>(),
  useMediaQuery: () => state.mobile,
}));

function CurrentPath() {
  const { pathname, search } = useLocation();
  return <output aria-label="Rota atual">{pathname}{search}</output>;
}

function setup() {
  render(<ColorModeProvider><MemoryRouter initialEntries={['/app']}>
    <HeaderAreaNavigation activeModuleId="estoque" />
    <CurrentPath />
  </MemoryRouter></ColorModeProvider>);
  return userEvent.setup();
}

describe('navegação por áreas no cabeçalho', () => {
  beforeEach(() => {
    state.permissions = ['stock:read', 'fiscal:read'];
    state.mobile = false;
    state.perfil = 'USUARIO';
  });

  it.each([false, true])('oculta Administração do caixa (mobile=%s)', async (mobile) => {
    state.permissions = ['operations:checkout'];
    state.mobile = mobile;
    const user = setup();
    if (mobile) await user.click(screen.getByRole('button', { name: 'Abrir áreas e processos' }));
    expect(screen.queryByRole('button', { name: 'Administração' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Operação' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Operação' }));
    expect(screen.getByRole('link', { name: 'Pátio' })).toHaveAttribute('href', '/app/patio');
    expect(screen.queryByRole('link', { name: 'Instalações' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dia a dia' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Início$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Eventos e ofertas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Vendas e credenciais' })).not.toBeInTheDocument();
  });

  it.each([false, true])('abre Instalações junto ao Pátio sem alterar a rota (mobile=%s)', async (mobile) => {
    state.mobile = mobile;
    state.permissions = ['operations:read', 'facilities:manage', 'organizations:admin'];
    const user = setup();
    if (mobile) await user.click(screen.getByRole('button', { name: 'Abrir áreas e processos' }));

    await user.click(screen.getByRole('button', { name: 'Operação' }));
    const panel = within(mobile
      ? screen.getByRole('dialog', { name: 'Áreas e processos' })
      : screen.getByRole('region', { name: 'Processos de Operação' }));
    expect(panel.getByRole('heading', { name: 'Estacionamento' })).toBeInTheDocument();
    const [patio, instalacoes] = panel.getAllByRole('link');
    expect(patio).toHaveAccessibleName('Pátio');
    expect(instalacoes).toHaveAccessibleName('Instalações');
    expect(instalacoes).toHaveAttribute('href', '/app/instalacoes');
    await user.click(instalacoes);
    expect(screen.getByLabelText('Rota atual')).toHaveTextContent('/app/instalacoes');

    if (!mobile) {
      await user.click(screen.getByRole('button', { name: 'Administração' }));
      const admin = within(screen.getByRole('region', { name: 'Processos de Administração' }));
      expect(admin.queryByRole('link', { name: 'Instalações' })).not.toBeInTheDocument();
    }
  });

  it('preserva os atalhos legados e de eventos para quem pode abrir cada rota', async () => {
    state.perfil = 'ADMIN';
    state.permissions = ['events:read', 'orders:read', 'fiscal:read'];
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Administração' }));
    const panel = screen.getByRole('region', { name: 'Processos de Administração' });
    expect(within(panel).getByRole('link', { name: 'Usuários' })).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Países' })).toBeInTheDocument();
    expect(within(panel).queryByRole('link', { name: 'Eventos e ofertas' })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('link', { name: 'Vendas e credenciais' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vendas' }));
    const sales = within(screen.getByRole('region', { name: 'Processos de Vendas' }));
    expect(sales.queryByRole('link', { name: 'Eventos e ofertas' })).not.toBeInTheDocument();
    expect(sales.queryByRole('link', { name: 'Vendas e credenciais' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Operação' }));
    const operations = within(screen.getByRole('region', { name: 'Processos de Operação' }));
    expect(operations.queryByRole('heading', { name: 'Estacionamento' })).not.toBeInTheDocument();
    expect(operations.getByRole('heading', { name: /^Eventos$/ })).toBeInTheDocument();
    expect(operations.getByRole('link', { name: 'Eventos e ofertas' })).toHaveAttribute('href', '/app/eventos');
    expect(operations.getByRole('link', { name: 'Vendas e credenciais' })).toHaveAttribute('href', '/app/vendas');
  });

  it('abre processos em colunas sem sair da tela e navega direto com os filtros', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Estoque' }));
    const panel = screen.getByRole('region', { name: 'Processos de Estoque' });
    const layer = Number(getComputedStyle(panel.closest('.MuiPopper-root')!).zIndex);
    expect(layer).toBeGreaterThan(createTheme().zIndex.appBar);
    expect(layer).toBeLessThan(createTheme().zIndex.modal);
    expect(within(panel).getByText('Entradas')).toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Notas de Entrada' })).toHaveAttribute('href', '/app/notas-entrada');
    expect(within(panel).queryByRole('link', { name: /Ver área/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Rota atual')).toHaveTextContent('/app');
    await user.click(within(panel).getByRole('link', { name: 'Razão de estoque' }));
    expect(screen.getByLabelText('Rota atual')).toHaveTextContent('/app/estoque?tab=razao');
    expect(screen.queryByRole('region', { name: 'Processos de Estoque' })).not.toBeInTheDocument();
  });

  it('remove áreas e grupos sem permissão', async () => {
    state.permissions = ['stock:read'];
    const user = setup();
    expect(screen.queryByRole('button', { name: 'Financeiro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fiscal' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Estoque' }));
    const panel = screen.getByRole('region', { name: 'Processos de Estoque' });
    expect(within(panel).queryByText('Entradas')).not.toBeInTheDocument();
    expect(within(panel).queryByRole('link', { name: 'Notas de Entrada' })).not.toBeInTheDocument();
    expect(within(panel).getByRole('link', { name: 'Posição de Estoque' })).toBeInTheDocument();
  });

  it('permite abrir pelo teclado e retorna o foco com Escape', async () => {
    const user = setup();
    const trigger = screen.getByRole('button', { name: 'Estoque' });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('link', { name: 'Notas de Entrada' })).toHaveFocus());
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('permite trocar de área com o menu aberto e fecha ao clicar fora', async () => {
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Estoque' }));
    expect(screen.queryByRole('button', { name: 'Fiscal' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Vendas' }));
    const panel = screen.getByRole('region', { name: 'Processos de Vendas' });
    expect(within(panel).getByRole('link', { name: 'Notas de Saída' })).toHaveAttribute('href', '/app/notas-saida');
    expect(within(panel).getByRole('link', { name: 'Notas de Serviço' })).toHaveAttribute('href', '/app/notas-servico');
    expect(within(panel).queryByRole('link', { name: 'Notas de Entrada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Processos de Estoque' })).not.toBeInTheDocument();
    await user.click(screen.getByLabelText('Rota atual'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Processos de Vendas' })).not.toBeInTheDocument());
  });

  it('oferece os mesmos processos no drawer mobile e preserva preferências salvas', async () => {
    state.mobile = true;
    const preference = JSON.stringify({ favoritePaths: ['/app/notas-entrada'], recentPaths: ['/app/estoque'] });
    localStorage.setItem('kaneko.ui.10.admin', preference);
    const user = setup();
    await user.click(screen.getByRole('button', { name: 'Abrir áreas e processos' }));
    const drawer = screen.getByRole('dialog', { name: 'Áreas e processos' });
    const layer = Number(getComputedStyle(drawer.closest('.MuiDrawer-root')!).zIndex);
    expect(layer).toBeGreaterThan(createTheme().zIndex.appBar);
    expect(layer).toBeLessThan(createTheme().zIndex.modal);
    expect(within(drawer).queryByRole('button', { name: 'Navegação desta área' })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('link', { name: /Ver área/ })).not.toBeInTheDocument();
    await user.click(within(drawer).getByRole('link', { name: 'Notas de Entrada' }));
    expect(screen.getByLabelText('Rota atual')).toHaveTextContent('/app/notas-entrada');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Áreas e processos' })).not.toBeInTheDocument());
    expect(localStorage.getItem('kaneko.ui.10.admin')).toBe(preference);
  });
});
