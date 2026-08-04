import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { api, describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { isResourcePreconditionConflict, type Page } from '../api/resource';
import {
  buildStockAdjustmentPayload,
  buildStockCompensationPayload,
  buildStockLocationPayload,
  stockApi,
  stockLocationApi,
  type StockBalance,
  type StockLocation,
  type StockMovement,
  type StockPosition,
} from '../api/stock';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { useSnackbar } from '../components/SnackbarProvider';
import { formatDateTime, formatNumber } from '../utils/format';
import { toApiDateTime } from '../utils/dateTime';

export function stockQueryKey(
  organizationId: number | null | undefined,
  ...parts: readonly unknown[]
) {
  return tenantQueryKey(organizationId, 'stock', ...parts);
}

export function stockInvalidationKey(organizationId: number): readonly unknown[] {
  return stockQueryKey(organizationId);
}

export function canAdjustStock(permissions: readonly string[]): boolean {
  return permissions.includes('stock:manage') && permissions.includes('catalog:read');
}

function intentKey(): string {
  return crypto.randomUUID();
}

function rows<T>(page?: Page<T>): T[] {
  return page?.content ?? [];
}

function TabPanel({ current, index, children }: { current: number; index: number; children: ReactNode }) {
  return current === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function QueryFeedback({ loading, error }: { loading: boolean; error: unknown }) {
  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{describeError(error)}</Alert>;
  return null;
}

interface PositionFilters {
  produtoId: string;
  localEstoqueId: string;
  abaixoMinimo: string;
}

const emptyPositionFilters: PositionFilters = { produtoId: '', localEstoqueId: '', abaixoMinimo: '' };

function PositionPanel({ organizationId }: { organizationId: number }) {
  const [draft, setDraft] = useState(emptyPositionFilters);
  const [filters, setFilters] = useState(emptyPositionFilters);
  const positionParams = {
    produtoId: filters.produtoId ? Number(filters.produtoId) : undefined,
    abaixoMinimo: filters.abaixoMinimo === '' ? undefined : filters.abaixoMinimo === 'true',
  };
  const balanceParams = {
    produtoId: filters.produtoId ? Number(filters.produtoId) : undefined,
    localEstoqueId: filters.localEstoqueId ? Number(filters.localEstoqueId) : undefined,
  };
  const positions = useQuery({
    queryKey: stockQueryKey(organizationId, 'positions', positionParams),
    queryFn: () => stockApi.positions(positionParams),
  });
  const balances = useQuery({
    queryKey: stockQueryKey(organizationId, 'balances', balanceParams),
    queryFn: () => stockApi.balances(balanceParams),
  });

  const filter = (event: FormEvent) => {
    event.preventDefault();
    setFilters(draft);
  };

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Stack component="form" onSubmit={filter} direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="ID do produto" type="number" value={draft.produtoId} onChange={(event) => setDraft({ ...draft, produtoId: event.target.value })} fullWidth />
          <TextField label="ID do local" type="number" value={draft.localEstoqueId} onChange={(event) => setDraft({ ...draft, localEstoqueId: event.target.value })} fullWidth />
          <TextField select label="Abaixo do mínimo" value={draft.abaixoMinimo} onChange={(event) => setDraft({ ...draft, abaixoMinimo: event.target.value })} fullWidth>
            <MenuItem value="">Todos</MenuItem><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Não</MenuItem>
          </TextField>
          <Button type="submit" variant="contained">Filtrar</Button>
        </Stack>
      </CardContent></Card>

      <Typography variant="h6">Posição consolidada</Typography>
      <QueryFeedback loading={positions.isLoading} error={positions.error} />
      {!positions.isLoading && !positions.isError && (
        <Card><TableContainer><Table size="small" aria-label="Posição de estoque"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell align="right">Saldo</TableCell><TableCell align="right">Mínimo</TableCell><TableCell>Situação</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockPosition>(positions.data).map((item) => <TableRow key={item.produtoId}>
            <TableCell>{item.produto}</TableCell><TableCell align="right">{formatNumber(item.quantidade, 3)}</TableCell><TableCell align="right">{formatNumber(item.quantidadeMinima, 3)}</TableCell>
            <TableCell><Chip size="small" color={item.abaixoMinimo ? 'warning' : 'success'} label={item.abaixoMinimo ? 'Abaixo do mínimo' : 'Regular'} /></TableCell>
          </TableRow>)}
        </TableBody></Table></TableContainer></Card>
      )}

      <Typography variant="h6">Saldos por local</Typography>
      <QueryFeedback loading={balances.isLoading} error={balances.error} />
      {!balances.isLoading && !balances.isError && (
        <Card><TableContainer><Table size="small" aria-label="Saldos por local"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell>Local</TableCell><TableCell align="right">Saldo</TableCell><TableCell>Atualização</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockBalance>(balances.data).map((item) => <TableRow key={item.id}>
            <TableCell>{item.produto}</TableCell><TableCell>{item.localEstoque}</TableCell><TableCell align="right">{formatNumber(item.quantidade, 3)}</TableCell><TableCell>v{item.version}</TableCell>
          </TableRow>)}
        </TableBody></Table></TableContainer></Card>
      )}
    </Stack>
  );
}

