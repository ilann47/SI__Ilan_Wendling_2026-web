import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import { Alert, Box, Button, Card, Chip, CircularProgress, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
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
  const queryKey = orgId ? tenantQueryKey(orgId, 'service-orders') : ['service-orders'];
  const list = useQuery({ queryKey, queryFn: () => serviceOrdersApi.list({ size: 100,
    sort: 'dataAbertura,desc' }), enabled: !!orgId && permissions.includes('service_orders:read') });
  const done = (message: string) => { notify(message, 'success');
    void queryClient.invalidateQueries({ queryKey }); };
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
    return <Alert severity="warning">Seu contexto nao possui permissao para ordens de servico.</Alert>;
  }
  return <Box><PageHeader title="Ordens de Servico"
    subtitle="Execucao de servicos com ciclo operacional e faturamento por Nota de Servico."
    action={canManage ? <Button variant="contained" startIcon={<AddOutlinedIcon />}
      onClick={() => setEditing(null)}>Nova ordem</Button> : undefined} />
    {list.isLoading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}
    {list.isError && <Alert severity="error">{describeError(list.error)}</Alert>}
    {list.data && <Card><TableContainer><Table size="small"><TableHead><TableRow>
      <TableCell>Numero</TableCell><TableCell>Cliente</TableCell><TableCell>Abertura</TableCell>
      <TableCell>Status</TableCell><TableCell align="right">Total</TableCell><TableCell>Acoes</TableCell>
    </TableRow></TableHead><TableBody>{list.data.content.map((order) => <TableRow key={order.id} hover>
      <TableCell>{order.numero}</TableCell><TableCell>{order.clienteNome}</TableCell>
      <TableCell>{formatDate(order.dataAbertura)}</TableCell><TableCell><Chip size="small"
        color={order.status === 'CONCLUIDA' ? 'success' : order.status === 'CANCELADA'
          ? 'error' : order.status === 'EM_EXECUCAO' ? 'info' : 'default'}
        label={order.status} /></TableCell><TableCell align="right">{formatCurrency(order.valorTotal)}</TableCell>
      <TableCell><Stack direction="row" spacing={0.5}>{canManage && order.status === 'RASCUNHO' && <>
        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(order)}>Editar</Button>
        <Button size="small" color="info" startIcon={<PlayArrowOutlinedIcon />}
          onClick={() => setStarting(order)}>Iniciar</Button></>}
        {canManage && order.status === 'EM_EXECUCAO' && <Button size="small" color="success"
          startIcon={<CheckCircleOutlineIcon />} onClick={() => setCompleting(order)}>Concluir</Button>}
        {canManage && (order.status === 'RASCUNHO' || order.status === 'EM_EXECUCAO') &&
          <Button size="small" color="error" startIcon={<CancelOutlinedIcon />}
            onClick={() => setCancelling(order)}>Cancelar</Button>}</Stack></TableCell>
    </TableRow>)}</TableBody></Table></TableContainer></Card>}
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
