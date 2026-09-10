import { type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useColorMode } from '../../context/ColorModeContext';
import { getThemeTokens } from '../../theme/hubTokens';

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  action?: ReactNode;
  /** Quando true, mostra Hub › título (padrão ModuleSubnav). */
  hubCrumb?: boolean;
}

export function PageHeader({ title, subtitle, count, action, hubCrumb = false }: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      spacing={2}
      sx={{ mb: 2.5 }}
    >
      <Box>
        {hubCrumb ? (
          <Typography variant="body2" sx={{ color: colors.textMuted, mb: 0.75 }}>
            <Box
              component={RouterLink}
              to="/app"
              sx={{
                color: colors.textMuted,
                fontWeight: 600,
                textDecoration: 'none',
                '&:hover': { color: colors.purple, textDecoration: 'underline' },
              }}
            >
              Hub
            </Box>
            {' › '}
            <Box component="span" sx={{ fontWeight: 700, color: colors.text }}>
              {title}
            </Box>
          </Typography>
        ) : null}
        <Typography
          component="h1"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '1.25rem', sm: '1.45rem' },
            color: colors.text,
            lineHeight: 1.2,
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              mt: 0.35,
              maxWidth: 680,
              lineHeight: 1.5,
              color: colors.textMuted,
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {subtitle}
          </Typography>
        )}
        {count !== undefined && (
          <Typography
            variant="caption"
            sx={{
              display: 'inline-block',
              mt: 1.1,
              px: 1.25,
              py: 0.35,
              borderRadius: 999,
              bgcolor: colors.brandHover,
              color: colors.purple,
              fontWeight: 700,
            }}
          >
            {count} {count === 1 ? 'registro' : 'registros'}
          </Typography>
        )}
      </Box>
      {action && (
        <Box
          sx={{
            alignSelf: { xs: 'stretch', sm: 'center' },
            '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' }, minHeight: 44 },
          }}
        >
          {action}
        </Box>
      )}
    </Stack>
  );
}