interface MovementFilters {
  produtoId: string;
  localEstoqueId: string;
  tipo: string;
  de: string;
  ate: string;
}

const emptyMovementFilters: MovementFilters = { produtoId: '', localEstoqueId: '', tipo: '', de: '', ate: '' };

function MovementPanel({ organizationId, canManage }: { organizationId: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [draft, setDraft] = useState(emptyMovementFilters);
  const [filters, setFilters] = useState(emptyMovementFilters);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compensating, setCompensating] = useState<StockMovement | null>(null);
  const [motivo, setMotivo] = useState('');
  const [compensationKey, setCompensationKey] = useState('');
  const params = {
    produtoId: filters.produtoId ? Number(filters.produtoId) : undefined,
    localEstoqueId: filters.localEstoqueId ? Number(filters.localEstoqueId) : undefined,
    tipo: filters.tipo || undefined,
    de: filters.de ? toApiDateTime(filters.de) : undefined,
    ate: filters.ate ? toApiDateTime(filters.ate) : undefined,
  };
  const movements = useQuery({
    queryKey: stockQueryKey(organizationId, 'movements', params),
    queryFn: () => stockApi.movements(params),
  });
  const detail = useQuery({
    queryKey: stockQueryKey(organizationId, 'movement', selectedId),
    queryFn: () => stockApi.movement(selectedId!),
    enabled: selectedId !== null,
  });
  const compensation = useMutation({
    mutationFn: () => stockApi.compensate(
      compensating!.id,
      buildStockCompensationPayload({ motivo }),
      compensationKey,
    ),
    onSuccess: () => {
      notify('Movimento compensado com sucesso.', 'success');
      setCompensating(null);
      setMotivo('');
      void queryClient.invalidateQueries({ queryKey: stockInvalidationKey(organizationId) });
    },
  });

  return (
    <Stack spacing={2}>
      <Card><CardContent><Stack component="form" onSubmit={(event) => { event.preventDefault(); setFilters(draft); }} direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <TextField label="ID do produto" type="number" value={draft.produtoId} onChange={(event) => setDraft({ ...draft, produtoId: event.target.value })} />
        <TextField label="ID do local" type="number" value={draft.localEstoqueId} onChange={(event) => setDraft({ ...draft, localEstoqueId: event.target.value })} />
        <TextField select label="Tipo" value={draft.tipo} onChange={(event) => setDraft({ ...draft, tipo: event.target.value })}><MenuItem value="">Todos</MenuItem>{['RECEBIMENTO', 'BAIXA', 'AJUSTE', 'COMPENSACAO'].map((tipo) => <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>)}</TextField>
        <TextField label="De" type="datetime-local" value={draft.de} onChange={(event) => setDraft({ ...draft, de: event.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField label="Até" type="datetime-local" value={draft.ate} onChange={(event) => setDraft({ ...draft, ate: event.target.value })} InputLabelProps={{ shrink: true }} />
        <Button type="submit" variant="contained">Filtrar</Button>
      </Stack></CardContent></Card>
      <QueryFeedback loading={movements.isLoading} error={movements.error} />
      {!movements.isLoading && !movements.isError && (
        <Card><TableContainer><Table size="small" aria-label="Razão de estoque"><TableHead><TableRow>
          <TableCell>ID</TableCell><TableCell>Produto</TableCell><TableCell>Local</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Delta</TableCell><TableCell>Data</TableCell><TableCell>Ações</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockMovement>(movements.data).map((item) => <TableRow key={item.id}>
            <TableCell>{item.id}</TableCell><TableCell>{item.produto}</TableCell><TableCell>{item.localEstoque}</TableCell><TableCell>{item.tipo}</TableCell>
            <TableCell align="right">{formatNumber(item.delta, 3)}</TableCell><TableCell>{formatDateTime(item.ocorridoEm)}</TableCell>
            <TableCell><Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => setSelectedId(item.id)}>Detalhe</Button>
              {canManage && <Button size="small" color="warning" startIcon={<ReplayOutlinedIcon />} onClick={() => { compensation.reset(); setMotivo(''); setCompensating(item); setCompensationKey(intentKey()); }}>Compensar</Button>}
            </TableCell>
          </TableRow>)}
        </TableBody></Table></TableContainer></Card>
      )}

      <Dialog open={selectedId !== null} onClose={() => setSelectedId(null)} maxWidth="sm" fullWidth><DialogTitle>Detalhe do movimento</DialogTitle><DialogContent dividers>
        <QueryFeedback loading={detail.isLoading} error={detail.error} />
        {detail.data && <Stack spacing={1}><Typography>Produto: {detail.data.produto}</Typography><Typography>Local: {detail.data.localEstoque}</Typography><Typography>Tipo: {detail.data.tipo}</Typography><Typography>Delta: {formatNumber(detail.data.delta, 3)}</Typography><Typography>Saldo posterior: {formatNumber(detail.data.saldoPosterior, 3)}</Typography><Typography>Origem: {detail.data.origemTipo} {detail.data.origemChave}</Typography><Typography>Motivo: {detail.data.motivo ?? '—'}</Typography></Stack>}
      </DialogContent><DialogActions><Button onClick={() => setSelectedId(null)}>Fechar</Button></DialogActions></Dialog>

      <Dialog open={compensating !== null} onClose={() => setCompensating(null)} maxWidth="xs" fullWidth><DialogTitle>Compensar movimento</DialogTitle><DialogContent dividers>
        {compensation.isError && <Alert severity="error" sx={{ mb: 2 }}>{describeError(compensation.error)}</Alert>}
        <TextField autoFocus fullWidth multiline minRows={2} label="Motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} required />
      </DialogContent><DialogActions><Button onClick={() => setCompensating(null)}>Cancelar</Button><Button variant="contained" color="warning" disabled={compensation.isPending || !motivo.trim()} onClick={() => compensation.mutate()}>Compensar</Button></DialogActions></Dialog>
    </Stack>
  );
}

function LocationsPanel({ organizationId, canManage }: { organizationId: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockLocation | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [deleting, setDeleting] = useState<{ row: StockLocation; version: number } | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const locations = useQuery({
    queryKey: stockQueryKey(organizationId, 'locations'),
    queryFn: () => stockLocationApi.list({ size: 100, sort: 'nome,asc' }),
  });
  const invalidate = () => queryClient.invalidateQueries({
    queryKey: stockInvalidationKey(organizationId),
  });
  const loadEdit = async (row: StockLocation) => {
    try {
      const current = await stockLocationApi.getVersioned(row.id);
      setEditing(current.data); setVersion(current.version); setConflict(null); setRevision((value) => value + 1); setFormOpen(true);
    } catch (error) { notify(describeError(error), 'error'); }
  };
  const reloadEdit = async () => {
    if (!editing) return;
    try {
      const current = await stockLocationApi.getVersioned(editing.id);
      setEditing(current.data); setVersion(current.version); setConflict(null); setRevision((value) => value + 1);
    } catch (error) { notify(describeError(error), 'error'); }
  };
  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = buildStockLocationPayload(values);
      if (!editing) return stockLocationApi.createVersioned(payload);
      if (version === null) throw new Error('Versão do local indisponível.');
      return stockLocationApi.updateVersioned(editing.id, payload, version);
    },
    onSuccess: () => { notify('Local de estoque salvo.', 'success'); setFormOpen(false); setEditing(null); setVersion(null); setConflict(null); void invalidate(); },
    onError: (error) => {
      if (editing && isResourcePreconditionConflict(error)) {
        setConflict('O local foi alterado. Recarregue os dados antes de salvar novamente.');
      } else notify(describeError(error), 'error');
    },
  });
  const remove = useMutation({
    mutationFn: () => stockLocationApi.removeVersioned(deleting!.row.id, deleting!.version),
    onSuccess: () => { notify('Local de estoque inativado.', 'success'); setDeleting(null); setDeleteConflict(false); void invalidate(); },
    onError: async (error) => {
      if (deleting && isResourcePreconditionConflict(error)) {
        try {
          const current = await stockLocationApi.getVersioned(deleting.row.id);
          setDeleting({ row: current.data, version: current.version });
          setDeleteConflict(true);
          notify('O local mudou e sua versão atual foi recarregada.', 'warning');
        } catch (reloadError) {
          notify(describeError(reloadError), 'error');
          setDeleting(null);
          setDeleteConflict(false);
        }
      } else notify(describeError(error), 'error');
    },
  });
  const prepareDelete = async (row: StockLocation) => {
    try {
      const current = await stockLocationApi.getVersioned(row.id);
      setDeleting({ row: current.data, version: current.version }); setDeleteConflict(false);
    } catch (error) { notify(describeError(error), 'error'); }
  };

  return (
    <Stack spacing={2}>
      {canManage && <Button variant="contained" startIcon={<AddOutlinedIcon />} sx={{ alignSelf: 'flex-start' }} onClick={() => { setEditing(null); setVersion(null); setConflict(null); setFormOpen(true); }}>Novo local</Button>}
      <QueryFeedback loading={locations.isLoading} error={locations.error} />
      {!locations.isLoading && !locations.isError && <Card><TableContainer><Table size="small" aria-label="Locais de estoque"><TableHead><TableRow><TableCell>ID</TableCell><TableCell>Nome</TableCell><TableCell>Situação</TableCell>{canManage && <TableCell>Ações</TableCell>}</TableRow></TableHead><TableBody>
        {rows<StockLocation>(locations.data).map((item) => <TableRow key={item.id}><TableCell>{item.id}</TableCell><TableCell>{item.nome}</TableCell><TableCell>{item.ativo ? 'Ativo' : 'Inativo'}</TableCell>{canManage && <TableCell><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => void loadEdit(item)}>Editar</Button><Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={() => void prepareDelete(item)}>Inativar</Button></TableCell>}</TableRow>)}
      </TableBody></Table></TableContainer></Card>}
      <ResourceFormDialog open={formOpen} title={editing ? 'Editar local de estoque' : 'Novo local de estoque'} fields={[{ name: 'nome', label: 'Nome', type: 'text', required: true, cols: 8 }, { name: 'ativo', label: 'Ativo', type: 'switch', cols: 4 }]} initialValues={editing ? { ...editing } : null} submitting={save.isPending} conflictMessage={conflict} onReload={editing ? () => void reloadEdit() : undefined} resetKey={revision} onClose={() => { setFormOpen(false); setEditing(null); setVersion(null); setConflict(null); }} onSubmit={(values) => save.mutate(values)} />
      <ConfirmDialog open={deleting !== null} title="Inativar local de estoque" message={deleteConflict ? 'O local foi alterado. A versão atual foi recarregada; revise e confirme novamente.' : 'Confirma a inativação deste local?'} confirmLabel={deleteConflict ? 'Tentar novamente' : 'Inativar'} confirmColor="error" loading={remove.isPending} onConfirm={() => remove.mutate()} onClose={() => { setDeleting(null); setDeleteConflict(false); }} />
    </Stack>
  );
}

