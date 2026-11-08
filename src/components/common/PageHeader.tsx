import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { type ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useInRouterContext, useLocation, useNavigate } from 'react-router-dom';
import { useColorMode } from '../../context/ColorModeContext';
import { getThemeTokens } from '../../theme/hubTokens';

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  action?: ReactNode;
  /** Quando true, mostra Hub › título (padrão ModuleSubnav). */
  hubCrumb?: boolean;
  backFallback?: string;
}

function RouterBackButton({ color, hoverColor, fallback }: { color: string; hoverColor: string; fallback: string }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (location.pathname === '/app') return null;

  const goBack = () => {
    if (location.key === 'default' || window.history.state?.idx === 0) navigate(fallback);
    else navigate(-1);
  };

  return (
    <Button
      type="button"
      size="small"
      color="inherit"
      startIcon={<ArrowBackRoundedIcon />}
      onClick={goBack}
      sx={{
        minWidth: 0,
        minHeight: 36,
        px: 0.5,
        mb: 0.75,
        color,
        fontWeight: 700,
        '&:hover': { color: hoverColor, bgcolor: 'transparent' },
      }}
    >
      Voltar
    </Button>
  );
}

export function PageHeader({ title, subtitle, count, action, hubCrumb = false, backFallback = '/app' }: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const isInRouter = useInRouterContext();

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      spacing={2.5}
      sx={{ mb: { xs: 2, md: 3 } }}
    >
      <Box>
        {isInRouter && <RouterBackButton color={colors.textMuted} hoverColor={colors.purple} fallback={backFallback} />}
        {hubCrumb ? (
          <Typography variant="body2" sx={{ color: colors.textMuted, mb: 0.75 }}>
            <Box
              component={isInRouter ? RouterLink : 'span'}
              {...(isInRouter ? { to: '/app' } : {})}
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
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <Box aria-hidden="true" sx={{ width: 5, height: { xs: 28, sm: 34 }, borderRadius: 99, background: colors.brandGradient, flexShrink: 0 }} />
          <Typography
            component="h1"
            sx={{
              fontWeight: 850,
              fontSize: { xs: '1.5rem', sm: '1.8rem' },
              color: colors.text,
              lineHeight: 1.15,
              letterSpacing: -0.6,
            }}
          >
            {title}
          </Typography>
        </Stack>
        {subtitle && (
          <Typography
            variant="body2"
            sx={{
              mt: 0.35,
              maxWidth: 680,
              lineHeight: 1.5,
              color: colors.textMuted,
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
              border: `1px solid ${colors.border}`,
              bgcolor: colors.card,
              color: colors.textMuted,
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
            alignSelf: { xs: 'stretch', sm: 'flex-start' },
            '& .MuiButton-root': { width: { xs: '100%', sm: 'auto' }, minHeight: 44 },
          }}
        >
          {action}
        </Box>
      )}
    </Stack>
  );
}
