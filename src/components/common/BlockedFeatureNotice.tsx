import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import { Alert, AlertTitle, Chip, Stack, Typography } from '@mui/material';
import type { ProductBlocker } from '../../features/blockers/blockers';

const statusLabels: Record<ProductBlocker['status'], string> = {
  BLOQUEADA_EXTERNAMENTE: 'Dependencia externa',
  BLOQUEADA_POR_DECISAO_DE_NEGOCIO: 'Decisao de negocio',
  BLOQUEADA_POR_INFRAESTRUTURA: 'Infraestrutura',
};

export function BlockedFeatureNotice({ blocker }: { blocker: ProductBlocker }) {
  return (
    <Alert severity="warning" icon={<BlockOutlinedIcon />}>
      <AlertTitle>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
          <Typography component="span" fontWeight={700}>{blocker.story}</Typography>
          <Chip size="small" color="warning" variant="outlined" label={statusLabels[blocker.status]} />
        </Stack>
      </AlertTitle>
      <Stack spacing={1}>
        <Typography variant="body2"><strong>Motivo:</strong> {blocker.blockerType}</Typography>
        <Typography variant="body2"><strong>Dependencia:</strong> {blocker.dependency}</Typography>
        <Typography variant="body2"><strong>Impacto:</strong> {blocker.impact}</Typography>
        <Typography variant="body2"><strong>Retomada:</strong> {blocker.resumeCondition}</Typography>
      </Stack>
    </Alert>
  );
}
