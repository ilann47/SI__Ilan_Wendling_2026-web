import { Box, Button, Drawer, IconButton, Tooltip, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import type { ReactNode } from 'react';
import { useColorMode } from '../context/ColorModeContext';
import { getThemeTokens } from '../theme/hubTokens';
import {
  APP_HEADER_HEIGHT,
  APP_HEADER_HEIGHTS,
  APP_SIDEBAR_COLLAPSED_WIDTH,
  APP_SIDEBAR_WIDTH,
} from './layoutMetrics';

export type SidebarNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
};

type Props = {
  moduleLabel?: string;
  items: SidebarNavItem[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

function SidebarNav({
  moduleLabel,
  items,
  selectedId,
  onSelect,
  collapsed = false,
}: Omit<Props, 'mobileOpen' | 'onMobileClose' | 'onToggleCollapsed'>) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: colors.appBar,
        color: colors.text,
        borderRight: `1px solid ${colors.border}`,
      }}
    >
      <Box
        sx={{
          px: collapsed ? 0.75 : 2,
          py: 1.5,
          minHeight: 48,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        {!collapsed ? (
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '0.72rem',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: colors.purple,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {moduleLabel}
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1, px: collapsed ? 0.75 : 1 }}>
        {items.map((item) => {
          const active = selectedId === item.id;
          return (
            <Tooltip key={item.id} title={collapsed ? item.label : ''} placement="right">
              <span>
                <Button
                  onClick={() => onSelect(item.id)}
                  startIcon={collapsed ? undefined : item.icon}
                  fullWidth={!collapsed}
                  aria-label={item.label}
                  sx={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    textTransform: 'none',
                    fontWeight: active ? 800 : 600,
                    fontSize: '0.82rem',
                    minWidth: collapsed ? 44 : undefined,
                    width: collapsed ? 44 : '100%',
                    mx: collapsed ? 'auto' : 0,
                    display: 'flex',
                    color: active ? colors.purple : colors.text,
                    bgcolor: active ? colors.brandHover : 'transparent',
                    borderRadius: 1.5,
                    px: collapsed ? 0 : 1.25,
                    py: 0.85,
                    mb: 0.25,
                    '& .MuiButton-startIcon': {
                      color: active ? colors.purple : colors.textMuted,
                      mr: 1,
                    },
                    '&:hover': {
                      bgcolor: active ? colors.brandHover : colors.sidebarHover,
                      color: active ? colors.purple : colors.text,
                    },
                  }}
                >
                  {collapsed ? item.icon : item.label}
                </Button>
              </span>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

/** Sidebar por módulo — portada do Hub YES7 (`AppSidebar`). */
export function AppSidebar({
  moduleLabel,
  items,
  selectedId,
  onSelect,
  mobileOpen = false,
  onMobileClose,
  collapsed = false,
  onToggleCollapsed,
}: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const desktopWidth = collapsed ? APP_SIDEBAR_COLLAPSED_WIDTH : APP_SIDEBAR_WIDTH;
  const nav = (
    <SidebarNav
      moduleLabel={moduleLabel}
      items={items}
      selectedId={selectedId}
      collapsed={collapsed}
      onSelect={(id) => {
        onSelect(id);
        onMobileClose?.();
      }}
    />
  );

  return (
    <Box component="nav" aria-label="Navegação principal">
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          width: desktopWidth,
          flexShrink: 0,
          position: 'fixed',
          top: APP_HEADER_HEIGHTS,
          left: 0,
          height: Object.fromEntries(Object.entries(APP_HEADER_HEIGHTS).map(([breakpoint, height]) => [breakpoint, `calc(100dvh - ${height}px)`])),
          zIndex: 1200,
          overflow: 'visible',
          transition: 'width 0.22s ease',
        }}
      >
        {nav}
        {onToggleCollapsed ? (
          <Tooltip title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            <IconButton
              onClick={onToggleCollapsed}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              size="small"
              sx={{
                position: 'absolute',
                top: 14,
                right: -12,
                width: 24,
                height: 24,
                bgcolor: colors.appBar,
                border: `1px solid ${colors.border}`,
                boxShadow: '0 2px 8px rgba(27, 33, 64, 0.12)',
                color: colors.textMuted,
                zIndex: 2,
                '&:hover': {
                  bgcolor: colors.card,
                  color: colors.purple,
                },
              }}
            >
              {collapsed ? (
                <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
      <Drawer
        open={mobileOpen}
        onClose={onMobileClose}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: APP_SIDEBAR_WIDTH,
            top: APP_HEADER_HEIGHT,
            height: `calc(100vh - ${APP_HEADER_HEIGHT}px)`,
            bgcolor: colors.appBar,
            boxShadow: 'none',
            borderRight: `1px solid ${colors.border}`,
          },
        }}
      >
        <SidebarNav
          moduleLabel={moduleLabel}
          items={items}
          selectedId={selectedId}
          onSelect={(id) => {
            onSelect(id);
            onMobileClose?.();
          }}
        />
      </Drawer>
    </Box>
  );
}
