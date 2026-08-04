import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CallMadeOutlinedIcon from '@mui/icons-material/CallMadeOutlined';
import CallReceivedOutlinedIcon from '@mui/icons-material/CallReceivedOutlined';
import CardMembershipOutlinedIcon from '@mui/icons-material/CardMembershipOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined';
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
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import StraightenOutlinedIcon from '@mui/icons-material/StraightenOutlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import type { ReactNode } from 'react';

export interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  permissions?: string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Eventos',
    items: [
      { label: 'Visao geral', path: '/app', icon: <SpaceDashboardOutlinedIcon fontSize="small" /> },
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
    label: 'Operação',
    items: [
      { label: 'Pátio', path: '/app/patio', icon: <LocalParkingOutlinedIcon fontSize="small" /> },
      { label: 'Movimentações', path: '/app/movimentacoes', icon: <SwapHorizOutlinedIcon fontSize="small" /> },
      { label: 'Mensalistas', path: '/app/mensalistas', icon: <CardMembershipOutlinedIcon fontSize="small" /> },
      { label: 'Relatórios', path: '/app/relatorios', icon: <AssessmentOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Fiscal',
    items: [
      { label: 'Notas de Entrada', path: '/app/notas-entrada', icon: <CallReceivedOutlinedIcon fontSize="small" />, permissions: ['fiscal:read'] },
      { label: 'Notas de Saída', path: '/app/notas-saida', icon: <CallMadeOutlinedIcon fontSize="small" />, permissions: ['fiscal:read'] },
      { label: 'Notas de Serviço', path: '/app/notas-servico', icon: <DescriptionOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Contas a Receber', path: '/app/contas-receber', icon: <TrendingUpOutlinedIcon fontSize="small" />, permissions: ['finance:read'] },
      { label: 'Contas a Pagar', path: '/app/contas-pagar', icon: <TrendingDownOutlinedIcon fontSize="small" />, permissions: ['finance:read'] },
      { label: 'Despesas Avulsas', path: '/app/contas-pagar-avulsas', icon: <ReceiptOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Cadastros',
    items: [
      {
        label: 'Clientes',
        path: '/app/clientes',
        icon: <PeopleOutlinedIcon fontSize="small" />,
        permissions: ['customers:read'],
      },
      { label: 'Veículos', path: '/app/veiculos', icon: <DirectionsCarOutlinedIcon fontSize="small" /> },
      {
        label: 'Fornecedores',
        path: '/app/fornecedores',
        icon: <LocalShippingOutlinedIcon fontSize="small" />,
        permissions: ['suppliers:read'],
      },
      { label: 'Tarifas', path: '/app/tarifas', icon: <PriceChangeOutlinedIcon fontSize="small" /> },
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
    label: 'Conveniência',
    items: [
      {
        label: 'Produtos',
        path: '/app/produtos',
        icon: <Inventory2OutlinedIcon fontSize="small" />,
        permissions: ['catalog:read'],
      },
      {
        label: 'Estoque',
        path: '/app/estoque',
        icon: <WarehouseOutlinedIcon fontSize="small" />,
        permissions: ['stock:read'],
      },
      {
        label: 'Serviços',
        path: '/app/servicos',
        icon: <BuildOutlinedIcon fontSize="small" />,
        permissions: ['catalog:read'],
      },
      { label: 'Produto x Fornecedor', path: '/app/produto-fornecedores', icon: <LinkOutlinedIcon fontSize="small" />, permissions: ['catalog:read'] },
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
  {
    label: 'Geografia',
    items: [
      { label: 'Países', path: '/app/paises', icon: <PublicOutlinedIcon fontSize="small" /> },
      { label: 'Estados', path: '/app/estados', icon: <MapOutlinedIcon fontSize="small" /> },
      { label: 'Cidades', path: '/app/cidades', icon: <LocationCityOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    label: 'RH & Acesso',
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
      { label: 'Usuários', path: '/app/usuarios', icon: <ManageAccountsOutlinedIcon fontSize="small" /> },
    ],
  },
  {
    label: 'Gestao',
    items: [
      {
        label: 'Administracao',
        path: '/app/administracao',
        icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
        permissions: ['organizations:admin', 'users:invite', 'roles:grant', 'roles:revoke'],
      },
      {
        label: 'Instalacoes',
        path: '/app/instalacoes',
        icon: <ApartmentOutlinedIcon fontSize="small" />,
        permissions: ['facilities:manage'],
      },
      {
        label: 'Eventos e ofertas',
        path: '/app/eventos',
        icon: <EventOutlinedIcon fontSize="small" />,
      },
      {
        label: 'Vendas e credenciais',
        path: '/app/vendas',
        icon: <ShoppingBagOutlinedIcon fontSize="small" />,
        permissions: ['inventory:hold', 'orders:create', 'orders:read', 'orders:manual-confirm', 'orders:cancel', 'credentials:issue'],
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        label: 'Bloqueios',
        path: '/app/bloqueios',
        icon: <BlockOutlinedIcon fontSize="small" />,
        permissions: ['organizations:admin', 'audit:read'],
      },
    ],
  },
];
