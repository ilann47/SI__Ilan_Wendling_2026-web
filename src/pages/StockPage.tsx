import { useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { isResourcePreconditionConflict, type Page } from '../api/resource';
import {
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
import { ResourceFormPage } from '../components/form/ResourceFormPage';
import { useFormPageLocation } from '../components/form/useFormPageLocation';
import { stockLocationFields } from '../resources/estoque';
import { ReferenceSelect } from '../components/form/ReferenceSelect';
import { ListingCards } from '../components/listing/ListingCards';
import { linkedDetailId, useLinkedDetail } from '../hooks/useLinkedDetail';
import { RecordDetailPage } from '../components/listing/RecordDetailPage';
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
const fiscalMovementOrigins = new Set(['NOTA_ENTRADA', 'NOTA_SAIDA', 'REVERSAO_NOTA_ENTRADA', 'REVERSAO_NOTA_SAIDA']);
const originPermissions: Record<string, string> = { NOTA_ENTRADA: 'fiscal:read', NOTA_SAIDA: 'fiscal:read',
  REVERSAO_NOTA_ENTRADA: 'fiscal:read', REVERSAO_NOTA_SAIDA: 'fiscal:read' };

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
              { label: 'Saldo', value: formatNumber(item.quantidade, 3, 6) },
              { label: 'Mínimo', value: formatNumber(item.quantidadeMinima, 6) },
              { label: 'Situação', value: <Chip size="small" color={item.abaixoMinimo ? 'warning' : 'success'} label={item.abaixoMinimo ? 'Abaixo do mínimo' : 'Regular'} /> },
            ]}
            onOpen={(item) => openMovements(item.produtoId)}
            getOpenLabel={(item) => `Ver movimentos de ${item.produto}`}
          />
          <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Posição de estoque"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell align="right">Saldo</TableCell><TableCell align="right">Mínimo</TableCell><TableCell>Situação</TableCell><TableCell>Histórico</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockPosition>(positions.data).map((item) => <TableRow key={item.produtoId}>
            <TableCell>{item.produto}</TableCell><TableCell align="right">{formatNumber(item.quantidade, 3, 6)}</TableCell><TableCell align="right">{formatNumber(item.quantidadeMinima, 6)}</TableCell>
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
              { label: 'Saldo', value: formatNumber(item.quantidade, 3, 6) },
            ]}
            onOpen={(item) => openMovements(item.produtoId, item.localEstoqueId)}
            getOpenLabel={(item) => `Ver movimentos de ${item.produto} em ${item.localEstoque}`}
          />
          <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Saldos por local"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell>Local</TableCell><TableCell align="right">Saldo</TableCell><TableCell>Histórico</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockBalance>(balances.data).map((item) => <TableRow key={item.id}>
            <TableCell>{item.produto}</TableCell><TableCell>{item.localEstoque}</TableCell><TableCell align="right">{formatNumber(item.quantidade, 3, 6)}</TableCell><TableCell><Button size="small" onClick={() => openMovements(item.produtoId, item.localEstoqueId)}>Ver movimentos</Button></TableCell>
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
const movementRoutes = { listPath: '/app/estoque', detailBase: '/app/estoque/movimentos' };
const newLocationForm = 'novo-local';
const editLocationPrefix = 'editar-local-';

function readMovementDate(value: string | null): string {
  return value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value) && Number.isFinite(Date.parse(value)) ? value : '';
}