interface ProductOption { id: number; nome: string }

function AdjustmentDialog({ open, organizationId, locations, onClose }: { open: boolean; organizationId: number; locations: StockLocation[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [values, setValues] = useState({ produtoId: '', localEstoqueId: '', delta: '', custoUnitario: '', motivo: '' });
  const [key, setKey] = useState('');
  const products = useQuery({
    queryKey: stockQueryKey(organizationId, 'adjustment-products'),
    queryFn: () => api.get<Page<ProductOption>>('/api/produtos', {
      params: { size: 100, ativo: true, sort: 'nome,asc' },
    }).then((response) => response.data),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: () => stockApi.adjust(buildStockAdjustmentPayload(values), key),
    onSuccess: () => {
      notify('Ajuste registrado na razão de estoque.', 'success');
      setValues({ produtoId: '', localEstoqueId: '', delta: '', custoUnitario: '', motivo: '' });
      onClose();
      void queryClient.invalidateQueries({ queryKey: stockInvalidationKey(organizationId) });
    },
  });
  const close = () => { if (!mutation.isPending) onClose(); };
  const submit = (event: FormEvent) => { event.preventDefault(); mutation.mutate(); };
  const ensureKey = () => { if (!key) setKey(intentKey()); };

  return <Dialog open={open} onClose={close} maxWidth="sm" fullWidth TransitionProps={{ onEnter: ensureKey, onExited: () => setKey('') }}><Box component="form" onSubmit={submit}><DialogTitle>Ajustar estoque</DialogTitle><DialogContent dividers>
    <Stack spacing={2}>
      {mutation.isError && <Alert severity="error">{describeError(mutation.error)}</Alert>}
      <TextField select label="Produto" value={values.produtoId} onChange={(event) => setValues({ ...values, produtoId: event.target.value })} required fullWidth>{rows<ProductOption>(products.data).map((item) => <MenuItem key={item.id} value={item.id}>{item.nome}</MenuItem>)}</TextField>
      <TextField select label="Local" value={values.localEstoqueId} onChange={(event) => setValues({ ...values, localEstoqueId: event.target.value })} required fullWidth>{locations.filter((item) => item.ativo).map((item) => <MenuItem key={item.id} value={item.id}>{item.nome}</MenuItem>)}</TextField>
      <TextField label="Delta" type="number" value={values.delta} onChange={(event) => setValues({ ...values, delta: event.target.value })} inputProps={{ step: 0.001 }} helperText="Use valor positivo para entrada e negativo para saída." required />
      <TextField label="Custo unitário" type="number" value={values.custoUnitario} onChange={(event) => setValues({ ...values, custoUnitario: event.target.value })} inputProps={{ min: 0, step: 0.01 }} />
      <TextField label="Motivo" multiline minRows={2} value={values.motivo} onChange={(event) => setValues({ ...values, motivo: event.target.value })} required />
    </Stack>
  </DialogContent><DialogActions><Button onClick={close}>Cancelar</Button><Button type="submit" variant="contained" disabled={mutation.isPending || !key}>Registrar ajuste</Button></DialogActions></Box></Dialog>;
}

export function StockPage() {
  const { activeOrganization, permissions } = useAuth();
  const [tab, setTab] = useState(0);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const organizationId = activeOrganization?.organizationId;
  const canRead = permissions.includes('stock:read');
  const canManage = permissions.includes('stock:manage');
  const canAdjust = canAdjustStock(permissions);
  const locations = useQuery({
    queryKey: organizationId ? stockQueryKey(organizationId, 'location-options') : ['stock', 'location-options'],
    queryFn: () => stockLocationApi.list({ size: 100, sort: 'nome,asc' }),
    enabled: !!organizationId && canRead,
  });
  const locationOptions = useMemo(() => rows<StockLocation>(locations.data), [locations.data]);

  if (!canRead || !organizationId) return <Alert severity="warning">Seu contexto não possui permissão de estoque.</Alert>;

  return <Box>
    <PageHeader title="Estoque" subtitle="Posição por produto e local, razão append-only e locais da organização ativa." action={canAdjust ? <Button variant="contained" startIcon={<TuneOutlinedIcon />} onClick={() => setAdjustmentOpen(true)}>Ajustar estoque</Button> : undefined} />
    {canManage && !permissions.includes('catalog:read') && <Alert severity="info" sx={{ mb: 2 }}>Ajustes exigem também leitura do catálogo para selecionar o produto.</Alert>}
    <Card><Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="scrollable"><Tab label="Posição" /><Tab label="Razão" /><Tab label="Locais" /></Tabs></Card>
    <TabPanel current={tab} index={0}><PositionPanel organizationId={organizationId} /></TabPanel>
    <TabPanel current={tab} index={1}><MovementPanel organizationId={organizationId} canManage={canManage} /></TabPanel>
    <TabPanel current={tab} index={2}><LocationsPanel organizationId={organizationId} canManage={canManage} /></TabPanel>
    {canAdjust && <AdjustmentDialog open={adjustmentOpen} organizationId={organizationId} locations={locationOptions} onClose={() => setAdjustmentOpen(false)} />}
  </Box>;
}
