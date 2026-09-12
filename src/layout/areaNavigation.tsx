import type { ReactNode } from 'react';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
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
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import { navGroups, type NavItem } from './navigation';

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
    description: 'Pátio, acessos, mensalistas e visão do dia a dia.',
    processGroups: [
      {
        label: 'Dia a dia',
        items: [
          { label: 'Resumo do dia', path: '/app', icon: <SpaceDashboardOutlinedIcon fontSize="small" /> },
          { label: 'Pátio', path: '/app/patio', icon: <LocalParkingOutlinedIcon fontSize="small" /> },
          {
            label: 'Movimentações',
            path: '/app/movimentacoes',
            icon: <SwapHorizOutlinedIcon fontSize="small" />,
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
            permissions: ['finance:read', 'operations:read', 'stock:read'],
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
    ],
  },
  {
    areaId: 'comercial',
    title: 'Vendas',
    description: 'Vendas, serviços e os documentos de cada processo.',
    processGroups: [
      {
        label: 'Vendas',
        items: [
          {
            label: 'Vendas Administrativas',
            path: '/app/vendas-administrativas',
            icon: <SellOutlinedIcon fontSize="small" />,
            permissions: ['sales:read'],
          },
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
            label: 'Ordens de Serviço',
            path: '/app/ordens-servico',
            icon: <BuildOutlinedIcon fontSize="small" />,
            permissions: ['service_orders:read'],
          },
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
    description: 'Comprar, receber, entrar nota e controlar posição.',
    processGroups: [
      {
        label: 'Compras',
        items: [
          {
            label: 'Ordens de Compra',
            path: '/app/ordens-compra',
            icon: <ShoppingCartCheckoutOutlinedIcon fontSize="small" />,
            permissions: ['purchases:read'],
          },
          {
            label: 'Recebimentos',
            path: '/app/recebimentos',
            icon: <ReceiptOutlinedIcon fontSize="small" />,
            permissions: ['purchases:read'],
          },
          {
            label: 'Notas de Entrada',
            path: '/app/notas-entrada',
            icon: <CallReceivedOutlinedIcon fontSize="small" />,
            permissions: ['fiscal:read'],
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
          {
            label: 'Conferência/Ajustes',
            path: '/app/estoque?tab=ajustes',
            icon: <TuneOutlinedIcon fontSize="small" />,
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
          {
            label: 'Despesas Avulsas',
            path: '/app/contas-pagar-avulsas',
            icon: <ReceiptOutlinedIcon fontSize="small" />,
            permissions: ['finance:read'],
          },
        ],
      },
    ],
  },
  {
    areaId: 'cadastros',
    title: 'Cadastros',
    description: 'Clientes, veículos, tarifas e parceiros.',
    processGroups: [
      {
        label: 'Clientes e veículos',
        items: [
          {
            label: 'Clientes',
            path: '/app/clientes',
            icon: <PeopleOutlinedIcon fontSize="small" />,
            permissions: ['customers:read'],
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
    description: 'Usuários, instalações, eventos e bloqueios.',
    processGroups: [
      {
        label: 'Empresa',
        items: [
          {
            label: 'Administração',
            path: '/app/administracao',
            icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
            permissions: ['organizations:admin', 'users:invite', 'roles:grant', 'roles:revoke'],
          },
          { label: 'Usuários', path: '/app/usuarios', icon: <ManageAccountsOutlinedIcon fontSize="small" /> },
          {
            label: 'Instalações',
            path: '/app/instalacoes',
            icon: <ApartmentOutlinedIcon fontSize="small" />,
            permissions: ['facilities:manage'],
          },
        ],
      },
      {
        label: 'Eventos',
        items: [
          { label: 'Eventos e ofertas', path: '/app/eventos', icon: <EventOutlinedIcon fontSize="small" /> },
          {
            label: 'Vendas e credenciais',
            path: '/app/vendas',
            icon: <ShoppingBagOutlinedIcon fontSize="small" />,
            permissions: [
              'inventory:hold', 'orders:create', 'orders:read', 'orders:manual-confirm',
              'orders:cancel', 'credentials:issue',
            ],
          },
          {
            label: 'Bloqueios',
            path: '/app/bloqueios',
            icon: <BlockOutlinedIcon fontSize="small" />,
            permissions: ['organizations:admin', 'audit:read'],
          },
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

export function filterNavItem(item: NavItem, permissions: readonly string[]): boolean {
  return !item.permissions || item.permissions.some((permission) => permissions.includes(permission));
}

export function visibleProcessGroups(
  menu: AreaMenuDefinition,
  permissions: readonly string[],
): AreaProcessGroup[] {
  return menu.processGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => filterNavItem(item, permissions)),
    }))
    .filter((group) => group.items.length > 0);
}

/** Itens flat da área (sidebar) — usa mega menu quando existir; senão o grupo clássico. */
export function areaFlatNavItems(areaId: string, permissions: readonly string[]): NavItem[] {
  const menu = areaMenuFor(areaId);
  if (menu) {
    return visibleProcessGroups(menu, permissions).flatMap((group) => group.items);
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
