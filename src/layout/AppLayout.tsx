import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box, Toolbar, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ContextSelector } from './ContextSelector';
import {
  hubModules,
  moduleNavItems,
  resolveHubModule,
  type HubModule,
} from './hubModules';
import {
  APP_HEADER_HEIGHT,
  APP_SIDEBAR_COLLAPSED_WIDTH,
  APP_SIDEBAR_WIDTH,
} from './layoutMetrics';
import { ModuleSubnav } from './ModuleSubnav';
import { OpenModulesBar } from './OpenModulesBar';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../context/ColorModeContext';
import { useUiPreferences } from '../preferences/useUiPreferences';
import { getThemeTokens } from '../theme/hubTokens';

const OPEN_MODULES_KEY = 'kaneko.hub.openModules';

function readOpenModules(): string[] {
  try {
    const raw = sessionStorage.getItem(OPEN_MODULES_KEY);
    const parsed = raw ? JSON.parse(raw) as string[] : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeOpenModules(ids: string[]) {
  sessionStorage.setItem(OPEN_MODULES_KEY, JSON.stringify(ids));
}

/**
 * Shell no padrão Hub YES7: header + launcher + abas de módulos + sidebar contextual.
 */
export function AppLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openModuleIds, setOpenModuleIds] = useState<string[]>(readOpenModules);
  const { permissions } = useAuth();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const { prefs, update, rememberPath } = useUiPreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const compactMenu = prefs.compactMenu;
  const isHubHome = location.pathname === '/app' || location.pathname === '/app/';
  const activeModule = resolveHubModule(location.pathname);
  const moduleItems = useMemo(
    () => (activeModule ? moduleNavItems(activeModule, permissions) : []),
    [activeModule, permissions],
  );
  const showSidebar = !isHubHome && moduleItems.length > 0;
  const drawerWidth = showSidebar
    ? (compactMenu ? APP_SIDEBAR_COLLAPSED_WIDTH : APP_SIDEBAR_WIDTH)
    : 0;

  const selectedNavId = useMemo(() => {
    if (!activeModule) return null;
    const match = moduleItems
      .filter((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match?.path ?? null;
  }, [activeModule, location.pathname, moduleItems]);

  useEffect(() => {
    if (!isHubHome) rememberPath(location.pathname);
  }, [isHubHome, location.pathname, rememberPath]);

  useEffect(() => {
    if (!activeModule) return;
    setOpenModuleIds((current) => {
      if (current.includes(activeModule.id)) return current;
      const next = [...current, activeModule.id];
      writeOpenModules(next);
      return next;
    });
  }, [activeModule]);

  const openTabs = openModuleIds
    .map((id) => hubModules.find((module) => module.id === id))
    .filter((module): module is HubModule => Boolean(module));

  const goHome = () => navigate('/app');
  const openModule = (module: HubModule) => {
    setOpenModuleIds((current) => {
      const next = current.includes(module.id) ? current : [...current, module.id];
      writeOpenModules(next);
      return next;
    });
    navigate(module.homePath);
  };
  const closeModuleTab = (moduleId: string) => {
    setOpenModuleIds((current) => {
      const next = current.filter((id) => id !== moduleId);
      writeOpenModules(next);
      if (activeModule?.id === moduleId) {
        const fallback = next
          .map((id) => hubModules.find((module) => module.id === id))
          .find(Boolean);
        navigate(fallback?.homePath ?? '/app');
      }
      return next;
    });
  };

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

      <AppHeader
        onGoHome={goHome}
        onSelectModule={openModule}
        onOpenSidebar={() => setMobileOpen(true)}
        showSidebarToggle={showSidebar && !isDesktop}
        activeModuleId={activeModule?.id}
      />

      {showSidebar && (
        <AppSidebar
          moduleLabel={activeModule?.label}
          items={moduleItems.map((item) => ({
            id: item.path,
            label: item.label,
            icon: item.icon,
          }))}
          selectedId={selectedNavId}
          onSelect={(path) => navigate(path)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          collapsed={compactMenu}
          onToggleCollapsed={() => update({ compactMenu: !compactMenu })}
        />
      )}

      <Box
        component="main"
        id="conteudo-principal"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          width: { md: showSidebar ? `calc(100% - ${drawerWidth}px)` : '100%' },
          ml: { md: showSidebar ? `${drawerWidth}px` : 0 },
          minHeight: '100vh',
          bgcolor: colors.background,
          transition: theme.transitions.create(['width', 'margin']),
        }}
      >
        <Toolbar sx={{ minHeight: `${APP_HEADER_HEIGHT}px !important` }} />
        {!isHubHome && openTabs.length > 0 && (
          <OpenModulesBar
            modules={openTabs.map((module) => ({
              id: module.id,
              label: module.label,
              icon: module.icon,
            }))}
            activeId={activeModule?.id ?? ''}
            onSelect={(id) => {
              const module = hubModules.find((candidate) => candidate.id === id);
              if (module) openModule(module);
            }}
            onClose={closeModuleTab}
          />
        )}
        <Box sx={{ display: { xs: 'block', lg: 'none' }, px: 2, pt: 1 }}>
          <ContextSelector />
        </Box>
        {isHubHome ? (
          <Outlet />
        ) : (
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {activeModule && (
              <ModuleSubnav
                title={moduleItems.find((item) => item.path === selectedNavId)?.label ?? activeModule.label}
                variant="crumb"
              />
            )}
            <Outlet />
          </Box>
        )}
      </Box>
    </Box>
  );
}
