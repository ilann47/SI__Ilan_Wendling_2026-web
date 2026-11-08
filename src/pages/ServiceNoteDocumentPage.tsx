import {
  Alert, Box, Button, Card, Checkbox, FormControlLabel, Link, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { describeError, getHttpStatus } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { serviceNotesApi } from '../api/serviceNotes';
import { useAuth } from '../auth/AuthContext';
import { AppDialog } from '../components/common/AppDialog';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { serviceNoteEditFields } from '../resources/fiscal';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from '../utils/format';

type Action = 'edit' | 'issue' | 'cancel' | 'delete';
type Intent = { action: Action; version: number; values?: Record<string, unknown> };

function CancelServiceNoteDialog({ busy, error, close, confirm }: {
  busy: boolean; error: string | null; close: () => void; confirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const formId = useId();
  const clean = reason.trim();
  const valid = clean.length > 0 && clean.length <= 500;
  return <AppDialog open onClose={close} title="Cancelar nota de serviço" maxWidth="sm" busy={busy}
    actions={<>
      <Button disabled={busy} onClick={close}>Voltar</Button>
      <Button form={formId} type="submit" color="error" variant="contained" disabled={busy || !valid}>Registrar cancelamento</Button>
    </>}>
    <Stack component="form" id={formId} spacing={2} onSubmit={(event) => {
      event.preventDefault();
      if (valid && !busy) confirm(clean);
    }}>
      <Alert severity="warning">As parcelas sem recebimento serão canceladas. O histórico da nota será preservado.</Alert>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField label="Motivo do cancelamento" value={reason} onChange={(event) => setReason(event.target.value)}
        disabled={busy} required multiline minRows={2} fullWidth inputProps={{ maxLength: 500 }} />
    </Stack>
  </AppDialog>;
}

export function ServiceNoteDocumentPage() {
  const { activeOrganization, permissions } = useAuth();
  const { id } = useParams();
  const org = activeOrganization?.organizationId;
  const noteId = Number(id);
  if (!org || !permissions.includes('fiscal:read')) return <Alert severity="warning">Seu acesso não permite consultar esta nota.</Alert>;
  if (!Number.isSafeInteger(noteId) || noteId < 1) return <Alert severity="error">Nota de serviço inválida.</Alert>;
  return <ServiceNoteDocument key={`${org}:${noteId}`} org={org} id={noteId} permissions={permissions} />;
}

function ServiceNoteDocument({ org, id, permissions }: { org: number; id: number; permissions: string[] }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const financeRead = permissions.includes('finance:read');
  const manage = permissions.includes('fiscal:manage');
  const [reviewed, setReviewed] = useState<number | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadRequired, setReloadRequired] = useState(false);
  const detail = useQuery({
    queryKey: tenantQueryKey(org, 'service-note-detail', id, financeRead),
    queryFn: () => serviceNotesApi.detail(id),
  });
  const command = useMutation({
    mutationFn: async ({ action, version, values }: Intent) => {
      if (action === 'issue') await serviceNotesApi.issue(id, version);
      if (action === 'cancel') await serviceNotesApi.cancel(id, String(values?.motivo ?? '').trim(), version);
      if (action === 'delete') await serviceNotesApi.removeDraft(id, version);
      if (action === 'edit') await serviceNotesApi.update(id, values ?? {}, version);
    },
    onSuccess: async (_, result) => {
      setIntent(null); setReviewed(null); setError(null); setReloadRequired(false);
      if (result.action === 'delete') navigate('/app/notas-servico', { replace: true });
      await client.invalidateQueries({ queryKey: ['tenant', org] });
    },
    onError: (cause, result) => {
      const status = getHttpStatus(cause);
      const stale = !status || status >= 500 || status === 412 || status === 428
        || (result.action === 'issue' && status === 409);
      setError(describeError(cause)); setReloadRequired(stale); setReviewed(null);
      if (stale || result.action === 'issue' || result.action === 'delete') setIntent(null);
    },
  });
  const reload = async () => {
    const result = await detail.refetch();
    if (!result.isError) { setReviewed(null); setError(null); setReloadRequired(false); }
  };

  if (detail.isLoading) return <ListingSkeleton />;
  if (detail.isError) return <ErrorState message={describeError(detail.error)} onRetry={() => void reload()} />;
  if (!detail.data) return null;
  const { nota: note, contasReceber: accounts } = detail.data;
  const items = note.itens ?? [];
  const installments = note.parcelas ?? [];
  const pending = note.situacao === 'PENDENTE';
  const canceled = note.situacao === 'CANCELADA';
  const linked = !!note.ordemServicoId;
  const hasReceipt = accounts?.some((account) => account.valorRecebido > 0);
  const canEdit = manage && pending && (linked || ['customers:read', 'catalog:read'].every((p) => permissions.includes(p)));
  const ready = pending && note.cronogramaDefinido && items.length > 0 && installments.length > 0 && note.valorTotal > 0;
  const version = typeof note.version === 'number' && Number.isSafeInteger(note.version) ? note.version : null;
  const busy = detail.isFetching || command.isPending || reloadRequired || version === null;
  const checked = version !== null && reviewed === version;
  const open = (action: Action) => {
    if (busy || version === null) return;
    setError(null); setIntent({ action, version });
  };
  const run = (values?: Record<string, unknown>) => {
    if (busy || !intent || intent.version !== version || (intent.action === 'issue' && !checked)) return;
    setError(null);
    command.mutate({ ...intent, values });
  };
  const close = () => {
    if (!command.isPending) { setIntent(null); setError(null); }
  };
  const editItems = items.length ? items.map(({ servicoId, quantidade, valorUnitario, valorDesconto }) =>
    ({ servicoId, quantidade, valorUnitario, valorDesconto })) : note.servicoId ? [{
      servicoId: note.servicoId, quantidade: 1, valorUnitario: note.valorServico, valorDesconto: 0,
    }] : [];

  return <Box>
    <PageHeader title={`Nota de Serviço ${note.numero}`}
      subtitle={`${note.clienteNome} · Série ${note.serie} · Modelo ${note.modelo}`}
      backFallback="/app/notas-servico"
      action={<Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        {canEdit && <Button variant="outlined" disabled={busy} onClick={() => open('edit')}>Editar rascunho</Button>}
        {manage && pending && <Button color="error" disabled={busy} onClick={() => open('delete')}>Excluir rascunho</Button>}
        {manage && !canceled && <Button color="error" disabled={busy || !!hasReceipt} onClick={() => open('cancel')}>Cancelar nota</Button>}
      </Stack>} />
    <Stack spacing={2}>
      {error && <Alert severity="error" action={reloadRequired
        ? <Button onClick={() => void reload()} disabled={detail.isFetching}>Consultar situação</Button> : undefined}>{error}
        {reloadRequired && ' Consulte a situação antes de tentar novamente.'}</Alert>}
      {canceled && note.motivoCancelamento && <Alert severity="info">
        Cancelada{note.canceladaEm ? ` em ${formatDateTime(note.canceladaEm)}` : ''}. Motivo: {note.motivoCancelamento}
      </Alert>}
      {hasReceipt && !canceled && <Alert severity="info">Há recebimento registrado. A nota não pode ser cancelada enquanto houver valores recebidos.</Alert>}
      {pending && !note.cronogramaDefinido && <Alert severity="warning">Salve o rascunho novamente para registrar as parcelas antes da emissão.</Alert>}
      {pending && note.cronogramaDefinido && !ready && <Alert severity="warning">
        Inclua os serviços e confira um total maior que zero antes de emitir.
      </Alert>}
      <Card variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
          <Stack gap={0.5}>
            <Typography variant="subtitle1" fontWeight={700}>{linked ? 'Serviços da ordem' : 'Nota avulsa'}</Typography>
            <Typography variant="body2">Emissão: {formatDate(note.dataEmissao)}</Typography>
            {linked && permissions.includes('service_orders:read') && <Link component={RouterLink}
              to={`/app/ordens-servico?detail=${note.ordemServicoId}`}>Ver ordem de serviço</Link>}
          </Stack>
          <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} gap={0.5}>
            <StatusChip status={note.situacao} />
            <Typography variant="h6">{formatCurrency(note.valorTotal)}</Typography>
          </Stack>
        </Stack>
        {note.observacao && <Typography variant="body2" sx={{ mt: 1 }}>{note.observacao}</Typography>}
      </Card>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Serviços prestados</Typography>
        {items.length ? <TableContainer><Table size="small" aria-label="Serviços prestados" sx={{ minWidth: 495 }}>
          <TableHead><TableRow>
            <TableCell>Serviço</TableCell><TableCell align="right">Quantidade</TableCell>
            <TableCell align="right">Valor unitário</TableCell><TableCell align="right">Desconto</TableCell><TableCell align="right">Total</TableCell>
          </TableRow></TableHead>
          <TableBody>{items.map((item) => <TableRow key={item.sequencia}>
            <TableCell>{item.descricao}</TableCell><TableCell align="right">{formatNumber(item.quantidade, 0, 6)}</TableCell>
            <TableCell align="right">{formatCurrency(item.valorUnitario)}</TableCell><TableCell align="right">{formatCurrency(item.valorDesconto)}</TableCell>
            <TableCell align="right">{formatCurrency(item.valorTotal)}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer> : <Typography variant="body2" color="text.secondary">Esta nota não tem serviços discriminados.</Typography>}
        <Stack direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={2} sx={{ mt: 2 }}>
          <Typography variant="body2">Subtotal: {formatCurrency(note.valorServico)}</Typography>
          <Typography variant="body2">Desconto da nota: {formatCurrency(note.valorDesconto)}</Typography>
          <Typography variant="body2">ISS destacado: {formatCurrency(note.valorIss)}{note.aliquotaIss != null && ` (${formatPercent(note.aliquotaIss)})`}</Typography>
          <Typography variant="body2" fontWeight={700}>Total: {formatCurrency(note.valorTotal)}</Typography>
        </Stack>
      </Card>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>{pending ? 'Parcelas previstas' : 'Parcelas da nota'}</Typography>
        {installments.length ? <TableContainer><Table size="small" aria-label="Parcelas da nota">
          <TableHead><TableRow><TableCell>Parcela</TableCell><TableCell>Vencimento</TableCell>
            <TableCell>Forma de pagamento</TableCell><TableCell align="right">Valor</TableCell></TableRow></TableHead>
          <TableBody>{installments.map((p) => <TableRow key={p.numeroParcela}>
            <TableCell>{p.numeroParcela}/{p.totalParcelas}</TableCell><TableCell>{formatDate(p.dataVencimento)}</TableCell>
            <TableCell>{p.formaPagamentoNome ?? 'Não informada'}</TableCell><TableCell align="right">{formatCurrency(p.valor)}</TableCell>
          </TableRow>)}</TableBody>
        </Table></TableContainer> : <Typography variant="body2" color="text.secondary">Não há parcelas de conferência registradas.</Typography>}
        {ready && manage && <Stack alignItems="flex-start" sx={{ mt: 2 }}>
          <Typography variant="body2">A emissão interna gera as contas acima. Não transmite NFS-e.</Typography>
          <FormControlLabel label="Conferi os serviços e as parcelas" control={
            <Checkbox checked={checked} disabled={busy} onChange={(_, selected) => setReviewed(selected ? version : null)} />} />
          <Button variant="contained" disabled={busy || !checked} onClick={() => open('issue')}>Emitir internamente</Button>
        </Stack>}
      </Card>
      {!pending && <Card variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>Contas a receber</Typography>
        {accounts == null ? <Typography variant="body2">Seu acesso não permite consultar as contas.</Typography>
          : accounts.length ? <Stack gap={1} sx={{ mt: 1 }}>
            {accounts.map((a) => <Stack key={a.id} direction={{ xs: 'column', sm: 'row' }} flexWrap="wrap" gap={1.5}>
              <Link component={RouterLink} to={`/app/contas-receber?detail=${a.id}`}>Parcela {a.numeroParcela}/{a.totalParcelas}</Link>
              <Typography variant="body2">{formatDate(a.dataVencimento)} · {formatCurrency(a.valorOriginal)}</Typography>
              <StatusChip status={a.situacao} />
            </Stack>)}
          </Stack> : <Typography variant="body2">Nenhuma conta foi gerada.</Typography>}
      </Card>}
    </Stack>
    <ResourceFormDialog open={intent?.action === 'edit'} title="Editar rascunho da nota"
      fields={serviceNoteEditFields(linked)}
      initialValues={{ ...note, itens: editItems }}
      submitting={command.isPending} conflictMessage={intent?.action === 'edit' ? error : null}
      onClose={close} onSubmit={(values) => run({ numero: note.numero, clienteId: note.clienteId, ...values })} />
    {intent?.action === 'cancel' && <CancelServiceNoteDialog busy={command.isPending} error={error}
      close={close} confirm={(motivo) => run({ motivo })} />}
    <ConfirmDialog open={intent?.action === 'issue'} title="Emitir nota internamente"
      message="As parcelas conferidas serão lançadas como contas a receber. A nota não será enviada ao fisco."
      confirmLabel="Confirmar emissão interna" loading={command.isPending} onClose={close} onConfirm={() => run()} />
    <ConfirmDialog open={intent?.action === 'delete'} title="Excluir rascunho"
      message="Esta nota ainda não gerou cobrança. A exclusão do rascunho não poderá ser desfeita."
      confirmLabel="Excluir rascunho" loading={command.isPending} onClose={close} onConfirm={() => run()} />
  </Box>;
}
