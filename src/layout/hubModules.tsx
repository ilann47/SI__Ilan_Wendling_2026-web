import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import type { ReactElement } from 'react';
import { navGroups, type NavItem } from './navigation';

export interface HubModule {
  id: string;
  label: string;
  description: string;
  icon: ReactElement;
  /** Prefixo ou path inicial ao abrir o módulo. */
  homePath: string;
  groupLabel: string;
}

/** Módulos da home no padrão Hub YES7, mapeados aos grupos Kaneko. */
export const hubModules: HubModule[] = [
  {
    id: 'operacao',
    label: 'Operação',
    description: 'Pátio, acessos, mensalistas e relatórios',
    icon: <LocalParkingOutlinedIcon />,
    homePath: '/app/visao-geral',
    groupLabel: 'Operação',
  },
  {
    id: 'comercial',
    label: 'Comercial',
    description: 'Compras, vendas e ordens de serviço',
    icon: <ShoppingCartCheckoutOutlinedIcon />,
    homePath: '/app/ordens-compra',
    groupLabel: 'Comercial',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Notas, contas a pagar e a receber',
    icon: <AccountBalanceWalletOutlinedIcon />,
    homePath: '/app/contas-pagar',
    groupLabel: 'Fiscal e financeiro',
  },
  {
    id: 'clientes',
    label: 'Cadastros',
    description: 'Clientes, veículos, fornecedores e tarifas',
    icon: <PeopleOutlinedIcon />,
    homePath: '/app/clientes',
    groupLabel: 'Clientes e parceiros',
  },
  {
    id: 'estoque',
    label: 'Estoque',
    description: 'Produtos, posição e catálogo',
    icon: <Inventory2OutlinedIcon />,
    homePath: '/app/estoque',
    groupLabel: 'Produtos e estoque',
  },
  {
    id: 'admin',
    label: 'Administração',
    description: 'Usuários, instalações, eventos e bloqueios',
    icon: <AdminPanelSettingsOutlinedIcon />,
    homePath: '/app/administracao',
    groupLabel: 'Administração',
  },
];

export function resolveHubModule(pathname: string): HubModule | null {
  if (pathname === '/app' || pathname === '/app/') return null;
  const allItems = navGroups.flatMap((group) => group.items.map((item) => ({ group: group.label, item })));
  const match = allItems
    .filter(({ item }) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.item.path.length - a.item.path.length)[0];
  if (!match) return null;
  return hubModules.find((module) => module.groupLabel === match.group) ?? null;
}

export function moduleNavItems(module: HubModule, permissions: readonly string[]): NavItem[] {
  const group = navGroups.find((candidate) => candidate.label === module.groupLabel);
  if (!group) return [];
  return group.items.filter((item) => !item.permissions
    || item.permissions.some((permission) => permissions.includes(permission)));
}

export function canOpenHubModule(module: HubModule, permissions: readonly string[]): boolean {
  return moduleNavItems(module, permissions).length > 0;
}