function MovementPanel({ organizationId }: { organizationId: number }) {
  const { permissions } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('tipo') ?? '';
  const filters: MovementFilters = {
    produtoId: String(linkedDetailId(searchParams.get('produtoId')) ?? ''),
    localEstoqueId: String(linkedDetailId(searchParams.get('localEstoqueId')) ?? ''),
    tipo: Object.prototype.hasOwnProperty.call(movementLabels, type) ? type : '',
    de: readMovementDate(searchParams.get('de')),
    ate: readMovementDate(searchParams.get('ate')),
  };
  const [draft, setDraft] = useState(filters);
  const page = linkedDetailId(searchParams.get('pagina')) ?? 0;
  const detail = useLinkedDetail(organizationId, 'stock-movement', stockApi.movement, true, true, movementRoutes);
  const origin = useQuery({ queryKey: stockQueryKey(organizationId, 'origin', detail.data?.id, permissions),
    queryFn: () => stockApi.origin(detail.data!.id), enabled: !!detail.data });
  const originPermission = origin.data ? originPermissions[origin.data.tipo] : undefined;
  const canReadOrigin = !originPermission || permissions.includes(originPermission);
  const openDetail = detail.open;
  const closeDetail = () => {
    const tab = searchParams.get('tab');
    if (tab === 'razao' || tab === 'movimentacoes') detail.close();
    else {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'razao');
      next.delete('detail');
      navigate({ pathname: movementRoutes.listPath, search: next.toString() }, { replace: true });
    }
  };
  const applyFilters = (values: MovementFilters) => {
    const next = new URLSearchParams({ tab: 'razao' });
    for (const [field, value] of Object.entries(values)) if (value) next.set(field, value);
    setSearchParams(next, { replace: true });
  };
  const setPage = (value: number) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (value > 0) next.set('pagina', String(value));
    else next.delete('pagina');
    return next;
  }, { replace: true });
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
    enabled: !detail.requested,
  });

  return detail.requested ? (
    <RecordDetailPage title="Detalhe do movimento" onBack={closeDetail}>
      <QueryFeedback loading={detail.isLoading} error={detail.error} />
      {detail.data && <Stack spacing={1}><Typography>Produto: {detail.data.produto}</Typography><Typography>Local: {detail.data.localEstoque}</Typography><Typography>Tipo: {movementLabels[detail.data.tipo] ?? detail.data.tipo}</Typography>
        <Typography>Quantidade movimentada: {formatNumber(detail.data.delta, 3, 6)}</Typography><Typography>Saldo anterior: {formatNumber(detail.data.saldoAnterior, 3, 6)}</Typography><Typography>Saldo posterior: {formatNumber(detail.data.saldoPosterior, 3, 6)}</Typography>
        <Typography>Responsável: {detail.data.atorNome ?? 'Não informado'}</Typography><Typography>Data: {formatDateTime(detail.data.ocorridoEm)}</Typography><Typography>Motivo: {detail.data.motivo ?? 'Não informado'}</Typography>
        {fiscalMovementOrigins.has(detail.data.origemTipo) && <Typography variant="body2" color="text.secondary">
          Movimentos de nota fiscal são revertidos pelo documento de origem, não isoladamente no estoque.
        </Typography>}
        <QueryFeedback loading={origin.isLoading} error={origin.error} />
        {origin.data && (!canReadOrigin ? <Typography color="text.secondary">Seu acesso não permite consultar o documento de origem.</Typography>
          : origin.data.caminho
            ? <Button component={RouterLink} to={origin.data.caminho}>{origin.data.descricao}</Button>
            : <Typography color="text.secondary">{origin.data.descricao}</Typography>)}
      </Stack>}
    </RecordDetailPage>
  ) : (
    <Stack spacing={2}>
      <Card><CardContent><Stack component="form" onSubmit={(event) => { event.preventDefault(); applyFilters(draft); }} direction={{ xs: 'column', lg: 'row' }} spacing={2}>
        <StockReferences draft={draft} change={(field, value) => setDraft({ ...draft, [field]: value })} />
        <TextField select label="Tipo" value={draft.tipo} onChange={(event) => setDraft({ ...draft, tipo: event.target.value })} sx={{ minWidth: 120 }}><MenuItem value="">Todos</MenuItem>{Object.entries(movementLabels).map(([tipo, label]) => <MenuItem key={tipo} value={tipo}>{label}</MenuItem>)}</TextField>
        <TextField label="De" type="datetime-local" value={draft.de} onChange={(event) => setDraft({ ...draft, de: event.target.value })} InputLabelProps={{ shrink: true }} />
        <TextField label="Até" type="datetime-local" value={draft.ate} onChange={(event) => setDraft({ ...draft, ate: event.target.value })} InputLabelProps={{ shrink: true }} />
        <Button type="submit" variant="contained">Filtrar</Button>
        <Button onClick={() => { setDraft(emptyMovementFilters); applyFilters(emptyMovementFilters); }}>Limpar</Button>
      </Stack></CardContent></Card>
      <QueryFeedback loading={movements.isLoading} error={movements.error} />
      {!movements.isLoading && !movements.isError && (
        <Box><ListingCards rows={rows<StockMovement>(movements.data)} getKey={(item) => item.id} getTitle={(item) => item.produto} onOpen={(item) => openDetail(item.id)}
          getFields={(item) => [{ label: 'Local', value: item.localEstoque }, { label: 'Movimento', value: movementLabels[item.tipo] ?? item.tipo },
            { label: 'Quantidade', value: formatNumber(item.delta, 3, 6) }, { label: 'Responsável', value: item.atorNome ?? 'Não informado' }, { label: 'Data', value: formatDateTime(item.ocorridoEm) }]} />
        <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Razão de estoque"><TableHead><TableRow>
          <TableCell>Produto</TableCell><TableCell>Local</TableCell><TableCell>Tipo</TableCell><TableCell align="right">Quantidade</TableCell><TableCell>Data</TableCell><TableCell>Responsável</TableCell><TableCell>Ações</TableCell>
        </TableRow></TableHead><TableBody>
          {rows<StockMovement>(movements.data).map((item) => <TableRow key={item.id}>
            <TableCell>{item.produto}</TableCell><TableCell>{item.localEstoque}</TableCell><TableCell>{movementLabels[item.tipo] ?? item.tipo}</TableCell>
            <TableCell align="right">{formatNumber(item.delta, 3, 6)}</TableCell><TableCell>{formatDateTime(item.ocorridoEm)}</TableCell>
            <TableCell>{item.atorNome ?? 'Não informado'}</TableCell>
            <TableCell><Button size="small" startIcon={<VisibilityOutlinedIcon />} onClick={() => openDetail(item.id)}>Detalhe</Button>
            </TableCell>
          </TableRow>)}
        </TableBody></Table></TableContainer></Card>
        {!movements.data?.content.length && <Alert severity="info">Nenhum movimento encontrado para os filtros.</Alert>}
        <StockPagination total={movements.data?.totalElements ?? 0} page={page} change={setPage} /></Box>
      )}

    </Stack>
  );
}

