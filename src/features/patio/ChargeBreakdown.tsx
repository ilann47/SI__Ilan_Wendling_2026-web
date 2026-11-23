import { Box, Typography } from '@mui/material';
import { currency } from './operation';

export type ChargeSnapshot = { valorCalculado?: string | null; valorDevido?: string | null; diferencaArredondamento?: string | null };
export function ChargeBreakdown({ snapshot }: { snapshot: ChargeSnapshot }) {
  if (snapshot.valorCalculado == null || snapshot.valorDevido == null || snapshot.diferencaArredondamento == null) return null;
  return <Box component="details" sx={{ mt: 0.5 }}>
    <Typography component="summary" variant="caption" sx={{ minHeight: 44, alignContent: 'center',
      cursor: 'pointer', color: 'primary.main', listStylePosition: 'inside' }}>Ver composição do valor</Typography>
    <Typography component="p" variant="caption" color="text.secondary" sx={{ mt: 0, mb: 1 }}>
      Base de cálculo: {currency(snapshot.valorCalculado)} · Cobrança em centavos: {currency(snapshot.valorDevido)} ·
      Diferença de arredondamento: {currency(snapshot.diferencaArredondamento)} (arredondamento comercial).
    </Typography>
  </Box>;
}
