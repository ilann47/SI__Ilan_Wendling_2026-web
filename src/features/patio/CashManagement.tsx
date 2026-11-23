import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { api, describeError, getHttpStatus } from '../../api/client';
import { tenantQueryKey } from '../../api/queryKeys';
import { AppDialog } from '../../components/common/AppDialog';
import { formatDateTime } from '../../utils/format';
import { currency, decimalInput } from './operation';
import { cashIntentStorageKey, clearCashIntent, readCashIntent, saveCashIntent, type CashIntent } from './cashIntent';

type Movement = { id: number; chave: string; tipo: 'SUPRIMENTO' | 'SANGRIA'; valor: string; motivo: string; registradoEm: string };
const BASE = '/api/v1/patio/turnos';

function Movements({ org, turnoId }: { org: number; turnoId: number }) {
  const query = useQuery({ queryKey: tenantQueryKey(org, 'cash-movements', turnoId), retry: false,
    queryFn: () => api.get<Movement[]>(`${BASE}/${turnoId}/movimentos-dinheiro`).then(({ data }) => data) });
  return <Stack gap={1}>
    <Typography component="h3" variant="subtitle1">Histórico de suprimentos e sangrias</Typography>
    {query.isPending && <Typography>Carregando movimentos…</Typography>}
    {query.isError && <Alert severity="error">{describeError(query.error)}</Alert>}
    {query.data?.length === 0 && <Typography variant="body2">Nenhum movimento de dinheiro neste turno.</Typography>}
    {query.data?.map((movement) => <Box key={movement.id} sx={{ borderBottom: 1, borderColor: 'divider', pb: 1 }}>
      <Typography>{movement.tipo === 'SUPRIMENTO' ? 'Suprimento' : 'Sangria'} · {currency(movement.valor)} · {formatDateTime(movement.registradoEm)}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{movement.motivo}</Typography>
    </Box>)}
  </Stack>;
}

