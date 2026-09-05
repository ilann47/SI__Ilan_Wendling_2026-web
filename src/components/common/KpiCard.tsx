import { type ReactNode } from 'react';
import { Avatar, Card, CardContent, Stack, Typography } from '@mui/material';
import { hub } from '../../theme/hubTokens';

interface Props {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: ReactNode;
  color?: string;
}

export function KpiCard({ title, value, subtitle, icon, color = hub.purple }: Props) {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform .15s ease, box-shadow .15s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 32px rgba(26, 31, 44, 0.10)' },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
          <Stack spacing={0.75} sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.7, fontWeight: 700 }}
            >
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.4 }}>
                {subtitle}
              </Typography>
            )}
          </Stack>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: color,
              width: 48,
              height: 48,
              borderRadius: 2.5,
              boxShadow: '0 8px 18px rgba(107,70,254,0.22)',
            }}
          >
            {icon}
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  );
}
