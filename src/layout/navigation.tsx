import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
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
    label: 'Gestao',
    items: [
      {
        label: 'Administracao',
        path: '/app/administracao',
        icon: <AdminPanelSettingsOutlinedIcon fontSize="small" />,
        permissions: ['organizations:admin', 'users:invite', 'roles:grant', 'roles:revoke'],
      },
    ],
  },
];