export function CashManagement({ org, operador, turnoId, online, suprimentos, sangrias, dinheiroEsperado, onSaved }: {
  org: number; operador: string; turnoId: number; online: boolean; suprimentos: string | number; sangrias: string | number;
  dinheiroEsperado: string | number; onSaved: () => void;
}) {
  const client = useQueryClient();
  const storageKey = cashIntentStorageKey(org, operador, turnoId);
  const [stored] = useState(() => readCashIntent(storageKey));
  const [storageError, setStorageError] = useState(stored.error);
  const [pending, setPending] = useState<CashIntent | null>(stored.intent);
  const [type, setType] = useState<Movement['tipo'] | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [outcome, setOutcome] = useState<'confirmed' | 'rejected' | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const normalized = decimalInput(amount);
  const valid = normalized !== null && /[1-9]/.test(normalized) && reason.trim().length >= 10 && reason.trim().length <= 300;
  const refreshed = () => {
    onSaved();
    void client.invalidateQueries({ queryKey: tenantQueryKey(org, 'cash-movements', turnoId) });
    void client.invalidateQueries({ queryKey: tenantQueryKey(org, 'cash-supervision') });
  };
  const resolve = async (intent: CashIntent, definitiveRejection: boolean) => {
    const { data } = await api.get<Movement[]>(`${BASE}/${turnoId}/movimentos-dinheiro`);
    const recorded = data.some((row) => row.chave === intent.chave);
    if (recorded || definitiveRejection) {
      clearCashIntent(storageKey); setPending(null); setOutcome(recorded ? 'confirmed' : 'rejected');
      setUnconfirmed(false); refreshed();
    } else setUnconfirmed(true);
  };
  const verification = useMutation({ networkMode: 'always', retry: false, mutationFn: async () => {
    if (!online || !pending) throw new Error('Conecte-se para verificar o resultado do movimento pendente.');
    await resolve(pending, false);
  } });
  const mutation = useMutation({ networkMode: 'always', retry: false, mutationFn: async () => {
    if (!online || storageError || outcome || (!pending && (!valid || !type))) throw new Error('Confira conexão, valor positivo e motivo antes de registrar.');
    const intent = pending ?? { chave: crypto.randomUUID(), tipo: type!, valor: normalized!, motivo: reason.trim() };
    // Persist before sending. Unknown outcomes are immutable and keep the same UUID across reloads.
    try { saveCashIntent(storageKey, intent); }
    catch (error) { setStorageError(error instanceof Error ? error.message : 'O armazenamento do movimento está indisponível. Nenhum envio foi realizado.'); throw error; }
    setPending(intent); setUnconfirmed(false);
    try {
      return await api.post(`${BASE}/${turnoId}/movimentos-dinheiro`, intent);
    } catch (error) {
      const status = getHttpStatus(error);
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
        try { await resolve(intent, true); } catch { setUnconfirmed(true); }
      } else setUnconfirmed(true);
      throw error;
    }
  }, onSuccess: () => {
    clearCashIntent(storageKey); setPending(null); setType(null); setOutcome(null); refreshed();
  } });
  const open = (value: Movement['tipo']) => {
    if (pending) { setType(pending.tipo); setAmount(pending.valor); setReason(pending.motivo); }
    else { setType(value); setAmount(''); setReason(''); setOutcome(null); }
    mutation.reset(); verification.reset();
  };
  const locked = pending !== null || outcome !== null;
  const busy = mutation.isPending || verification.isPending;
  return <Stack gap={2}>
    <Typography>Suprimentos: {currency(suprimentos)} · Sangrias: {currency(sangrias)}</Typography>
    <Typography>Dinheiro esperado: <strong>{currency(dinheiroEsperado)}</strong></Typography>
    <Typography variant="body2" color="text.secondary">Movimentos de dinheiro do seu turno. Suprimento e sangria não são receita nem pagamento de cliente.</Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
      <Button variant="outlined" disabled={!online || !!storageError || !!pending || !!outcome} onClick={() => open('SUPRIMENTO')}>Registrar suprimento</Button>
      <Button variant="outlined" disabled={!online || !!storageError || !!pending || !!outcome} onClick={() => open('SANGRIA')}>Registrar sangria</Button>
    </Stack>
    {storageError && <Alert severity="error">{storageError}</Alert>}
    {pending && <Alert severity="warning" action={<Button onClick={() => open(pending.tipo)}>Retomar movimento pendente</Button>}>
      Há um movimento sem resultado conhecido. Não registre outro para substituir este; retome e confira o histórico.
    </Alert>}
    {outcome && type === null && <Alert severity={outcome === 'confirmed' ? 'success' : 'warning'}
      action={<Button onClick={() => { setOutcome(null); setUnconfirmed(false); }}>Novo movimento</Button>}>
      {outcome === 'confirmed' ? 'Movimento confirmado no histórico.' : 'Movimento recusado e não encontrado no histórico. Revise o motivo da recusa.'}
    </Alert>}
    <Movements org={org} turnoId={turnoId} />
    <AppDialog open={type !== null} title={type === 'SUPRIMENTO' ? 'Suprimento do caixa' : 'Sangria do caixa'} busy={busy}
      onClose={() => setType(null)} actions={<><Button disabled={busy} onClick={() => setType(null)}>Cancelar</Button>
        {pending && <Button disabled={!online || busy} onClick={() => verification.mutate()}>Verificar resultado</Button>}
        {outcome ? <Button onClick={() => { setOutcome(null); setType(null); setAmount(''); setReason(''); setUnconfirmed(false); }}>Novo movimento</Button>
          : <Button variant="contained" type="submit" form="cash-movement" disabled={!online || !valid || busy || !!storageError}>{pending ? 'Repetir o mesmo envio' : 'Confirmar movimento'}</Button>}</>}>
      <Stack component="form" id="cash-movement" gap={2} onSubmit={(event) => { event.preventDefault(); if (online && valid && !busy && !outcome && !storageError) mutation.mutate(); }}>
        <TextField disabled={locked || busy} label="Valor do movimento" value={amount} onChange={(event) => setAmount(event.target.value)} inputProps={{ inputMode: 'decimal', maxLength: 19 }} />
        <TextField disabled={locked || busy} multiline minRows={2} label="Motivo do movimento" value={reason} onChange={(event) => setReason(event.target.value)}
          inputProps={{ maxLength: 300 }} helperText="Descreva o motivo (10 a 300 caracteres)." />
        {(unconfirmed || (pending && !busy)) && !outcome && <Alert severity="warning">Resultado ainda não confirmado. O envio original pode ter sido aplicado. Verifique o histórico ou repita a mesma intenção, sem alterar seus dados. Nenhum envio ocorre automaticamente.</Alert>}
        {outcome && <Alert severity={outcome === 'confirmed' ? 'success' : 'warning'}>{outcome === 'confirmed'
          ? 'Movimento confirmado no histórico. Não será lançado novamente.' : 'Movimento recusado e não encontrado no histórico. Revise a recusa antes de iniciar outro movimento.'}</Alert>}
        {mutation.isError && !outcome && <Alert severity="error">{describeError(mutation.error)}</Alert>}
        {verification.isError && <Alert severity="error">{describeError(verification.error)}</Alert>}
      </Stack>
    </AppDialog>
  </Stack>;
}

