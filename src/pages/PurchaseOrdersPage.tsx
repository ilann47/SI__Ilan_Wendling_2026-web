import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useLinkedDetail } from '../hooks/useLinkedDetail';
import { Link as RouterLink } from 'react-router-dom';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingCards } from '../components/listing/ListingCards';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { AppliedFilterChips } from '../components/listing/AppliedFilterChips';
import { DetailDrawer } from '../components/listing/DetailDrawer';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { SecondaryActionsMenu, type SecondaryAction } from '../components/listing/SecondaryActionsMenu';
import { UNAVAILABLE_API } from '../components/listing/listingUtils';
import {
  inboundNoteFromReceiptPath,
  PurchaseProcessStrip,
} from '../components/purchases/PurchaseProcessStrip';
import { FilterBar } from '../components/crud/FilterBar';
import type { FilterConfig } from '../components/crud/resourceConfig';
import { describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import {
  buildPurchaseOrderPayload, buildPurchaseReceiptPayload, purchaseApi,
  type PurchaseOrder, type PurchaseReceipt,
} from '../api/purchases';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import type { FieldConfig } from '../components/form/fieldConfig';
import { useSnackbar } from '../components/SnackbarProvider';
import { formatCurrency, formatDate, formatDateTime, formatNumber } from '../utils/format';

const itemFields: FieldConfig[] = [
  { name: 'produtoId', label: 'Produto', type: 'reference', required: true, cols: 4,
    reference: { basePath: '/api/produtos', labelField: 'nome', params: { ativo: true } } },
  { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 2, step: 0.001 },
  { name: 'valorUnitario', label: 'Valor unitário', type: 'money', required: true, cols: 2 },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 2 },
];

const orderFields: FieldConfig[] = [
  { name: 'numero', label: 'Número', type: 'text', required: true, cols: 4 },
  { name: 'fornecedorId', label: 'Fornecedor', type: 'reference', required: true, cols: 8,
    reference: { basePath: '/api/fornecedores', labelField: 'nome', params: { ativo: true } } },
  { name: 'dataEmissao', label: 'Emissão', type: 'date', cols: 3 },
  { name: 'previsaoEntrega', label: 'Previsão de entrega', type: 'date', cols: 3 },
  { name: 'moeda', label: 'Moeda', type: 'text', cols: 2, defaultValue: 'BRL' },
  { name: 'valorFrete', label: 'Frete', type: 'money', cols: 2, defaultValue: 0 },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 2, defaultValue: 0 },
  { name: 'observacao', label: 'Observação', type: 'textarea' },
  { name: 'itens', label: 'Itens da ordem', type: 'subitems', subFields: itemFields },
];

function key(organizationId: number, ...parts: readonly unknown[]) {
  return tenantQueryKey(organizationId, 'purchase-orders', ...parts);
}

function statusColor(status: PurchaseOrder['status']): 'default' | 'success' | 'error' | 'warning' | 'info' {
  if (status === 'RECEBIDA') return 'success';
  if (status === 'CANCELADA') return 'error';
  if (status === 'PARCIALMENTE_RECEBIDA') return 'warning';
  if (status === 'APROVADA') return 'info';
  return 'default';
}

function toForm(order: PurchaseOrder) {
  return {
    numero: order.numero, fornecedorId: order.fornecedorId,
    dataEmissao: order.dataEmissao, previsaoEntrega: order.previsaoEntrega ?? '',
    moeda: order.moeda, valorFrete: order.valorFrete,
    valorDesconto: order.valorDesconto, observacao: order.observacao ?? '',
    itens: order.itens.map((item) => ({
      produtoId: item.produtoId, quantidade: item.quantidadePedida,
      valorUnitario: item.valorUnitario, valorDesconto: item.valorDesconto,
    })),
  };
}

