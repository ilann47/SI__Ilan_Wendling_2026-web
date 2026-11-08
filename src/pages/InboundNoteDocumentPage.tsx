import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { describeError, getHttpStatus } from '../api/client';
import { canReverseFiscalNote } from '../api/fiscalCommands';
import { inboundNotesApi, inboundNoteVersion } from '../api/inboundNotes';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { FiscalReversalDialog } from '../components/common/FiscalReversalDialog';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { InboundNoteDocumentReview } from '../components/inboundNotes/InboundNoteDocumentReview';
import { formatCurrencyMicros, formatDate, formatDateTime, formatNumber } from '../utils/format';

function NoteFact({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography display="block" variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
    <Typography fontWeight={emphasis ? 850 : 700} color={emphasis ? 'primary.main' : 'text.primary'} fontSize={emphasis ? '1.2rem' : undefined}
      sx={{ overflowWrap: 'anywhere' }}>{value}</Typography>
  </Box>;
}

export function InboundNoteDocumentPage() {
  const { id } = useParams();
  const noteId = Number(id);
  const { activeOrganization, permissions } = useAuth();
  const org = activeOrganization?.organizationId;
  if (!org || !permissions.includes('fiscal:read')) return <Alert severity="warning">Seu contexto não possui permissão fiscal de leitura.</Alert>;
  if (!Number.isSafeInteger(noteId) || noteId <= 0) return <Alert severity="error">Identificador da nota inválido.</Alert>;
  return <InboundDocument key={`${org}:${noteId}`} org={org} noteId={noteId} permissions={permissions} />;
}

function InboundDocument({ org, noteId, permissions }: { org: number; noteId: number; permissions: string[] }) {
  const client = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reverseError, setReverseError] = useState<string | null>(null);
  const [reverseUncertain, setReverseUncertain] = useState(false);
  const detail = useQuery({ queryKey: tenantQueryKey(org, 'notas-entrada', 'detail', noteId, permissions),
    queryFn: () => inboundNotesApi.details(noteId) });
  const cancel = useMutation({ mutationFn: () => inboundNotesApi.cancel(noteId, inboundNoteVersion(detail.data!.nota)),
    onSuccess: () => { setCancelling(false); void client.invalidateQueries({ queryKey: ['tenant', org] }); } });
  const reverse = useMutation({
    mutationFn: ({ reason, version }: { reason: string; version: number }) => inboundNotesApi.reverse(noteId, version, reason),
    onSuccess: async () => {
      setReversing(false); setReverseError(null); setReverseUncertain(false);
      await client.invalidateQueries({ queryKey: ['tenant', org] });
    },
    onError: (cause) => {
      const status = getHttpStatus(cause);
      const uncertain = !status || status >= 500 || status === 412 || status === 428;
      setReverseError(describeError(cause)); setReverseUncertain(uncertain);
      if (uncertain) setReversing(false);
    },
  });
  if (detail.isLoading) return <ListingSkeleton />;
  if (detail.isError) return <ErrorState message={describeError(detail.error)} onRetry={() => void detail.refetch()} />;
  if (!detail.data) return null;
  const data = detail.data;
  const note = data.nota;
  const pending = note.situacao === 'PENDENTE';
  const manages = permissions.includes('fiscal:manage');
  const reversed = !!note.revertidaEm;
  const mayReverse = note.situacao === 'CONFIRMADA' && canReverseFiscalNote(permissions);
  const hasPayment = permissions.includes('finance:read') && data.contasPagar?.some((account) => account.valorPago > 0);
  const stockRead = permissions.includes('stock:read');
  const missingMovements = stockRead && data.movimentosEstoque?.length === 0;
  const compensated = stockRead && data.movimentosEstoque?.some((movement) => movement.tipo === 'COMPENSACAO');
  const versionKnown = note.version !== undefined && Number.isSafeInteger(note.version) && note.version >= 0;
  const reversalBlocked = !versionKnown || hasPayment || missingMovements || compensated;
  const stateCopy = reversed ? 'Nota revertida internamente · histórico preservado' : pending ? 'Rascunho · ainda não movimenta estoque nem gera obrigação' : note.situacao === 'CONFIRMADA'
    ? 'Nota confirmada · somente leitura' : 'Nota cancelada · somente consulta';
  return <Box>
    <PageHeader title={`Nota ${note.numero}`} subtitle={`Série ${note.serie} · modelo ${note.modelo} · ${note.fornecedorNome}`}
      backFallback="/app/notas-entrada"
      action={pending && manages ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        {pending && manages && <Button variant="contained" component={RouterLink} to={`/app/notas-entrada/${note.id}/editar`}>Editar / conferir entrada</Button>}
        {pending && manages && <Button color="error" onClick={() => setCancelling(true)}>Cancelar rascunho</Button>}
      </Stack> : mayReverse && !reversalBlocked ? <Button variant="outlined" color="error" disabled={reverseUncertain || reverse.isPending || detail.isFetching}
        onClick={() => { setReverseError(null); setReversing(true); }}>Reverter nota</Button> : undefined} />
    {reversed && <Alert severity="warning" sx={{ mb: 2 }}>
      Reversão registrada em {formatDateTime(note.revertidaEm)}. Motivo: {note.motivoReversao ?? 'Não informado'}.
    </Alert>}
    {mayReverse && reversalBlocked && <Alert severity="info" sx={{ mb: 2 }}>
      {hasPayment ? 'Há pagamento registrado. Esta nota não pode ser revertida por aqui.' : compensated
        ? 'Há movimento já compensado. Esta nota não pode ser revertida por aqui.'
        : missingMovements ? 'Não há movimentos de estoque vinculados para reverter esta nota.'
        : 'Recarregue a nota para consultar sua versão atual.'}
    </Alert>}
    {reverseError && !reversing && <Alert severity="error" sx={{ mb: 2 }}
      action={reverseUncertain && <Button onClick={() => void detail.refetch().then((result) => {
        if (result.isSuccess) { setReverseUncertain(false); setReverseError(null); }
      })}>Recarregar nota</Button>}>{reverseError}</Alert>}
    <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Box component="section" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box>
            <Typography component="h2" variant="h6" fontWeight={800}>Dados da nota</Typography>
            <Typography variant="body2" color="text.secondary">{stateCopy}</Typography>
          </Box>
          <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
            {reversed ? <Chip size="small" color="warning" label="Revertida" /> : <StatusChip status={note.situacao} />}
            <Typography fontWeight={850} color="primary.main" fontSize="1.35rem">{formatCurrencyMicros(note.valorTotal)}</Typography>
          </Stack>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: 'repeat(5, minmax(0, 1fr))' }, gap: { xs: 1.5, md: 2.5 }, mt: 2 }}>
          <NoteFact label="Documento" value={`Modelo ${note.modelo} · Série ${note.serie}`} />
          <NoteFact label="Emissão" value={formatDate(note.dataEmissao)} />
          <NoteFact label="Chegada" value={formatDate(note.dataChegada)} />
          <NoteFact label="Local de estoque" value={note.localEstoqueNome ?? 'Não disponível'} />
          <NoteFact label="Condição" value={note.condicaoPagamentoNome ?? 'Não informada'} />
        </Box>
        <Typography display="block" variant="caption" color="text.secondary" mt={1.5}>
          {note.transportadoraNome ? `Transportadora: ${note.transportadoraNome} · ` : ''}Frete: {note.tipoFrete} · Atualizada em {formatDateTime(note.updatedAt)}
        </Typography>
      </Box>

      <Divider />
      <Box sx={{ p: { xs: 2, md: 2.5 } }}>
        {data.previa ? <InboundNoteDocumentReview value={data.previa} situacao={note.situacao} revertida={reversed} /> : <Stack spacing={2}>
          <Box component="section">
            <Typography component="h2" variant="h6" fontWeight={800}>Itens e custos</Typography>
            <Box sx={{ mt: 1, borderTop: 1, borderColor: 'divider' }}>
              {note.itens.map((item) => <Box key={item.id} sx={{ py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                <Typography fontWeight={700}>{item.produtoNome}</Typography>
                <Typography variant="body2" color="text.secondary">{formatNumber(item.quantidade, 3, 6)} {item.unidadeMedida ?? '(unidade não disponível)'} × {formatCurrencyMicros(item.valorUnitario)} · Desconto {formatCurrencyMicros(item.valorDesconto)} · Custo unitário {formatCurrencyMicros(item.custoPrecoFinal)}</Typography>
              </Box>)}
            </Box>
          </Box>
          <Box component="section"><Typography component="h2" variant="h6" fontWeight={800}>Totais</Typography><Typography mt={1}>Total registrado: {formatCurrencyMicros(note.valorTotal)} · Desconto geral: {formatCurrencyMicros(note.valorDesconto)}</Typography></Box>
        </Stack>}
      </Box>

      <Divider />
      <Box component="section" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Typography component="h2" variant="h6" fontWeight={800}>Lançamentos gerados</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, mt: 1.25, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ py: 1.5, pr: { md: 2 } }}>
            <Typography component="h3" variant="subtitle1" fontWeight={800}>Estoque</Typography>
            {!permissions.includes('stock:read') || data.movimentosEstoque === null ? <Typography color="text.secondary">Seu perfil não permite consultar o estoque.</Typography> : data.movimentosEstoque.length === 0 ? <Typography color="text.secondary">Nenhum movimento de estoque vinculado a esta nota.</Typography> : data.movimentosEstoque.map((movement) => <Box key={movement.id} sx={{ mt: 0.75 }}>
              <Button sx={{ px: 0, justifyContent: 'flex-start', textAlign: 'left' }} component={RouterLink} to={`/app/estoque?tab=razao&detail=${movement.id}`}>{movement.produto} · {movement.localEstoque}</Button>
              <Typography variant="body2" color="text.secondary">
                Saldo anterior: {formatNumber(movement.saldoAnterior, 3, 6)} · {movement.tipo === 'COMPENSACAO' ? 'Compensação' : 'Entrada'}: {formatNumber(movement.delta, 3, 6)} · Saldo posterior: {formatNumber(movement.saldoPosterior, 3, 6)} · {formatDateTime(movement.ocorridoEm)}
              </Typography>
              {movement.compensadoId != null && <Button size="small" sx={{ px: 0 }} component={RouterLink}
                to={`/app/estoque?tab=razao&detail=${movement.compensadoId}`}>Ver lançamento original</Button>}
            </Box>)}
          </Box>
          <Box sx={{ py: 1.5, pl: { md: 2 }, borderTop: { xs: 1, md: 0 }, borderLeft: { xs: 0, md: 1 }, borderColor: 'divider' }}>
            <Typography component="h3" variant="subtitle1" fontWeight={800}>Contas a pagar</Typography>
            {!permissions.includes('finance:read') || data.contasPagar === null ? <Typography color="text.secondary">Seu perfil não permite consultar contas a pagar.</Typography> : data.contasPagar.length === 0 ? <Typography color="text.secondary">Nenhuma obrigação positiva gerada para esta nota.</Typography> : data.contasPagar.map((account) => <Box key={account.id} sx={{ mt: 0.75 }}>
              <Button sx={{ px: 0, justifyContent: 'flex-start', textAlign: 'left' }} component={RouterLink} to={`/app/contas-pagar?detail=${account.id}`}>Parcela {account.numeroParcela}/{account.totalParcelas} · {formatCurrencyMicros(account.valorTotal)}</Button>
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={0.75}><Typography variant="body2" color="text.secondary">Vence em {formatDate(account.dataVencimento)}</Typography><StatusChip status={account.situacao} /></Stack>
              <Typography variant="body2" color="text.secondary">Pago: {formatCurrencyMicros(account.valorPago)} · Saldo: {formatCurrencyMicros(account.saldo)}</Typography>
            </Box>)}
          </Box>
        </Box>
      </Box>

      {(note.observacao || note.observacaoInterna) && <Accordion disableGutters elevation={0} sx={{ borderTop: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-label="Ver observações" sx={{ px: { xs: 2, md: 2.5 } }}><Typography fontWeight={800}>Observações</Typography></AccordionSummary>
        <AccordionDetails sx={{ px: { xs: 2, md: 2.5 }, pt: 0 }}>
          {note.observacao && <Box><Typography variant="caption" color="text.secondary">Para o fornecedor</Typography><Typography>{note.observacao}</Typography></Box>}
          {note.observacaoInterna && <Box sx={{ mt: note.observacao ? 1.5 : 0 }}><Typography variant="caption" color="text.secondary">Interna</Typography><Typography>{note.observacaoInterna}</Typography></Box>}
        </AccordionDetails>
      </Accordion>}
      <Typography variant="caption" color="text.secondary" display="block" sx={{ px: { xs: 2, md: 2.5 }, py: 1.5, borderTop: 1, borderColor: 'divider' }}>O histórico de ações não está disponível nesta tela. Os documentos e movimentos vinculados permanecem consultáveis conforme seu acesso.</Typography>
    </Box>
    {cancel.isError && <Box mt={2}><ErrorState message={describeError(cancel.error)} onRetry={() => void detail.refetch()} /></Box>}
    <ConfirmDialog open={cancelling} title="Cancelar rascunho?" message="Cancelar esta nota pendente? Nenhum lançamento será gerado." confirmLabel="Cancelar rascunho" confirmColor="error" loading={cancel.isPending} onClose={() => setCancelling(false)} onConfirm={() => cancel.mutate()} />
    {reversing && <FiscalReversalDialog busy={reverse.isPending} error={reverseError}
      onClose={() => { if (!reverse.isPending) { setReversing(false); setReverseError(null); } }}
      onConfirm={(reason) => { if (mayReverse && !reversalBlocked && !detail.isFetching && !reverseUncertain) {
        reverse.mutate({ reason, version: inboundNoteVersion(note) });
      } }} />}
  </Box>;
}
