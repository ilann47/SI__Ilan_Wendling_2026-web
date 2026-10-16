import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert, Box, Button, Card, Chip, CircularProgress,
  Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useMemo, useState } from 'react';
import { useLinkedDetail } from '../hooks/useLinkedDetail';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingCards } from '../components/listing/ListingCards';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { AppliedFilterChips } from '../components/listing/AppliedFilterChips';
import { DetailDrawer } from '../components/listing/DetailDrawer';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { SecondaryActionsMenu, type SecondaryAction } from '../components/listing/SecondaryActionsMenu';
import {
  inboundNoteFromReceiptPath,
} from '../components/purchases/PurchaseProcessStrip';
import { PurchaseProgress } from '../components/purchases/PurchaseProgress';
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
import { AppDialog } from '../components/common/AppDialog';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import type { FieldConfig } from '../components/form/fieldConfig';
import { useSnackbar } from '../components/SnackbarProvider';
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatStatusLabel } from '../utils/format';

export function validateItemDiscount(
  value: unknown,
  values: Record<string, unknown>,
  namePrefix: string,
): true | string {
  const index = Number(/^itens\.(\d+)\.$/.exec(namePrefix)?.[1]);
  const items = Array.isArray(values.itens) ? values.itens : [];
  const item = Number.isSafeInteger(index)
    ? items[index] as Record<string, unknown> | undefined
    : undefined;
  const quantity = Number(item?.quantidade);
  const unitValue = Number(item?.valorUnitario);
  const discount = Number(value ?? 0);
  if (![quantity, unitValue, discount].every(Number.isFinite)
      || quantity < 0 || unitValue < 0 || discount < 0) return true;

  const itemTotal = Math.round(quantity * unitValue * 100) / 100;
  return discount <= itemTotal
    || `O desconto não pode exceder o total do item (${formatCurrency(itemTotal)}).`;
}

const itemFields: FieldConfig[] = [
  { name: 'produtoId', label: 'Produto', type: 'reference', required: true, cols: 4,
    reference: { basePath: '/api/produtos', labelField: 'nome', params: { ativo: true } } },
  { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 2, step: 0.001, min: 0.001 },
  { name: 'valorUnitario', label: 'Valor unitário', type: 'money', required: true, cols: 2 },
  { name: 'valorDesconto', label: 'Desconto do item', type: 'money', cols: 2,
    validate: validateItemDiscount, dependsOn: ['quantidade', 'valorUnitario'] },
];

export function fiscalKeyComplete(values: Record<string, unknown>) {
  return Number(values.fornecedorId) > 0
    && String(values.numeroNota ?? '').trim() !== ''
    && String(values.serieNota ?? '').trim() !== ''
    && String(values.modeloNota ?? '').trim() !== '';
}

export function hasProducts(values: Record<string, unknown>) {
  return Array.isArray(values.itens) && values.itens.length > 0;
}

function DetailValue({ label, children, strong = false }: {
  label: string;
  children: ReactNode;
  strong?: boolean;
}) {
  return <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
      {label}
    </Typography>
    {typeof children === 'string' || typeof children === 'number'
      ? <Typography fontWeight={strong ? 700 : 500} sx={{ overflowWrap: 'anywhere' }}>{children}</Typography>
      : children}
  </Box>;
}

const lockedUntilFiscalKey = (values: Record<string, unknown>) => !fiscalKeyComplete(values);
const fiscalKeyLocked = (values: Record<string, unknown>) => hasProducts(values);

