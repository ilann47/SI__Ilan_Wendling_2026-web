import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import type { ReactElement } from 'react';
import { areaFlatNavItems, areaMenuFor, filterNavItem } from './areaNavigation';
import { navGroups, type NavItem } from './navigation';

export interface HubModule {
  id: string;
  label: string;
  description: string;
  icon: ReactElement;
  /** Prefixo ou path inicial ao abrir o módulo (landing da área). */
  homePath: string;
  groupLabel: string;
  flowSummary?: string;
}

/** Áreas do Hub: navegação por processo, identidade Kaneko. */
export const hubModules: HubModule[] = [
  {
    id: 'operacao',
    label: 'Operação',
    description: 'Pátio, acessos, mensalistas e relatórios',
    icon: <LocalParkingOutlinedIcon />,
    homePath: '/app/areas/operacao',
    groupLabel: 'Operação',
  },
  {
    id: 'comercial',
    label: 'Vendas',
    description: 'Vendas, ordens de serviço e notas de saída e de serviço',
    icon: <ShoppingCartCheckoutOutlinedIcon />,
    homePath: '/app/areas/comercial',
    groupLabel: 'Vendas',
  },
  {
    id: 'estoque',
    label: 'Estoque',
    description: 'Compras, notas de entrada e posição de estoque',
    icon: <Inventory2OutlinedIcon />,
    homePath: '/app/areas/estoque',
    groupLabel: 'Estoque',
    flowSummary: 'Ordem → Recebimento → Nota → Conta',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Contas a pagar, a receber e despesas',
    icon: <AccountBalanceWalletOutlinedIcon />,
    homePath: '/app/areas/financeiro',
    groupLabel: 'Financeiro',
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    description: 'Clientes, veículos, tarifas e parceiros',
    icon: <PeopleOutlinedIcon />,
    homePath: '/app/areas/cadastros',
    groupLabel: 'Cadastros',
  },
  {
    id: 'admin',
    label: 'Administração',
    description: 'Usuários, instalações, eventos, vagas e bloqueios',
    icon: <AdminPanelSettingsOutlinedIcon />,
    homePath: '/app/areas/admin',
    groupLabel: 'Administração',
  },
];

function pathMatches(pathname: string, search: string, itemPath: string): boolean {
  const [itemPathname, itemSearch = ''] = itemPath.split('?');
  if (!itemPathname) return false;
  const pathOk = pathname === itemPathname || pathname.startsWith(`${itemPathname}/`);
  if (!pathOk) return false;
  if (!itemSearch) return true;
  const wanted = new URLSearchParams(itemSearch);
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of wanted.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

export function resolveHubModule(pathname: string, search = ''): HubModule | null {
  if (pathname === '/app' || pathname === '/app/') return null;
  const areaMatch = pathname.match(/^\/app\/areas\/([^/]+)/);
  if (areaMatch) {
    return hubModules.find((module) => module.id === areaMatch[1]) ?? null;
  }

  const allItems = navGroups.flatMap((group) => group.items.map((item) => ({ group: group.label, item })));
  const match = allItems
    .filter(({ item }) => pathMatches(pathname, search, item.path))
    .sort((a, b) => b.item.path.length - a.item.path.length)[0];
  if (!match) return null;
  return hubModules.find((module) => module.groupLabel === match.group) ?? null;
}

export function moduleNavItems(module: HubModule, permissions: readonly string[]): NavItem[] {
  if (areaMenuFor(module.id)) {
    return areaFlatNavItems(module.id, permissions);
  }
  const group = navGroups.find((candidate) => candidate.label === module.groupLabel);
  if (!group) return [];
  return group.items.filter((item) => filterNavItem(item, permissions));
}

export function canOpenHubModule(module: HubModule, permissions: readonly string[]): boolean {
  return moduleNavItems(module, permissions).length > 0;
}
