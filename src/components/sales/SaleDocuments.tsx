import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import { Alert, Box, Button, Card, Chip,
  Link, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { administrativeSalesApi, buildSaleOutboundNotePayload,
  type AdministrativeSale, type AdministrativeSaleDocuments, type SaleOutboundNote,
  type SaleOutboundNoteRequest } from '../../api/administrativeSales';
import { describeError, getHttpStatus } from '../../api/client';
import { tenantQueryKey } from '../../api/queryKeys';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatStatusLabel, statusColor } from '../../utils/format';
import { ErrorState } from '../listing/ErrorState';
import { ListingSkeleton } from '../listing/ListingSkeleton';
import { AppDialog } from '../common/AppDialog';

interface Props { sale: AdministrativeSale; organizationId: number; permissions: string[] }
const noteFields = [
  { name: 'numero', label: 'Número da nota', required: true, maxLength: 20 },
  { name: 'serie', label: 'Série', maxLength: 10 },
  { name: 'modelo', label: 'Modelo', maxLength: 10 },
  { name: 'dataEmissao', label: 'Data de emissão', type: 'date' },
  { name: 'dataSaida', label: 'Data de saída', type: 'date' },
] as const;

export function SaleDocuments({ sale, organizationId, permissions }: Props) {
  const client = useQueryClient();
  const fiscalRead = permissions.includes('fiscal:read');
  const financeRead = permissions.includes('finance:read');
  const stockRead = permissions.includes('stock:read');
  const canGenerate = permissions.includes('fiscal:manage') && permissions.includes('sales:read');
  const queryKey = tenantQueryKey(organizationId, 'administrative-sales', sale.id, 'documents',
    fiscalRead, financeRead, stockRead);
  const query = useQuery({ queryKey, queryFn: () => administrativeSalesApi.documents(sale.id) });
  const [generating, setGenerating] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<SaleOutboundNote | null>(null);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const note = query.data?.nota ?? generatedNote;

  const accepted = (created: SaleOutboundNote) => {
    setGeneratedNote(created); setGenerating(false); setError(null); setUncertain(false);
    if (fiscalRead) client.setQueryData<AdministrativeSaleDocuments>(queryKey,
      (current) => current ? { ...current, nota: created } : current);
    void client.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'dashboard') });
    void client.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'list', '/api/notas-saida') });
  };
  const reconcile = async () => {
    const result = await query.refetch();
    if (result.data?.nota && !result.isError) { accepted(result.data.nota); return true; }
    if (result.isError) setError(`Não foi possível consultar a nota. ${describeError(result.error)}`);
    return false;
  };
  const create = useMutation({
    mutationFn: ({ body, key }: { body: SaleOutboundNoteRequest; key: string }) =>
      administrativeSalesApi.outboundNote(sale.id, body, key),
    onSuccess: accepted,
    onError: async (failure) => {
      setError(describeError(failure));
      const status = getHttpStatus(failure);
      setUncertain(!status || status >= 500);
      if (status === 409) await reconcile();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending || !canGenerate) return;
    try {
      const body = buildSaleOutboundNotePayload(values);
      const fingerprint = JSON.stringify(body);
      if (!intent.current || intent.current.fingerprint !== fingerprint) {
        intent.current = { fingerprint, key: crypto.randomUUID() };
      }
      setError(null); create.mutate({ body, key: intent.current.key });
    } catch (failure) { setError(describeError(failure)); }
  };
  return <Stack spacing={2.5}>
    {query.isPending && <ListingSkeleton />}
    {query.isError && <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />}
    {!query.isError && query.data && <>
      {(fiscalRead || canGenerate) && <Box>
        <Typography variant="subtitle2" component="h3">Nota de saída</Typography>
        {note ? <Stack spacing={1} sx={{ mt: 1 }}>
          <Chip sx={{ alignSelf: 'flex-start' }} label={formatStatusLabel(note.situacao)} size="small" color={statusColor(note.situacao)} />
          {fiscalRead ? <Link component={RouterLink} to={`/app/notas-saida?detail=${note.id}`}>Ver nota {note.numero}</Link>
            : <Typography>Nota {note.numero} preparada. A consulta exige permissão fiscal.</Typography>}
          <Typography variant="caption" color="text.secondary">Documento interno. Não representa autorização fiscal externa.</Typography>
        </Stack> : <Stack spacing={1} sx={{ mt: 1 }}>
          {fiscalRead && <Typography variant="body2">Nenhuma nota vinculada.</Typography>}
          {sale.status === 'CONFIRMADA' && canGenerate
            ? <Button variant="contained" startIcon={<NoteAddOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}
              onClick={() => { setError(null); setGenerating(true); }}>Gerar nota de saída</Button>
            : sale.status === 'RASCUNHO' && <Typography variant="body2" color="text.secondary">Confirme o pedido antes de preparar a nota.</Typography>}
        </Stack>}
      </Box>}
      {financeRead && <Box>
        <Typography variant="subtitle2" component="h3">Parcelas e recebimento</Typography>
        {query.data.contas === null ? <Alert severity="info">Os dados financeiros não estão disponíveis para este acesso.</Alert>
          : query.data.contas.length === 0 ? <Typography variant="body2">Nenhuma conta vinculada.</Typography>
            : <Stack spacing={1.25} sx={{ mt: 1 }}>
              <Box><Typography variant="caption" color="text.secondary">Saldo a receber</Typography>
                <Typography variant="h6">{formatCurrency(query.data.contas.filter((account) => account.situacao !== 'CANCELADA')
                  .reduce((total, account) => total + Math.max(0, account.valorTotal - account.valorRecebido), 0))}</Typography></Box>
              {query.data.contas.map((account) => <Card key={account.id} variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" gap={1}>
                  <Link component={RouterLink} to={`/app/contas-receber?detail=${account.id}`}>Parcela {account.numeroParcela}/{account.totalParcelas}</Link>
                  <Chip size="small" label={formatStatusLabel(account.situacao)} color={statusColor(account.situacao)} />
                </Stack>
                <Typography variant="body2">Vencimento: {formatDate(account.dataVencimento)}</Typography>
                <Typography variant="body2">Original: {formatCurrency(account.valorOriginal)} · Recebido: {formatCurrency(account.valorRecebido)}</Typography>
                <Typography variant="body2">Total atualizado: {formatCurrency(account.valorTotal)}</Typography>
              </Card>)}
            </Stack>}
      </Box>}
      {stockRead && <Box>
        <Typography variant="subtitle2" component="h3">Movimentações de estoque</Typography>
        {query.data.movimentos === null ? <Alert severity="info">O histórico de estoque não está disponível para este acesso.</Alert>
          : query.data.movimentos.length === 0 ? <Typography variant="body2">Nenhuma movimentação vinculada.</Typography>
            : <Stack spacing={1} sx={{ mt: 1 }}>{query.data.movimentos.map((movement) => <Card key={movement.id} variant="outlined" sx={{ p: 1.5 }}>
              <Typography fontWeight={700}>{movement.produto}</Typography>
              <Typography variant="body2">{movement.localEstoque} · {movement.tipo.replace(/_/g, ' ')} · {formatNumber(movement.delta, 3)}</Typography>
              <Typography variant="body2">Saldo: {formatNumber(movement.saldoAnterior, 3)} → {formatNumber(movement.saldoPosterior, 3)}</Typography>
              <Typography variant="caption" color="text.secondary">{formatDateTime(movement.ocorridoEm)} · Responsável registrado: {movement.atorId}</Typography>
              {movement.motivo && <Typography variant="body2">{movement.motivo}</Typography>}
            </Card>)}</Stack>}
      </Box>}
    </>}
    <AppDialog open={generating} onClose={() => setGenerating(false)} title="Gerar nota de saída"
      maxWidth="sm" fullScreenOnMobile busy={create.isPending}
      actions={<>
        <Button color="inherit" disabled={create.isPending} onClick={() => setGenerating(false)}>Voltar</Button>
        {uncertain && fiscalRead && <Button disabled={query.isFetching || create.isPending} onClick={() => void reconcile()}>Verificar nota</Button>}
        <Button type="submit" form="sale-note-form" variant="contained" disabled={create.isPending || query.isFetching}>{create.isPending ? 'Preparando…' : uncertain ? 'Tentar novamente' : 'Preparar nota'}</Button>
      </>}>
      <Box component="form" id="sale-note-form" onSubmit={submit}>
          <Stack spacing={2}>
            <Alert severity="info">Cliente, produtos, valores e condições vêm do pedido {sale.numero}. Será preparada uma nota pendente, sem repetir a baixa de estoque nem as contas a receber.</Alert>
            {error && <Alert severity="error">{error}</Alert>}
            {uncertain && <Alert severity="warning">Não recebemos a confirmação. Verifique a nota ou repita a mesma solicitação com segurança; os dados foram preservados.</Alert>}
            {noteFields.map((field) => <TextField key={field.name} label={field.label} fullWidth
              required={'required' in field && field.required} value={values[field.name] ?? ''}
              type={'type' in field ? field.type : 'text'}
              inputProps={'maxLength' in field ? { maxLength: field.maxLength } : undefined}
              InputLabelProps={'type' in field ? { shrink: true } : undefined}
              disabled={create.isPending || uncertain}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} />)}
            <Typography variant="caption" color="text.secondary">Série, modelo e datas são opcionais: em branco, serão usados os padrões já definidos no sistema. Não há envio ao fisco nesta ação.</Typography>
          </Stack>
      </Box>
    </AppDialog>
  </Stack>;
}
