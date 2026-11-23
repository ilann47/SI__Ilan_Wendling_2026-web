import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { AppDialog } from '../../components/common/AppDialog';
import { RecordDetailPage } from '../../components/listing/RecordDetailPage';
import { api, describeError } from '../../api/client';
import { tenantQueryKey } from '../../api/queryKeys';
import { formatDateTime } from '../../utils/format';
import { cashChange, currency, isValidPatioPlate, normalizePatioPlate, PATIO_PLATE_MAX_LENGTH } from './operation';
import { ChargeBreakdown, type ChargeSnapshot } from './ChargeBreakdown';
import { useConnectivity } from './connectivity';
import './receipt.css';

const BASE = '/api/v1/patio';
export const paymentNames = { DINHEIRO: 'Dinheiro', PIX: 'Pix', CARTAO: 'Cartão', SEM_COBRANCA: 'Sem cobrança' };
export { currency } from './operation';
export type Receipt = ChargeSnapshot & {
  movimentacaoId: number; turnoId: number; placa: string; valor: string | number;
  meio: keyof typeof paymentNames; registradoEm: string; recebido?: string; troco?: string; cancelada?: boolean;
  evento?: { nome: string; ordemServicoNumero?: string; fiscalStatus?: string } | null;
};
export function CashReceived({ value, due, onChange, disabled }: {
  value: string; due: string | number; onChange: (value: string) => void; disabled?: boolean;
}) {
  const change = cashChange(value, due);
  return <Stack gap={1}>
    <TextField autoFocus label="Valor recebido" value={value} disabled={disabled}
      onChange={(e) => onChange(e.target.value)} inputProps={{ inputMode: 'decimal', maxLength: 19 }}
      error={!!value && change === null} helperText={value && change === null
        ? 'Informe um valor igual ou maior que a cobrança, com até 6 casas decimais.' : 'Informe o dinheiro entregue pelo cliente.'} />
    <Typography role="status">Troco: <strong>{change === null ? '—' : currency(change)}</strong></Typography>
  </Stack>;
}

export type ExitMatch = { movimentacaoId: number; placa: string; patioId: number; patioNome: string; eventoId?: number; eventoNome?: string };
export function QuickExit({ org, patioId, eventoId, enabled, onSelect }: {
  org: number; patioId?: number; eventoId?: number; enabled: boolean; onSelect: (row: ExitMatch) => void;
}) {
  const [plate, setPlate] = useState('');
  const [term, setTerm] = useState('');
  const normalized = normalizePatioPlate(plate);
  const canSearch = enabled && isValidPatioPlate(plate);
  const query = useQuery({
    queryKey: tenantQueryKey(org, 'quick-exit', term, patioId ?? null, eventoId ?? null),
    enabled: enabled && !!term, retry: false,
    queryFn: () => api.get<ExitMatch[]>(BASE + '/busca-saida', {
      params: { placa: term, patioId, eventoId },
    }).then(({ data }) => data),
  });
  return <Stack spacing={1.5} component="form" onSubmit={(event) => {
    event.preventDefault();
    if (canSearch) {
      if (term === normalized) void query.refetch(); else setTerm(normalized);
    }
  }}>
    <Typography component="h2" variant="h6">Saída rápida pela placa</Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
      <TextField label="Placa para saída" value={plate} inputProps={{ maxLength: PATIO_PLATE_MAX_LENGTH, autoCapitalize: 'characters' }}
        onChange={(event) => { setPlate(event.target.value.toUpperCase()); setTerm(''); }} disabled={!enabled} />
      <Button type="submit" variant="contained" disabled={!canSearch || query.isFetching}>Buscar saída</Button>
    </Stack>
    <Typography variant="caption" color="text.secondary">Busca no estacionamento selecionado, inclusive veículos fora da lista exibida abaixo.</Typography>
    {query.isError && <Alert severity="error">{describeError(query.error)}</Alert>}
    {term && query.isSuccess && (query.data.length === 0
      ? <Alert severity="info">Nenhum veículo aberto encontrado. Confira a placa e o estacionamento; não registre uma nova entrada para liberar uma saída.</Alert>
      : query.data.map((row) => <Stack key={row.movimentacaoId} direction={{ xs: 'column', sm: 'row' }} gap={1} alignItems={{ sm: 'center' }}>
        <Typography sx={{ flex: 1 }}>{row.placa} · {row.patioNome}{row.eventoNome ? ` · ${row.eventoNome}` : ''}</Typography>
        <Button variant="outlined" disabled={!enabled} aria-label={`Conferir saída encontrada de ${row.placa}`} onClick={() => { if (enabled) onSelect(row); }}>Conferir saída</Button>
      </Stack>))}
  </Stack>;
}

