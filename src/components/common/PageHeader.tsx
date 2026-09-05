import { type ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';

interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  action?: ReactNode;
}

export function PageHeader({ title, subtitle, count, action }: Props) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'flex-start' }}
      spacing={2}
      sx={{ mb: 3 }}
    >
      <Box>
        <Typography variant="h5" component="h1" sx={{ letterSpacing: -0.4 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, maxWidth: 640, lineHeight: 1.5 }}>
            {subtitle}
          </Typography>
        )}
        {count !== undefined && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'inline-block', mt: 1, px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.hover' }}
          >
            {count} {count === 1 ? 'registro' : 'registros'}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>{action}</Box>}
    </Stack>
  );
}
