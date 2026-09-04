import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Alert, Box, Button, Card, Chip, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { DetailDrawer } from '../components/listing/DetailDrawer';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { RelatedItemsTable } from '../components/listing/ResourceDetailBody';
import { UNAVAILABLE_API } from '../components/listing/listingUtils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import { formatCurrency, formatDate } from '../utils/format';

const itemFields: FieldConfig[] = [
  { name: 'produtoId', label: 'Produto', type: 'reference', required: true, cols: 4,
    reference: { basePath: '/api/produtos', labelField: 'nome', params: { ativo: true } } },
  { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 2, step: 0.001 },
  { name: 'valorUnitario', label: 'Valor unitario', type: 'money', required: true, cols: 3 },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 3 },
];
const fields: FieldConfig[] = [
  { name: 'numero', label: 'Numero', type: 'text', required: true, cols: 4 },
  { name: 'clienteId', label: 'Cliente', type: 'reference', required: true, cols: 8,
    reference: { basePath: '/api/clientes', labelField: 'nome', params: { ativo: true } } },
  { name: 'localEstoqueId', label: 'Local de estoque', type: 'reference', required: true, cols: 6,
    reference: { basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true } } },
  { name: 'condicaoPagamentoId', label: 'Condicao de pagamento', type: 'reference', cols: 6,
    reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome', params: { ativo: true } } },
  { name: 'dataEmissao', label: 'Emissao', type: 'date', cols: 4 },
  { name: 'moeda', label: 'Moeda', type: 'text', cols: 2, defaultValue: 'BRL' },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 3, defaultValue: 0 },
  { name: 'observacao', label: 'Observacao', type: 'textarea' },
  { name: 'itens', label: 'Itens da venda', type: 'subitems', subFields: itemFields },
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
  const canManage = permissions.includes('sales:manage');
  const client = useQueryClient(); const { notify } = useSnackbar();
  const [editing, setEditing] = useState<AdministrativeSale | null | undefined>(undefined);
  const [confirming, setConfirming] = useState<AdministrativeSale | null>(null);
  const [cancelling, setCancelling] = useState<AdministrativeSale | null>(null);
  const [details, setDetails] = useState<AdministrativeSale | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const queryKey = orgId ? tenantQueryKey(orgId, 'administrative-sales', page, search) : ['administrative-sales'];
  const list = useQuery({ queryKey, queryFn: () => administrativeSalesApi.list({
    page, size: 10, sort: 'dataEmissao,desc', ...(search.trim() ? { numero: search.trim() } : {}),
  }), enabled: !!orgId && permissions.includes('sales:read') });
  const done = (message: string) => { notify(message, 'success');
    void client.invalidateQueries({ queryKey }); };
  const fail = (error: unknown) => notify(describeError(error), 'error');
  const save = useMutation({ mutationFn: (values: Record<string, unknown>) => editing
    ? administrativeSalesApi.update(editing.id, buildAdministrativeSalePayload(values), editing.version)
    : administrativeSalesApi.create(buildAdministrativeSalePayload(values), crypto.randomUUID()),
  onSuccess: () => { setEditing(undefined); done('Venda administrativa salva.'); }, onError: fail });
  const confirm = useMutation({ mutationFn: (sale: AdministrativeSale) =>
    administrativeSalesApi.confirm(sale.id, sale.version), onSuccess: () => {
      setConfirming(null); done('Venda confirmada; estoque e financeiro atualizados.'); }, onError: fail });
  const cancel = useMutation({ mutationFn: (values: Record<string, unknown>) =>
    administrativeSalesApi.cancel(cancelling!.id, String(values.motivo ?? '').trim(),
      cancelling!.version), onSuccess: () => { setCancelling(null); done('Venda cancelada.'); }, onError: fail });

  if (!orgId || !permissions.includes('sales:read')) {
    return <Alert severity="warning">Seu contexto não possui permissão comercial.</Alert>;
  }
  const sales = list.data?.content ?? [];
  return <Box><PageHeader title="Vendas Administrativas"
    subtitle="Vendas fora do PDV com baixa de estoque e contas a receber."
    count={list.data?.totalElements}
    action={canManage ? <PrimaryButton startIcon={<AddOutlinedIcon />}
      onClick={() => setEditing(null)}>Nova venda</PrimaryButton> : undefined} />
    <ListingToolbar searchValue={search} searchLabel="Buscar por número"
      onSearchChange={(value) => { setSearch(value); setPage(0); }} />
    {list.isLoading && <ListingSkeleton />}
    {list.isError && <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />}
    {!list.isLoading && !list.isError && sales.length === 0 && (
      <EmptyState title="Nenhuma venda administrativa encontrada" description="Registre uma venda ou ajuste a busca." />
    )}
    {sales.length > 0 && <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" stickyHeader><TableHead><TableRow>
      <TableCell>Número</TableCell><TableCell>Cliente</TableCell><TableCell>Emissão</TableCell>
      <TableCell>Situação</TableCell><TableCell align="right">Total</TableCell><TableCell>Ações</TableCell>
    </TableRow></TableHead><TableBody>{sales.map((sale) => <TableRow key={sale.id} hover
      onClick={() => setDetails(sale)} sx={{ cursor: 'pointer' }}>
      <TableCell>{sale.numero}</TableCell><TableCell>{sale.clienteNome}</TableCell>
      <TableCell>{formatDate(sale.dataEmissao)}</TableCell><TableCell><Chip size="small"
        color={sale.status === 'CONFIRMADA' ? 'success' : sale.status === 'CANCELADA' ? 'error' : 'default'}
        label={sale.status.replace(/_/g, ' ')} /></TableCell><TableCell align="right">{formatCurrency(sale.valorTotal)}</TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}><Stack direction="row" spacing={0.5}>{canManage && sale.status === 'RASCUNHO' && <>
        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(sale)}>Editar</Button>
        <Button size="small" color="success" startIcon={<CheckCircleOutlineIcon />}
          onClick={() => setConfirming(sale)}>Confirmar</Button>
        <Button size="small" color="error" startIcon={<CancelOutlinedIcon />}
          onClick={() => setCancelling(sale)}>Cancelar</Button></>}</Stack></TableCell>
    </TableRow>)}</TableBody></Table></TableContainer></Card>}
    {sales.length > 0 && <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
      {sales.map((sale) => <Card key={sale.id} sx={{ p: 2 }} onClick={() => setDetails(sale)}>
        <Typography fontWeight={700}>{sale.numero}</Typography>
        <Typography variant="body2">{sale.clienteNome}</Typography>
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
          <Chip size="small" label={sale.status.replace(/_/g, ' ')} />
          <Typography>{formatCurrency(sale.valorTotal)}</Typography>
        </Stack>
      </Card>)}
    </Stack>}
    {list.data && list.data.totalPages > 1 && (
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
        <Button disabled={list.data.last} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
      </Stack>
    )}
    <DetailDrawer open={!!details} title={`Venda ${details?.numero ?? ''}`} subtitle={details?.clienteNome}
      onClose={() => setDetails(null)}>
      {details && <Stack spacing={2.5}>
        <Box><Typography variant="overline" color="text.secondary">Situação</Typography>
          <Box><Chip size="small" label={details.status.replace(/_/g, ' ')}
            color={details.status === 'CONFIRMADA' ? 'success' : details.status === 'CANCELADA' ? 'error' : 'default'} /></Box></Box>
        <RelatedItemsTable title="Itens vendidos" items={details.itens} />
        <Box><Typography variant="overline" color="text.secondary">Total</Typography>
          <Typography variant="h6">{formatCurrency(details.valorTotal)}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Local de estoque</Typography>
          <Typography>{details.localEstoqueNome}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Baixa de estoque</Typography>
          <Typography variant="body2" color="text.secondary">{details.status === 'CONFIRMADA'
            ? 'A confirmação baixa o estoque no local informado.' : UNAVAILABLE_API}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Nota de saída</Typography>
          <Typography variant="body2" color="text.secondary">{UNAVAILABLE_API}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Conta a receber</Typography>
          <Typography variant="body2" color="text.secondary">{details.status === 'CONFIRMADA'
            ? 'A confirmação gera as contas a receber. O vínculo detalhado não é exposto pela API atual.'
            : UNAVAILABLE_API}</Typography></Box>
      </Stack>}
    </DetailDrawer>
    <ResourceFormDialog open={editing !== undefined} title={editing ? 'Editar venda' : 'Nova venda'}
      fields={fields} initialValues={editing ? toForm(editing) : null} submitting={save.isPending}
      onClose={() => setEditing(undefined)} onSubmit={(values) => save.mutate(values)} />
    <ConfirmDialog open={!!confirming} title="Confirmar venda"
      message="A confirmacao baixa o estoque e gera as contas a receber."
      confirmLabel="Confirmar" loading={confirm.isPending} onClose={() => setConfirming(null)}
      onConfirm={() => confirming && confirm.mutate(confirming)} />
    <ResourceFormDialog open={!!cancelling} title="Cancelar venda" fields={[
      { name: 'motivo', label: 'Motivo', type: 'textarea', required: true },
    ]} submitting={cancel.isPending} onClose={() => setCancelling(null)}
      onSubmit={(values) => cancel.mutate(values)} />
  </Box>;
}