function StockLocationForm({ organizationId, locationId, onClose }: {
  organizationId: number; locationId: number | null; onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const current = useQuery({
    queryKey: stockQueryKey(organizationId, 'location-form', locationId),
    queryFn: () => stockLocationApi.getVersioned(locationId!),
    enabled: locationId !== null,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const save = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = buildStockLocationPayload(values);
      if (locationId === null) return stockLocationApi.createVersioned(payload);
      if (!current.data) throw new Error('Versão do local indisponível.');
      return stockLocationApi.updateVersioned(locationId, payload, current.data.version);
    },
    onSuccess: () => {
      notify('Local de estoque salvo.', 'success');
      void queryClient.invalidateQueries({ queryKey: stockInvalidationKey(organizationId) });
    },
  });
  const conflict = locationId !== null && isResourcePreconditionConflict(save.error);
  const title = locationId === null ? 'Novo local de estoque' : 'Editar local de estoque';
  const reload = async () => {
    const result = await current.refetch();
    if (result.isSuccess) save.reset();
  };

  if (locationId !== null && !current.data) {
    return <RecordDetailPage title={title} onBack={onClose}
      actions={current.isError && <Button onClick={() => void reload()}>Tentar novamente</Button>}>
      <QueryFeedback loading={current.isLoading} error={current.error} />
    </RecordDetailPage>;
  }
  return <ResourceFormPage title={title} fields={stockLocationFields} initialValues={current.data ? { ...current.data.data } : null}
    submitting={save.isPending} reloading={current.isFetching} submitDisabled={conflict} resetKey={current.dataUpdatedAt}
    error={current.error ? describeError(current.error)
      : conflict ? 'O local foi alterado. Recarregue os dados antes de salvar novamente.'
        : save.error ? describeError(save.error) : null}
    onReload={conflict ? () => void reload() : undefined} onClose={onClose} onSubmit={save.mutateAsync} />;
}

