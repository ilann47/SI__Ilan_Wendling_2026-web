import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import { Alert, Box, Button, Card, Chip,
  Link, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { serviceOrdersApi, buildServiceOrderNotePayload, type ServiceOrder,
  type ServiceOrderDocumentsResponse, type ServiceOrderNote, type ServiceOrderNoteRequest } from '../../api/serviceOrders';
import { describeError, getHttpStatus } from '../../api/client';
import { tenantQueryKey } from '../../api/queryKeys';
import { formatCurrency, formatDate, formatStatusLabel, statusColor } from '../../utils/format';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AppDialog } from '../common/AppDialog';
import { ReferenceSelect } from '../form/ReferenceSelect';
import { ErrorState } from '../listing/ErrorState';
import { ListingSkeleton } from '../listing/ListingSkeleton';

interface Props { order: ServiceOrder; organizationId: number; permissions: string[] }
const fields = [
  { name: 'numero', label: 'Número da nota', required: true, maxLength: 20 },
  { name: 'serie', label: 'Série', maxLength: 10 },
  { name: 'modelo', label: 'Modelo', maxLength: 10 },
  { name: 'dataEmissao', label: 'Data de emissão', type: 'date' },
  { name: 'aliquotaIss', label: 'Alíquota ISS (%)', type: 'number' },
] as const;

