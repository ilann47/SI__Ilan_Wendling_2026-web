import { useEffect, useState } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import ExpandLessOutlinedIcon from '@mui/icons-material/ExpandLessOutlined';
import ExpandMoreOutlinedIcon from '@mui/icons-material/ExpandMoreOutlined';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { navGroups } from './navigation';
import { ContextSelector } from './ContextSelector';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../context/ColorModeContext';
import { useSnackbar } from '../components/SnackbarProvider';
import { describeError } from '../api/client';
import { GlobalSearch } from '../components/search/GlobalSearch';
import { useUiPreferences } from '../preferences/useUiPreferences';
import { BrandMark } from '../components/brand/BrandMark';
import { getThemeTokens } from '../theme/hubTokens';

const DRAWER_WIDTH = 228;
const COMPACT_DRAWER_WIDTH = 72;
const HEADER_HEIGHT = 64;

export function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [switchingOrganizationId, setSwitchingOrganizationId] = useState<number | null>(null);
  const { user, activeOrganization, organizations, permissions, logout, selectOrganization } = useAuth();
  const { mode, toggle } = useColorMode();
  const colors = getThemeTokens(mode);
  const { notify } = useSnackbar();
  const { prefs, update, rememberPath, toggleFavorite } = useUiPreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const compactMenu = prefs.compactMenu;
  const allItems = navGroups.flatMap((group) => group.items);
  const activeGroup = navGroups.find((group) => group.items.some((item) => item.path === '/app'
    ? location.pathname === item.path : location.pathname.startsWith(item.path)))?.label;
  const expandedGroups = Object.keys(prefs.expandedGroups).length > 0
    ? prefs.expandedGroups
    : Object.fromEntries(navGroups.map((group) => [group.label, group.label === activeGroup]));

  useEffect(() => {
    rememberPath(location.pathname);
  }, [location.pathname, rememberPath]);

  useEffect(() => {
    if (activeGroup) {
      update((current) => ({
        ...current,
        expandedGroups: { ...current.expandedGroups, [activeGroup]: true },
      }));
    }
  }, [activeGroup, update]);

  const setExpandedGroups = (next: Record<string, boolean> | ((current: Record<string, boolean>) => Record<string, boolean>)) => {
    update((current) => ({
      ...current,
      expandedGroups: typeof next === 'function' ? next(current.expandedGroups) : next,
    }));
  };

  const navItemSx = (selected: boolean) => ({
    mx: compactMenu ? 0.75 : 1,
    my: 0.2,
    borderRadius: 1.5,
    py: 0.85,
    px: compactMenu ? 0 : 1.25,
    justifyContent: compactMenu ? 'center' : 'flex-start',
    color: selected ? colors.purple : colors.text,
    bgcolor: selected ? colors.brandHover : 'transparent',
    fontWeight: selected ? 800 : 600,
    '&:hover': {
      bgcolor: selected ? colors.brandHover : colors.sidebarHover,
      color: selected ? colors.purple : colors.text,
    },
    '&.Mui-selected': {
      bgcolor: colors.brandHover,
      color: colors.purple,
      '&:hover': { bgcolor: colors.brandHover },
      '& .MuiListItemIcon-root': { color: colors.purple },
    },
    '& .MuiListItemIcon-root': {
      color: selected ? colors.purple : colors.textMuted,
      minWidth: compactMenu ? 0 : 36,
      justifyContent: 'center',
    },
  });

  const drawerContent = (compact: boolean) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: colors.appBar }}>
      <Box
        sx={{
          px: compact ? 0.75 : 2,
          py: 1.5,
          minHeight: 48,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: compact ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        {!compact && (
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: colors.purple,
            }}
          >
            Navegação
          </Typography>
        )}
        {isDesktop && (
          <Tooltip title={compact ? 'Expandir menu' : 'Recolher menu'}>
            <IconButton
              size="small"
              aria-label={compact ? 'Expandir menu' : 'Recolher menu'}
              onClick={() => update({ compactMenu: !compact })}
              sx={{ color: colors.textMuted }}
            >
              {compact ? <ChevronRightOutlinedIcon fontSize="small" /> : <ChevronLeftOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Box sx={{ overflowY: 'auto', flexGrow: 1, py: 1 }}>
        {!compact && prefs.favoritePaths.length > 0 && (
          <List dense disablePadding>
            <Typography variant="overline" sx={{ px: 2, color: colors.textMuted }}>Favoritos</Typography>
            {prefs.favoritePaths.map((path) => {
              const item = allItems.find((candidate) => candidate.path === path);
              if (!item) return null;
              const selected = location.pathname === path;
              return (
                <ListItemButton
                  key={path}
                  component={RouterLink}
                  to={path}
                  selected={selected}
                  onClick={() => !isDesktop && setMobileOpen(false)}
                  sx={navItemSx(selected)}
                >
                  <ListItemIcon><StarOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: selected ? 800 : 600 }} />
                </ListItemButton>
              );
            })}
          </List>
        )}
        {!compact && prefs.recentPaths.length > 0 && (
          <List dense disablePadding>
            <Typography variant="overline" sx={{ px: 2, color: colors.textMuted }}>Últimas</Typography>
            {prefs.recentPaths.slice(0, 4).map((path) => {
              const item = allItems.find((candidate) => candidate.path === path);
              if (!item) return null;
              return (
                <ListItemButton
                  key={`recent-${path}`}
                  component={RouterLink}
                  to={path}
                  onClick={() => !isDesktop && setMobileOpen(false)}
                  sx={navItemSx(false)}
                >
                  <ListItemIcon><HistoryOutlinedIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: 600 }} />
                </ListItemButton>
              );
            })}
          </List>
        )}
        {navGroups.map((group) => {
          const items = group.items.filter((item) => !item.permissions
            || item.permissions.some((permission) => permissions.includes(permission)));
          if (items.length === 0) return null;
          const expanded = expandedGroups[group.label] ?? false;
          if (compact) {
            return (
              <Tooltip key={group.label} title={group.label} placement="right">
                <ListItemButton
                  aria-label={`Abrir ${group.label}`}
                  onClick={() => {
                    update({ compactMenu: false });
                    setExpandedGroups((current) => ({ ...current, [group.label]: true }));
                  }}
                  sx={navItemSx(false)}
                >
                  <ListItemIcon>{items[0].icon}</ListItemIcon>
                </ListItemButton>
              </Tooltip>
            );
          }
          return (
            <Box key={group.label}>
              <List dense disablePadding>
                <ListItemButton
                  aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${group.label}`}
                  onClick={() => setExpandedGroups((current) => ({ ...current, [group.label]: !expanded }))}
                  sx={{ px: 2, py: 0.75, color: colors.textMuted }}
                >
                  <ListItemText
                    primary={group.label}
                    primaryTypographyProps={{
                      fontWeight: 800, letterSpacing: 0.8, fontSize: '0.72rem', textTransform: 'uppercase',
                    }}
                  />
                  {expanded ? <ExpandLessOutlinedIcon fontSize="small" /> : <ExpandMoreOutlinedIcon fontSize="small" />}
                </ListItemButton>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                  {items.map((item) => {
                    const selected = item.path === '/app'
                      ? location.pathname === item.path
                      : location.pathname.startsWith(item.path);
                    return (
                      <ListItemButton
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        selected={selected}
                        onClick={() => !isDesktop && setMobileOpen(false)}
                        sx={navItemSx(selected)}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: selected ? 800 : 600 }}
                        />
                        <IconButton
                          size="small"
                          aria-label={prefs.favoritePaths.includes(item.path) ? `Remover ${item.label} dos favoritos` : `Favoritar ${item.label}`}
                          onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleFavorite(item.path); }}
                          sx={{ color: selected ? colors.purple : colors.textMuted }}
                        >
                          {prefs.favoritePaths.includes(item.path)
                            ? <StarOutlinedIcon fontSize="inherit" />
                            : <StarBorderOutlinedIcon fontSize="inherit" />}
                        </IconButton>
                      </ListItemButton>
                    );
                  })}
                </Collapse>
              </List>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  const drawerWidth = compactMenu ? COMPACT_DRAWER_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: colors.background }}>
      <Box
        component="a"
        href="#conteudo-principal"
        sx={{
          position: 'fixed', top: 8, left: 8, zIndex: theme.zIndex.tooltip + 1,
          px: 2, py: 1, bgcolor: 'background.paper', color: 'primary.main', borderRadius: 1,
          transform: 'translateY(-150%)', '&:focus': { transform: 'translateY(0)' },
        }}
      >
        Ir para o conteúdo principal
      </Box>

      <AppBar position="fixed" elevation={0} sx={{ zIndex: 1500, bgcolor: colors.appBar, color: colors.text }}>
        <Toolbar
          disableGutters
          sx={{
            minHeight: `${HEADER_HEIGHT}px !important`,
            height: HEADER_HEIGHT,
            px: { xs: 1.5, sm: 2.25 },
            display: 'grid',
            gridTemplateColumns: {
              xs: 'minmax(0, 1fr) auto',
              md: 'minmax(0, 1fr) minmax(200px, 520px) minmax(0, 1fr)',
            },
            columnGap: 1.5,
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
            {!isDesktop && (
              <IconButton edge="start" aria-label="Abrir menu de navegação" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <BrandMark size={34} showName onClick={() => navigate('/app')} />
            <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0 }}>
              <ContextSelector />
            </Box>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center', width: '100%' }}>
            <GlobalSearch />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
            <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
              <GlobalSearch />
            </Box>
            <Tooltip title={mode === 'light' ? 'Modo escuro' : 'Modo claro'}>
              <IconButton aria-label={mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'} onClick={toggle}>
                {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Conta">
              <IconButton aria-label="Conta" onClick={(e) => setAnchor(e.currentTarget)}>
                <Avatar sx={{ width: 34, height: 34, bgcolor: colors.purple, fontSize: 14, fontWeight: 700 }}>
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
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                Sair
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        aria-label="Navegação principal"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width'),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              top: HEADER_HEIGHT,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              bgcolor: colors.appBar,
            },
          }}
        >
          {drawerContent(false)}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              top: HEADER_HEIGHT,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
              bgcolor: colors.appBar,
              borderRight: `1px solid ${colors.border}`,
              transition: theme.transitions.create('width'),
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent(compactMenu)}
        </Drawer>
      </Box>

      <Box
        component="main"
        id="conteudo-principal"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: colors.background,
          transition: theme.transitions.create('width'),
        }}
      >
        <Toolbar sx={{ minHeight: `${HEADER_HEIGHT}px !important` }} />
        <Box sx={{ display: { xs: 'block', lg: 'none' }, px: 2, pt: 1 }}>
          <ContextSelector />
        </Box>
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
