import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
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
import { AppDialog } from '../components/common/AppDialog';
import { PageHeader } from '../components/common/PageHeader';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { NumberField } from '../components/form/NumberField';
import { stockLocationFields } from '../resources/estoque';
import { ReferenceSelect } from '../components/form/ReferenceSelect';
import { ListingCards } from '../components/listing/ListingCards';
import { useLinkedDetail } from '../hooks/useLinkedDetail';
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

const movementLabels: Record<string, string> = { RECEBIMENTO: 'Entrada', BAIXA: 'Saída', AJUSTE: 'Ajuste', COMPENSACAO: 'Compensação' };
const originPermissions: Record<string, string> = { NOTA_ENTRADA: 'fiscal:read', NOTA_SAIDA: 'fiscal:read',
  VENDA_ADMINISTRATIVA: 'sales:read', RECEBIMENTO_COMPRA: 'purchases:read', ORDEM_COMPRA: 'purchases:read' };

function StockReferences({ draft, change }: { draft: { produtoId: string; localEstoqueId: string }; change: (field: 'produtoId' | 'localEstoqueId', value: string) => void }) {
  const { permissions } = useAuth();
  return <>
    {permissions.includes('catalog:read') && <ReferenceSelect label="Produto" value={draft.produtoId ? Number(draft.produtoId) : null}
      onChange={(value) => change('produtoId', value ? String(value) : '')}
      reference={{ basePath: '/api/produtos', labelField: 'nome', readPermissions: ['catalog:read'] }} />}
    <ReferenceSelect label="Local de estoque" value={draft.localEstoqueId ? Number(draft.localEstoqueId) : null}
      onChange={(value) => change('localEstoqueId', value ? String(value) : '')}
      reference={{ basePath: '/api/v1/stock-locations', labelField: 'nome', readPermissions: ['stock:read'] }} />
  </>;
}

function StockPagination({ total, page, change }: { total: number; page: number; change: (value: number) => void }) {
  return <TablePagination component="div" count={total} page={page} rowsPerPage={20} rowsPerPageOptions={[20]}
    onPageChange={(_, next) => change(next)} labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />;
}

