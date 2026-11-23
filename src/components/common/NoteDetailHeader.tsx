import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import { useId, type ReactNode } from 'react';
import { PageHeader } from './PageHeader';
import { StatusChip } from './StatusChip';

interface Props {
  title: string;
  counterpart?: string | null;
  series: string;
  model: string;
  backFallback: string;
  status: string;
  reversed?: boolean;
  total: string;
  facts: readonly { label: string; value: ReactNode }[];
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function NoteDetailHeader({ title, counterpart, series, model, backFallback, status,
  reversed, total, facts, description, action, children }: Props) {
  const headingId = useId();
  const fields = [{ label: 'Documento', value: `Modelo ${model} · Série ${series}` }, ...facts];
  return <>
    <PageHeader title={title} subtitle={counterpart ?? undefined} backFallback={backFallback} action={action} />
    <Card component="section" aria-labelledby={headingId} variant="outlined"
      sx={{ p: { xs: 2, md: 2.5 }, mb: 2 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" useFlexGap flexWrap="wrap" gap={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography id={headingId} component="h2" variant="h6" fontWeight={800}>Dados da nota</Typography>
          <Box sx={{ mt: 0.75 }}>
            {reversed ? <Chip size="small" color="warning" label="Revertida" /> : <StatusChip status={status} />}
          </Box>
          {description && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{description}</Typography>}
        </Box>
        <Box sx={{ ml: 'auto', textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>
          <Typography variant="caption" color="text.secondary">Total da nota</Typography>
          <Typography variant="h5" color="primary.main" fontWeight={850}>{total}</Typography>
        </Box>
      </Stack>
      <Box component="dl" sx={{ m: 0, mt: 2, display: 'grid', gap: { xs: 1.5, md: 2.5 },
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' } }}>
        {fields.map(({ label, value }) => <Box key={label} sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
          <Typography component="dd" variant="body2" fontWeight={650} sx={{ m: 0 }}>{value}</Typography>
        </Box>)}
      </Box>
      {children && <Box sx={{ mt: 1.5, overflowWrap: 'anywhere' }}>{children}</Box>}
    </Card>
  </>;
}
