import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { AppHeader } from './AppHeader';
import { ContextSelector } from './ContextSelector';
import { resolveHubModule } from './hubModules';
import { APP_HEADER_HEIGHTS } from './layoutMetrics';
import { useColorMode } from '../context/ColorModeContext';
import { useUiPreferences } from '../preferences/useUiPreferences';
import { getThemeTokens } from '../theme/hubTokens';

export interface AppLayoutContext {
  openArea: (areaId: string) => void;
}

/** Menu superior único, contexto da organização e conteúdo em largura total. */
export function AppLayout() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const { rememberPath } = useUiPreferences();
  const location = useLocation();
  const navigate = useNavigate();
  const activeModule = resolveHubModule(location.pathname, location.search);
  const [requestedArea, setRequestedArea] = useState<string | null>(null);
  const clearAreaRequest = useCallback(() => setRequestedArea(null), []);

  useEffect(() => {
    if (/^\/app\/?$/.test(location.pathname) || location.pathname.startsWith('/app/areas/')) return;
    rememberPath(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search, rememberPath]);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: colors.background, overflowX: 'hidden' }}>
      <Box component="a" href="#conteudo-principal" sx={{
        position: 'fixed', top: 8, left: 8, zIndex: theme.zIndex.tooltip + 1,
        px: 2, py: 1, bgcolor: 'background.paper', color: 'primary.main', borderRadius: 1,
        transform: 'translateY(-150%)', '&:focus': { transform: 'translateY(0)' },
      }}>
        Ir para o conteúdo principal
      </Box>
      <AppHeader onGoHome={() => navigate('/app')} activeModuleId={activeModule?.id}
        requestedArea={requestedArea} onAreaOpened={clearAreaRequest} />
      <Box component="main" id="conteudo-principal" tabIndex={-1}
        sx={{ width: '100%', minWidth: 0, minHeight: '100dvh', pb: 'env(safe-area-inset-bottom)' }}>
        <Box aria-hidden="true" sx={{
          height: Object.fromEntries(Object.entries(APP_HEADER_HEIGHTS)
            .map(([breakpoint, height]) => [breakpoint, `calc(${height}px + env(safe-area-inset-top))`])),
        }} />
        <Box sx={{ display: { xs: 'block', lg: 'none' }, px: { xs: 1.5, sm: 2 }, pt: 1, pb: 0.5 }}>
          <ContextSelector />
        </Box>
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, minWidth: 0 }}>
          <Outlet context={{ openArea: setRequestedArea } satisfies AppLayoutContext} />
        </Box>
      </Box>
    </Box>
  );
}