export function ReceiptPage({ org, id, onBack }: { org: number; id: number; onBack: () => void }) {
  const query = useQuery({ queryKey: tenantQueryKey(org, 'patio-receipt', id), retry: false,
    queryFn: () => api.get<Receipt>(`${BASE}/movimentacoes/${id}/comprovante`).then(({ data }) => data) });
  return <RecordDetailPage title="Comprovante do estacionamento" onBack={onBack}
    actions={<Button variant="contained" disabled={!query.data} onClick={() => window.print()}>Imprimir segunda via</Button>}>
    {query.isError && <Alert severity="error">{describeError(query.error)}</Alert>}
    {query.isPending && <Typography>Carregando comprovante…</Typography>}
    {query.data && <Stack id="patio-receipt-print" gap={1} sx={{ overflowWrap: 'anywhere' }}>
      <Typography variant="h6">Yes7 Parking · Comprovante</Typography>
      <Typography>Segunda via · não é nota fiscal</Typography>
      {query.data.cancelada && <Alert severity="warning">Estadia cancelada. Este comprovante preserva o registro original.</Alert>}
      <Typography>Placa: <strong>{query.data.placa}</strong></Typography>
      <Typography>{formatDateTime(query.data.registradoEm)} · Turno {query.data.turnoId}</Typography>
      {query.data.evento && <Typography>{query.data.evento.nome} · OS {query.data.evento.ordemServicoNumero ?? 'não informada'}</Typography>}
      <Typography>Valor registrado: <strong>{currency(query.data.valor)}</strong></Typography>
      <ChargeBreakdown snapshot={query.data} />
      <Typography>Meio: {paymentNames[query.data.meio]}</Typography>
      {query.data.recebido != null && <Typography>Entregue em dinheiro: {currency(query.data.recebido)}</Typography>}
      {query.data.troco != null && <Typography>Troco: {currency(query.data.troco)}</Typography>}
      {query.data.evento?.fiscalStatus && <Typography>Pendência fiscal: {query.data.evento.fiscalStatus === 'PENDENTE_EMISSAO'
        ? 'NFS-e pendente de emissão. Não comprova autorização fiscal.' : query.data.evento.fiscalStatus}</Typography>}
    </Stack>}
  </RecordDetailPage>;
}

export function ReceiptHistory({ org, canManage, search, onSearch, onReceipt, onCorrect }: {
  org: number; canManage: boolean; search: string | null; onSearch: (plate: string) => void;
  onReceipt: (id: number, plate: string | null) => void; onCorrect: (row: { movimentacaoId: number; placa: string }) => void;
}) {
  const online = useConnectivity();
  const [plate, setPlate] = useState(search ?? '');
  const query = useQuery({ queryKey: tenantQueryKey(org, 'patio-receipts', search), enabled: search !== null, retry: false,
    queryFn: () => api.get<Receipt[]>(BASE + '/comprovantes', { params: { placa: search || undefined } }).then(({ data }) => data) });
  return <Stack spacing={1.5}>
    <Typography component="h2" variant="h6">Comprovantes e correções</Typography>
    <Stack component="form" direction={{ xs: 'column', sm: 'row' }} gap={1} onSubmit={(event) => {
      event.preventDefault();
      if (plate.trim() && !isValidPatioPlate(plate)) return;
      const normalized = normalizePatioPlate(plate);
      if (search === normalized) void query.refetch();
      else onSearch(normalized);
    }}>
      <TextField label="Placa do comprovante" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())}
        inputProps={{ maxLength: PATIO_PLATE_MAX_LENGTH }} />
      <Button type="submit" variant="outlined" disabled={query.isFetching || (!!plate.trim() && !isValidPatioPlate(plate))}>Consultar comprovantes</Button>
    </Stack>
    {query.isError && <Alert severity="error">{describeError(query.error)}</Alert>}
    {query.isSuccess && query.data.length === 0 && <Typography>Nenhum comprovante encontrado.</Typography>}
    {query.isSuccess && query.data.map((row) => <Stack key={row.movimentacaoId} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1}>
      <Typography sx={{ flex: 1 }}>{row.placa} · {currency(row.valor)} · {paymentNames[row.meio]}{row.cancelada ? ' · Cancelada' : ''}</Typography>
      <Button onClick={() => onReceipt(row.movimentacaoId, search)} aria-label={`Comprovante de ${row.placa}`}>Segunda via</Button>
      {canManage && !row.cancelada && <Button disabled={!online} onClick={() => onCorrect(row)} aria-label={`Corrigir registro de ${row.placa}`}>Corrigir registro</Button>}
    </Stack>)}
    {query.isSuccess && <Typography variant="caption" color="text.secondary">Até 50 comprovantes mais recentes. Informe a placa para localizar um registro anterior.</Typography>}
  </Stack>;
}

