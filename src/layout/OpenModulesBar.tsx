import { Box, IconButton, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { ReactNode } from 'react';
import { useColorMode } from '../context/ColorModeContext';
import { getThemeTokens } from '../theme/hubTokens';
import { APP_HEADER_HEIGHT } from './layoutMetrics';

export type OpenModuleTab = {
  id: string;
  label: string;
  icon?: ReactNode;
};

type Props = {
  modules: OpenModuleTab[];
  activeId: string;
  onSelect: (moduleId: string) => void;
  onClose: (moduleId: string) => void;
};

/** Abas dos módulos já abertos — padrão Hub YES7. */
export function OpenModulesBar({ modules, activeId, onSelect, onClose }: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);

  if (modules.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'sticky',
        top: APP_HEADER_HEIGHT,
        zIndex: 20,
        display: 'flex',
        alignItems: 'stretch',
        gap: 0.5,
        px: { xs: 1, sm: 1.5 },
        py: 0.65,
        bgcolor: colors.card,
        borderBottom: `1px solid ${colors.border}`,
        overflowX: 'auto',
        '&::-webkit-scrollbar': { height: 4 },
      }}
    >
      {modules.map((mod) => {
        const active = mod.id === activeId;
        return (
          <Box
            key={mod.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(mod.id)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.75,
              pl: 1.25,
              pr: 0.5,
              py: 0.55,
              minHeight: 34,
              borderRadius: 1.25,
              cursor: 'pointer',
              flexShrink: 0,
              bgcolor: active ? 'rgba(107,70,254,0.12)' : 'transparent',
              border: `1px solid ${active ? colors.purple : 'transparent'}`,
              color: active ? colors.purple : colors.textMuted,
              '&:hover': {
                bgcolor: active ? 'rgba(107,70,254,0.14)' : colors.sidebarHover,
                color: active ? colors.purple : colors.text,
              },
            }}
          >
            {mod.icon ? (
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 16,
                  '& .MuiSvgIcon-root': { fontSize: 16 },
                }}
              >
                {mod.icon}
              </Box>
            ) : null}
            <Typography
              component="span"
              sx={{
                fontWeight: active ? 800 : 650,
                fontSize: '0.82rem',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}
            >
              {mod.label}
            </Typography>
            <IconButton
              size="small"
              aria-label={`Fechar módulo ${mod.label}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(mod.id);
              }}
              sx={{
                p: 0.25,
                color: 'inherit',
                opacity: 0.7,
                '&:hover': { opacity: 1, bgcolor: 'rgba(0,0,0,0.06)' },
              }}
            >
              <CloseRoundedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        );
      })}
    </Box>
  );
}