const orderFields: FieldConfig[] = [
  { name: '_chaveFiscal', label: 'Identificação da compra', type: 'section',
    helperText: 'Informe fornecedor, número, série e modelo da nota para liberar o restante. Após adicionar o primeiro produto, esses dados ficam bloqueados.' },
  { name: 'fornecedorId', label: 'Fornecedor', type: 'reference', required: true, cols: 6,
    disabledWhen: fiscalKeyLocked,
    reference: { basePath: '/api/fornecedores', labelField: 'nome', params: { ativo: true },
      inheritFields: {
        condicaoPagamentoId: 'condicaoPagamentoId',
        transportadoraId: 'transportadoraId',
      } } },
  { name: 'numeroNota', label: 'Número da nota', type: 'text', required: true, cols: 2,
    disabledWhen: fiscalKeyLocked },
  { name: 'serieNota', label: 'Série', type: 'text', required: true, cols: 2,
    disabledWhen: fiscalKeyLocked },
  { name: 'modeloNota', label: 'Modelo', type: 'text', required: true, cols: 2,
    disabledWhen: fiscalKeyLocked },
  { name: 'dataEmissao', label: 'Data da ordem', type: 'date', cols: 3, disabledWhen: lockedUntilFiscalKey },
  { name: 'previsaoEntrega', label: 'Previsão de chegada', type: 'date', cols: 3, disabledWhen: lockedUntilFiscalKey },
  { name: 'moeda', label: 'Moeda', type: 'text', cols: 2, defaultValue: 'BRL', disabledWhen: lockedUntilFiscalKey },
  { name: 'referenciaFornecedor', label: 'Referência do fornecedor', type: 'text', cols: 4, disabledWhen: lockedUntilFiscalKey },
  { name: '_condicoesComerciais', label: 'Condições comerciais e entrega', type: 'section',
    helperText: 'A condição de pagamento e a transportadora são herdadas do fornecedor quando não forem informadas.' },
  { name: 'condicaoPagamentoId', label: 'Condição de pagamento', type: 'reference', cols: 4, disabledWhen: lockedUntilFiscalKey,
    helperText: 'Herdado do fornecedor; você pode substituir.',
    reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome', params: { ativo: true }, readPermissions: ['payments:read'] } },
  { name: 'localEstoqueEntregaId', label: 'Local previsto de entrega', type: 'reference', cols: 4, disabledWhen: lockedUntilFiscalKey,
    reference: { basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true }, readPermissions: ['stock:read'] } },
  { name: 'transportadoraId', label: 'Transportadora', type: 'reference', cols: 4, disabledWhen: lockedUntilFiscalKey,
    helperText: 'Herdado do fornecedor; você pode substituir.',
    reference: { basePath: '/api/transportadoras', labelField: 'nome', params: { ativo: true }, readPermissions: ['logistics:read'] } },
  { name: 'tipoFrete', label: 'Responsável pelo frete', type: 'select', cols: 4, disabledWhen: lockedUntilFiscalKey,
    defaultValue: 'SEM_FRETE', options: [
      { value: 'SEM_FRETE', label: 'Sem frete' },
      { value: 'CIF', label: 'CIF - fornecedor paga' },
      { value: 'FOB', label: 'FOB - comprador paga' },
    ] },
  { name: 'itens', label: 'Itens da ordem', type: 'subitems', subFields: itemFields,
    subItemsSummary: 'purchase-costs', disabledWhen: lockedUntilFiscalKey },
  { name: '_custosOrdem', label: 'Custos da ordem', type: 'section',
    helperText: 'Frete, seguro e outras despesas são rateados entre os itens.' },
  { name: 'valorFrete', label: 'Frete', type: 'money', cols: 4, defaultValue: 0, disabledWhen: lockedUntilFiscalKey },
  { name: 'valorSeguro', label: 'Seguro', type: 'money', cols: 4, defaultValue: 0, disabledWhen: lockedUntilFiscalKey },
  { name: 'outrasDespesas', label: 'Outras despesas', type: 'money', cols: 4, defaultValue: 0, disabledWhen: lockedUntilFiscalKey },
  { name: '_totaisItens', label: 'Totais dos itens', type: 'subitems-summary', subItemsSummary: 'purchase-costs' },
  { name: 'observacao', label: 'Observação para o fornecedor', type: 'textarea', disabledWhen: lockedUntilFiscalKey },
  { name: 'observacaoInterna', label: 'Observação interna', type: 'textarea',
    disabledWhen: lockedUntilFiscalKey,
    helperText: 'Visível apenas na operação interna; não compõe a comunicação ao fornecedor.' },
];

function key(organizationId: number, ...parts: readonly unknown[]) {
  return tenantQueryKey(organizationId, 'purchase-orders', ...parts);
}

function statusColor(status: PurchaseOrder['status']): 'default' | 'success' | 'error' | 'warning' | 'info' {
  if (status === 'RECEBIDA') return 'success';
  if (status === 'CANCELADA' || status === 'REJEITADA') return 'error';
  if (status === 'PARCIALMENTE_RECEBIDA') return 'warning';
  if (status === 'APROVADA') return 'info';
  return 'default';
}

