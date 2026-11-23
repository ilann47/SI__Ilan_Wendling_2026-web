import type { ReactNode } from 'react';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CallMadeOutlinedIcon from '@mui/icons-material/CallMadeOutlined';
import CallReceivedOutlinedIcon from '@mui/icons-material/CallReceivedOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import LocationCityOutlinedIcon from '@mui/icons-material/LocationCityOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PriceChangeOutlinedIcon from '@mui/icons-material/PriceChangeOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { navGroups, type NavItem } from './navigation';
import { EVENT_READ_PERMISSIONS } from '../auth/administrationAccess';
import { PATIO_PAGE_ACCESS, REPORTS_PAGE_ACCESS } from '../auth/accessPolicy';
import { canOpenAppPath } from '../auth/routeAccess';
import { isOperationalNavigationPath } from './operationalNavigation';
import type { Perfil } from '../auth/AuthContext';

/** Grupo de processos dentro de uma área (mega menu estilo Bling, visual Kaneko). */
export interface AreaProcessGroup {
  label: string;
  items: NavItem[];
}

export interface AreaMenuDefinition {
  areaId: string;
  title: string;
  description: string;
  processGroups: AreaProcessGroup[];
}

/** Menus por processo em todas as áreas — navegação orientada a trabalho, não a entidade. */
export const areaMenus: AreaMenuDefinition[] = [
  {
    areaId: 'operacao',
    title: 'Operação',
    description: 'Pátio, instalações, veículos, tarifas, acessos, eventos e serviços.',
    processGroups: [
      {
        label: 'Estacionamento',
        items: [
          { label: 'Pátio', path: '/app/patio', icon: <LocalParkingOutlinedIcon fontSize="small" />, permissions: PATIO_PAGE_ACCESS },
          {
            label: 'Instalações',
            path: '/app/instalacoes',
            icon: <ApartmentOutlinedIcon fontSize="small" />,
            permissions: ['facilities:manage'],
          },
          {
            label: 'Movimentações',
            path: '/app/movimentacoes',
            icon: <SwapHorizOutlinedIcon fontSize="small" />,
            permissions: ['operations:read'],
          },
          {
            label: 'Veículos',
            path: '/app/veiculos',
            icon: <DirectionsCarOutlinedIcon fontSize="small" />,
            permissions: ['operations:read'],
          },
          {
            label: 'Tarifas',
            path: '/app/tarifas',
            icon: <PriceChangeOutlinedIcon fontSize="small" />,
            permissions: ['operations:read'],
          },
          {
            label: 'Mensalistas',
            path: '/app/mensalistas',
            icon: <CardMembershipOutlinedIcon fontSize="small" />,
            permissions: ['operations:read'],
          },
          {
            label: 'Relatórios',
            path: '/app/relatorios',
            icon: <AssessmentOutlinedIcon fontSize="small" />,
            permissions: REPORTS_PAGE_ACCESS,
          },
        ],
      },
      {
        label: 'Acessos',
        items: [
          {
            label: 'Acesso de eventos',
            path: '/app/acesso-eventos',
            icon: <QrCodeScannerOutlinedIcon fontSize="small" />,
            permissions: ['access:validate', 'access:checkin', 'access:checkout', 'credentials:block'],
          },
          {
            label: 'Tentativas de acesso',
            path: '/app/tentativas-acesso',
            icon: <FactCheckOutlinedIcon fontSize="small" />,
            permissions: ['audit:read'],
          },
        ],
      },
      {
        label: 'Eventos',
        items: [
          { label: 'Eventos e ofertas', path: '/app/eventos', icon: <EventOutlinedIcon fontSize="small" />, permissions: EVENT_READ_PERMISSIONS },
          {
            label: 'Vendas e credenciais',
            path: '/app/vendas',
            icon: <ShoppingBagOutlinedIcon fontSize="small" />,
            permissions: [
              'inventory:hold', 'orders:create', 'orders:read', 'orders:manual-confirm',
              'orders:cancel', 'credentials:issue',
            ],
          },
        ],
      },
      {
        label: 'Serviços',
        items: [
          {
            label: 'Ordens de Serviço',
            path: '/app/ordens-servico',
            icon: <BuildOutlinedIcon fontSize="small" />,
            permissions: ['service_orders:read'],
          },
        ],
      },
    ],
  },
  {
    areaId: 'comercial',
    title: 'Vendas',
    description: 'Notas de saída e notas de serviço.',
    processGroups: [
      {
        label: 'Vendas',
        items: [
          {
            label: 'Notas de Saída',
            path: '/app/notas-saida',
            icon: <CallMadeOutlinedIcon fontSize="small" />,
            permissions: ['fiscal:read'],
          },
        ],
      },
      {
        label: 'Serviços',
        items: [
          {
            label: 'Notas de Serviço',
            path: '/app/notas-servico',
            icon: <DescriptionOutlinedIcon fontSize="small" />,
            permissions: ['fiscal:read'],
          },
        ],
      },
    ],
  },
  {
    areaId: 'estoque',
    title: 'Estoque',
    description: 'Notas de entrada e controle de estoque.',
    processGroups: [
      {
        label: 'Entradas',
        items: [
          {
            label: 'Notas de Entrada',
            path: '/app/notas-entrada',
            icon: <CallReceivedOutlinedIcon fontSize="small" />,
            permissions: ['fiscal:read'],
          },
        ],
      },
      {
        label: 'Estoque',
        items: [
          {
            label: 'Posição de Estoque',
            path: '/app/estoque',
            icon: <WarehouseOutlinedIcon fontSize="small" />,
            permissions: ['stock:read'],
          },
          {
            label: 'Razão de estoque',
            path: '/app/estoque?tab=razao',
            icon: <StraightenOutlinedIcon fontSize="small" />,
            permissions: ['stock:read'],
          },
          {
            label: 'Locais de Estoque',
            path: '/app/estoque?tab=locais',
            icon: <Inventory2OutlinedIcon fontSize="small" />,
            permissions: ['stock:read'],
          },
        ],
      },
      {
        label: 'Cadastro de produtos',
        items: [
          {
            label: 'Produtos',
            path: '/app/produtos',
            icon: <Inventory2OutlinedIcon fontSize="small" />,
            permissions: ['catalog:read'],
          },
          {
            label: 'Serviços',
            path: '/app/servicos',
            icon: <BuildOutlinedIcon fontSize="small" />,
            permissions: ['catalog:read'],
          },
          {
            label: 'Produto x Fornecedor',
            path: '/app/produto-fornecedores',
            icon: <LinkOutlinedIcon fontSize="small" />,
            permissions: ['catalog:read'],
          },
          {
            label: 'Categorias',
            path: '/app/categorias',
            icon: <CategoryOutlinedIcon fontSize="small" />,
            permissions: ['catalog:read'],
          },
          {
            label: 'Marcas',
            path: '/app/marcas',
            icon: <SellOutlinedIcon fontSize="small" />,
            permissions: ['catalog:read'],
          },
          {
            label: 'Unidades de Medida',
            path: '/app/unidades-medida',
            icon: <StraightenOutlinedIcon fontSize="small" />,
            permissions: ['catalog:read'],
          },
        ],
      },
    ],
  },
  {
    areaId: 'financeiro',
    title: 'Financeiro',
    description: 'Contas a pagar, a receber e despesas.',
    processGroups: [
      {
        label: 'Contas',
        items: [
          {
            label: 'Contas a Pagar',
            path: '/app/contas-pagar',
            icon: <TrendingDownOutlinedIcon fontSize="small" />,
            permissions: ['finance:read'],
          },
          {
            label: 'Contas a Receber',
            path: '/app/contas-receber',
            icon: <TrendingUpOutlinedIcon fontSize="small" />,
            permissions: ['finance:read'],
          },
        ],
      },
    ],
  },
  {
    areaId: 'cadastros',
    title: 'Cadastros',
    description: 'Clientes, fornecedores, pagamentos e logística.',
    processGroups: [
      {
        label: 'Clientes e fornecedores',
        items: [
          {
            label: 'Clientes',
            path: '/app/clientes',
            icon: <PeopleOutlinedIcon fontSize="small" />,
            permissions: ['customers:read'],
          },
          {
            label: 'Fornecedores',
            path: '/app/fornecedores',
            icon: <LocalShippingOutlinedIcon fontSize="small" />,
            permissions: ['suppliers:read'],
          },
        ],
      },
      {
        label: 'Pagamentos',
        items: [
          {
            label: 'Condições de Pagamento',
            path: '/app/condicoes-pagamento',
            icon: <EventRepeatOutlinedIcon fontSize="small" />,
            permissions: ['payments:read'],
          },
          {
            label: 'Formas de Pagamento',
            path: '/app/formas-pagamento',
            icon: <PaymentOutlinedIcon fontSize="small" />,
            permissions: ['payments:read'],
          },
        ],
      },
      {
        label: 'Logística',
        items: [
          {
            label: 'Transportadoras',
            path: '/app/transportadoras',
            icon: <LocalShippingOutlinedIcon fontSize="small" />,
            permissions: ['logistics:read'],
          },
          {
            label: 'Veículos de Frota',
            path: '/app/veiculos-frota',
            icon: <DirectionsCarOutlinedIcon fontSize="small" />,
            permissions: ['logistics:read'],
          },
          {
            label: 'Frota (Transp. x Veículo)',
            path: '/app/transportadora-veiculos',
            icon: <LinkOutlinedIcon fontSize="small" />,
            permissions: ['logistics:read'],
          },
        ],
      },
    ],
  },
  {
    areaId: 'admin',
    title: 'Administração',
    description: 'Organização, usuários e permissões.',
    processGroups: [
      {
        label: 'Empresa',
        items: [
          {
            label: 'Administração',
            path: '/app/administracao',
            icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
          },
          { label: 'Usuários', path: '/app/usuarios', icon: <ManageAccountsOutlinedIcon fontSize="small" /> },
        ],
      },
      {
        label: 'RH e geografia',
        items: [
          {
            label: 'Cargos',
            path: '/app/cargos',
            icon: <BadgeOutlinedIcon fontSize="small" />,
            permissions: ['workforce:read'],
          },
          {
            label: 'Funcionários',
            path: '/app/funcionarios',
            icon: <WorkOutlineIcon fontSize="small" />,
            permissions: ['workforce:read'],
          },
          { label: 'Países', path: '/app/paises', icon: <PublicOutlinedIcon fontSize="small" /> },
          { label: 'Estados', path: '/app/estados', icon: <MapOutlinedIcon fontSize="small" /> },
          { label: 'Cidades', path: '/app/cidades', icon: <LocationCityOutlinedIcon fontSize="small" /> },
        ],
      },
    ],
  },
];

