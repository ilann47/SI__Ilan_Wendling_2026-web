import { Box } from '@mui/material';
import { useContext, type ReactNode } from 'react';
import { QuickFormPagesContext, SuspendedDialogContext } from '../../context/quickFormPages';

/** Mantém o documento de origem montado durante um cadastro aberto pelo seletor. */
export function QuickFormPageHost({ children }: { children: ReactNode }) {
  const workspace = useContext(QuickFormPagesContext);
  const active = workspace?.active ?? false;
  return <>
    <SuspendedDialogContext.Provider value={active}>
      <Box hidden={active} sx={{ display: active ? 'none' : undefined }}>{children}</Box>
    </SuspendedDialogContext.Provider>
    {workspace?.pages}
  </>;
}
