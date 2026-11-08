import {
  Alert, Box, Button, Card, Checkbox, Chip, Divider, FormControlLabel, Link, Stack, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { describeError, getHttpStatus } from '../api/client';
import { canReverseFiscalNote } from '../api/fiscalCommands';
import { outboundNotesApi, outboundNoteVersion, type OutboundNoteDetail } from '../api/outboundNotes';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { FiscalReversalDialog } from '../components/common/FiscalReversalDialog';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { hasResourceActionPermission } from '../components/crud/resourceConfig';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { notaSaidaConfig } from '../resources/fiscal';
import { formatCurrencyMicros as formatCurrency, formatDate, formatDateTime, formatNumber, formatPercent } from '../utils/format';

export function OutboundNoteDocumentPage() {
  const { id } = useParams();
  const { activeOrganization, permissions } = useAuth();
  const org = activeOrganization?.organizationId;
  if (!org || !permissions.includes('fiscal:read')) return <Alert severity="warning">Seu contexto não possui permissão fiscal de leitura.</Alert>;
  const noteId = Number(id);
  if (!Number.isSafeInteger(noteId) || noteId <= 0) return <Alert severity="error">Identificador da nota inválido.</Alert>;
  return <OutboundDocument key={`${org}:${noteId}`} org={org} noteId={noteId} permissions={permissions} />;
}

type Command = 'confirm' | 'cancel' | 'delete' | 'reverse';

function OutboundDocument({ org, noteId, permissions }: { org: number; noteId: number; permissions: string[] }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [reviewed, setReviewed] = useState<number | null>(null);
  const [action, setAction] = useState<Command | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const financeRead = permissions.includes('finance:read');
  const stockRead = permissions.includes('stock:read');
  const manages = permissions.includes('fiscal:manage');
  const canEdit = hasResourceActionPermission(notaSaidaConfig, 'create', permissions);
  const detail = useQuery({
    queryKey: tenantQueryKey(org, 'notas-saida', 'detail', noteId, financeRead, stockRead),
    queryFn: () => outboundNotesApi.details(noteId),
  });
  const command = useMutation({
    mutationFn: async ({ kind, version, reason }: { kind: Command; version: number; reason?: string }) => {
      if (kind === 'confirm') await outboundNotesApi.confirm(noteId, version);
      else if (kind === 'cancel') await outboundNotesApi.cancel(noteId, version);
      else if (kind === 'reverse') await outboundNotesApi.reverse(noteId, version, reason!);
      else await outboundNotesApi.deleteDraft(noteId, version);
    },
    onSuccess: async (_, { kind }) => {
      setAction(null); setError(null); setReviewed(null); setUncertain(false);
      if (kind === 'delete') navigate('/app/notas-saida', { replace: true });
      await client.invalidateQueries({ queryKey: ['tenant', org] });
    },
    onError: (cause, { kind }) => {
      const status = getHttpStatus(cause);
      const unknown = !status || status >= 500 || status === 412 || status === 428;
      setUncertain(unknown); setReviewed(null); setError(describeError(cause));
      if (kind !== 'reverse' || unknown) setAction(null);
    },
  });
  if (detail.isLoading) return <ListingSkeleton />;
  if (detail.isError) return <ErrorState message={describeError(detail.error)} onRetry={() => void detail.refetch()} />;
  if (!detail.data) return null;
  const data = detail.data;
  const note = data.nota;
  const pending = note.situacao === 'PENDENTE';
  const confirmed = note.situacao === 'CONFIRMADA';
  const reversed = !!note.revertidaEm;
  const versionKnown = note.version !== undefined && Number.isSafeInteger(note.version) && note.version >= 0;
  const oldDraft = pending && note.cronogramaDefinido !== true;
  const financialReview = financeRead && data.parcelas !== null;
  const canConfirm = manages && pending && !oldDraft && financialReview && versionKnown;
  const canReverse = confirmed && canReverseFiscalNote(permissions) && versionKnown;
  const hasReceipt = financeRead && data.contasReceber?.some((account) => account.valorRecebido > 0);
  const missingMovements = stockRead && data.movimentosEstoque?.length === 0;
  const compensated = stockRead && data.movimentosEstoque?.some((movement) => movement.tipo === 'COMPENSACAO');
  const canDelete = manages && !confirmed && !reversed && versionKnown;
  const busy = command.isPending || detail.isFetching;
  const checked = versionKnown && reviewed === note.version;
  const openAction = (kind: Command) => { setError(null); setAction(kind); };
  const submit = (kind: Command, reason?: string) => {
    if (busy || uncertain || !versionKnown) return;
    if (kind === 'confirm' && (!canConfirm || !checked)) return;
    if (kind === 'reverse' && (!canReverse || hasReceipt || compensated || missingMovements || !reason?.trim())) return;
    if (kind === 'cancel' && (!pending || !manages)) return;
    if (kind === 'delete' && !canDelete) return;
    command.mutate({ kind, reason, version: outboundNoteVersion(note) });
  };
  const reload = async () => {
    const result = await detail.refetch();
    if (!result.isError) { setReviewed(null); setError(null); setUncertain(false); }
  };
  const effectSummary = 'A confirmação baixa as quantidades no local indicado e gera as parcelas previstas uma única vez.';

  return <Box>
    <PageHeader title={`Nota de Saída ${note.numero}`} subtitle={`Série ${note.serie} · modelo ${note.modelo} · ${note.clienteNome}`} backFallback="/app/notas-saida"
      action={<Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        {pending && canEdit && <Button variant="outlined" disabled={busy || uncertain} component={RouterLink}
          to={`/app/notas-saida/${note.id}/editar`} state={{ outboundDocumentId: note.id }}>Editar rascunho</Button>}
        {pending && manages && <Button color="error" disabled={busy || uncertain || !versionKnown}
          onClick={() => openAction('cancel')}>Cancelar rascunho</Button>}
        {canDelete && <Button color="error" disabled={busy || uncertain} onClick={() => openAction('delete')}>Excluir rascunho</Button>}
        {canReverse && !missingMovements && <Button color="error" variant="outlined" disabled={busy || uncertain || !!hasReceipt || !!compensated}
          onClick={() => openAction('reverse')}>Reverter nota</Button>}
      </Stack>} />
    <Stack spacing={2}>
      {error && action !== 'reverse' && <Alert severity="error" action={
        <Button onClick={() => void reload()} disabled={detail.isFetching}>Recarregar nota</Button>
      }>{error}{uncertain && ' Consulte o estado atual antes de tentar novamente.'}</Alert>}
      {reversed && <Alert severity="info">Nota revertida internamente em {formatDateTime(note.revertidaEm!)}.
        {note.motivoReversao && ` Motivo: ${note.motivoReversao}`} O histórico permanece disponível.</Alert>}
      {oldDraft && <Alert severity="warning">Salve o rascunho novamente para registrar as parcelas antes da confirmação.</Alert>}
      {pending && manages && !financialReview && <Alert severity="info">A conferência da nota exige acesso de leitura às parcelas.</Alert>}
      {canReverse && (hasReceipt || compensated || missingMovements) && <Alert severity="warning">
        {missingMovements ? 'Não há movimentos de estoque vinculados para reverter esta nota.'
          : 'A reversão interna não está disponível: há recebimento registrado ou movimento já compensado.'}
      </Alert>}
      <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box>
            <Typography component="h2" variant="h6">Dados da nota</Typography>
            <Typography variant="body2" color="text.secondary">
              Emissão: {formatDate(note.dataEmissao)} · Saída: {formatDate(note.dataSaida)} · Local: {note.localEstoqueNome ?? 'Não informado'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Condição: {note.condicaoPagamentoNome ?? 'Não informada'} · Frete: {note.tipoFrete}
            </Typography>
          </Box>
          {reversed ? <Chip size="small" color="warning" label="Revertida" /> : <StatusChip status={pending ? 'RASCUNHO' : note.situacao} />}
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography component="h2" variant="h6">Produtos e valores</Typography>
        {note.itens.map((item) => <Box key={item.id} sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography fontWeight={700}>{item.produtoNome}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatNumber(item.quantidade, 3, 6)} × {formatCurrency(item.valorUnitario)} · Desconto: {formatCurrency(item.valorDesconto)}
            {item.percentualDesconto > 0 && ` (${formatPercent(item.percentualDesconto, 6)})`}
            {' · '}Subtotal: {formatCurrency(item.valorTotal)} · Despesas rateadas: {formatCurrency(item.rateioFrete + item.rateioSeguro + item.rateioOutras)}
          </Typography>
        </Box>)}
        <Typography variant="body2" sx={{ mt: 1.5 }}>
          Produtos: {formatCurrency(note.valorProdutos)} · Frete: {formatCurrency(note.valorFrete)} · Seguro: {formatCurrency(note.valorSeguro)}
          {' · '}Outras despesas: {formatCurrency(note.outrasDespesas)} · Desconto geral: {formatCurrency(note.valorDesconto)}
        </Typography>
        <Typography variant="h6">Total: {formatCurrency(note.valorTotal)}</Typography>
        {note.observacao && <Typography variant="body2">Observação: {note.observacao}</Typography>}
      </Card>
      {pending && <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography component="h2" variant="h6">Conferência da saída</Typography>
        <Alert severity="info" sx={{ my: 1.5 }}>{effectSummary} Documento interno, sem transmissão fiscal.</Alert>
        {!oldDraft && financeRead && data.parcelas !== null && <>
          <Typography component="h3" variant="subtitle1" fontWeight={700}>Parcelas previstas</Typography>
          {data.parcelas.length === 0 ? <Typography variant="body2">Nenhuma parcela positiva prevista.</Typography>
            : data.parcelas.map((parcel) => <Typography key={parcel.numeroParcela} variant="body2">
              Parcela {parcel.numeroParcela} · {formatCurrency(parcel.valor)} · Vence em {formatDate(parcel.dataVencimento)}
              {parcel.formaPagamentoNome ? ` · ${parcel.formaPagamentoNome}` : ''}
            </Typography>)}
        </>}
        {canConfirm && <Stack alignItems="flex-start" spacing={1} sx={{ mt: 1.5 }}>
          <FormControlLabel control={<Checkbox checked={checked} disabled={busy || uncertain}
            onChange={(_, selected) => setReviewed(selected ? outboundNoteVersion(note) : null)} />}
          label="Conferi as quantidades, o local, os valores e os vencimentos desta versão." />
          <Button variant="contained" disabled={!checked || busy || uncertain} onClick={() => openAction('confirm')}>Confirmar saída</Button>
        </Stack>}
      </Card>}
      {!pending && <OutboundEffects data={data} financeRead={financeRead} stockRead={stockRead} />}
    </Stack>
    <ConfirmDialog open={action === 'confirm'} title="Confirmar esta saída?" message={effectSummary}
      confirmLabel="Confirmar saída" loading={command.isPending} onClose={() => setAction(null)} onConfirm={() => submit('confirm')} />
    <ConfirmDialog open={action === 'cancel'} title="Cancelar rascunho?" message="Nenhum lançamento será gerado por esta nota."
      confirmLabel="Cancelar rascunho" confirmColor="error" loading={command.isPending}
      onClose={() => setAction(null)} onConfirm={() => submit('cancel')} />
    <ConfirmDialog open={action === 'delete'} title="Excluir rascunho?" message="Esta operação não pode ser desfeita."
      confirmLabel="Excluir rascunho" confirmColor="error" loading={command.isPending}
      onClose={() => setAction(null)} onConfirm={() => submit('delete')} />
    {action === 'reverse' && <FiscalReversalDialog busy={command.isPending} error={error}
      onClose={() => { setAction(null); setError(null); }} onConfirm={(reason) => submit('reverse', reason)} />}
  </Box>;
}

function OutboundEffects({ data, stockRead, financeRead }: {
  data: OutboundNoteDetail; stockRead: boolean; financeRead: boolean;
}) {
  return <Card variant="outlined" sx={{ p: { xs: 2, md: 2.5 } }}>
    <Typography component="h2" variant="h6">Lançamentos da nota</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2, mt: 1 }}>
      <Box>
        <Typography component="h3" variant="subtitle1" fontWeight={700}>Estoque</Typography>
        {!stockRead || data.movimentosEstoque === null ? <Typography variant="body2">Seu perfil não permite consultar o estoque.</Typography>
          : data.movimentosEstoque.length === 0 ? <Typography variant="body2">Nenhum movimento vinculado.</Typography>
            : data.movimentosEstoque.map((movement) => <Box key={movement.id} sx={{ mt: 1 }}>
              <Link component={RouterLink} to={`/app/estoque?tab=razao&detail=${movement.id}`}>
                {movement.tipo === 'COMPENSACAO' ? 'Compensação' : 'Saída'} · {movement.produto} · {movement.localEstoque}
              </Link>
              <Typography variant="body2" color="text.secondary">
                Saldo: {formatNumber(movement.saldoAnterior, 3, 6)} → {formatNumber(movement.saldoPosterior, 3, 6)}
                {movement.custoUnitario != null && ` · Custo unitário registrado: ${formatCurrency(movement.custoUnitario)}`}
              </Typography>
              {movement.compensadoId != null && <Link component={RouterLink}
                to={`/app/estoque?tab=razao&detail=${movement.compensadoId}`}>Ver lançamento original</Link>}
            </Box>)}
      </Box>
      <Box>
        <Typography component="h3" variant="subtitle1" fontWeight={700}>Contas a receber</Typography>
        {!financeRead || data.contasReceber === null ? <Typography variant="body2">Seu perfil não permite consultar contas a receber.</Typography>
          : data.contasReceber.length === 0 ? <Typography variant="body2">Nenhum título vinculado.</Typography>
            : data.contasReceber.map((account) => <Box key={account.id} sx={{ mt: 1 }}>
              <Link component={RouterLink} to={`/app/contas-receber?detail=${account.id}`}>
                Parcela {account.numeroParcela}/{account.totalParcelas} · {formatCurrency(account.valorTotal)}
              </Link>
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}>
                <Typography variant="body2" color="text.secondary">Vence em {formatDate(account.dataVencimento)} · Recebido: {formatCurrency(account.valorRecebido)}</Typography>
                <StatusChip status={account.situacao} />
              </Stack>
            </Box>)}
      </Box>
    </Box>
  </Card>;
}
