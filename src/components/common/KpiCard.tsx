import { type ReactNode } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { useColorMode } from '../../context/ColorModeContext';
import { getThemeTokens } from '../../theme/hubTokens';

interface Props {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: ReactNode;
  /** Cor do ícone; fundo pastel derivado automaticamente. */
  color?: string;
  iconBg?: string;
}

/** KPI no padrão MetricCard do Hub YES7 (ícone pastel, tipografia densa). */
export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
  iconBg,
}: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const accent = color ?? colors.purple;
  const softBg = iconBg ?? (mode === 'dark' ? 'rgba(107,70,254,0.18)' : '#F3F0FA');

  return (
    <Card sx={{ height: '100%', borderRadius: 2.5 }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1.5,
              bgcolor: softBg,
              color: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              '& .MuiSvgIcon-root': { fontSize: 22 },
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography
          variant="caption"
          sx={{ color: colors.textMuted, fontWeight: 700, letterSpacing: 0.6 }}
        >
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 750, mt: 0.75, color: colors.text, letterSpacing: -0.4 }}>
          {value}
        </Typography>
        {subtitle ? (
          <Typography variant="caption" sx={{ display: 'block', mt: 1.1, color: colors.textMuted, fontWeight: 600 }}>
            {subtitle}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}
