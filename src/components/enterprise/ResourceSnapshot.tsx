import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface ResourceSnapshotProps {
  title?: string;
  data: Record<string, unknown>;
}

function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ResourceSnapshot({ title = 'Resposta confirmada pela API', data }: ResourceSnapshotProps) {
  return (
    <Box sx={{ border: 1, borderColor: 'success.light', bgcolor: 'success.50', borderRadius: 2, p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <CheckCircleOutlineIcon color="success" fontSize="small" />
        <Typography variant="subtitle2">{title}</Typography>
        {'status' in data && <Chip size="small" label={display(data.status)} color="success" variant="outlined" />}
      </Stack>
      <Divider sx={{ mb: 1.5 }} />
      <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5 }}>
        {Object.entries(data).map(([key, value]) => (
          <Box key={key}>
            <Typography component="dt" variant="caption" color="text.secondary">{key}</Typography>
            <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: 'break-word' }}>{display(value)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
