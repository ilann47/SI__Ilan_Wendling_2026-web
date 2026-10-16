import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedOutlinedIcon from '@mui/icons-material/RadioButtonUncheckedOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import { Box, Card, Typography } from '@mui/material';
import type { PurchaseDocuments, PurchaseOrder } from '../../api/purchases';

type StepState = 'done' | 'current' | 'pending' | 'blocked' | 'unknown';

interface ProgressStep {
  label: string;
  detail: string;
  state: StepState;
}

export function purchaseProgressSteps(
  order: PurchaseOrder,
  documents?: PurchaseDocuments,
): ProgressStep[] {
  const cancelled = order.status === 'CANCELADA';
  const rejected = order.status === 'REJEITADA';
  const stopped = cancelled || rejected;
  const receiptDone = order.status === 'RECEBIDA'
    || order.status === 'PARCIALMENTE_RECEBIDA'
    || (documents?.recebimentos?.length ?? 0) > 0;
  const notesUnavailable = documents !== undefined && documents.notas == null;
  const accountsUnavailable = documents !== undefined && documents.contasPagar == null;
  const noteDone = (documents?.notas?.length ?? 0) > 0;
  const accountDone = (documents?.contasPagar?.length ?? 0) > 0;

  return [
    {
      label: 'Ordem',
      state: cancelled ? 'blocked' : order.status === 'RASCUNHO' ? 'current' : 'done',
      detail: cancelled ? 'Compra cancelada' : order.status === 'RASCUNHO' ? 'Em preparação' : 'Ordem registrada',
    },
    {
      label: 'Recebimento',
      state: receiptDone ? 'done' : stopped ? 'blocked' : order.status === 'APROVADA' ? 'current' : 'pending',
      detail: receiptDone
        ? order.status === 'PARCIALMENTE_RECEBIDA' ? 'Recebimento parcial legado' : 'Recebimento concluído'
        : rejected ? 'Entrega rejeitada' : cancelled ? 'Não será recebido'
          : order.status === 'APROVADA' ? 'Aguardando recebimento' : 'Aguardando aprovação',
    },
    {
      label: 'Nota',
      state: noteDone ? 'done' : notesUnavailable || documents === undefined ? 'unknown'
        : stopped ? 'blocked' : receiptDone ? 'current' : 'pending',
      detail: noteDone ? 'Nota registrada'
        : notesUnavailable ? 'Sem acesso à consulta' : documents === undefined ? 'Consultando documentos'
          : stopped ? 'Não aplicável' : receiptDone ? 'Aguardando nota' : 'Após o recebimento',
    },
    {
      label: 'Conta',
      state: accountDone ? 'done' : accountsUnavailable || documents === undefined ? 'unknown'
        : stopped ? 'blocked' : noteDone ? 'current' : 'pending',
      detail: accountDone ? 'Conta gerada'
        : accountsUnavailable ? 'Sem acesso à consulta' : documents === undefined ? 'Consultando financeiro'
          : stopped ? 'Não aplicável' : noteDone ? 'Aguardando geração' : 'Após a nota',
    },
  ];
}

const statePresentation: Record<StepState, { color: string; bg: string; icon: typeof CheckCircleOutlineIcon }> = {
  done: { color: 'success.main', bg: 'success.50', icon: CheckCircleOutlineIcon },
  current: { color: 'primary.main', bg: 'primary.50', icon: ScheduleOutlinedIcon },
  pending: { color: 'text.disabled', bg: 'action.hover', icon: RadioButtonUncheckedOutlinedIcon },
  blocked: { color: 'error.main', bg: 'error.50', icon: BlockOutlinedIcon },
  unknown: { color: 'text.secondary', bg: 'action.hover', icon: RadioButtonUncheckedOutlinedIcon },
};

export function PurchaseProgress({
  order,
  documents,
}: {
  order: PurchaseOrder;
  documents?: PurchaseDocuments;
}) {
  const steps = purchaseProgressSteps(order, documents);

  return (
    <Card component="section" aria-label="Andamento da compra" variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" component="h3" sx={{ mb: 1.5 }}>Andamento da compra</Typography>
      <Box component="ol" sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
        gap: 1,
        p: 0,
        m: 0,
        listStyle: 'none',
      }}>
        {steps.map((step, index) => {
          const presentation = statePresentation[step.state];
          const Icon = presentation.icon;
          return (
            <Box component="li" key={step.label} sx={{
              display: 'grid',
              gridTemplateColumns: '32px minmax(0, 1fr)',
              gap: 1,
              alignItems: 'center',
              minWidth: 0,
              p: 1.25,
              borderRadius: 1.5,
              bgcolor: presentation.bg,
            }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: presentation.color,
              }}>
                <Icon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary">{index + 1}. {step.label}</Typography>
                <Typography variant="body2" fontWeight={700}>{step.detail}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Card>
  );
}