export function PurchaseOrdersPage() {
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [editing, setEditing] = useState<PurchaseOrder | null | undefined>(undefined);
  const [approving, setApproving] = useState<PurchaseOrder | null>(null);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [received, setReceived] = useState<{ orderId: number; receiptId: number } | null>(null);
  const [selectedDetails, setDetails] = useState<PurchaseOrder | null>(null);
  const linked = useLinkedDetail(organizationId, 'purchase-orders', purchaseApi.get, permissions.includes('purchases:read'));
  const details = selectedDetails ?? linked.data ?? null;
  const closeDetails = () => { setDetails(null); if (linked.requested) linked.close(); };
  const [history, setHistory] = useState<PurchaseOrder | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [page, setPage] = useState(0);
  const canManage = permissions.includes('purchases:manage');
  const advancedFilters: FilterConfig[] = [
    { name: 'status', label: 'Situação', type: 'select', options: [
      { value: 'RASCUNHO', label: 'Rascunho' },
      { value: 'APROVADA', label: 'Aprovada' },
      { value: 'PARCIALMENTE_RECEBIDA', label: 'Parcialmente recebida' },
      { value: 'RECEBIDA', label: 'Recebida' },
      { value: 'CANCELADA', label: 'Cancelada' },
    ] },
  ];
  const list = useQuery({
    queryKey: organizationId ? key(organizationId, 'list', page, search, filters) : ['purchase-orders'],
    queryFn: () => purchaseApi.list({
      page, size: 10, sort: 'dataEmissao,desc',
      ...(search.trim() ? { numero: search.trim() } : {}),
      ...filters,
    }),
    enabled: !!organizationId && permissions.includes('purchases:read'),
  });
  const receiptOrder = history ?? details;
  const receipts = useQuery({
    queryKey: organizationId && receiptOrder ? key(organizationId, receiptOrder.id, 'receipts') : ['receipts'],
    queryFn: () => purchaseApi.receipts(receiptOrder!.id), enabled: !!organizationId && !!receiptOrder,
  });
  const invalidate = () => organizationId
    && queryClient.invalidateQueries({ queryKey: key(organizationId) });
  const success = (message: string) => { notify(message, 'success'); closeDetails(); void invalidate();
    if (organizationId) void queryClient.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'dashboard', 'purchase-orders') }); };
  const failure = (error: unknown) => notify(describeError(error), 'error');

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => editing
      ? purchaseApi.update(editing.id, buildPurchaseOrderPayload(values), editing.version)
      : purchaseApi.create(buildPurchaseOrderPayload(values), crypto.randomUUID()),
    onSuccess: () => { setEditing(undefined); success('Ordem de compra salva.'); },
    onError: failure,
  });
  const approve = useMutation({
    mutationFn: (order: PurchaseOrder) => purchaseApi.approve(order.id, order.version),
    onSuccess: () => { setApproving(null); success('Ordem aprovada para recebimento.'); },
    onError: failure,
  });
  const cancel = useMutation({
    mutationFn: (values: Record<string, unknown>) => purchaseApi.cancel(
      cancelling!.id, String(values.motivo ?? '').trim(), cancelling!.version),
    onSuccess: () => { setCancelling(null); success('Ordem cancelada.'); },
    onError: failure,
  });
  const receive = useMutation({
    mutationFn: (values: Record<string, unknown>) => purchaseApi.receive(
      receiving!.id, buildPurchaseReceiptPayload(values), receiving!.version,
      crypto.randomUUID()),
    onSuccess: (receipt) => {
      if (receiving) setReceived({ orderId: receiving.id, receiptId: receipt.id });
      setReceiving(null);
      success('Mercadoria recebida e estoque atualizado.');
    },
    onError: failure,
  });
  const receiptFields = useMemo<FieldConfig[]>(() => receiving ? [
    { name: 'localEstoqueId', label: 'Local de estoque', type: 'reference', required: true,
      reference: { basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true } } },
    { name: 'observacao', label: 'Observação do recebimento', type: 'textarea' },
    { name: 'itens', label: 'Itens recebidos', type: 'subitems', subFields: [
      { name: 'itemOrdemCompraId', label: 'Item pendente', type: 'select', required: true, cols: 8,
        options: receiving.itens.filter((item) => item.quantidadePendente > 0).map((item) => ({
          value: String(item.id), label: `${item.produtoNome} - pendente ${formatNumber(item.quantidadePendente)}`,
        })) },
      { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 3, step: 0.001 },
    ] },
  ] : [], [receiving]);

  if (!organizationId || !permissions.includes('purchases:read')) {
    return <Alert severity="warning">Seu contexto não possui permissão de compras.</Alert>;
  }

  const orders = list.data?.content ?? [];
  const clearFilters = () => { setSearch(''); setFilters({}); setPage(0); };
  const secondaryActions = (order: PurchaseOrder): SecondaryAction[] => [
    ...(canManage && order.status === 'RASCUNHO' ? [{
      key: 'edit', label: 'Editar ordem', icon: <EditOutlinedIcon fontSize="small" />,
      onClick: () => setEditing(order),
    }] : []),
    ...(canManage && order.status === 'RASCUNHO' ? [{
      key: 'approve', label: 'Aprovar para receber', icon: <CheckCircleOutlineIcon fontSize="small" />,
      onClick: () => setApproving(order),
    }] : []),
    ...(canManage && ['RASCUNHO', 'APROVADA'].includes(order.status) ? [{
      key: 'cancel', label: 'Cancelar ordem', icon: <CancelOutlinedIcon fontSize="small" />,
      danger: true, onClick: () => setCancelling(order),
    }] : []),
    ...(canManage && ['APROVADA', 'PARCIALMENTE_RECEBIDA'].includes(order.status) ? [{
      key: 'receive', label: 'Receber mercadoria', icon: <InventoryOutlinedIcon fontSize="small" />,
      onClick: () => setReceiving(order),
    }] : []),
    {
      key: 'details', label: 'Ver detalhes', icon: <VisibilityOutlinedIcon fontSize="small" />,
      onClick: () => setDetails(order),
    },
    {
      key: 'history', label: 'Ver recebimentos', icon: <HistoryOutlinedIcon fontSize="small" />,
      onClick: () => setHistory(order),
    },
  ];

  return <Box>
    <PageHeader title="Ordens de Compra" subtitle="Aprovação e recebimentos parciais integrados à razão de estoque."
      count={list.data?.totalElements}
      action={canManage ? <PrimaryButton startIcon={<AddOutlinedIcon />}
        onClick={() => setEditing(null)}>Nova ordem</PrimaryButton> : undefined} />
    <PurchaseProcessStrip active="ordem" />
    {linked.requested && linked.isLoading && <ListingSkeleton />}
    {linked.requested && linked.isError && <ErrorState message={describeError(linked.error)} onRetry={() => void linked.refetch()} />}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
      <Button component={RouterLink} to="/app/recebimentos" size="small" variant="outlined">
        Ir para recebimentos
      </Button>
      <Button component={RouterLink} to="/app/notas-entrada" size="small" variant="outlined">
        Ir para notas de entrada
      </Button>
      <Button component={RouterLink} to="/app/contas-pagar" size="small" variant="outlined">
        Ir para contas a pagar
      </Button>
    </Stack>
    <ListingToolbar
      searchValue={search}
      searchLabel="Buscar por número"
      onSearchChange={(value) => { setSearch(value); setPage(0); }}
      filterForm={<FilterBar filters={advancedFilters} values={filters} onChange={(value) => { setFilters(value); setPage(0); }} />}
      appliedCount={filters.status ? 1 : 0}
      onClear={clearFilters}
    />
    <AppliedFilterChips filters={advancedFilters} values={filters} onRemove={() => setFilters({})} onClear={clearFilters} />
    {list.isLoading && <ListingSkeleton />}
    {list.isError && <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />}
    {!list.isLoading && !list.isError && orders.length === 0 && (
      <EmptyState title="Nenhuma ordem de compra encontrada" description="Crie uma ordem ou ajuste os filtros." />
    )}
    {orders.length > 0 && <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" stickyHeader>
      <TableHead><TableRow>
      <TableCell>Número</TableCell><TableCell>Fornecedor</TableCell><TableCell>Emissão</TableCell>
      <TableCell>Situação</TableCell><TableCell align="right">Total</TableCell><TableCell>Ações</TableCell>
    </TableRow></TableHead><TableBody>{orders.map((order) => <TableRow key={order.id} hover
      onClick={() => setDetails(order)} sx={{ cursor: 'pointer' }}>
      <TableCell>{order.numero}</TableCell><TableCell>{order.fornecedorNome}</TableCell>
      <TableCell>{formatDate(order.dataEmissao)}</TableCell>
      <TableCell><Chip size="small" label={order.status.replace(/_/g, ' ')} color={statusColor(order.status)} /></TableCell>
      <TableCell align="right">{formatCurrency(order.valorTotal)}</TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          {canManage && ['APROVADA', 'PARCIALMENTE_RECEBIDA'].includes(order.status) && (
            <Button size="small" variant="contained" onClick={() => setReceiving(order)}>
              Receber
            </Button>
          )}
          <SecondaryActionsMenu actions={secondaryActions(order).filter((action) => action.key !== 'receive')} />
        </Stack>
      </TableCell>
    </TableRow>)}</TableBody></Table></TableContainer></Card>}
    {orders.length > 0 && (
      <ListingCards
        rows={orders}
        getKey={(order) => order.id}
        getTitle={(order) => order.numero}
        getFields={(order) => [
          { label: 'Fornecedor', value: order.fornecedorNome },
          { label: 'Situação', value: <Chip size="small" label={order.status.replace(/_/g, ' ')} color={statusColor(order.status)} /> },
          { label: 'Total', value: formatCurrency(order.valorTotal) },
        ]}
        getActions={secondaryActions}
        onOpen={setDetails}
      />
    )}
    {list.data && list.data.totalPages > 1 && (
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
        <Button disabled={list.data.last} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
      </Stack>
    )}
    <ResourceFormDialog open={editing !== undefined} title={editing ? 'Editar ordem de compra' : 'Nova ordem de compra'}
      fields={orderFields} initialValues={editing ? toForm(editing) : null} submitting={save.isPending}
      onClose={() => setEditing(undefined)} onSubmit={(values) => save.mutate(values)} />
    <ConfirmDialog open={!!approving} title="Aprovar ordem" message="Após aprovada, os itens não poderão mais ser alterados."
      confirmLabel="Aprovar" loading={approve.isPending} onClose={() => setApproving(null)}
      onConfirm={() => approving && approve.mutate(approving)} />
    <ResourceFormDialog open={!!cancelling} title="Cancelar ordem" fields={[
      { name: 'motivo', label: 'Motivo', type: 'textarea', required: true },
    ]} submitting={cancel.isPending} onClose={() => setCancelling(null)} onSubmit={(values) => cancel.mutate(values)} />
    <ResourceFormDialog open={!!receiving} title={`Receber ${receiving?.numero ?? ''}`} fields={receiptFields}
      submitting={receive.isPending} onClose={() => setReceiving(null)} onSubmit={(values) => receive.mutate(values)} />
    <Dialog open={!!received} onClose={() => setReceived(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Mercadoria recebida</DialogTitle>
      <DialogContent>
        <Typography>
          O estoque já foi atualizado. Se a nota do fornecedor está em mãos, você pode lançá-la agora.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setReceived(null)}>Agora não</Button>
        {received && (
          <Button
            variant="contained"
            component={RouterLink}
            to={inboundNoteFromReceiptPath(received.orderId, received.receiptId)}
            startIcon={<NoteAddOutlinedIcon />}
          >
            Gerar nota agora
          </Button>
        )}
      </DialogActions>
    </Dialog>
    <DetailDrawer open={!!details} title={`Detalhes da ordem ${details?.numero ?? ''}`}
      subtitle={details?.fornecedorNome} onClose={closeDetails}
      actions={details && canManage ? <Stack direction="row" spacing={1}>
        {(details.status === 'APROVADA' || details.status === 'PARCIALMENTE_RECEBIDA') && <PrimaryButton
          startIcon={<InventoryOutlinedIcon />} onClick={() => { setReceiving(details); closeDetails(); }}>Receber mercadoria</PrimaryButton>}
        {details.status === 'RASCUNHO' && <PrimaryButton startIcon={<CheckCircleOutlineIcon />}
          onClick={() => { setApproving(details); closeDetails(); }}>Aprovar para receber</PrimaryButton>}
      </Stack> : undefined}>
        {details && <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="text.secondary">Fornecedor</Typography>
              <Typography fontWeight={700}>{details.fornecedorNome}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Emissão</Typography>
              <Typography>{formatDate(details.dataEmissao)}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Previsão de entrega</Typography>
              <Typography>{details.previsaoEntrega ? formatDate(details.previsaoEntrega) : 'Não informada'}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Situação</Typography>
              <Box><Chip size="small" label={details.status.replace(/_/g, ' ')} color={statusColor(details.status)} /></Box>
            </Box>
          </Stack>
          <Box>
            <Typography variant="overline" color="text.secondary">Condição de pagamento</Typography>
            <Typography variant="body2" color="text.secondary">{UNAVAILABLE_API}</Typography>
          </Box>

          <Box>
            <Typography variant="h6" gutterBottom>Itens comprados</Typography>
            <TableContainer component={Card} variant="outlined"><Table size="small">
              <TableHead><TableRow>
                <TableCell>Produto</TableCell><TableCell align="right">Pedida</TableCell>
                <TableCell align="right">Recebida</TableCell><TableCell align="right">Pendente</TableCell>
                <TableCell align="right">Valor unitário</TableCell><TableCell align="right">Desconto</TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow></TableHead>
              <TableBody>{details.itens.map((item) => <TableRow key={item.id}>
                <TableCell><Typography fontWeight={600}>{item.produtoNome}</Typography>
                  <Typography variant="caption" color="text.secondary">Produto #{item.produtoId}</Typography></TableCell>
                <TableCell align="right">{formatNumber(item.quantidadePedida)}</TableCell>
                <TableCell align="right">{formatNumber(item.quantidadeRecebida)}</TableCell>
                <TableCell align="right">{formatNumber(item.quantidadePendente)}</TableCell>
                <TableCell align="right">{formatCurrency(item.valorUnitario)}</TableCell>
                <TableCell align="right">{formatCurrency(item.valorDesconto)}</TableCell>
                <TableCell align="right">{formatCurrency(item.valorTotal)}</TableCell>
              </TableRow>)}</TableBody>
            </Table></TableContainer>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="flex-end">
            <Box><Typography variant="caption" color="text.secondary">Subtotal</Typography>
              <Typography>{formatCurrency(details.subtotal)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Frete</Typography>
              <Typography>{formatCurrency(details.valorFrete)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Desconto</Typography>
              <Typography>{formatCurrency(details.valorDesconto)}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">Total da ordem</Typography>
              <Typography variant="h6">{formatCurrency(details.valorTotal)}</Typography></Box>
          </Stack>

          {details.observacao && <Box><Typography variant="overline" color="text.secondary">Observação</Typography>
            <Typography>{details.observacao}</Typography></Box>}
          {details.motivoCancelamento && <Alert severity="error">Motivo do cancelamento: {details.motivoCancelamento}</Alert>}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.secondary">Recebimentos</Typography>
              <Button component={RouterLink} to="/app/recebimentos" size="small">Ver todos</Button>
            </Stack>
            {receipts.isLoading && <Typography variant="body2">Carregando recebimentos…</Typography>}
            {receipts.data?.length === 0 && <Typography variant="body2" color="text.secondary">Nenhum recebimento registrado.</Typography>}
            <Stack spacing={1}>
              {receipts.data?.map((receipt: PurchaseReceipt) => (
                <Card key={receipt.id} variant="outlined" sx={{ p: 1.5 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                    <Typography variant="body2">
                      #{receipt.id} · {receipt.localEstoqueNome} · {formatDateTime(receipt.recebidoEm)}
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      component={RouterLink}
                      to={inboundNoteFromReceiptPath(details.id, receipt.id)}
                      startIcon={<NoteAddOutlinedIcon />}
                    >
                      Gerar nota de entrada
                    </Button>
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Nota de entrada vinculada</Typography>
            <Typography variant="body2" color="text.secondary">{UNAVAILABLE_API}</Typography>
            <Button component={RouterLink} to="/app/notas-entrada" size="small" sx={{ mt: 0.5 }}>
              Abrir notas de entrada
            </Button>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Conta a pagar relacionada</Typography>
            <Typography variant="body2" color="text.secondary">{UNAVAILABLE_API}</Typography>
            <Button
              component={RouterLink}
              to={`/app/contas-pagar?fornecedorId=${details.fornecedorId}`}
              size="small"
              sx={{ mt: 0.5 }}
            >
              Ver contas do fornecedor
            </Button>
          </Box>
        </Stack>}
    </DetailDrawer>
    <Dialog open={!!history} onClose={() => setHistory(null)} maxWidth="md" fullWidth>
      <DialogTitle>Recebimentos de {history?.numero}</DialogTitle><DialogContent dividers>
        {receipts.isLoading && <CircularProgress />}{receipts.isError && <Alert severity="error">{describeError(receipts.error)}</Alert>}
        {receipts.data?.length === 0 && <Typography color="text.secondary">Nenhum recebimento registrado.</Typography>}
        {receipts.data?.map((receipt: PurchaseReceipt) => <Card key={receipt.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ sm: 'center' }}>
            <Box>
              <Typography fontWeight={700}>#{receipt.id} - {receipt.localEstoqueNome}</Typography>
              <Typography variant="body2" color="text.secondary">{formatDateTime(receipt.recebidoEm)} por {receipt.atorNome}</Typography>
              {receipt.itens.map((item) => <Typography key={item.id} variant="body2">{item.produtoNome}: {formatNumber(item.quantidade)} - movimento #{item.movimentoEstoqueId}</Typography>)}
            </Box>
            {history && (
              <Button
                size="small"
                variant="contained"
                component={RouterLink}
                to={inboundNoteFromReceiptPath(history.id, receipt.id)}
                startIcon={<NoteAddOutlinedIcon />}
              >
                Gerar nota
              </Button>
            )}
          </Stack>
        </Card>)}
      </DialogContent><DialogActions>
        <Button component={RouterLink} to="/app/recebimentos">Abrir recebimentos</Button>
        <Button onClick={() => setHistory(null)}>Fechar</Button>
      </DialogActions>
    </Dialog>
  </Box>;
}
