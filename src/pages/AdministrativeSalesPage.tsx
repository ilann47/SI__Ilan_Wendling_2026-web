import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Alert, Box, Button, Card, Chip, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { ListingCards } from '../components/listing/ListingCards';
import { SecondaryActionsMenu, type SecondaryAction } from '../components/listing/SecondaryActionsMenu';
import { DetailDrawer } from '../components/listing/DetailDrawer';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { RelatedItemsTable } from '../components/listing/ResourceDetailBody';
import { SaleDocuments } from '../components/sales/SaleDocuments';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLinkedDetail } from '../hooks/useLinkedDetail';
import { buildAdministrativeSalePayload, administrativeSalesApi,
  type AdministrativeSale } from '../api/administrativeSales';
import { describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import type { FieldConfig } from '../components/form/fieldConfig';
import { useSnackbar } from '../components/SnackbarProvider';
import { formatCurrency, formatDate, formatStatusLabel } from '../utils/format';

const itemFields: FieldConfig[] = [
  { name: 'produtoId', label: 'Produto', type: 'reference', required: true, cols: 4,
    reference: { basePath: '/api/produtos', labelField: 'nome', params: { ativo: true } } },
  { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 2, step: 0.001, min: 0.001 },
  { name: 'valorUnitario', label: 'Valor unitário', type: 'money', required: true, cols: 3 },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 3 },
];
const fields: FieldConfig[] = [
  { name: 'numero', label: 'Número', type: 'text', required: true, cols: 4 },
  { name: 'clienteId', label: 'Cliente', type: 'reference', required: true, cols: 8,
    reference: { basePath: '/api/clientes', labelField: 'nome', params: { ativo: true } } },
  { name: 'localEstoqueId', label: 'Local de estoque', type: 'reference', required: true, cols: 6,
    reference: { basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true } } },
  { name: 'condicaoPagamentoId', label: 'Condição de pagamento', type: 'reference', cols: 6,
    reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome', params: { ativo: true } } },
  { name: 'dataEmissao', label: 'Emissão', type: 'date', cols: 4 },
  { name: 'moeda', label: 'Moeda', type: 'text', cols: 2, defaultValue: 'BRL' },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 3, defaultValue: 0 },
  { name: 'observacao', label: 'Observação', type: 'textarea' },
  { name: 'itens', label: 'Itens do pedido', type: 'subitems', subFields: itemFields },
];

function toForm(sale: AdministrativeSale) {
  return { numero: sale.numero, clienteId: sale.clienteId,
    condicaoPagamentoId: sale.condicaoPagamentoId ?? '', localEstoqueId: sale.localEstoqueId,
    dataEmissao: sale.dataEmissao, moeda: sale.moeda, valorDesconto: sale.valorDesconto,
    observacao: sale.observacao ?? '', itens: sale.itens.map((item) => ({
      produtoId: item.produtoId, quantidade: item.quantidade,
      valorUnitario: item.valorUnitario, valorDesconto: item.valorDesconto,
    })) };
}

export function AdministrativeSalesPage() {
  const { activeOrganization, permissions } = useAuth();
  const orgId = activeOrganization?.organizationId;
  return <SalesWorkspace key={orgId ?? 'global'} orgId={orgId} permissions={permissions} />;
}

