import { AppBar, Box, IconButton, Toolbar, Tooltip } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import type { ReactNode } from 'react';
import { BrandMark } from '../components/brand/BrandMark';
import { GlobalSearch } from '../components/search/GlobalSearch';
import { useColorMode } from '../context/ColorModeContext';
import { getThemeTokens } from '../theme/hubTokens';
import { ContextSelector } from './ContextSelector';
import { HubLauncherButton } from './HubLauncherButton';
import type { HubModule } from './hubModules';
import {
  APP_HEADER_BRAND_SIZE,
  APP_HEADER_HEIGHT,
  APP_HEADER_NAV_SLOT,
  APP_HEADER_PX,
  APP_HEADER_SEARCH_MAX_WIDTH,
} from './layoutMetrics';
import { UserAccountMenu } from './UserAccountMenu';

type Props = {
  onGoHome: () => void;
  onSelectModule: (module: HubModule) => void;
  onOpenSidebar?: () => void;
  showSidebarToggle?: boolean;
  activeModuleId?: string;
  contextSlot?: ReactNode;
};

const iconBtnSx = {
  color: 'inherit',
  bgcolor: 'transparent',
  borderRadius: 1.25,
  width: 36,
  height: 36,
  flexShrink: 0,
} as const;

/** Header global — mesmo grid e slots do Hub YES7 (`AppHeader`). */
export function AppHeader({
  onGoHome,
  onSelectModule,
  onOpenSidebar,
  showSidebarToggle = false,
  activeModuleId,
  contextSlot,
}: Props) {
  const { mode, toggle } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: '100%',
        bgcolor: colors.appBar,
        color: colors.text,
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 1500,
        overflow: 'visible',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          minHeight: `${APP_HEADER_HEIGHT}px !important`,
          height: APP_HEADER_HEIGHT,
          display: 'grid',
          gridTemplateColumns: {
            xs: 'minmax(0, 1fr) auto',
            md: 'minmax(0, 1fr) minmax(200px, 520px) minmax(0, 1fr)',
          },
          alignItems: 'center',
          columnGap: 1.5,
          px: APP_HEADER_PX,
          overflow: 'visible',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            minWidth: 0,
            overflow: 'visible',
            justifySelf: 'start',
          }}
        >
          <Box
            sx={{
              width: APP_HEADER_NAV_SLOT,
              height: APP_HEADER_NAV_SLOT,
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              visibility: showSidebarToggle ? 'visible' : 'hidden',
              pointerEvents: showSidebarToggle ? 'auto' : 'none',
            }}
          >
            <IconButton
              onClick={onOpenSidebar}
              aria-label="Abrir menu de navegação"
              sx={{ color: colors.text }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          <Tooltip title="Hub de módulos">
            <IconButton
              onClick={onGoHome}
              aria-label="Hub de módulos"
              sx={{
                ...iconBtnSx,
                color: colors.purple,
                bgcolor: colors.brandHover,
                '&:hover': { bgcolor: colors.brandHover },
              }}
            >
              <HomeOutlinedIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          <HubLauncherButton
            onGoHome={onGoHome}
            onSelectModule={onSelectModule}
            activeModuleId={activeModuleId}
          />

          <BrandMark size={APP_HEADER_BRAND_SIZE} showName onClick={onGoHome} />
          <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 0 }}>
            {contextSlot ?? <ContextSelector />}
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            width: '100%',
            maxWidth: APP_HEADER_SEARCH_MAX_WIDTH,
            justifySelf: 'center',
            justifyContent: 'center',
          }}
        >
          <GlobalSearch />
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.25,
            flexShrink: 0,
            justifySelf: 'end',
          }}
        >
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <GlobalSearch />
          </Box>
          <Tooltip title={mode === 'light' ? 'Modo escuro' : 'Modo claro'}>
            <IconButton
              aria-label={mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
              onClick={toggle}
              sx={{ color: colors.textMuted }}
            >
              {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
            </IconButton>
          </Tooltip>
          <UserAccountMenu />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