function PositionPanel({ organizationId }: { organizationId: number }) {
  const [, setSearchParams] = useSearchParams();
  const [positionPage, setPositionPage] = useState(0);
  const [balancePage, setBalancePage] = useState(0);
  const [draft, setDraft] = useState(emptyPositionFilters);
  const [filters, setFilters] = useState(emptyPositionFilters);
  const positionParams = {
    page: positionPage, size: 20,
    produtoId: filters.produtoId ? Number(filters.produtoId) : undefined,
    abaixoMinimo: filters.abaixoMinimo === '' ? undefined : filters.abaixoMinimo === 'true',
  };
  const balanceParams = {
    page: balancePage, size: 20,
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
    setPositionPage(0); setBalancePage(0);
  };
  const openMovements = (produtoId: number, localEstoqueId?: number) => setSearchParams({
    tab: 'razao', produtoId: String(produtoId), ...(localEstoqueId ? { localEstoqueId: String(localEstoqueId) } : {}),
  });

  return (
    <Stack spacing={2}>
      <Card><CardContent>
        <Stack component="form" onSubmit={filter} direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <StockReferences draft={draft} change={(field, value) => setDraft({ ...draft, [field]: value })} />
          <TextField select label="Abaixo do mínimo" value={draft.abaixoMinimo} onChange={(event) => setDraft({ ...draft, abaixoMinimo: event.target.value })} fullWidth>
            <MenuItem value="">Todos</MenuItem><MenuItem value="true">Sim</MenuItem><MenuItem value="false">Não</MenuItem>
          </TextField>
          <Button type="submit" variant="contained">Filtrar</Button>
        </Stack>
      </CardContent></Card>

      <Typography variant="h6">Posição consolidada</Typography>
      <QueryFeedback loading={positions.isLoading} error={positions.error} />
      {!positions.isLoading && !positions.isError && (
        <Box>
          <ListingCards rows={rows<StockPosition>(positions.data)} getKey={(item) => item.produtoId}
            getTitle={(item) => item.produto}
            getFields={(item) => [
              { label: 'Saldo', value: formatNumber(item.quantidade, 3) },
              { label: 'Mínimo', value: formatNumber(item.quantidadeMinima, 3) },
              { label: 'Situação', value: <Chip size="small" color={item.abaixoMinimo ? 'warning' : 'success'} label={item.abaixoMinimo ? 'Abaixo do mínimo' : 'Regular'} /> },
            ]}
            onOpen={(item) => openMovements(item.produtoId)}
            getOpenLabel={(item) => `Ver movimentos de ${item.produto}`}
          />
          <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Posição de estoque"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell align="right">Saldo</TableCell><TableCell align="right">Mínimo</TableCell><TableCell>Situação</TableCell><TableCell>Histórico</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockPosition>(positions.data).map((item) => <TableRow key={item.produtoId}>
            <TableCell>{item.produto}</TableCell><TableCell align="right">{formatNumber(item.quantidade, 3)}</TableCell><TableCell align="right">{formatNumber(item.quantidadeMinima, 3)}</TableCell>
            <TableCell><Chip size="small" color={item.abaixoMinimo ? 'warning' : 'success'} label={item.abaixoMinimo ? 'Abaixo do mínimo' : 'Regular'} /></TableCell>
            <TableCell><Button size="small" onClick={() => openMovements(item.produtoId)}>Ver movimentos</Button></TableCell>
          </TableRow>)}
          {!positions.data?.content.length && <TableRow><TableCell colSpan={5}>Nenhum produto encontrado.</TableCell></TableRow>}
          </TableBody></Table></TableContainer></Card>
          {!positions.data?.content.length && <Alert severity="info">Nenhum produto encontrado.</Alert>}
          <StockPagination total={positions.data?.totalElements ?? 0} page={positionPage} change={setPositionPage} />
        </Box>
      )}

      <Typography variant="h6">Saldos por local</Typography>
      <QueryFeedback loading={balances.isLoading} error={balances.error} />
      {!balances.isLoading && !balances.isError && (
        <Box>
          <ListingCards rows={rows<StockBalance>(balances.data)} getKey={(item) => item.id}
            getTitle={(item) => item.produto}
            getFields={(item) => [
              { label: 'Local', value: item.localEstoque },
              { label: 'Saldo', value: formatNumber(item.quantidade, 3) },
            ]}
            onOpen={(item) => openMovements(item.produtoId, item.localEstoqueId)}
            getOpenLabel={(item) => `Ver movimentos de ${item.produto} em ${item.localEstoque}`}
          />
          <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Saldos por local"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell>Local</TableCell><TableCell align="right">Saldo</TableCell><TableCell>Histórico</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockBalance>(balances.data).map((item) => <TableRow key={item.id}>
            <TableCell>{item.produto}</TableCell><TableCell>{item.localEstoque}</TableCell><TableCell align="right">{formatNumber(item.quantidade, 3)}</TableCell><TableCell><Button size="small" onClick={() => openMovements(item.produtoId, item.localEstoqueId)}>Ver movimentos</Button></TableCell>
          </TableRow>)}
          {!balances.data?.content.length && <TableRow><TableCell colSpan={4}>Nenhum saldo encontrado.</TableCell></TableRow>}
          </TableBody></Table></TableContainer></Card>
          {!balances.data?.content.length && <Alert severity="info">Nenhum saldo encontrado.</Alert>}
          <StockPagination total={balances.data?.totalElements ?? 0} page={balancePage} change={setBalancePage} />
        </Box>
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
  const { permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = { ...emptyMovementFilters, produtoId: searchParams.get('produtoId') ?? '', localEstoqueId: searchParams.get('localEstoqueId') ?? '' };
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const [draft, setDraft] = useState(initial);
  const [filters, setFilters] = useState(initial);
  const [page, setPage] = useState(0);
  const detail = useLinkedDetail(organizationId, 'stock-movement', stockApi.movement, true);
  const origin = useQuery({ queryKey: stockQueryKey(organizationId, 'origin', detail.data?.id, permissions),
    queryFn: () => stockApi.origin(detail.data!.id), enabled: !!detail.data });
  const originPermission = origin.data ? originPermissions[origin.data.tipo] : undefined;
  const canReadOrigin = !originPermission || permissions.includes(originPermission);
  const openDetail = (id: number) => setSearchParams((current) => { const next = new URLSearchParams(current); next.set('detail', String(id)); return next; });
  const [compensating, setCompensating] = useState<StockMovement | null>(null);
  const [motivo, setMotivo] = useState('');
  const [compensationKey, setCompensationKey] = useState('');
  const params = {
    page, size: 20,
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
      if (detail.requested) void detail.refetch();
    },
  });

  return (
    <Stack spacing={2}>
      <Card><CardContent><Stack component="form" onSubmit={(event) => { event.preventDefault(); setFilters(draft); setPage(0); }} direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <StockReferences draft={draft} change={(field, value) => setDraft({ ...draft, [field]: value })} />
        <TextField select label="Tipo" value={draft.tipo} onChange={(event) => setDraft({ ...draft, tipo: event.target.value })} sx={{ minWidth: 120 }}><MenuItem value="">Todos</MenuItem>{Object.entries(movementLabels).map(([tipo, label]) => <MenuItem key={tipo} value={tipo}>{label}</MenuItem>)}</TextField>
        <TextField label="De" type="datetime-local" value={draft.de} onChange={(event) => setDraft({ ...draft, de: event.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField label="Até" type="datetime-local" value={draft.ate} onChange={(event) => setDraft({ ...draft, ate: event.target.value })} InputLabelProps={{ shrink: true }} />
        <Button type="submit" variant="contained">Filtrar</Button>
        <Button onClick={() => { setDraft(emptyMovementFilters); setFilters(emptyMovementFilters); setPage(0); setSearchParams({ tab: 'razao' }); }}>Limpar</Button>
      </Stack></CardContent></Card>
      <QueryFeedback loading={movements.isLoading} error={movements.error} />
      {!movements.isLoading && !movements.isError && (
        <Box><ListingCards rows={rows<StockMovement>(movements.data)} getKey={(item) => item.id} getTitle={(item) => item.produto} onOpen={(item) => openDetail(item.id)}
          getFields={(item) => [{ label: 'Local', value: item.localEstoque }, { label: 'Movimento', value: movementLabels[item.tipo] ?? item.tipo },
            { label: 'Quantidade', value: formatNumber(item.delta, 3) }, { label: 'Responsável', value: item.atorNome ?? 'Não informado' }, { label: 'Data', value: formatDateTime(item.ocorridoEm) }]} />
        <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Razão de estoque"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell>Local</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Quantidade</TableCell><TableCell>Data</TableCell><TableCell>Responsável</TableCell><TableCell>Ações</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockMovement>(movements.data).map((item) => <TableRow key={item.id}>
            <TableCell>{item.produto}</TableCell><TableCell>{item.localEstoque}</TableCell><TableCell>{movementLabels[item.tipo] ?? item.tipo}</TableCell>
            <TableCell align="right">{formatNumber(item.delta, 3)}</TableCell><TableCell>{formatDateTime(item.ocorridoEm)}</TableCell>
            <TableCell>{item.atorNome ?? 'Não informado'}</TableCell>
            <TableCell><Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => openDetail(item.id)}>Detalhe</Button>
            </TableCell>
          </TableRow>)}
        </TableBody></Table></TableContainer></Card>
        {!movements.data?.content.length && <Alert severity="info">Nenhum movimento encontrado para os filtros.</Alert>}
        <StockPagination total={movements.data?.totalElements ?? 0} page={page} change={setPage} /></Box>
      )}

      <AppDialog open={detail.requested} onClose={detail.close} title="Detalhe do movimento" maxWidth="sm"
        fullScreenOnMobile actions={<>
          {canManage && detail.data && detail.data.tipo !== 'COMPENSACAO' && <Button color="warning" startIcon={<ReplayOutlinedIcon />} onClick={() => { compensation.reset(); setMotivo(''); setCompensating(detail.data!); setCompensationKey(intentKey()); }}>Compensar movimento</Button>}
          <Button onClick={detail.close}>Fechar</Button>
        </>}>
        <QueryFeedback loading={detail.isLoading} error={detail.error} />
        {detail.data && <Stack spacing={1}><Typography>Produto: {detail.data.produto}</Typography><Typography>Local: {detail.data.localEstoque}</Typography><Typography>Tipo: {movementLabels[detail.data.tipo] ?? detail.data.tipo}</Typography>
          <Typography>Quantidade movimentada: {formatNumber(detail.data.delta, 3)}</Typography><Typography>Saldo anterior: {formatNumber(detail.data.saldoAnterior, 3)}</Typography><Typography>Saldo posterior: {formatNumber(detail.data.saldoPosterior, 3)}</Typography>
          <Typography>Responsável: {detail.data.atorNome ?? 'Não informado'}</Typography><Typography>Data: {formatDateTime(detail.data.ocorridoEm)}</Typography><Typography>Motivo: {detail.data.motivo ?? 'Não informado'}</Typography>
          <QueryFeedback loading={origin.isLoading} error={origin.error} />
          {origin.data && (!canReadOrigin ? <Typography color="text.secondary">Seu acesso não permite consultar o documento de origem.</Typography>
            : origin.data.caminho ? <Button component={RouterLink} to={origin.data.caminho}>{origin.data.descricao}</Button> : <Typography color="text.secondary">{origin.data.descricao}</Typography>)}
        </Stack>}
      </AppDialog>

      <AppDialog open={compensating !== null} onClose={() => setCompensating(null)} title="Compensar movimento"
        maxWidth="xs" role="alertdialog" busy={compensation.isPending} actions={<>
          <Button onClick={() => setCompensating(null)}>Cancelar</Button>
          <Button variant="contained" color="warning" disabled={compensation.isPending || !motivo.trim()} onClick={() => compensation.mutate()}>Compensar</Button>
        </>}>
        {compensation.isError && <Alert severity="error" sx={{ mb: 2 }}>{describeError(compensation.error)}</Alert>}
        <TextField autoFocus fullWidth multiline minRows={2} label="Motivo" value={motivo} onChange={(event) => setMotivo(event.target.value)} required />
      </AppDialog>
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
      {!locations.isLoading && !locations.isError && <Box>
        <ListingCards rows={rows<StockLocation>(locations.data)} getKey={(item) => item.id}
          getTitle={(item) => item.nome}
          getFields={(item) => [{ label: 'Situação', value: <Chip size="small" color={item.ativo ? 'success' : 'default'} label={item.ativo ? 'Ativo' : 'Inativo'} /> }]}
          getActions={canManage ? (item) => [
            { key: 'edit', label: 'Editar', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => void loadEdit(item) },
            { key: 'disable', label: 'Inativar', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, disabled: !item.ativo, disabledReason: 'Este local já está inativo.', onClick: () => void prepareDelete(item) },
          ] : undefined}
        />
        <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Locais de estoque"><TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Situação</TableCell>{canManage && <TableCell>Ações</TableCell>}</TableRow></TableHead><TableBody>
          {rows<StockLocation>(locations.data).map((item) => <TableRow key={item.id}><TableCell>{item.nome}</TableCell><TableCell>{item.ativo ? 'Ativo' : 'Inativo'}</TableCell>{canManage && <TableCell><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => void loadEdit(item)}>Editar</Button><Button size="small" color="error" startIcon={<DeleteOutlineIcon />} disabled={!item.ativo} onClick={() => void prepareDelete(item)}>Inativar</Button></TableCell>}</TableRow>)}
        </TableBody></Table></TableContainer></Card>
        {!locations.data?.content.length && <Alert severity="info">Nenhum local de estoque cadastrado.</Alert>}
      </Box>}
      <ResourceFormDialog open={formOpen} title={editing ? 'Editar local de estoque' : 'Novo local de estoque'} fields={stockLocationFields} initialValues={editing ? { ...editing } : null} submitting={save.isPending} conflictMessage={conflict} onReload={editing ? () => void reloadEdit() : undefined} resetKey={revision} onClose={() => { setFormOpen(false); setEditing(null); setVersion(null); setConflict(null); }} onSubmit={(values) => save.mutate(values)} />
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
  useEffect(() => {
    setKey(open ? intentKey() : '');
  }, [open]);

  return <AppDialog open={open} onClose={close} title="Ajustar estoque" maxWidth="sm"
    fullScreenOnMobile busy={mutation.isPending} actions={<>
      <Button onClick={close}>Cancelar</Button>
      <Button type="submit" form="stock-adjustment-form" variant="contained" disabled={mutation.isPending || !key}>Registrar ajuste</Button>
    </>}><Box component="form" id="stock-adjustment-form" onSubmit={submit}>
    <Stack spacing={2}>
      {mutation.isError && <Alert severity="error">{describeError(mutation.error)}</Alert>}
      <TextField select label="Produto" value={values.produtoId} onChange={(event) => setValues({ ...values, produtoId: event.target.value })} required fullWidth>{rows<ProductOption>(products.data).map((item) => <MenuItem key={item.id} value={item.id}>{item.nome}</MenuItem>)}</TextField>
      <TextField select label="Local" value={values.localEstoqueId} onChange={(event) => setValues({ ...values, localEstoqueId: event.target.value })} required fullWidth>{locations.filter((item) => item.ativo).map((item) => <MenuItem key={item.id} value={item.id}>{item.nome}</MenuItem>)}</TextField>
      <NumberField label="Delta" value={values.delta} step={0.001}
        onValueChange={(delta) => setValues({ ...values, delta })}
        helperText="Use valor positivo para entrada e negativo para saída." required />
      <NumberField label="Custo unitário" value={values.custoUnitario} min={0} step={0.01}
        onValueChange={(custoUnitario) => setValues({ ...values, custoUnitario })} />
      <TextField label="Motivo" multiline minRows={2} value={values.motivo} onChange={(event) => setValues({ ...values, motivo: event.target.value })} required />
    </Stack>
  </Box></AppDialog>;
}