function SalesWorkspace({ orgId, permissions }: { orgId?: number; permissions: string[] }) {
  const canManage = permissions.includes('sales:manage');
  const client = useQueryClient(); const { notify } = useSnackbar();
  const [editing, setEditing] = useState<AdministrativeSale | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<AdministrativeSale | null>(null);
  const [cancelling, setCancelling] = useState<AdministrativeSale | null>(null);
  const [, setSearchParams] = useSearchParams();
  const linked = useLinkedDetail(orgId, 'administrative-sales', administrativeSalesApi.get, permissions.includes('sales:read'));
  const details = linked.data;
  const setDetails = (sale: AdministrativeSale) => setSearchParams((current) => {
    const next = new URLSearchParams(current); next.set('detail', String(sale.id)); return next;
  });
  const createIntent = useRef<{ fingerprint: string; key: string } | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const queryKey = orgId ? tenantQueryKey(orgId, 'administrative-sales', page, search) : ['administrative-sales'];
  const list = useQuery({ queryKey, queryFn: () => administrativeSalesApi.list({
    page, size: 10, sort: 'dataEmissao,desc', ...(search.trim() ? { numero: search.trim() } : {}),
  }), enabled: !!orgId && permissions.includes('sales:read') });
  const done = (message: string, updated?: AdministrativeSale) => { notify(message, 'success');
    if (orgId) {
      if (updated) client.setQueryData(tenantQueryKey(orgId, 'linked-detail', 'administrative-sales', updated.id), updated);
      void client.invalidateQueries({ queryKey: tenantQueryKey(orgId, 'administrative-sales') });
      void client.invalidateQueries({ queryKey: tenantQueryKey(orgId, 'dashboard') });
      void client.invalidateQueries({ queryKey: tenantQueryKey(orgId, 'stock') });
      void client.invalidateQueries({ queryKey: tenantQueryKey(orgId, 'financial-accounts') });
      void client.invalidateQueries({ queryKey: tenantQueryKey(orgId, 'financial-summary') });
    } };
  const fail = (error: unknown) => notify(describeError(error), 'error');
  const save = useMutation({ mutationFn: (values: Record<string, unknown>) => {
    const body = buildAdministrativeSalePayload(values);
    if (editing) return administrativeSalesApi.update(editing.id, body, editing.version);
    const fingerprint = JSON.stringify(body);
    if (!createIntent.current || createIntent.current.fingerprint !== fingerprint) {
      createIntent.current = { fingerprint, key: crypto.randomUUID() };
    }
    return administrativeSalesApi.create(body, createIntent.current.key);
  },
  onSuccess: (updated) => { setEditing(undefined); createIntent.current = null; setDetails(updated); done('Pedido salvo.', updated); }, onError: fail });
  const confirm = useMutation({ mutationFn: (sale: AdministrativeSale) =>
    administrativeSalesApi.confirm(sale.id, sale.version), onSuccess: (updated) => {
      setConfirming(null); done('Venda confirmada; estoque e financeiro atualizados.', updated); }, onError: fail });
  const cancel = useMutation({ mutationFn: (values: Record<string, unknown>) =>
    administrativeSalesApi.cancel(cancelling!.id, String(values.motivo ?? '').trim(),
      cancelling!.version), onSuccess: (updated) => { setCancelling(null); done('Pedido cancelado.', updated); }, onError: fail });

  const actions = (sale: AdministrativeSale): SecondaryAction[] => [
    { key: 'detail', label: 'Ver pedido', icon: <VisibilityOutlinedIcon />, onClick: () => setDetails(sale) },
    ...(canManage && sale.status === 'RASCUNHO' ? [
      { key: 'edit', label: 'Editar pedido', icon: <EditOutlinedIcon />, onClick: () => setEditing(sale) },
      { key: 'confirm', label: 'Confirmar pedido', icon: <CheckCircleOutlineIcon />, onClick: () => setConfirming(sale) },
      { key: 'cancel', label: 'Cancelar pedido', icon: <CancelOutlinedIcon />, danger: true, onClick: () => setCancelling(sale) },
    ] : []),
  ];

  if (!orgId || !permissions.includes('sales:read')) {
    return <Alert severity="warning">Seu contexto não possui permissão comercial.</Alert>;
  }
  const sales = list.data?.content ?? [];
  return <Box><PageHeader title="Pedidos de venda"
    subtitle="Do pedido à nota de saída, com estoque e recebimento no mesmo contexto."
    count={list.data?.totalElements}
    action={canManage ? <PrimaryButton startIcon={<AddOutlinedIcon />}
      onClick={() => setEditing(null)}>Novo pedido</PrimaryButton> : undefined} />
    <ListingToolbar searchValue={search} searchLabel="Buscar por número"
      onSearchChange={(value) => { setSearch(value); setPage(0); }} />
    {list.isLoading && <ListingSkeleton />}
    {list.isError && <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />}
    {!list.isLoading && !list.isError && sales.length === 0 && (
      <EmptyState title="Nenhum pedido de venda encontrado" description="Registre um pedido ou ajuste a busca." />
    )}
    {sales.length > 0 && <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" stickyHeader><TableHead><TableRow>
      <TableCell>Número</TableCell><TableCell>Cliente</TableCell><TableCell>Emissão</TableCell>
      <TableCell>Situação</TableCell><TableCell align="right">Total</TableCell><TableCell>Ações</TableCell>
    </TableRow></TableHead><TableBody>{sales.map((sale) => <TableRow key={sale.id} hover
      onClick={() => setDetails(sale)} sx={{ cursor: 'pointer' }}>
      <TableCell><Button size="small" onClick={(event) => { event.stopPropagation(); setDetails(sale); }}>{sale.numero}</Button></TableCell><TableCell>{sale.clienteNome}</TableCell>
      <TableCell>{formatDate(sale.dataEmissao)}</TableCell><TableCell><Chip size="small"
        color={sale.status === 'CONFIRMADA' ? 'success' : sale.status === 'CANCELADA' ? 'error' : 'default'}
        label={formatStatusLabel(sale.status)} /></TableCell><TableCell align="right">{formatCurrency(sale.valorTotal)}</TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}><SecondaryActionsMenu actions={actions(sale)} /></TableCell>
    </TableRow>)}</TableBody></Table></TableContainer></Card>}
    <ListingCards rows={sales} getKey={(sale) => sale.id} getTitle={(sale) => sale.numero}
      getFields={(sale) => [{ label: 'Cliente', value: sale.clienteNome },
        { label: 'Emissão', value: formatDate(sale.dataEmissao) },
        { label: 'Situação', value: formatStatusLabel(sale.status) }, { label: 'Total', value: formatCurrency(sale.valorTotal) }]}
      getActions={actions} onOpen={setDetails} />
    {list.data && list.data.totalPages > 1 && (
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
        <Button disabled={list.data.last} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
      </Stack>
    )}
    <DetailDrawer open={linked.requested} title={details ? `Pedido ${details.numero}` : 'Pedido de venda'} subtitle={details?.clienteNome}
      onClose={linked.close}
      actions={details && canManage && details.status === 'RASCUNHO' ? <Stack direction="row" gap={1}>
        <Button variant="contained" onClick={() => setConfirming(details)}>Confirmar pedido</Button>
        <SecondaryActionsMenu actions={actions(details).filter((action) => action.key === 'edit' || action.key === 'cancel')} />
      </Stack> : undefined}>
      {linked.isPending && <ListingSkeleton />}
      {linked.isError && <ErrorState message={describeError(linked.error)} onRetry={() => void linked.refetch()} />}
      {details && <Stack spacing={2.5}>
        <Box><Typography variant="overline" color="text.secondary">Situação</Typography>
          <Box><Chip size="small" label={formatStatusLabel(details.status)}
            color={details.status === 'CONFIRMADA' ? 'success' : details.status === 'CANCELADA' ? 'error' : 'default'} /></Box></Box>
        <Box sx={{ overflowX: 'auto' }}><RelatedItemsTable title="Itens do pedido" items={details.itens} /></Box>
        <Box><Typography variant="body2">Subtotal: {formatCurrency(details.subtotal)}</Typography>
          <Typography variant="body2">Desconto do pedido: {formatCurrency(details.valorDesconto)}</Typography>
          <Typography variant="overline" color="text.secondary">Total</Typography>
          <Typography variant="h6">{formatCurrency(details.valorTotal)}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Condição de pagamento</Typography>
          <Typography>{details.condicaoPagamentoNome ?? 'À vista'}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Local de estoque</Typography>
          <Typography>{details.localEstoqueNome}</Typography></Box>
        <Alert severity="info">{details.status === 'CONFIRMADA'
          ? 'Venda confirmada: estoque baixado e contas a receber geradas. A nota vinculada não repetirá esses lançamentos.'
          : details.status === 'RASCUNHO' ? 'O pedido ainda não baixou estoque nem gerou contas a receber.' : 'Pedido cancelado.'}</Alert>
        {details.observacao && <Typography variant="body2">{details.observacao}</Typography>}
        {details.motivoCancelamento && <Typography variant="body2">Motivo do cancelamento: {details.motivoCancelamento}</Typography>}
        <SaleDocuments key={details.id} sale={details} organizationId={orgId} permissions={permissions} />
      </Stack>}
    </DetailDrawer>
    <ResourceFormDialog open={editing !== undefined} title={editing ? 'Editar pedido' : 'Novo pedido'}
      fields={fields} initialValues={editing ? toForm(editing) : null} submitting={save.isPending}
      onClose={() => setEditing(undefined)} onSubmit={(values) => save.mutate(values)} />
    <ConfirmDialog open={!!confirming} title="Confirmar venda"
      message="A confirmação baixa o estoque no local informado e gera as contas a receber conforme as condições do pedido. Gerar a nota depois não repetirá esses lançamentos."
      confirmLabel="Confirmar venda" loading={confirm.isPending} onClose={() => !confirm.isPending && setConfirming(null)}
      onConfirm={() => confirming && confirm.mutate(confirming)} />
    <ResourceFormDialog open={!!cancelling} title="Cancelar pedido" fields={[
      { name: 'motivo', label: 'Motivo', type: 'textarea', required: true },
    ]} submitting={cancel.isPending} onClose={() => setCancelling(null)}
      onSubmit={(values) => cancel.mutate(values)} />
  </Box>;
}
