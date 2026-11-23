import { Alert, Box, Button, Card, CircularProgress, Stack } from '@mui/material';
import { useContext, useEffect, useRef, useState, type FormEventHandler, type ReactNode } from 'react';
import { UNSAFE_DataRouterContext, useBeforeUnload, useBlocker, type Blocker } from 'react-router-dom';
import { FormNavigationContext, useManagedFormBlocker } from '../../context/formNavigationCore';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PageHeader } from '../common/PageHeader';

interface GuardProps {
  shouldBlock: () => boolean;
  busy: boolean;
  dirty: boolean;
  discardLabel: string;
  returnToOrigin?: () => void;
}

function GuardFeedback({ blocker, shouldBlock, dirty, busy, discardLabel, returnToOrigin }: GuardProps & { blocker: Blocker }) {
  useBeforeUnload((event) => { if (shouldBlock()) event.preventDefault(); });
  useEffect(() => {
    if (returnToOrigin && blocker.state === 'blocked' && !busy && !dirty) {
      blocker.reset();
      returnToOrigin();
    }
  }, [blocker, busy, dirty, returnToOrigin]);
  return <ConfirmDialog open={blocker.state === 'blocked' && !busy && (!returnToOrigin || dirty)} title="Descartar alterações?"
    message="Os dados preenchidos neste formulário serão perdidos."
    cancelLabel="Continuar preenchendo" confirmLabel={discardLabel} confirmColor="error"
    onClose={() => { if (blocker.state === 'blocked') blocker.reset(); }}
    onConfirm={() => {
      if (blocker.state !== 'blocked') return;
      if (returnToOrigin) { blocker.reset(); returnToOrigin(); }
      else blocker.proceed();
    }} />;
}

function ManagedGuard(props: GuardProps) {
  const blocker = useManagedFormBlocker(() => !!props.returnToOrigin || props.shouldBlock(), props.returnToOrigin ? 1 : 0);
  return <GuardFeedback {...props} blocker={blocker} />;
}

function StandaloneGuard(props: GuardProps) {
  const blocker = useBlocker(props.shouldBlock);
  return <GuardFeedback {...props} blocker={blocker} />;
}

interface Props {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  dirty: boolean;
  busy?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  busyLabel?: string;
  extraActions?: ReactNode;
  discardLabel?: string;
  error?: string | null;
  recoveryAction?: ReactNode;
  guardNavigation?: boolean;
  contextual?: boolean;
  navigationAllowed?: () => boolean;
  noValidate?: boolean;
  id?: string;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
}

export function FormPage({ title, description, children, dirty, busy = false, submitDisabled,
  submitLabel = 'Salvar', busyLabel = 'Salvando…', extraActions, discardLabel = 'Descartar alterações', error, recoveryAction, guardNavigation = true,
  contextual, navigationAllowed, noValidate, id, onClose, onSubmit }: Props) {
  const router = useContext(UNSAFE_DataRouterContext);
  const managed = useContext(FormNavigationContext);
  const NavigationGuard = managed ? ManagedGuard : StandaloneGuard;
  const heading = useRef<HTMLHeadingElement>(null);
  const allowExit = useRef(false);
  const [discard, setDiscard] = useState(false);
  useEffect(() => { heading.current?.focus(); }, []);
  const close = () => {
    allowExit.current = true;
    onClose();
  };
  const requestClose = () => {
    if (!busy) {
      if (dirty) setDiscard(true);
      else close();
    }
  };
  return <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
    <PageHeader title={title} titleRef={heading} subtitle={typeof description === 'string' ? description : undefined} onBack={requestClose} />
    <Box component="form" id={id} aria-label={title} aria-busy={busy} noValidate={noValidate} onSubmit={onSubmit}>
      {description && typeof description !== 'string' && <Box sx={{ mb: 2 }}>{description}</Box>}
      {error && <Alert severity="error" action={recoveryAction} sx={{ mb: 2 }}>{error}</Alert>}
      <Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
        <Box component="fieldset" disabled={busy} sx={{ m: 0, p: 0, border: 0, minWidth: 0 }}>{children}</Box>
      </Card>
      <Card variant="outlined" sx={{ position: 'sticky', bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 10, p: 1.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="flex-end" gap={1}>
          <Button type="button" variant="outlined" onClick={requestClose} disabled={busy}>Cancelar</Button>
          {extraActions}
          <Button type="submit" variant="contained" disabled={busy || submitDisabled}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {busy ? busyLabel : submitLabel}
          </Button>
        </Stack>
      </Card>
    </Box>
    <ConfirmDialog open={discard} title="Descartar alterações?"
      message="Os dados preenchidos neste formulário serão perdidos."
      cancelLabel="Continuar preenchendo" confirmLabel={discardLabel} confirmColor="error"
      onClose={() => setDiscard(false)} onConfirm={close} />
    {router && guardNavigation && <NavigationGuard busy={busy} dirty={dirty} discardLabel={discardLabel}
      returnToOrigin={contextual ? close : undefined}
      shouldBlock={() => !allowExit.current && !navigationAllowed?.() && (dirty || busy)} />}
  </Box>;
}
