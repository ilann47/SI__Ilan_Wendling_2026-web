import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { Box, ButtonBase, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useColorMode } from '../../context/ColorModeContext';
import { getThemeTokens } from '../../theme/hubTokens';

export type PurchaseFlowStep = 'ordem' | 'recebimento' | 'nota' | 'contas';

export function inboundNoteFromReceiptPath(orderId: number, receiptId: number): string {
  return `/app/notas-entrada/nova?ordemId=${orderId}&recebimentoId=${receiptId}`;
}

const STEPS: Array<{ id: PurchaseFlowStep; label: string; path: string; hint: string }> = [
  { id: 'ordem', label: '1. Ordem', path: '/app/ordens-compra', hint: 'Pedir ao fornecedor' },
  { id: 'recebimento', label: '2. Receber', path: '/app/recebimentos', hint: 'Entrada física' },
  { id: 'nota', label: '3. Nota', path: '/app/notas-entrada', hint: 'Documento e custos' },
  { id: 'contas', label: '4. Pagar', path: '/app/contas-pagar', hint: 'Contas a pagar' },
];

type Props = {
  active: PurchaseFlowStep;
};

/**
 * Trilha do processo de compras (estilo Bling): ordem → receber → nota → pagar.
 * Só navega; não inventa estado de progresso.
 */
export function PurchaseProcessStrip({ active }: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <Box
      component="nav"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 1,
        mb: 2.5,
        p: 1,
        borderRadius: 2,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.card,
      }}
      aria-label="Fluxo de compras"
    >
      {STEPS.map((step) => {
        const isActive = step.id === active;
        return (
          <ButtonBase
            key={step.id}
            component={RouterLink}
            to={step.path}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.25,
              px: 1.5,
              py: 1.25,
              borderRadius: 1.5,
              textAlign: 'left',
              bgcolor: isActive ? colors.brandHover : 'transparent',
              border: isActive ? `1px solid ${colors.purple}` : '1px solid transparent',
              color: colors.text,
              '&:hover': { bgcolor: colors.brandHover },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {isActive && <CheckCircleOutlineIcon sx={{ fontSize: 16, color: colors.purple }} />}
              <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: isActive ? colors.purple : colors.text }}>
                {step.label}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: colors.textMuted }}>
              {step.hint}
            </Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