type SupervisedTurn = { turnoId: number; operador: string; abertoEm: string; fechadoEm?: string | null;
  resumo: { totalRecebido: string; dinheiroEsperado: string; dinheiroContado?: string | null; diferencaDinheiro?: string | null; suprimentos: string; sangrias: string } };
export function TurnSupervision({ org }: { org: number }) {
  const [page, setPage] = useState(0);
  const [details, setDetails] = useState<number | null>(null);
  const query = useQuery({ queryKey: tenantQueryKey(org, 'cash-supervision', page), retry: false,
    queryFn: () => api.get<{ content: SupervisedTurn[]; totalElements: number }>(BASE, { params: { pagina: page, tamanho: 20 } }).then(({ data }) => data) });
  return <Stack gap={2}>
    <Typography component="h2" variant="h6">Supervisão dos turnos</Typography>
    <Typography variant="body2">Consulte os caixas da organização. Movimentos só podem ser lançados pelo responsável no próprio turno aberto.</Typography>
    {query.isPending && <Typography>Carregando turnos…</Typography>}
    {query.isError && <Alert severity="error">{describeError(query.error)}</Alert>}
    {query.data?.content.length === 0 && <Typography>Nenhum turno encontrado.</Typography>}
    {query.data?.content.map((turn) => <Card key={turn.turnoId}><CardContent><Stack gap={1}>
      <Typography component="h3" variant="h6">{turn.operador} · {turn.fechadoEm ? 'Fechado' : 'Aberto'}</Typography>
      <Typography>{formatDateTime(turn.abertoEm)}{turn.fechadoEm ? ` até ${formatDateTime(turn.fechadoEm)}` : ''}</Typography>
      <Typography>Recebido: {currency(turn.resumo.totalRecebido)} · Dinheiro esperado: {currency(turn.resumo.dinheiroEsperado)}</Typography>
      <Typography>Suprimentos: {currency(turn.resumo.suprimentos)} · Sangrias: {currency(turn.resumo.sangrias)}</Typography>
      {turn.resumo.dinheiroContado != null && <Typography>Contado: {currency(turn.resumo.dinheiroContado)} · Diferença: {currency(turn.resumo.diferencaDinheiro ?? '0')}</Typography>}
      <Button onClick={() => setDetails(details === turn.turnoId ? null : turn.turnoId)}>{details === turn.turnoId ? 'Ocultar movimentos' : 'Ver movimentos'}</Button>
      {details === turn.turnoId && <Movements org={org} turnoId={turn.turnoId} />}
    </Stack></CardContent></Card>)}
    {query.data && <Stack direction="row" gap={1}><Button disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
      <Typography alignSelf="center">Página {page + 1}</Typography><Button disabled={(page + 1) * 20 >= query.data.totalElements} onClick={() => setPage((value) => value + 1)}>Próxima</Button></Stack>}
  </Stack>;
}
