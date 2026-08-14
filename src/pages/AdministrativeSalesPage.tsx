import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Alert, Box, Button, Card, Chip, CircularProgress, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
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
  const queryKey = orgId ? tenantQueryKey(orgId, 'administrative-sales') : ['administrative-sales'];
  const list = useQuery({ queryKey, queryFn: () => administrativeSalesApi.list({ size: 100,
    sort: 'dataEmissao,desc' }), enabled: !!orgId && permissions.includes('sales:read') });
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
    return <Alert severity="warning">Seu contexto nao possui permissao comercial.</Alert>;
  }
  return <Box><PageHeader title="Vendas Administrativas"
    subtitle="Vendas fora do PDV com baixa de estoque e contas a receber."
    action={canManage ? <Button variant="contained" startIcon={<AddOutlinedIcon />}
      onClick={() => setEditing(null)}>Nova venda</Button> : undefined} />
    {list.isLoading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}
    {list.isError && <Alert severity="error">{describeError(list.error)}</Alert>}
    {list.data && <Card><TableContainer><Table size="small"><TableHead><TableRow>
      <TableCell>Numero</TableCell><TableCell>Cliente</TableCell><TableCell>Emissao</TableCell>
      <TableCell>Status</TableCell><TableCell align="right">Total</TableCell><TableCell>Acoes</TableCell>
    </TableRow></TableHead><TableBody>{list.data.content.map((sale) => <TableRow key={sale.id} hover>
      <TableCell>{sale.numero}</TableCell><TableCell>{sale.clienteNome}</TableCell>
      <TableCell>{formatDate(sale.dataEmissao)}</TableCell><TableCell><Chip size="small"
        color={sale.status === 'CONFIRMADA' ? 'success' : sale.status === 'CANCELADA' ? 'error' : 'default'}
        label={sale.status} /></TableCell><TableCell align="right">{formatCurrency(sale.valorTotal)}</TableCell>
      <TableCell><Stack direction="row" spacing={0.5}>{canManage && sale.status === 'RASCUNHO' && <>
        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => setEditing(sale)}>Editar</Button>
        <Button size="small" color="success" startIcon={<CheckCircleOutlineIcon />}
          onClick={() => setConfirming(sale)}>Confirmar</Button>
        <Button size="small" color="error" startIcon={<CancelOutlinedIcon />}
          onClick={() => setCancelling(sale)}>Cancelar</Button></>}</Stack></TableCell>
    </TableRow>)}</TableBody></Table></TableContainer></Card>}
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
