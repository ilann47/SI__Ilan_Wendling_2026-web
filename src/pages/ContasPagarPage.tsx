import { Box } from '@mui/material';
import { CrudResourcePage } from '../components/crud/CrudResourcePage';
import { PurchaseProcessStrip } from '../components/purchases/PurchaseProcessStrip';
import { contaPagarConfig } from '../resources/financeiro';

/** Contas a pagar com a trilha do processo de compras (passo 4). */
export function ContasPagarPage() {
  return (
    <Box>
      <PurchaseProcessStrip active="contas" />
      <CrudResourcePage config={contaPagarConfig} />
    </Box>
  );
}
