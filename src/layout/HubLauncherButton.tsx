import { useMemo, useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  InputAdornment,
  Popover,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AppsIcon from '@mui/icons-material/Apps';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useColorMode } from '../context/ColorModeContext';
import { getThemeTokens } from '../theme/hubTokens';
import { canOpenHubModule, hubModules, type HubModule } from './hubModules';
import { useAuth } from '../auth/AuthContext';

type Props = {
  onGoHome?: () => void;
  onSelectModule?: (module: HubModule) => void;
  activeModuleId?: string;
};

/** Launcher em grade — popover no desktop, bottom sheet no mobile. */
export function HubLauncherButton({ onGoHome, onSelectModule, activeModuleId }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const { permissions } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState('');

  const modules = useMemo(
    () => hubModules.filter((module) => canOpenHubModule(module, permissions)),
    [permissions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter(
      (m) => m.label.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
    );
  }, [modules, query]);

  const open = Boolean(anchor);
  const close = () => {
    setAnchor(null);
    setQuery('');
  };

  const grid = (
    <>
      <TextField
        autoFocus={!isMobile}
        fullWidth
        size="small"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar módulos…"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchOutlinedIcon sx={{ fontSize: 18, color: colors.textMuted }} />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1.25 }}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(5, 1fr)' },
          gap: 0.75,
          maxHeight: { xs: 'none', sm: 320 },
          overflowY: 'auto',
        }}
      >
        {filtered.map((mod) => {
          const active = mod.id === activeModuleId;
          return (
            <Box
              key={mod.id}
              component="button"
              type="button"
              onClick={() => {
                onSelectModule?.(mod);
                close();
              }}
              sx={{
                appearance: 'none',
                border: 'none',
                bgcolor: active ? colors.brandHover : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5,
                px: 0.5,
                py: 1,
                minHeight: 84,
                borderRadius: 1.5,
                color: colors.text,
                WebkitTapHighlightColor: 'transparent',
                '&:hover': { bgcolor: colors.brandHover },
                '&:active': { bgcolor: colors.brandHover },
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1.5,
                  bgcolor: active ? colors.purple : colors.brandHover,
                  color: active ? '#fff' : colors.purple,
                  display: 'grid',
                  placeItems: 'center',
                  '& svg': { fontSize: 24 },
                }}
              >
                {mod.icon}
              </Box>
              <Typography
                sx={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  lineHeight: 1.15,
                  textAlign: 'center',
                }}
              >
                {mod.label}
              </Typography>
            </Box>
          );
        })}
      </Box>

      <Box
        component="button"
        type="button"
        onClick={() => {
          onGoHome?.();
          close();
        }}
        sx={{
          appearance: 'none',
          border: 'none',
          bgcolor: 'transparent',
          mt: 1,
          pt: 1.25,
          pb: 0.5,
          minHeight: 48,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          cursor: 'pointer',
          color: colors.purpleSoft,
          borderTop: `1px solid ${colors.border}`,
          fontWeight: 700,
          fontSize: '0.85rem',
          '&:hover': { color: colors.purple },
        }}
      >
        <HomeOutlinedIcon sx={{ fontSize: 20 }} />
        Hub de módulos
      </Box>
    </>
  );

  return (
    <>
      <Tooltip title="Aplicativos">
        <IconButton
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label="Abrir módulos"
          sx={{
            color: colors.purple,
            bgcolor: colors.brandHover,
            borderRadius: 1.25,
            width: 44,
            height: 44,
            flexShrink: 0,
            '&:hover': { bgcolor: colors.brandHover },
          }}
        >
          <AppsIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Tooltip>

      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={close}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '88dvh',
              p: 2,
              pb: 'max(16px, env(safe-area-inset-bottom))',
              border: `1px solid ${colors.border}`,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>Módulos</Typography>
            <IconButton aria-label="Fechar módulos" onClick={close} sx={{ width: 44, height: 44 }}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
          {grid}
        </Drawer>
      ) : (
        <Popover
          open={open}
          anchorEl={anchor}
          onClose={close}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                width: 420,
                maxWidth: 'calc(100vw - 24px)',
                p: 1.5,
                borderRadius: 2,
                border: `1px solid ${colors.border}`,
                boxShadow: '0 12px 40px rgba(15, 23, 42, 0.16)',
              },
            },
          }}
        >
          {grid}
        </Popover>
      )}
    </>
  );
}
