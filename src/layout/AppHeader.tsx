import { AppBar, Box, IconButton, Toolbar, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import type { ReactNode } from 'react';
import { BrandMark } from '../components/brand/BrandMark';
import { GlobalSearch } from '../components/search/GlobalSearch';
import { useColorMode } from '../context/ColorModeContext';
import { getThemeTokens } from '../theme/hubTokens';
import { ContextSelector } from './ContextSelector';
import { HeaderAreaNavigation } from './HeaderAreaNavigation';
import {
  APP_HEADER_BRAND_SIZE,
  APP_HEADER_HEIGHT,
  APP_HEADER_NAV_HEIGHT,
  APP_HEADER_PX,
  APP_HEADER_SEARCH_MAX_WIDTH,
} from './layoutMetrics';
import { UserAccountMenu } from './UserAccountMenu';

type Props = {
  onGoHome: () => void;
  activeModuleId?: string;
  requestedArea?: string | null;
  onAreaOpened?: () => void;
  contextSlot?: ReactNode;
};

/** Cabeçalho por processo: menus diretos no desktop e drawer no mobile. */
export function AppHeader({
  onGoHome,
  activeModuleId,
  requestedArea,
  onAreaOpened,
  contextSlot,
}: Props) {
  const { mode, toggle } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: '100%', bgcolor: colors.appBar, color: colors.text,
        borderBottom: `1px solid ${colors.border}`,
        pt: 'env(safe-area-inset-top)',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: `${APP_HEADER_HEIGHT}px !important`,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'auto minmax(0, 1fr) auto',
            md: 'auto minmax(220px, 1fr) auto',
            xl: 'auto auto minmax(180px, 1fr) auto',
          },
          gridTemplateAreas: {
            xs: '"navigation brand account"',
            md: '"brand search account" "navigation navigation navigation"',
            xl: '"brand navigation search account"',
          },
          gridTemplateRows: {
            xs: `${APP_HEADER_HEIGHT}px`,
            md: `${APP_HEADER_HEIGHT}px ${APP_HEADER_NAV_HEIGHT}px`,
            xl: `${APP_HEADER_HEIGHT}px`,
          },
          columnGap: { xs: 0.5, md: 2, xl: 1.5 },
          alignItems: 'center', px: { xs: 1, sm: APP_HEADER_PX.sm },
        }}
      >
        <Box sx={{ gridArea: 'brand', display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <BrandMark size={APP_HEADER_BRAND_SIZE} showName onClick={onGoHome} />
          </Box>
          <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
            <BrandMark size={30} onClick={onGoHome} />
          </Box>
          <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0, maxWidth: { lg: 210, xl: 140 }, '& > button': { maxWidth: '100%' } }}>
            {contextSlot ?? <ContextSelector />}
          </Box>
        </Box>

        <Box sx={{ gridArea: 'navigation', alignSelf: 'stretch', display: 'flex', alignItems: 'center', minWidth: 0, borderTop: { xs: 0, md: `1px solid ${colors.border}`, xl: 0 } }}>
          <HeaderAreaNavigation activeModuleId={activeModuleId} requestedArea={requestedArea} onAreaOpened={onAreaOpened} />
        </Box>

        <Box sx={{ gridArea: 'search', display: { xs: 'none', md: 'flex' }, width: '100%', maxWidth: APP_HEADER_SEARCH_MAX_WIDTH, justifySelf: 'center', minWidth: 0 }}>
          <GlobalSearch />
        </Box>

        <Box sx={{ gridArea: 'account', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', justifySelf: 'end' }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}><GlobalSearch /></Box>
          <Tooltip title={mode === 'light' ? 'Modo escuro' : 'Modo claro'}>
            <IconButton aria-label={mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
              onClick={toggle} sx={{ color: colors.textMuted, width: 44, height: 44, display: { xs: 'none', sm: 'inline-flex' } }}>
              {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <UserAccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