function toForm(order: PurchaseOrder) {
  return {
    fornecedorId: order.fornecedorId, numeroNota: order.numeroNota,
    serieNota: order.serieNota, modeloNota: order.modeloNota,
    dataEmissao: order.dataEmissao, previsaoEntrega: order.previsaoEntrega ?? '',
    condicaoPagamentoId: order.condicaoPagamentoId ?? '',
    transportadoraId: order.transportadoraId ?? '',
    localEstoqueEntregaId: order.localEstoqueEntregaId ?? '',
    tipoFrete: order.tipoFrete ?? 'SEM_FRETE',
    referenciaFornecedor: order.referenciaFornecedor ?? '',
    moeda: order.moeda, valorFrete: order.valorFrete,
    valorSeguro: order.valorSeguro, outrasDespesas: order.outrasDespesas,
    observacao: order.observacao ?? '', observacaoInterna: order.observacaoInterna ?? '',
    itens: order.itens.map((item) => ({
      produtoId: item.produtoId, quantidade: item.quantidadePedida,
      valorUnitario: item.valorUnitario, valorDesconto: item.valorDesconto,
    })),
  };
}

export function PurchaseOrdersPage() {
  const [searchParams] = useSearchParams();
  const receiptFromUrl = Number(searchParams.get('recebimentoId'));
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [editing, setEditing] = useState<PurchaseOrder | null | undefined>(undefined);
  const [approving, setApproving] = useState<PurchaseOrder | null>(null);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);
  const [rejecting, setRejecting] = useState<PurchaseOrder | null>(null);
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
  const [createKey, setCreateKey] = useState(() => crypto.randomUUID());
  const [receiptKey, setReceiptKey] = useState(() => crypto.randomUUID());
  const advancedFilters: FilterConfig[] = [
    { name: 'status', label: 'Situação', type: 'select', options: [
      { value: 'RASCUNHO', label: 'Rascunho' },
      { value: 'APROVADA', label: 'Aprovada' },
      { value: 'PARCIALMENTE_RECEBIDA', label: 'Parcialmente recebida' },
      { value: 'RECEBIDA', label: 'Recebida' },
      { value: 'REJEITADA', label: 'Entrega rejeitada' },
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
  const documents = useQuery({
    queryKey: organizationId && receiptOrder ? key(organizationId, receiptOrder.id, 'documents') : ['purchase-documents'],
    queryFn: () => purchaseApi.documents(receiptOrder!.id),
    enabled: !!organizationId && !!receiptOrder && permissions.includes('purchases:read'),
  });
  const receiptNote = (receiptId: number) => documents.data?.notas?.find((note) => note.recebimentoCompraId === receiptId);
  const invalidate = () => organizationId
    && queryClient.invalidateQueries({ queryKey: key(organizationId) });
  const success = (message: string) => { notify(message, 'success'); closeDetails(); void invalidate();
    if (organizationId) void queryClient.invalidateQueries({ queryKey: tenantQueryKey(organizationId, 'dashboard', 'purchase-orders') }); };
  const failure = (error: unknown) => notify(describeError(error), 'error');

  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => editing
      ? purchaseApi.update(editing.id, buildPurchaseOrderPayload(values), editing.version)
      : purchaseApi.create(buildPurchaseOrderPayload(values), createKey),
    onSuccess: () => { setCreateKey(crypto.randomUUID()); setEditing(undefined); success('Ordem de compra salva.'); },
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
      receiptKey),
    onSuccess: (receipt) => {
      setReceiptKey(crypto.randomUUID());
      if (receiving) setReceived({ orderId: receiving.id, receiptId: receipt.id });
      setReceiving(null);
      success('Mercadoria recebida e estoque atualizado.');
    },
    onError: failure,
  });
  const rejectReceipt = useMutation({
    mutationFn: (values: Record<string, unknown>) => purchaseApi.rejectReceipt(
      rejecting!.id, String(values.motivo ?? '').trim(), rejecting!.version),
    onSuccess: () => { setRejecting(null); success('Entrega rejeitada sem movimentar o estoque.'); },
    onError: failure,
  });
  const receiptFields = useMemo<FieldConfig[]>(() => receiving ? [
    { name: 'localEstoqueId', label: 'Local de estoque', type: 'reference', required: true,
      reference: { basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true } } },
    { name: 'observacao', label: 'Observação do recebimento', type: 'textarea',
      helperText: 'Ao confirmar, todos os produtos e quantidades da compra entram no estoque. Se houver qualquer divergência, rejeite a entrega.' },
    { name: 'itens', label: 'Itens da entrega integral', type: 'subitems', disabledWhen: () => true, subFields: [
      { name: 'itemOrdemCompraId', label: 'Item pendente', type: 'select', required: true, cols: 8,
        options: receiving.itens.filter((item) => item.quantidadePendente > 0).map((item) => ({
          value: String(item.id), label: `${item.produtoNome} - pendente ${formatNumber(item.quantidadePendente)}`,
        })) },
      { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 3, step: 0.001, min: 0.001 },
    ] },
  ] : [], [receiving]);

  const freightLabel = (value?: PurchaseOrder['tipoFrete']) => {
    if (value === 'CIF') return 'CIF (fornecedor paga)';
    if (value === 'FOB') return 'FOB (comprador paga)';
    return 'Sem frete';
  };

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
    ...(canManage && order.status === 'APROVADA' ? [{
      key: 'receive', label: 'Receber mercadoria', icon: <InventoryOutlinedIcon fontSize="small" />,
      onClick: () => setReceiving(order),
    }, {
      key: 'reject-receipt', label: 'Rejeitar entrega', icon: <CancelOutlinedIcon fontSize="small" />,
      danger: true, onClick: () => setRejecting(order),
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
    <PageHeader title="Compras" subtitle="Registro fiscal da compra e confirmação integral da entrega."
      count={list.data?.totalElements}
      action={canManage ? <PrimaryButton startIcon={<AddOutlinedIcon />}
        onClick={() => setEditing(null)}>Nova ordem</PrimaryButton> : undefined} />
    {linked.requested && linked.isLoading && <ListingSkeleton />}
    {linked.requested && linked.isError && <ErrorState message={describeError(linked.error)} onRetry={() => void linked.refetch()} />}
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
      <TableCell>Nota</TableCell><TableCell>Fornecedor</TableCell><TableCell>Data da ordem</TableCell>
      <TableCell>Situação</TableCell><TableCell align="right">Total</TableCell><TableCell>Ações</TableCell>
    </TableRow></TableHead><TableBody>{orders.map((order) => <TableRow key={order.id} hover
      onClick={() => setDetails(order)} sx={{ cursor: 'pointer' }}>
      <TableCell>{order.numeroNota} · série {order.serieNota} · modelo {order.modeloNota}</TableCell><TableCell>{order.fornecedorNome}</TableCell>
      <TableCell>{formatDate(order.dataEmissao)}</TableCell>
      <TableCell><Chip size="small" label={formatStatusLabel(order.status)} color={statusColor(order.status)} /></TableCell>
      <TableCell align="right">{formatCurrency(order.valorTotal)}</TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
          {canManage && order.status === 'APROVADA' && (
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
        getTitle={(order) => `Nota ${order.numeroNota}`}
        getFields={(order) => [
          { label: 'Fornecedor', value: order.fornecedorNome },
          { label: 'Situação', value: <Chip size="small" label={formatStatusLabel(order.status)} color={statusColor(order.status)} /> },
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
      confirmDiscard maxWidth="lg"
      onClose={() => setEditing(undefined)} onSubmit={(values) => save.mutate(values)} />
    <ConfirmDialog open={!!approving} title="Aprovar ordem" message="Após aprovada, os itens não poderão mais ser alterados."
      confirmLabel="Aprovar" loading={approve.isPending} onClose={() => setApproving(null)}
      onConfirm={() => approving && approve.mutate(approving)} />
    <ResourceFormDialog open={!!cancelling} title="Cancelar ordem" fields={[
      { name: 'motivo', label: 'Motivo', type: 'textarea', required: true },
    ]} submitting={cancel.isPending} onClose={() => setCancelling(null)} onSubmit={(values) => cancel.mutate(values)} />
    <ResourceFormDialog open={!!rejecting} title="Rejeitar entrega completa" submitLabel="Rejeitar entrega" fields={[
      { name: 'motivo', label: 'Motivo da rejeição', type: 'textarea', required: true,
        helperText: 'Nenhum item será lançado no estoque.' },
    ]} submitting={rejectReceipt.isPending} onClose={() => setRejecting(null)}
      onSubmit={(values) => rejectReceipt.mutate(values)} />
    <ResourceFormDialog open={!!receiving} title={`Receber nota ${receiving?.numeroNota ?? ''}`} submitLabel="Receber toda a entrega" fields={receiptFields}
      initialValues={receiving?.localEstoqueEntregaId
        ? { localEstoqueId: receiving.localEstoqueEntregaId,
          itens: receiving.itens.map((item) => ({ itemOrdemCompraId: item.id, quantidade: item.quantidadePendente })) }
        : receiving ? { itens: receiving.itens.map((item) => ({ itemOrdemCompraId: item.id, quantidade: item.quantidadePendente })) } : null}
      submitting={receive.isPending} onClose={() => setReceiving(null)} onSubmit={(values) => receive.mutate(values)} />
    <AppDialog open={!!received} onClose={() => setReceived(null)} title="Mercadoria recebida"
      maxWidth="xs" contentDividers={false} actions={<>
        <Button onClick={() => setReceived(null)}>Agora não</Button>
        {received && (
          <Button variant="contained" component={RouterLink}
            to={inboundNoteFromReceiptPath(received.orderId, received.receiptId)}
            startIcon={<NoteAddOutlinedIcon />}>
            Gerar nota agora
          </Button>
        )}
      </>}>
        <Typography>
          O estoque já foi atualizado. Se a nota do fornecedor está em mãos, você pode lançá-la agora.
        </Typography>
    </AppDialog>
    <DetailDrawer open={!!details} title={`Compra · nota ${details?.numeroNota ?? ''}`}
      width="wide"
      subtitle={details?.fornecedorNome} onClose={closeDetails}
      actions={details && canManage ? <Stack direction="row" spacing={1}>
        {details.status === 'APROVADA' && <PrimaryButton
          startIcon={<InventoryOutlinedIcon />} onClick={() => { setReceiving(details); closeDetails(); }}>Receber mercadoria</PrimaryButton>}
        {details.status === 'RASCUNHO' && <PrimaryButton startIcon={<CheckCircleOutlineIcon />}
          onClick={() => { setApproving(details); closeDetails(); }}>Aprovar para receber</PrimaryButton>}
      </Stack> : undefined}>
        {details && <Stack spacing={2.5}>
          <PurchaseProgress order={details} documents={documents.data} />
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>Dados da compra</Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
              gap: 2,
            }}>
              <Box sx={{ gridColumn: { sm: 'span 2' } }}>
                <DetailValue label="Fornecedor" strong>{details.fornecedorNome}</DetailValue>
              </Box>
              <DetailValue label="Data da ordem">{formatDate(details.dataEmissao)}</DetailValue>
              <DetailValue label="Previsão de entrega">
                {details.previsaoEntrega ? formatDate(details.previsaoEntrega) : 'Não informada'}
              </DetailValue>
              <DetailValue label="Situação">
                <Chip size="small" label={formatStatusLabel(details.status)} color={statusColor(details.status)} />
              </DetailValue>
              <DetailValue label="Comprador">{details.compradorNome ?? 'Não informado'}</DetailValue>
              <DetailValue label="Referência do fornecedor">
                {details.referenciaFornecedor ?? 'Não informada'}
              </DetailValue>
            </Box>
          </Card>

          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>Entrega e condições</Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' },
              gap: 2,
            }}>
              <DetailValue label="Condição de pagamento">
                {details.condicaoPagamentoNome ?? 'Não informada'}
              </DetailValue>
              <DetailValue label="Local previsto de entrega">
                {details.localEstoqueEntregaNome ?? 'Não informado'}
              </DetailValue>
              <DetailValue label="Transportadora">{details.transportadoraNome ?? 'Não informada'}</DetailValue>
              <DetailValue label="Responsável pelo frete">{freightLabel(details.tipoFrete)}</DetailValue>
            </Box>
          </Card>

          <Box>
            <Typography variant="h6" gutterBottom>Itens comprados</Typography>
            <Stack spacing={1.5}>
              {details.itens.map((item) => <Card key={item.id} component="article"
                aria-label={`Item ${item.produtoNome}`} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" sx={{ mb: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700}>{item.produtoNome}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.codigoProdutoFornecedor
                        ? `Código no fornecedor: ${item.codigoProdutoFornecedor}`
                        : `Produto #${item.produtoId}`}
                    </Typography>
                  </Box>
                  <Chip size="small" variant="outlined" label={`Total ${formatCurrency(item.valorTotal)}`} />
                </Stack>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
                  gap: 2,
                  pb: 2,
                  mb: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                }}>
                  <DetailValue label="Quantidade pedida">{formatNumber(item.quantidadePedida)}</DetailValue>
                  <DetailValue label="Quantidade recebida">{formatNumber(item.quantidadeRecebida)}</DetailValue>
                  <DetailValue label="Quantidade pendente">{formatNumber(item.quantidadePendente)}</DetailValue>
                </Box>
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' },
                  gap: 2,
                }}>
                  <DetailValue label="Valor unitário">{formatCurrency(item.valorUnitario)}</DetailValue>
                  <DetailValue label="Desconto">{formatCurrency(item.valorDesconto)}</DetailValue>
                  <DetailValue label="Despesas rateadas">
                    {formatCurrency((item.rateioFrete ?? 0) + (item.rateioSeguro ?? 0) + (item.rateioOutrasDespesas ?? 0))}
                  </DetailValue>
                  <DetailValue label="Custo unitário final" strong>
                    {formatCurrency(item.custoUnitarioFinal ?? item.valorUnitario)}
                  </DetailValue>
                </Box>
              </Card>)}
            </Stack>
          </Box>

          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>Totais da compra</Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(5, minmax(0, 1fr))' },
              gap: 2,
            }}>
              <DetailValue label="Subtotal">{formatCurrency(details.subtotal)}</DetailValue>
              <DetailValue label="Frete">{formatCurrency(details.valorFrete)}</DetailValue>
              <DetailValue label="Seguro">{formatCurrency(details.valorSeguro ?? 0)}</DetailValue>
              <DetailValue label="Outras despesas">{formatCurrency(details.outrasDespesas ?? 0)}</DetailValue>
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                <DetailValue label="Total da ordem" strong>{formatCurrency(details.valorTotal)}</DetailValue>
              </Box>
            </Box>
          </Card>

          {details.observacao && <Box><Typography variant="overline" color="text.secondary">Observação</Typography>
            <Typography>{details.observacao}</Typography></Box>}
          {details.observacaoInterna && <Box><Typography variant="overline" color="text.secondary">Observação interna</Typography>
            <Typography>{details.observacaoInterna}</Typography></Box>}
          {details.motivoCancelamento && <Alert severity="error">
            {details.status === 'REJEITADA' ? 'Motivo da rejeição' : 'Motivo do cancelamento'}: {details.motivoCancelamento}
          </Alert>}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="overline" color="text.secondary">Recebimentos</Typography>
              <Button component={RouterLink} to="/app/recebimentos" size="small">Ver todos</Button>
            </Stack>
            {receipts.isLoading && <Typography variant="body2">Carregando recebimentos…</Typography>}
            {receipts.isError && <ErrorState message={describeError(receipts.error)} onRetry={() => void receipts.refetch()} />}
            {receipts.data?.length === 0 && <Typography variant="body2" color="text.secondary">Nenhum recebimento registrado.</Typography>}
            <Stack spacing={1}>
              {receipts.data?.map((receipt: PurchaseReceipt) => (
                <Card key={receipt.id} variant="outlined"
                  ref={(node: HTMLDivElement | null) => { if (receipt.id === receiptFromUrl) node?.scrollIntoView?.({ block: 'nearest' }); }}
                  sx={{ p: 1.5, borderColor: receipt.id === receiptFromUrl ? 'primary.main' : undefined }}>
                  {receipt.id === receiptFromUrl && <Typography variant="caption" color="primary">Recebimento selecionado #{receipt.id}</Typography>}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'center' }}>
                    <Typography variant="body2">
                      {receipt.localEstoqueNome} · {formatDateTime(receipt.recebidoEm)} · {receipt.atorNome}
                    </Typography>
                    {permissions.includes('fiscal:read') && receiptNote(receipt.id) ? <Button component={RouterLink}
                      to={`/app/notas-entrada/${receiptNote(receipt.id)!.id}`}>Ver nota {receiptNote(receipt.id)!.numero}</Button>
                      : permissions.includes('fiscal:manage') && <Button
                      size="small"
                      variant="contained"
                      component={RouterLink}
                      to={inboundNoteFromReceiptPath(details.id, receipt.id)}
                      startIcon={<NoteAddOutlinedIcon />}
                    >
                      Gerar nota de entrada
                    </Button>}
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Notas de entrada vinculadas</Typography>
            {documents.isLoading && <Typography>Carregando documentos…</Typography>}
            {documents.isError && <ErrorState message={describeError(documents.error)} onRetry={() => void documents.refetch()} />}
            {(!permissions.includes('fiscal:read') || documents.data?.notas === null) && <Typography color="text.secondary">Seu perfil não permite consultar notas.</Typography>}
            {permissions.includes('fiscal:read') && documents.data?.notas?.length === 0 && <Typography color="text.secondary">Nenhuma nota registrada para os recebimentos desta compra.</Typography>}
            {permissions.includes('fiscal:read') && documents.data?.notas?.map((note) => <Stack key={note.id} direction="row" justifyContent="space-between" alignItems="center">
              <Button component={RouterLink} to={`/app/notas-entrada/${note.id}`}>Nota {note.numero}</Button>
              <Typography>{formatStatusLabel(note.situacao)} · {formatCurrency(note.valorTotal)}</Typography>
            </Stack>)}
          </Box>
          <Box>
            <Typography variant="overline" color="text.secondary">Contas a pagar desta compra</Typography>
            {(!permissions.includes('finance:read') || documents.data?.contasPagar === null) && <Typography color="text.secondary">Seu perfil não permite consultar contas a pagar.</Typography>}
            {permissions.includes('finance:read') && documents.data?.contasPagar?.length === 0 && <Typography color="text.secondary">As contas serão geradas ao confirmar as notas dos recebimentos.</Typography>}
            {permissions.includes('finance:read') && documents.data?.contasPagar?.map((account) => <Stack key={account.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
              <Button component={RouterLink} to={`/app/contas-pagar?detail=${account.id}`}>
                {account.notaEntradaNumero ? `Nota ${account.notaEntradaNumero} · ` : ''}Parcela {account.numeroParcela ?? 1}/{account.totalParcelas ?? 1}
              </Button>
              <Typography variant="body2">{formatDate(account.dataVencimento)} · Saldo {formatCurrency(account.saldo ?? (account.situacao === 'CANCELADA' ? 0 : Math.max(0, account.valorTotal - (account.valorPago ?? 0))))} · {formatStatusLabel(account.situacao)}</Typography>
            </Stack>)}
          </Box>
        </Stack>}
    </DetailDrawer>
    <AppDialog open={!!history} onClose={() => setHistory(null)} title={`Recebimentos de ${history?.numero ?? ''}`}
      maxWidth="md" fullScreenOnMobile actions={<>
        <Button component={RouterLink} to="/app/recebimentos">Abrir recebimentos</Button>
        <Button onClick={() => setHistory(null)}>Fechar</Button>
      </>}>
        {receipts.isLoading && <CircularProgress />}{receipts.isError && <Alert severity="error">{describeError(receipts.error)}</Alert>}
        {receipts.data?.length === 0 && <Typography color="text.secondary">Nenhum recebimento registrado.</Typography>}
        {receipts.data?.map((receipt: PurchaseReceipt) => <Card key={receipt.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1} alignItems={{ sm: 'center' }}>
            <Box>
              <Typography fontWeight={700}>#{receipt.id} - {receipt.localEstoqueNome}</Typography>
              <Typography variant="body2" color="text.secondary">{formatDateTime(receipt.recebidoEm)} por {receipt.atorNome}</Typography>
              {receipt.itens.map((item) => <Typography key={item.id} variant="body2">{item.produtoNome}: {formatNumber(item.quantidade)} - movimento #{item.movimentoEstoqueId}</Typography>)}
            </Box>
            {history && permissions.includes('fiscal:read') && receiptNote(receipt.id) ? <Button component={RouterLink}
              to={`/app/notas-entrada/${receiptNote(receipt.id)!.id}`}>Ver nota {receiptNote(receipt.id)!.numero}</Button>
              : history && permissions.includes('fiscal:manage') && (
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
    </AppDialog>
  </Box>;
}