export function StockPage() {
  const { activeOrganization, permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabKey = searchParams.get('tab') ?? 'posicao';
  const tabIndex = tabKey === 'razao' || tabKey === 'movimentacoes'
    ? 1
    : tabKey === 'locais'
      ? 2
      : 0;
  const [adjustmentOpen, setAdjustmentOpen] = useState(tabKey === 'ajustes');
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

  useEffect(() => {
    if (tabKey === 'ajustes') setAdjustmentOpen(true);
  }, [tabKey]);

  const setTab = (value: number) => {
    const next = value === 1 ? 'razao' : value === 2 ? 'locais' : 'posicao';
    setSearchParams({ tab: next }, { replace: true });
  };

  if (!canRead || !organizationId) return <Alert severity="warning">Seu contexto não possui permissão de estoque.</Alert>;

  return <Box>
    <PageHeader title="Estoque" subtitle="Saldos por produto e local, entradas, saídas e responsáveis por cada movimentação." action={canAdjust ? <Button variant="contained" startIcon={<TuneOutlinedIcon />} onClick={() => setAdjustmentOpen(true)}>Ajustar estoque</Button> : undefined} />
    {canManage && !permissions.includes('catalog:read') && <Alert severity="info" sx={{ mb: 2 }}>Ajustes exigem também leitura do catálogo para selecionar o produto.</Alert>}
    {tabKey === 'ajustes' && !canAdjust && (
      <Alert severity="info" sx={{ mb: 2 }}>
        Conferência e ajustes exigem permissão de gestão de estoque e leitura do catálogo.
      </Alert>
    )}
    <Card><Tabs value={tabIndex} onChange={(_, value: number) => setTab(value)} variant="scrollable"
      scrollButtons="auto" allowScrollButtonsMobile aria-label="Áreas do estoque"><Tab label="Posição" /><Tab label="Razão" /><Tab label="Locais" /></Tabs></Card>
    <TabPanel current={tabIndex} index={0}><PositionPanel organizationId={organizationId} /></TabPanel>
    <TabPanel current={tabIndex} index={1}><MovementPanel organizationId={organizationId} canManage={canManage} /></TabPanel>
    <TabPanel current={tabIndex} index={2}><LocationsPanel organizationId={organizationId} canManage={canManage} /></TabPanel>
    {canAdjust && (
      <AdjustmentDialog
        open={adjustmentOpen}
        organizationId={organizationId}
        locations={locationOptions}
        onClose={() => {
          setAdjustmentOpen(false);
          if (tabKey === 'ajustes') setSearchParams({ tab: 'posicao' }, { replace: true });
        }}
      />
    )}
  </Box>;
}