export function ServiceOrderDocuments({ order, organizationId, permissions }: Props) {
  const client = useQueryClient();
  const fiscalRead = permissions.includes('fiscal:read');
  const financeRead = permissions.includes('finance:read');
  const canGenerate = permissions.includes('fiscal:manage') && permissions.includes('service_orders:read');
  const paymentsRead = permissions.includes('payments:read');
  const queryKey = tenantQueryKey(organizationId, 'service-orders', order.id, 'documents', fiscalRead, financeRead);
  const query = useQuery({ queryKey, queryFn: () => serviceOrdersApi.documents(order.id) });
  const [generating, setGenerating] = useState(false);
  const [confirmEmission, setConfirmEmission] = useState(false);
  const [values, setValues] = useState<Record<string, string | number | null>>({});
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [emissionError, setEmissionError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [emissionUncertain, setEmissionUncertain] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<ServiceOrderNote | null>(null);
  const intent = useRef<{ fingerprint: string; key: string } | null>(null);
  const note = query.data?.nota ?? generatedNote;

  const remember = (result: ServiceOrderNote) => {
    setGeneratedNote(result);
    if (fiscalRead) client.setQueryData<ServiceOrderDocumentsResponse>(queryKey,
      (current) => current ? { ...current, nota: result } : current);
    void client.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'dashboard') });
    void client.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'list', '/api/notas-servico') });
    void client.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'detail', '/api/notas-servico', result.id) });
    if (result.situacao === 'EMITIDA') {
      void client.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'financial-accounts') });
      void client.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'financial-summary') });
    }
  };
  const acceptGeneration = (result: ServiceOrderNote) => {
    remember(result); setGenerating(false); setGenerationError(null); setUncertain(false);
  };
  const reconcile = async (purpose: 'generation' | 'emission') => {
    const result = await query.refetch();
    if (result.isError) {
      const message = `Não foi possível consultar a situação. ${describeError(result.error)}`;
      if (purpose === 'generation') setGenerationError(message); else setEmissionError(message);
      return;
    }
    const found = result.data?.nota;
    if (purpose === 'generation' && found) acceptGeneration(found);
    if (purpose === 'emission' && found) {
      remember(found); setEmissionUncertain(false);
      if (found.situacao === 'EMITIDA') { setConfirmEmission(false); setEmissionError(null); }
    }
  };
  const create = useMutation({
    mutationFn: ({ body, key }: { body: ServiceOrderNoteRequest; key: string }) =>
      serviceOrdersApi.serviceNote(order.id, body, key),
    onSuccess: acceptGeneration,
    onError: async (error) => {
      setGenerationError(describeError(error)); const status = getHttpStatus(error);
      setUncertain(!status || status >= 500);
      if (status === 409) await reconcile('generation');
    },
  });
  const emit = useMutation({
    mutationFn: () => serviceOrdersApi.issueNote(note!.id),
    onSuccess: async (result) => {
      remember(result); setConfirmEmission(false); setEmissionError(null); setEmissionUncertain(false);
      await query.refetch();
    },
    onError: async (error) => {
      setEmissionError(describeError(error)); setConfirmEmission(false);
      const status = getHttpStatus(error);
      setEmissionUncertain(!status || status >= 500);
      if (status === 409 || !status || status >= 500) await reconcile('emission');
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (create.isPending || !canGenerate) return;
    try {
      const body = buildServiceOrderNotePayload(values); const fingerprint = JSON.stringify(body);
      if (!intent.current || intent.current.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
      setGenerationError(null); create.mutate({ body, key: intent.current.key });
    } catch (error) { setGenerationError(describeError(error)); }
  };

  return <Stack spacing={2.5}>
    {query.isPending && <ListingSkeleton />}
    {query.isError && <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />}
    {!query.isError && query.data && <>
      {(fiscalRead || canGenerate) && <Box>
        <Typography variant="subtitle2" component="h3">Nota de serviço</Typography>
        {note ? <Stack spacing={1} sx={{ mt: 1 }}>
          <Chip label={formatStatusLabel(note.situacao)} size="small" color={statusColor(note.situacao)} sx={{ alignSelf: 'flex-start' }} />
          {fiscalRead ? <Link component={RouterLink} to={`/app/notas-servico?detail=${note.id}`}>Ver nota {note.numero}</Link>
            : <Typography>Nota {note.numero} preparada. A consulta exige permissão fiscal.</Typography>}
          <Typography variant="caption" color="text.secondary">Documento interno. Não representa autorização fiscal externa.</Typography>
          {emissionError && <Alert severity="error">{emissionError}</Alert>}
          {emissionUncertain && <Alert severity="warning" action={fiscalRead
            ? <Button onClick={() => void reconcile('emission')} disabled={query.isFetching}>Consultar situação</Button> : undefined}>
            Confirmação indisponível. Consulte a situação antes de emitir novamente.
          </Alert>}
          {note.situacao === 'PENDENTE' && canGenerate && <Button variant="contained" sx={{ alignSelf: 'flex-start' }}
            disabled={emissionUncertain || emit.isPending || query.isFetching} onClick={() => setConfirmEmission(true)}>Emitir internamente</Button>}
        </Stack> : <Stack spacing={1} sx={{ mt: 1 }}>
          {fiscalRead && <Typography variant="body2">Nenhuma nota vinculada.</Typography>}
          {order.status === 'CONCLUIDA' && canGenerate ? <Button variant="contained" startIcon={<NoteAddOutlinedIcon />}
            sx={{ alignSelf: 'flex-start' }} onClick={() => setGenerating(true)}>Gerar nota de serviço</Button>
            : order.status !== 'CANCELADA' && <Typography variant="body2" color="text.secondary">A geração fica disponível após concluir o serviço.</Typography>}
        </Stack>}
      </Box>}
      {financeRead && <Box>
        <Typography variant="subtitle2" component="h3">Parcelas e recebimento</Typography>
        {query.data.contas === null ? <Alert severity="info">As contas não estão disponíveis para este acesso.</Alert>
          : query.data.contas.length === 0 ? <Typography variant="body2">Nenhuma conta vinculada. A cobrança é gerada somente na emissão interna da nota.</Typography>
            : <Stack spacing={1.25} sx={{ mt: 1 }}>
              <Typography variant="body2">Saldo a receber: {formatCurrency(query.data.contas.filter((account) => account.situacao !== 'CANCELADA')
                .reduce((total, account) => total + Math.max(0, account.valorTotal - account.valorRecebido), 0))}</Typography>
              {query.data.contas.map((account) => <Card variant="outlined" key={account.id} sx={{ p: 1.5 }}>
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
    </>}
    <AppDialog open={generating} onClose={() => setGenerating(false)} title="Gerar nota de serviço"
      maxWidth="sm" fullScreenOnMobile busy={create.isPending}
      actions={<>
        <Button color="inherit" disabled={create.isPending} onClick={() => setGenerating(false)}>Voltar</Button>
        {uncertain && fiscalRead && <Button onClick={() => void reconcile('generation')} disabled={query.isFetching || create.isPending}>Verificar nota</Button>}
        <Button type="submit" form="service-note-form" variant="contained" disabled={create.isPending || query.isFetching}>{create.isPending ? 'Preparando…' : uncertain ? 'Tentar novamente' : 'Preparar nota'}</Button>
      </>}>
      <Box component="form" id="service-note-form" onSubmit={submit}>
        <Stack spacing={2}>
          <Alert severity="info">Cliente, serviços e valores vêm da ordem {order.numero}. Preparar a nota não gera cobrança. As contas serão criadas somente ao emitir internamente.</Alert>
          {generationError && <Alert severity="error">{generationError}</Alert>}
          {uncertain && <Alert severity="warning">Não recebemos a confirmação. Verifique a nota ou repita a mesma solicitação; os dados foram preservados.</Alert>}
          {fields.map((field) => <TextField key={field.name} fullWidth label={field.label}
            required={'required' in field && field.required} value={values[field.name] ?? ''}
            type={'type' in field ? field.type : 'text'} disabled={create.isPending || uncertain}
            inputProps={'maxLength' in field ? { maxLength: field.maxLength }
              : field.name === 'aliquotaIss' ? { min: 0, max: 100, step: 0.01 } : undefined}
            InputLabelProps={field.name === 'dataEmissao' ? { shrink: true } : undefined}
            onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} />)}
          {paymentsRead && <>
            <ReferenceSelect label="Condição de pagamento" value={Number(values.condicaoPagamentoId) || null}
              disabled={create.isPending || uncertain} onChange={(id) => setValues((current) => ({ ...current, condicaoPagamentoId: id }))}
              reference={{ basePath: '/api/condicoes-pagamento', labelField: 'nome', params: { ativo: true } }} />
            <ReferenceSelect label="Forma de pagamento" value={Number(values.formaPagamentoId) || null}
              disabled={create.isPending || uncertain} onChange={(id) => setValues((current) => ({ ...current, formaPagamentoId: id }))}
              reference={{ basePath: '/api/formas-pagamento', labelField: 'nome', params: { ativo: true } }} />
          </>}
          <Typography variant="caption" color="text.secondary">Preencha apenas os dados necessários. Campos opcionais em branco usam os padrões existentes. Não há envio ao fisco.</Typography>
        </Stack>
      </Box>
    </AppDialog>
    <ConfirmDialog open={confirmEmission} title="Emitir nota internamente" confirmLabel="Confirmar emissão interna"
      message="Esta ação registra a emissão interna e gera as contas a receber. Ela não envia o documento ao fisco nem significa autorização de NFS-e."
      loading={emit.isPending} onClose={() => !emit.isPending && setConfirmEmission(false)} onConfirm={() => emit.mutate()} />
  </Stack>;
}
