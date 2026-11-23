import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../context/ColorModeContext';
import { getThemeTokens } from '../theme/hubTokens';

type Props = {
  title: string;
  description?: string;
  /** `full` = breadcrumb + título (Hub). `crumb` = só Hub › título. */
  variant?: 'full' | 'crumb';
};

/** Breadcrumb Hub › Módulo — padrão Hub YES7 (`ModuleSubnav`). */
export function ModuleSubnav({ title, description, variant = 'full' }: Props) {
  const navigate = useNavigate();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <Box sx={{ mb: variant === 'crumb' ? 1.5 : 2 }}>
      <Typography variant="body2" sx={{ color: colors.textMuted, mb: variant === 'full' ? 0.75 : 0 }}>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/app')}
          sx={{
            appearance: 'none',
            border: 0,
            background: 'none',
            p: 0,
            m: 0,
            cursor: 'pointer',
            color: colors.textMuted,
            font: 'inherit',
            fontWeight: 600,
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
      {variant === 'full' ? (
        <>
          <Typography sx={{ fontWeight: 800, fontSize: '1.45rem', color: colors.text, lineHeight: 1.2 }}>
            {title}
          </Typography>
          {description ? (
            <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.35 }}>
              {description}
            </Typography>
          ) : null}
        </>
      ) : null}
    </Box>
  );
}
