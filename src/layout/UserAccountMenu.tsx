import { useState, type MouseEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { describeError } from '../api/client';
import { useSnackbar } from '../components/SnackbarProvider';
import { useColorMode } from '../context/ColorModeContext';
import { getThemeTokens } from '../theme/hubTokens';

type Props = {
  variant?: 'header' | 'hub';
};

/** Menu de conta no padrão Hub YES7, com troca de organização Kaneko. */
export function UserAccountMenu({ variant = 'header' }: Props) {
  const navigate = useNavigate();
  const { notify } = useSnackbar();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const { user, activeOrganization, organizations, logout, selectOrganization } = useAuth();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [switchingOrganizationId, setSwitchingOrganizationId] = useState<number | null>(null);

  const userName = user?.login ?? 'Operador';
  const roleLabel = user?.perfil === 'ADMIN' ? 'Administrador' : 'Operador';
  const initials = userName.slice(0, 1).toUpperCase();
  const open = Boolean(anchor);
  const close = () => setAnchor(null);
  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchor(e.currentTarget);

  return (
    <>
      <Button
        onClick={handleOpen}
        endIcon={<KeyboardArrowDownIcon />}
        aria-label="Conta"
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : undefined}
        sx={{
          color: colors.text,
          fontWeight: 600,
          fontSize: variant === 'hub' ? '0.875rem' : '0.8rem',
          px: 1,
          gap: 1,
          textTransform: 'none',
          minWidth: 0,
          '&:hover': { bgcolor: colors.sidebarHover },
        }}
      >
        <Avatar
          sx={{
            width: variant === 'hub' ? 34 : 30,
            height: variant === 'hub' ? 34 : 30,
            background: colors.brandGradient,
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 800,
          }}
        >
          {initials}
        </Avatar>
        <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'left', lineHeight: 1.15 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', color: colors.text }}>
            {userName.split(/[.@]/)[0]}
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: colors.textMuted, fontWeight: 600 }}>
            {roleLabel}
          </Typography>
        </Box>
      </Button>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 240,
              borderRadius: 2,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.25 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{userName}</Typography>
          <Typography variant="caption" color="text.secondary">{roleLabel}</Typography>
          {activeOrganization && (
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.35 }}>
              {activeOrganization.tradeName || activeOrganization.legalName}
            </Typography>
          )}
        </Box>
        <Divider />
        {organizations.length > 1 && (
          <>
            <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block' }}>
              Trocar organização
            </Typography>
            {organizations
              .filter((organization) => organization.organizationId !== activeOrganization?.organizationId)
              .map((organization) => (
                <MenuItem
                  key={organization.organizationId}
                  disabled={switchingOrganizationId !== null}
                  onClick={async () => {
                    setSwitchingOrganizationId(organization.organizationId);
                    try {
                      await selectOrganization(organization.organizationId);
                      close();
                      navigate('/app');
                    } catch (cause) {
                      notify(describeError(cause), 'error');
                    } finally {
                      setSwitchingOrganizationId(null);
                    }
                  }}
                >
                  <ListItemIcon><BusinessOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={organization.tradeName || organization.legalName} />
                </MenuItem>
              ))}
            <Divider />
          </>
        )}
        <MenuItem
          onClick={() => {
            close();
            logout();
            navigate('/login');
          }}
        >
          <ListItemIcon><PowerSettingsNewIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sair" />
        </MenuItem>
      </Menu>
    </>
  );
}