export function areaMenuFor(areaId: string): AreaMenuDefinition | undefined {
  return areaMenus.find((menu) => menu.areaId === areaId);
}

export function filterNavItem(item: NavItem, permissions: readonly string[], profile?: Perfil): boolean {
  return isOperationalNavigationPath(item.path) && canOpenAppPath(item.path, permissions, profile);
}

export function visibleProcessGroups(
  menu: AreaMenuDefinition,
  permissions: readonly string[],
  profile?: Perfil,
): AreaProcessGroup[] {
  return menu.processGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => filterNavItem(item, permissions, profile)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Itens flat da área (sidebar) — usa mega menu quando existir; senão o grupo clássico. */
export function areaFlatNavItems(areaId: string, permissions: readonly string[], profile?: Perfil): NavItem[] {
  const menu = areaMenuFor(areaId);
  if (menu) {
    return visibleProcessGroups(menu, permissions, profile).flatMap((group) => group.items);
  }
  return [];
}

/** Resolve rótulo humano para path favorito/recente. */
export function labelForPath(path: string): string {
  const normalized = path.split('?')[0] ?? path;
  const fromAreas = areaMenus
    .flatMap((menu) => menu.processGroups.flatMap((group) => group.items))
    .find((item) => item.path === path || item.path.split('?')[0] === normalized);
  if (fromAreas) return fromAreas.label;
  const fromNav = navGroups
    .flatMap((group) => group.items)
    .find((item) => path === item.path || path.startsWith(`${item.path}/`) || item.path === normalized);
  return fromNav?.label ?? (path.replace(/^\/app\/?/, '') || 'Hub');
}

export type { ReactNode };
