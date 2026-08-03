import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { navGroups } from './navigation';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../context/ColorModeContext';
import { useSnackbar } from '../components/SnackbarProvider';
import { describeError } from '../api/client';

const DRAWER_WIDTH = 268;

export function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [switchingOrganizationId, setSwitchingOrganizationId] = useState<number | null>(null);
  const { user, activeOrganization, organizations, permissions, logout, selectOrganization } = useAuth();
  const { mode, toggle } = useColorMode();
  const { notify } = useSnackbar();
  const location = useLocation();
  const navigate = useNavigate();

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar sx={{ gap: 1.5 }}>
        <LocalParkingIcon color="primary" />
        <Box>
          <Typography variant="subtitle1" lineHeight={1.1}>
            Kaneko
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Estacionamento
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <Box sx={{ overflowY: 'auto', flexGrow: 1, pb: 2 }}>
        {navGroups.map((group) => {
          const items = group.items.filter((item) => !item.permissions
            || item.permissions.some((permission) => permissions.includes(permission)));
          if (items.length === 0) return null;
          return (
          <List
            key={group.label}
            dense
            subheader={
              <ListSubheader
                disableSticky
                sx={{ bgcolor: 'transparent', fontWeight: 700, letterSpacing: 0.4, fontSize: 11, textTransform: 'uppercase' }}
              >
                {group.label}
              </ListSubheader>
            }
          >
            {items.map((item) => (
              <ListItemButton
                key={item.path}
                component={RouterLink}
                to={item.path}
                selected={item.path === '/app'
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path)}
                onClick={() => !isDesktop && setMobileOpen(false)}
                sx={{ mx: 1, borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
              </ListItemButton>
            ))}
          </List>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Box
        component="a"
        href="#conteudo-principal"
        sx={{
          position: 'fixed', top: 8, left: 8, zIndex: theme.zIndex.tooltip + 1,
          px: 2, py: 1, bgcolor: 'background.paper', color: 'primary.main', borderRadius: 1,
          transform: 'translateY(-150%)', '&:focus': { transform: 'translateY(0)' },
        }}
      >
        Ir para o conteudo principal
      </Box>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {!isDesktop && (
            <IconButton edge="start" aria-label="Abrir menu de navegacao" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: { xs: 16, md: 20 } }}>
            {activeOrganization?.tradeName || activeOrganization?.legalName || 'Estacionamento Kaneko'}
          </Typography>
          <Tooltip title={mode === 'light' ? 'Modo escuro' : 'Modo claro'}>
            <IconButton onClick={toggle} color="inherit">
              {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Conta">
            <IconButton aria-label="Conta" onClick={(e) => setAnchor(e.currentTarget)} sx={{ ml: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 15 }}>
                {user?.login?.[0]?.toUpperCase() ?? '?'}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="subtitle2">{user?.login}</Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.perfil === 'ADMIN' ? 'Administrador' : 'Operador'}
              </Typography>
            </Box>
            <Divider />
            {organizations.length > 1 && (
              <>
                <Typography variant="overline" color="text.secondary" sx={{ px: 2, pt: 1, display: 'block' }}>
                  Trocar organizacao
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
                          setAnchor(null);
                          navigate('/app');
                        } catch (cause) {
                          notify(describeError(cause), 'error');
                        } finally {
                          setSwitchingOrganizationId(null);
                        }
                      }}
                    >
                      <ListItemIcon><BusinessOutlinedIcon fontSize="small" /></ListItemIcon>
                      {organization.tradeName || organization.legalName}
                    </MenuItem>
                  ))}
                <Divider />
              </>
            )}
            <MenuItem
              onClick={() => {
                setAnchor(null);
                logout();
                navigate('/login');
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" aria-label="Navegacao principal" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid', borderColor: 'divider' },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        id="conteudo-principal"
        tabIndex={-1}
        sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}
      >
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
