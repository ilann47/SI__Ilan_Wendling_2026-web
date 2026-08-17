import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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
  { name: 'valorUnitario', label: 'Valor unitario', type: 'money', required: true, cols: 2 },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 2 },
];

const orderFields: FieldConfig[] = [
  { name: 'numero', label: 'Numero', type: 'text', required: true, cols: 4 },
  { name: 'fornecedorId', label: 'Fornecedor', type: 'reference', required: true, cols: 8,
    reference: { basePath: '/api/fornecedores', labelField: 'nome', params: { ativo: true } } },
  { name: 'dataEmissao', label: 'Emissao', type: 'date', cols: 3 },
  { name: 'previsaoEntrega', label: 'Previsao de entrega', type: 'date', cols: 3 },
  { name: 'moeda', label: 'Moeda', type: 'text', cols: 2, defaultValue: 'BRL' },
  { name: 'valorFrete', label: 'Frete', type: 'money', cols: 2, defaultValue: 0 },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 2, defaultValue: 0 },
  { name: 'observacao', label: 'Observacao', type: 'textarea' },
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
  const [details, setDetails] = useState<PurchaseOrder | null>(null);
  const [history, setHistory] = useState<PurchaseOrder | null>(null);
  const canManage = permissions.includes('purchases:manage');
  const list = useQuery({
    queryKey: organizationId ? key(organizationId, 'list') : ['purchase-orders'],
    queryFn: () => purchaseApi.list({ size: 100, sort: 'dataEmissao,desc' }),
    enabled: !!organizationId && permissions.includes('purchases:read'),
  });
  const receipts = useQuery({
    queryKey: organizationId && history ? key(organizationId, history.id, 'receipts') : ['receipts'],
    queryFn: () => purchaseApi.receipts(history!.id), enabled: !!organizationId && !!history,
  });
  const invalidate = () => organizationId
    && queryClient.invalidateQueries({ queryKey: key(organizationId) });
  const success = (message: string) => { notify(message, 'success'); void invalidate(); };
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
    onSuccess: () => { setReceiving(null); success('Recebimento registrado no estoque.'); },
    onError: failure,
  });
  const receiptFields = useMemo<FieldConfig[]>(() => receiving ? [
    { name: 'localEstoqueId', label: 'Local de estoque', type: 'reference', required: true,
      reference: { basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true } } },
    { name: 'observacao', label: 'Observacao do recebimento', type: 'textarea' },
    { name: 'itens', label: 'Itens recebidos', type: 'subitems', subFields: [
      { name: 'itemOrdemCompraId', label: 'Item pendente', type: 'select', required: true, cols: 8,
        options: receiving.itens.filter((item) => item.quantidadePendente > 0).map((item) => ({
          value: String(item.id), label: `${item.produtoNome} - pendente ${formatNumber(item.quantidadePendente)}`,
        })) },
      { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 3, step: 0.001 },
    ] },
  ] : [], [receiving]);

  if (!organizationId || !permissions.includes('purchases:read')) {
    return <Alert severity="warning">Seu contexto nao possui permissao de compras.</Alert>;
  }

  return <Box>
    <PageHeader title="Ordens de Compra" subtitle="Aprovacao e recebimentos parciais integrados a razao de estoque."
      action={canManage ? <Button variant="contained" startIcon={<AddOutlinedIcon />}
        onClick={() => setEditing(null)}>Nova ordem</Button> : undefined} />
    {list.isLoading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}
    {list.isError && <Alert severity="error">{describeError(list.error)}</Alert>}
    {list.data && <Card><TableContainer><Table size="small"><TableHead><TableRow>
      <TableCell>Numero</TableCell><TableCell>Fornecedor</TableCell><TableCell>Emissao</TableCell>
      <TableCell>Status</TableCell><TableCell align="right">Total</TableCell><TableCell>Acoes</TableCell>
    </TableRow></TableHead><TableBody>{list.data.content.map((order) => <TableRow key={order.id} hover>
      <TableCell>{order.numero}</TableCell><TableCell>{order.fornecedorNome}</TableCell>
      <TableCell>{formatDate(order.dataEmissao)}</TableCell>
      <TableCell><Chip size="small" label={order.status.replace(/_/g, ' ')} color={statusColor(order.status)} /></TableCell>
      <TableCell align="right">{formatCurrency(order.valorTotal)}</TableCell>
      <TableCell><Stack direction="row" spacing={0.5} flexWrap="wrap">
        {canManage && order.status === 'RASCUNHO' && <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(order)}>Editar</Button>}
        {canManage && order.status === 'RASCUNHO' && <Button size="small" color="success" startIcon={<CheckCircleOutlineIcon />} onClick={() => setApproving(order)}>Aprovar</Button>}
        {canManage && ['RASCUNHO', 'APROVADA'].includes(order.status) && <Button size="small" color="error" startIcon={<CancelOutlinedIcon />} onClick={() => setCancelling(order)}>Cancelar</Button>}
        {canManage && ['APROVADA', 'PARCIALMENTE_RECEBIDA'].includes(order.status) && <Button size="small" startIcon={<InventoryOutlinedIcon />} onClick={() => setReceiving(order)}>Receber</Button>}
        <Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => setDetails(order)}>Detalhes</Button>
        <Button size="small" startIcon={<HistoryOutlinedIcon />} onClick={() => setHistory(order)}>Historico</Button>
      </Stack></TableCell>
    </TableRow>)}</TableBody></Table></TableContainer></Card>}
    <ResourceFormDialog open={editing !== undefined} title={editing ? 'Editar ordem de compra' : 'Nova ordem de compra'}
      fields={orderFields} initialValues={editing ? toForm(editing) : null} submitting={save.isPending}
      onClose={() => setEditing(undefined)} onSubmit={(values) => save.mutate(values)} />
    <ConfirmDialog open={!!approving} title="Aprovar ordem" message="Apos aprovada, os itens nao poderao mais ser alterados."
      confirmLabel="Aprovar" loading={approve.isPending} onClose={() => setApproving(null)}
      onConfirm={() => approving && approve.mutate(approving)} />
    <ResourceFormDialog open={!!cancelling} title="Cancelar ordem" fields={[
      { name: 'motivo', label: 'Motivo', type: 'textarea', required: true },
    ]} submitting={cancel.isPending} onClose={() => setCancelling(null)} onSubmit={(values) => cancel.mutate(values)} />
    <ResourceFormDialog open={!!receiving} title={`Receber ${receiving?.numero ?? ''}`} fields={receiptFields}
      submitting={receive.isPending} onClose={() => setReceiving(null)} onSubmit={(values) => receive.mutate(values)} />
    <Dialog open={!!details} onClose={() => setDetails(null)} maxWidth="lg" fullWidth>
      <DialogTitle>Detalhes da ordem {details?.numero}</DialogTitle><DialogContent dividers>
        {details && <Stack spacing={3}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between">
            <Box>
              <Typography variant="overline" color="text.secondary">Fornecedor</Typography>
              <Typography fontWeight={700}>{details.fornecedorNome}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Emissao</Typography>
              <Typography>{formatDate(details.dataEmissao)}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Previsao de entrega</Typography>
              <Typography>{details.previsaoEntrega ? formatDate(details.previsaoEntrega) : 'Nao informada'}</Typography>
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Status</Typography>
              <Box><Chip size="small" label={details.status.replace(/_/g, ' ')} color={statusColor(details.status)} /></Box>
            </Box>
          </Stack>

          <Box>
            <Typography variant="h6" gutterBottom>Itens comprados</Typography>
            <TableContainer component={Card} variant="outlined"><Table size="small">
              <TableHead><TableRow>
                <TableCell>Produto</TableCell><TableCell align="right">Pedida</TableCell>
                <TableCell align="right">Recebida</TableCell><TableCell align="right">Pendente</TableCell>
                <TableCell align="right">Valor unitario</TableCell><TableCell align="right">Desconto</TableCell>
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

          {details.observacao && <Box><Typography variant="overline" color="text.secondary">Observacao</Typography>
            <Typography>{details.observacao}</Typography></Box>}
          {details.motivoCancelamento && <Alert severity="error">Motivo do cancelamento: {details.motivoCancelamento}</Alert>}
        </Stack>}
      </DialogContent><DialogActions><Button onClick={() => setDetails(null)}>Fechar</Button></DialogActions>
    </Dialog>
    <Dialog open={!!history} onClose={() => setHistory(null)} maxWidth="md" fullWidth>
      <DialogTitle>Recebimentos de {history?.numero}</DialogTitle><DialogContent dividers>
        {receipts.isLoading && <CircularProgress />}{receipts.isError && <Alert severity="error">{describeError(receipts.error)}</Alert>}
        {receipts.data?.length === 0 && <Typography color="text.secondary">Nenhum recebimento registrado.</Typography>}
        {receipts.data?.map((receipt: PurchaseReceipt) => <Card key={receipt.id} variant="outlined" sx={{ mb: 2, p: 2 }}>
          <Typography fontWeight={700}>#{receipt.id} - {receipt.localEstoqueNome}</Typography>
          <Typography variant="body2" color="text.secondary">{formatDateTime(receipt.recebidoEm)} por {receipt.atorNome}</Typography>
          {receipt.itens.map((item) => <Typography key={item.id} variant="body2">{item.produtoNome}: {formatNumber(item.quantidade)} - movimento #{item.movimentoEstoqueId}</Typography>)}
        </Card>)}
      </DialogContent><DialogActions><Button onClick={() => setHistory(null)}>Fechar</Button></DialogActions>
    </Dialog>
  </Box>;
}
