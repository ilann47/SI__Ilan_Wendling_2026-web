import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import { Alert, Box, Button, Card, Chip, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { ListingCards } from '../components/listing/ListingCards';
import { SecondaryActionsMenu, type SecondaryAction } from '../components/listing/SecondaryActionsMenu';
import { useLinkedDetail } from '../hooks/useLinkedDetail';
import { DetailDrawer } from '../components/listing/DetailDrawer';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { RelatedItemsTable } from '../components/listing/ResourceDetailBody';
import { UNAVAILABLE_API } from '../components/listing/listingUtils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { buildServiceOrderPayload, serviceOrdersApi, type ServiceOrder } from '../api/serviceOrders';
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
  { name: 'servicoId', label: 'Servico', type: 'reference', required: true, cols: 5,
    reference: { basePath: '/api/servicos', labelField: 'nome', params: { ativo: true } } },
  { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 2, step: 0.001 },
  { name: 'valorUnitario', label: 'Valor unitario', type: 'money', required: true, cols: 3 },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 2 },
];
const fields: FieldConfig[] = [
  { name: 'numero', label: 'Numero', type: 'text', required: true, cols: 4 },
  { name: 'clienteId', label: 'Cliente', type: 'reference', required: true, cols: 8,
    reference: { basePath: '/api/clientes', labelField: 'nome', params: { ativo: true } } },
  { name: 'dataAbertura', label: 'Abertura', type: 'date', cols: 4 },
  { name: 'previsaoConclusao', label: 'Previsao de conclusao', type: 'date', cols: 4 },
  { name: 'moeda', label: 'Moeda', type: 'text', cols: 2, defaultValue: 'BRL' },
  { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 2, defaultValue: 0 },
  { name: 'observacao', label: 'Observacao', type: 'textarea' },
  { name: 'itens', label: 'Servicos da ordem', type: 'subitems', subFields: itemFields },
];

function toForm(order: ServiceOrder) {
  return { numero: order.numero, clienteId: order.clienteId,
    dataAbertura: order.dataAbertura, previsaoConclusao: order.previsaoConclusao ?? '',
    moeda: order.moeda, valorDesconto: order.valorDesconto,
    observacao: order.observacao ?? '', itens: order.itens.map((item) => ({
      servicoId: item.servicoId, quantidade: item.quantidade,
      valorUnitario: item.valorUnitario, valorDesconto: item.valorDesconto,
    })) };
}