export function CorrectionDialog({ target, onClose, onSaved }: {
  org: number; target: { movimentacaoId: number; placa: string }; onClose: () => void; onSaved: () => void;
}) {
  const online = useConnectivity();
  const [action, setAction] = useState('CORRIGIR_PLACA');
  const [reason, setReason] = useState('');
  const [plate, setPlate] = useState(target.placa);
  const [method, setMethod] = useState('');
  const [key] = useState(() => crypto.randomUUID());
  const mutation = useMutation({
    networkMode: 'always',
    mutationFn: () => { if (!online) throw new Error('Sem conexão. Nenhuma correção foi enviada.'); return api.post(`${BASE}/movimentacoes/${target.movimentacaoId}/correcao`, {
      chave: key, acao: action, motivo: reason.trim(), ...(action === 'CORRIGIR_PLACA' ? { placa: normalizePatioPlate(plate) } : {}),
      ...(action === 'CORRIGIR_MEIO' ? { meio: method } : {}),
    }); },
    onSuccess: () => { onSaved(); onClose(); },
  });
  const plateValid = isValidPatioPlate(plate);
  return <AppDialog open title={`Corrigir registro · ${target.placa}`} onClose={onClose} busy={mutation.isPending}
    actions={<><Button disabled={mutation.isPending} onClick={onClose}>Voltar</Button><Button variant="contained"
      color={action === 'CANCELAR_ESTADIA' ? 'error' : 'primary'}
      disabled={!online || mutation.isPending || reason.trim().length < 10 || (action === 'CORRIGIR_PLACA' && !plateValid) || (action === 'CORRIGIR_MEIO' && !method)}
      onClick={() => mutation.mutate()}>Confirmar correção</Button></>}>
    <Stack spacing={2}>
      <Alert severity="warning">A correção ficará registrada no histórico. Recebimentos, OS e vínculos fiscais não serão apagados.
        Cancelar pode registrar devolução no turno atual. Confirme somente após a devolução efetiva ao cliente.</Alert>
      <TextField select label="O que corrigir" value={action} onChange={(event) => setAction(event.target.value)} disabled={mutation.isPending}>
        <MenuItem value="CORRIGIR_PLACA">Placa digitada incorretamente</MenuItem>
        <MenuItem value="CORRIGIR_MEIO">Meio de pagamento registrado incorretamente</MenuItem>
        <MenuItem value="CANCELAR_ESTADIA">Cancelar estadia registrada por engano</MenuItem>
      </TextField>
      {action === 'CORRIGIR_PLACA' && <TextField label="Placa correta" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())}
        inputProps={{ maxLength: PATIO_PLATE_MAX_LENGTH }} disabled={mutation.isPending} />}
      {action === 'CORRIGIR_MEIO' && <TextField select label="Meio correto" value={method} onChange={(event) => setMethod(event.target.value)} disabled={mutation.isPending}>
        {(['DINHEIRO', 'PIX', 'CARTAO'] as const).map((value) => <MenuItem key={value} value={value}>{paymentNames[value]}</MenuItem>)}
      </TextField>}
      <TextField label="Motivo da correção" value={reason} multiline minRows={2} disabled={mutation.isPending}
        onChange={(event) => setReason(event.target.value)} inputProps={{ maxLength: 300 }} helperText="Explique em 10 a 300 caracteres." />
      {mutation.isError && <Alert severity="error">{describeError(mutation.error)}</Alert>}
    </Stack>
  </AppDialog>;
}