function LocationsPanel({ organizationId, canManage }: { organizationId: number; canManage: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const form = useFormPageLocation();
  const [deleting, setDeleting] = useState<{ row: StockLocation; version: number } | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const locations = useQuery({
    queryKey: stockQueryKey(organizationId, 'locations'),
    queryFn: () => stockLocationApi.list({ size: 100, sort: 'nome,asc' }),
  });
  const invalidate = () => queryClient.invalidateQueries({
    queryKey: stockInvalidationKey(organizationId),
  });
  const loadEdit = (row: StockLocation) => form.open(`${editLocationPrefix}${row.id}`);
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
      {canManage && <Button variant="contained" startIcon={<AddOutlinedIcon />} sx={{ alignSelf: 'flex-start' }} onClick={() => form.open(newLocationForm)}>Novo local</Button>}
      <QueryFeedback loading={locations.isLoading} error={locations.error} />
      {!locations.isLoading && !locations.isError && <Box>
        <ListingCards rows={rows<StockLocation>(locations.data)} getKey={(item) => item.id}
          getTitle={(item) => item.nome}
          getFields={(item) => [{ label: 'Situação', value: <Chip size="small" color={item.ativo ? 'success' : 'default'} label={item.ativo ? 'Ativo' : 'Inativo'} /> }]}
          getActions={canManage ? (item) => [
            { key: 'edit', label: 'Editar', icon: <EditOutlinedIcon fontSize="small" />, onClick: () => loadEdit(item) },
            { key: 'disable', label: 'Inativar', icon: <DeleteOutlineIcon fontSize="small" />, danger: true, disabled: !item.ativo, disabledReason: 'Este local já está inativo.', onClick: () => void prepareDelete(item) },
          ] : undefined}
        />
        <Card sx={{ display: { xs: 'none', md: 'block' } }}><TableContainer><Table size="small" aria-label="Locais de estoque"><TableHead><TableRow><TableCell>Nome</TableCell><TableCell>Situação</TableCell>{canManage && <TableCell>Ações</TableCell>}</TableRow></TableHead><TableBody>
          {rows<StockLocation>(locations.data).map((item) => <TableRow key={item.id}><TableCell>{item.nome}</TableCell><TableCell>{item.ativo ? 'Ativo' : 'Inativo'}</TableCell>{canManage && <TableCell><Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => loadEdit(item)}>Editar</Button><Button size="small" color="error" startIcon={<DeleteOutlineIcon />} disabled={!item.ativo} onClick={() => void prepareDelete(item)}>Inativar</Button></TableCell>}</TableRow>)}
        </TableBody></Table></TableContainer></Card>
        {!locations.data?.content.length && <Alert severity="info">Nenhum local de estoque cadastrado.</Alert>}
      </Box>}
      <ConfirmDialog open={deleting !== null} title="Inativar local de estoque" message={deleteConflict ? 'O local foi alterado. A versão atual foi recarregada; revise e confirme novamente.' : 'Confirma a inativação deste local?'} confirmLabel={deleteConflict ? 'Tentar novamente' : 'Inativar'} confirmColor="error" loading={remove.isPending} onConfirm={() => remove.mutate()} onClose={() => { setDeleting(null); setDeleteConflict(false); }} />
    </Stack>
  );
}

export function StockPage() {
  const { activeOrganization, permissions } = useAuth();
  const { detailId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const form = useFormPageLocation();
  const tabKey = searchParams.get('tab') ?? 'posicao';
  const tabIndex = detailId !== undefined || tabKey === 'razao' || tabKey === 'movimentacoes'
    ? 1
    : tabKey === 'locais'
      ? 2
      : 0;
  const organizationId = activeOrganization?.organizationId;
  const canRead = permissions.includes('stock:read');
  const canManage = permissions.includes('stock:manage');
  const setTab = (value: number) => {
    const next = value === 1 ? 'razao' : value === 2 ? 'locais' : 'posicao';
    setSearchParams({ tab: next }, { replace: true });
  };

  if (!canRead || !organizationId) return <Alert severity="warning">Seu contexto não possui permissão de estoque.</Alert>;

  if (tabIndex === 2 && canManage) {
    const editId = form.name?.startsWith(editLocationPrefix) ? linkedDetailId(form.name.slice(editLocationPrefix.length)) : null;
    if (form.name === newLocationForm || editId !== null) return <StockLocationForm key={`${organizationId}:${form.name}`}
      organizationId={organizationId} locationId={editId} onClose={form.close} />;
  }

  const showingMovement = tabIndex === 1 && (detailId !== undefined || linkedDetailId(searchParams.get('detail')) !== null);
  return <Box>
    {!showingMovement && <>
    <PageHeader title="Estoque" subtitle="Saldos por produto e local, entradas, saídas e responsáveis por cada movimentação." />
    <Card><Tabs value={tabIndex} onChange={(_, value: number) => setTab(value)} variant="scrollable"
      scrollButtons="auto" allowScrollButtonsMobile aria-label="Áreas do estoque"><Tab label="Posição" /><Tab label="Razão" /><Tab label="Locais" /></Tabs></Card>
    </>}
    <TabPanel current={tabIndex} index={0}><PositionPanel organizationId={organizationId} /></TabPanel>
    <TabPanel current={tabIndex} index={1}><MovementPanel organizationId={organizationId} /></TabPanel>
    <TabPanel current={tabIndex} index={2}><LocationsPanel organizationId={organizationId} canManage={canManage} /></TabPanel>
  </Box>;
}