export function ServiceOrdersPage() {
  const { activeOrganization, permissions } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const canManage = permissions.includes('service_orders:manage');
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [editing, setEditing] = useState<ServiceOrder | null | undefined>(undefined);
  const [starting, setStarting] = useState<ServiceOrder | null>(null);
  const [completing, setCompleting] = useState<ServiceOrder | null>(null);
  const [cancelling, setCancelling] = useState<ServiceOrder | null>(null);
  const [selectedDetails, setDetails] = useState<ServiceOrder | null>(null);
  const linked = useLinkedDetail(orgId, 'service-orders', serviceOrdersApi.get, permissions.includes('service_orders:read'));
  const details = selectedDetails ?? linked.data ?? null;
  const closeDetails = () => { setDetails(null); if (linked.requested) linked.close(); };
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const queryKey = orgId ? tenantQueryKey(orgId, 'service-orders', page, search) : ['service-orders'];
  const list = useQuery({ queryKey, queryFn: () => serviceOrdersApi.list({
    page, size: 10, sort: 'dataAbertura,desc', ...(search.trim() ? { numero: search.trim() } : {}),
  }), enabled: !!orgId && permissions.includes('service_orders:read') });
  const done = (message: string) => { notify(message, 'success'); closeDetails();
    if (orgId) {
      void queryClient.invalidateQueries({ queryKey: tenantQueryKey(orgId, 'service-orders') });
      void queryClient.invalidateQueries({ queryKey: tenantQueryKey(orgId, 'dashboard', 'service-orders') });
    } };
  const fail = (error: unknown) => notify(describeError(error), 'error');
  const save = useMutation({ mutationFn: (values: Record<string, unknown>) => editing
    ? serviceOrdersApi.update(editing.id, buildServiceOrderPayload(values), editing.version)
    : serviceOrdersApi.create(buildServiceOrderPayload(values), crypto.randomUUID()),
  onSuccess: () => { setEditing(undefined); done('Ordem de servico salva.'); }, onError: fail });
  const start = useMutation({ mutationFn: (order: ServiceOrder) =>
    serviceOrdersApi.start(order.id, order.version), onSuccess: () => {
      setStarting(null); done('Execucao iniciada.'); }, onError: fail });
  const complete = useMutation({ mutationFn: (order: ServiceOrder) =>
    serviceOrdersApi.complete(order.id, order.version), onSuccess: () => {
      setCompleting(null); done('Ordem concluida e disponivel para faturamento.'); }, onError: fail });
  const cancel = useMutation({ mutationFn: (values: Record<string, unknown>) =>
    serviceOrdersApi.cancel(cancelling!.id, String(values.motivo ?? '').trim(),
      cancelling!.version), onSuccess: () => { setCancelling(null); done('Ordem cancelada.'); }, onError: fail });

  if (!orgId || !permissions.includes('service_orders:read')) {
    return <Alert severity="warning">Seu contexto não possui permissão para ordens de serviço.</Alert>;
  }
  const orders = list.data?.content ?? [];
  const primaryAction = (order: ServiceOrder) => {
    if (!canManage) return null;
    if (order.status === 'RASCUNHO') return <PrimaryButton size="small" startIcon={<PlayArrowOutlinedIcon />}
      onClick={() => { setStarting(order); closeDetails(); }}>Iniciar serviço</PrimaryButton>;
    if (order.status === 'EM_EXECUCAO') return <PrimaryButton size="small" startIcon={<CheckCircleOutlineIcon />}
      onClick={() => { setCompleting(order); closeDetails(); }}>Concluir serviço</PrimaryButton>;
    return null;
  };
  const secondaryActions = (order: ServiceOrder): SecondaryAction[] => [
    { key: 'details', label: 'Ver detalhes', onClick: () => setDetails(order) },
    ...(canManage && order.status === 'RASCUNHO' ? [{ key: 'edit', label: 'Editar ordem', icon: <EditOutlinedIcon />,
      onClick: () => { setEditing(order); closeDetails(); } }] : []),
    ...(canManage && (order.status === 'RASCUNHO' || order.status === 'EM_EXECUCAO') ? [{ key: 'cancel', label: 'Cancelar ordem', danger: true, icon: <CancelOutlinedIcon />,
      onClick: () => { setCancelling(order); closeDetails(); } }] : []),
  ];
  return <Box><PageHeader title="Ordens de Serviço"
    subtitle="Execução de serviços com ciclo operacional e faturamento por Nota de Serviço."
    count={list.data?.totalElements}
    action={canManage ? <PrimaryButton startIcon={<AddOutlinedIcon />}
      onClick={() => setEditing(null)}>Nova ordem</PrimaryButton> : undefined} />
    <ListingToolbar searchValue={search} searchLabel="Buscar por número"
      onSearchChange={(value) => { setSearch(value); setPage(0); }} />
    {list.isLoading && <ListingSkeleton />}
    {linked.requested && linked.isLoading && <ListingSkeleton />}
    {linked.requested && linked.isError && <ErrorState message={describeError(linked.error)} onRetry={() => void linked.refetch()} />}
    {list.isError && <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />}
    {!list.isLoading && !list.isError && orders.length === 0 && (
      <EmptyState title="Nenhuma ordem de serviço encontrada" description="Abra uma ordem ou ajuste a busca." />
    )}
    {orders.length > 0 && <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" stickyHeader><TableHead><TableRow>
      <TableCell>Número</TableCell><TableCell>Cliente</TableCell><TableCell>Abertura</TableCell>
      <TableCell>Situação</TableCell><TableCell align="right">Total</TableCell><TableCell>Ações</TableCell>
    </TableRow></TableHead><TableBody>{orders.map((order) => <TableRow key={order.id} hover
      onClick={() => setDetails(order)} sx={{ cursor: 'pointer' }}>
      <TableCell>{order.numero}</TableCell><TableCell>{order.clienteNome}</TableCell>
      <TableCell>{formatDate(order.dataAbertura)}</TableCell><TableCell><Chip size="small"
        color={order.status === 'CONCLUIDA' ? 'success' : order.status === 'CANCELADA'
          ? 'error' : order.status === 'EM_EXECUCAO' ? 'info' : 'default'}
        label={order.status.replace(/_/g, ' ')} /></TableCell><TableCell align="right">{formatCurrency(order.valorTotal)}</TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}><Stack direction="row" spacing={0.5}>
        {primaryAction(order)}<SecondaryActionsMenu actions={secondaryActions(order)} />
      </Stack></TableCell>
    </TableRow>)}</TableBody></Table></TableContainer></Card>}
    {orders.length > 0 && <ListingCards rows={orders} getKey={(order) => order.id} getTitle={(order) => order.numero}
      onOpen={setDetails} getActions={secondaryActions} getFields={(order) => [
        { label: 'Cliente', value: order.clienteNome }, { label: 'Situação', value: order.status.replace(/_/g, ' ') },
        { label: 'Abertura', value: formatDate(order.dataAbertura) }, { label: 'Total', value: formatCurrency(order.valorTotal) },
      ]} />}
    {list.data && list.data.totalPages > 1 && (
      <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
        <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
        <Button disabled={list.data.last} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
      </Stack>
    )}
    <DetailDrawer open={!!details} title={`Ordem ${details?.numero ?? ''}`} subtitle={details?.clienteNome}
      onClose={closeDetails} actions={details ? <Stack direction="row" spacing={1}>
        {primaryAction(details)}<SecondaryActionsMenu actions={secondaryActions(details).filter((action) => action.key !== 'details')} />
      </Stack> : undefined}>
      {details && <Stack spacing={2.5}>
        <Box><Typography variant="overline" color="text.secondary">Situação</Typography>
          <Box><Chip size="small" label={details.status.replace(/_/g, ' ')} /></Box></Box>
        <RelatedItemsTable title="Serviços" items={details.itens} />
        <Box><Typography variant="overline" color="text.secondary">Datas</Typography>
          <Typography variant="body2">Abertura: {formatDate(details.dataAbertura)}</Typography>
          <Typography variant="body2">Previsão: {details.previsaoConclusao ? formatDate(details.previsaoConclusao) : '—'}</Typography>
          <Typography variant="body2">Iniciada: {details.iniciadaEm ? formatDate(details.iniciadaEm) : '—'}</Typography>
          <Typography variant="body2">Concluída: {details.concluidaEm ? formatDate(details.concluidaEm) : '—'}</Typography>
        </Box>
        <Box><Typography variant="overline" color="text.secondary">Valor</Typography>
          <Typography variant="h6">{formatCurrency(details.valorTotal)}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Responsável</Typography>
          <Typography variant="body2" color="text.secondary">{UNAVAILABLE_API}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Nota de serviço</Typography>
          <Typography variant="body2" color="text.secondary">{UNAVAILABLE_API}</Typography></Box>
        <Box><Typography variant="overline" color="text.secondary">Conta a receber</Typography>
          <Typography variant="body2" color="text.secondary">{UNAVAILABLE_API}</Typography></Box>
        {details.motivoCancelamento && <Alert severity="error">{details.motivoCancelamento}</Alert>}
      </Stack>}
    </DetailDrawer>
    <ResourceFormDialog open={editing !== undefined} title={editing ? 'Editar ordem' : 'Nova ordem'}
      fields={fields} initialValues={editing ? toForm(editing) : null} submitting={save.isPending}
      onClose={() => setEditing(undefined)} onSubmit={(values) => save.mutate(values)} />
    <ConfirmDialog open={!!starting} title="Iniciar execucao"
      message="A ordem deixara de permitir edicao apos o inicio."
      confirmLabel="Iniciar" loading={start.isPending} onClose={() => setStarting(null)}
      onConfirm={() => starting && start.mutate(starting)} />
    <ConfirmDialog open={!!completing} title="Concluir ordem"
      message="A conclusao torna a ordem disponivel para faturamento por Nota de Servico."
      confirmLabel="Concluir" loading={complete.isPending} onClose={() => setCompleting(null)}
      onConfirm={() => completing && complete.mutate(completing)} />
    <ResourceFormDialog open={!!cancelling} title="Cancelar ordem" fields={[
      { name: 'motivo', label: 'Motivo', type: 'textarea', required: true },
    ]} submitting={cancel.isPending} onClose={() => setCancelling(null)}
      onSubmit={(values) => cancel.mutate(values)} />
  </Box>;
}
