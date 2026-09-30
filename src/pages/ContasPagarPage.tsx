import { Box } from '@mui/material';
import { FinancialAccountsPage } from './FinancialAccountsPage';
import { PurchaseProcessStrip } from '../components/purchases/PurchaseProcessStrip';

/** Contas a pagar com a trilha do processo de compras (passo 4). */
export function ContasPagarPage() {
  return (
    <Box>
      <PurchaseProcessStrip active="contas" />
      <FinancialAccountsPage tipo="pagar" />
    </Box>
  );
}
