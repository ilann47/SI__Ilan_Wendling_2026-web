import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
import PriceChangeOutlinedIcon from '@mui/icons-material/PriceChangeOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, describeError, ifMatchHeaders } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { OperationCard } from '../components/enterprise/OperationCard';
import { ResourceIdField } from '../components/enterprise/ResourceIdField';
import { ResourceSnapshot } from '../components/enterprise/ResourceSnapshot';
import { facilityCategories } from '../features/facilities/spaceImport';
import { fromApiDateTime, fromNowLocalInput, toApiDateTime } from '../utils/dateTime';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import type { WorkspaceResource } from '../workspace/workspaceStore';
import { useAuth } from '../auth/AuthContext';
import { tenantQueryKey } from '../api/queryKeys';
import { eventCatalogApi, type AllocationResponse, type EventResponse,
  type PriceTierResponse, type ProductResponse } from '../api/eventCatalog';

interface AvailabilityResponse {
  eventId: number; asOf: string; totalAvailable: number; guaranteesHold: boolean;
  items: Array<{
    productId: number; parkingAllocationId: number; name: string; category: string;
    availableQuantity: number; priceTierId?: number; priceTierName?: string; price?: number;
    currency?: string; salesEndsAt?: string;
  }>;
}

function recentSnapshot<T>(items: WorkspaceResource[], id: string): T | null {
  const resource = items.find((item) => item.id === Number(id));
  return resource?.snapshot ? resource.snapshot as T : null;
}

function EventSetup({ catalog, loadingCatalog, catalogError, refreshCatalog }: {
  catalog: EventResponse[]; loadingCatalog: boolean; catalogError: unknown;
  refreshCatalog: () => void;
}) {
  const { permissions } = useAuth();
  const { recent, remember } = useOperationalWorkspace();
  const canCreate = permissions.includes('events:create');
  const canPublish = permissions.includes('events:publish');
  const canOperate = permissions.includes('access:operate');
  const allowedActions = [
    canCreate && { value: 'update', label: 'Alterar politica de reentrada' },
    canPublish && { value: 'publication', label: 'Publicar evento' },
    canPublish && { value: 'sales-opening', label: 'Abrir vendas' },
    canPublish && { value: 'sales-closing', label: 'Encerrar vendas' },
    canOperate && { value: 'operation-start', label: 'Iniciar operacao' },
    canOperate && { value: 'operation-closing', label: 'Encerrar operacao' },
  ].filter(Boolean) as { value: string; label: string }[];
  const events = recent('event');
  const [form, setForm] = useState({
    name: '', venueId: '', startsAt: fromNowLocalInput(24 * 60), endsAt: fromNowLocalInput(27 * 60),
    timeZone: 'America/Sao_Paulo', externalId: '',
  });
  const [eventRef, setEventRef] = useState({ id: '', version: '0', status: 'RASCUNHO', name: '' });
  const [reentryPolicy, setReentryPolicy] = useState('ENTRADA_UNICA');
  const [action, setAction] = useState(() => allowedActions[0]?.value ?? '');
  const [salesStartsAt, setSalesStartsAt] = useState('');
  const [result, setResult] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (data: EventResponse) => {
    setResult(data);
    setEventRef({ id: String(data.id), version: String(data.version), status: data.status, name: data.name });
    setReentryPolicy(data.reentryPolicy ?? 'ENTRADA_UNICA');
    remember('event', { id: data.id, label: data.name, version: data.version, snapshot: { ...data } });
  };

  const create = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<EventResponse>('/api/v1/events', {
        name: form.name,
        venueId: Number(form.venueId),
        startsAt: toApiDateTime(form.startsAt),
        endsAt: toApiDateTime(form.endsAt),
        timeZone: form.timeZone,
        externalId: form.externalId.trim() || null,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data);
      refreshCatalog();
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };

  const chooseEvent = (id: string) => {
    setEventRef((current) => ({ ...current, id }));
    const snapshot = recentSnapshot<EventResponse>(events, id);
    if (snapshot) accept(snapshot);
  };

  const execute = async () => {
    setLoading(true); setError(null);
    try {
      const id = Number(eventRef.id);
      const headers = ifMatchHeaders(Number(eventRef.version));
      let response;
      if (action === 'update') {
        response = await api.patch<EventResponse>(`/api/v1/events/${id}`, { reentryPolicy }, { headers });
      } else if (action === 'publication') {
        response = await api.post<EventResponse>(`/api/v1/events/${id}/publication`, { confirmed: true }, { headers });
      } else if (action === 'sales-opening') {
        response = await api.post<EventResponse>(`/api/v1/events/${id}/sales-opening`, {
          startsAt: salesStartsAt ? toApiDateTime(salesStartsAt) : null,
        }, { headers });
      } else if (action === 'sales-closing') {
        response = await api.post<EventResponse>(`/api/v1/events/${id}/sales-closing`, { confirmed: true }, { headers });
      } else if (action === 'operation-start') {
        response = await api.post<EventResponse>(`/api/v1/events/${id}/operation-start`, { confirmed: true }, { headers });
      } else {
        response = await api.post<EventResponse>(`/api/v1/events/${id}/operation-closing`, {
          confirmed: true, financialPendingAcknowledged: true,
        }, { headers });
      }
      accept(response.data);
      refreshCatalog();
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };

  return (
    <Stack spacing={2}>
      <Card>
        {loadingCatalog ? <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}><CircularProgress /></Box>
          : catalogError ? <Alert severity="error">{describeError(catalogError)}</Alert>
            : catalog.length === 0 ? <Alert severity="info">Nenhum evento cadastrado.</Alert>
              : <TableContainer><Table size="small"><TableHead><TableRow>
                <TableCell>Evento</TableCell><TableCell>Inicio</TableCell><TableCell>Status</TableCell>
                <TableCell>Versao</TableCell><TableCell>Acoes</TableCell>
              </TableRow></TableHead><TableBody>{catalog.map((item) => <TableRow key={item.id} hover
                selected={eventRef.id === String(item.id)}>
                <TableCell>{item.name}<Typography variant="caption" display="block" color="text.secondary">#{item.id}</Typography></TableCell>
                <TableCell>{new Date(item.startsAt).toLocaleString('pt-BR')}</TableCell>
                <TableCell><Chip size="small" label={item.status} /></TableCell><TableCell>{item.version}</TableCell>
                <TableCell><Button size="small" onClick={() => accept(item)}>Selecionar</Button></TableCell>
              </TableRow>)}</TableBody></Table></TableContainer>}
      </Card>
      {canCreate && <OperationCard title="Criar evento" description="A chave idempotente e gerada por tentativa de criacao." error={error}>
        <Stack component="form" spacing={2} onSubmit={(event) => void create(event)}>
          <TextField label="Nome do evento" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          <ResourceIdField label="ID do local (Venue)" value={form.venueId} onChange={(venueId) => setForm((current) => ({ ...current, venueId }))} recent={recent('venue')} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Inicio" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
            <TextField label="Fim" type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Fuso horario IANA" value={form.timeZone} onChange={(event) => setForm((current) => ({ ...current, timeZone: event.target.value }))} required fullWidth />
            <TextField label="ID externo" value={form.externalId} onChange={(event) => setForm((current) => ({ ...current, externalId: event.target.value }))} fullWidth />
          </Stack>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <EventAvailableOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar evento</Button>
        </Stack>
      </OperationCard>}
      {allowedActions.length > 0 && <OperationCard
        title="Ciclo de vida"
        description="Selecione um evento da listagem para executar as transicoes permitidas."
        error={error}
        result={result ? <ResourceSnapshot data={{ id: result.id, name: result.name, status: result.status, reentryPolicy: result.reentryPolicy, version: result.version, configurationChecklist: result.configurationChecklist }} /> : undefined}
      >
        <ResourceIdField label="ID do evento" value={eventRef.id} onChange={chooseEvent} recent={events} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Versao" type="number" value={eventRef.version} onChange={(event) => setEventRef((current) => ({ ...current, version: event.target.value }))} inputProps={{ min: 0 }} required fullWidth />
          <TextField label="Estado conhecido" value={eventRef.status} onChange={(event) => setEventRef((current) => ({ ...current, status: event.target.value }))} fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select label="Operacao" value={action} onChange={(event) => setAction(event.target.value)} fullWidth>
            {allowedActions.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
          </TextField>
          {action === 'update' && <TextField select label="Politica de reentrada" value={reentryPolicy} onChange={(event) => setReentryPolicy(event.target.value)} fullWidth><MenuItem value="ENTRADA_UNICA">Entrada unica</MenuItem><MenuItem value="REENTRADA_PERMITIDA">Reentrada permitida</MenuItem></TextField>}
          {action === 'sales-opening' && <TextField label="Inicio das vendas (opcional)" type="datetime-local" value={salesStartsAt} onChange={(event) => setSalesStartsAt(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />}
        </Stack>
        {action === 'operation-closing' && <Alert severity="warning">O backend exige confirmacao explicita de que a pendencia financeira externa foi reconhecida.</Alert>}
        <Button variant="contained" disabled={loading || !eventRef.id} onClick={() => void execute()} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PublishOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Executar operacao</Button>
      </OperationCard>}
    </Stack>
  );
}

function AllocationSetup({ events }: { events: EventResponse[] }) {
  const { activeOrganization, permissions } = useAuth();
  const queryClient = useQueryClient();
  const orgId = activeOrganization?.organizationId;
  const canManage = permissions.includes('inventory:manage');
  const { recent, remember } = useOperationalWorkspace();
  const allocations = recent('allocation');
  const [eventId, setEventId] = useState('');
  const [form, setForm] = useState({
    parkingFacilityId: '', startsAt: fromNowLocalInput(23 * 60), endsAt: fromNowLocalInput(28 * 60),
    operationalCapacity: '100', sellableCapacity: '90', reservedCapacity: '10',
  });
  const [allocationRef, setAllocationRef] = useState({ id: '', version: '0' });
  const [result, setResult] = useState<AllocationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const allocationKey = orgId && eventId
    ? tenantQueryKey(orgId, 'event-allocations', Number(eventId))
    : ['event-allocations', Number(eventId)];
  const catalog = useQuery({ queryKey: allocationKey,
    queryFn: () => eventCatalogApi.listAllocations(Number(eventId)),
    enabled: !!orgId && !!eventId });
  const capacities = () => ({
    operationalCapacity: Number(form.operationalCapacity),
    sellableCapacity: Number(form.sellableCapacity),
    reservedCapacity: Number(form.reservedCapacity),
  });
  const accept = (data: AllocationResponse) => {
    setResult(data); setAllocationRef({ id: String(data.id), version: String(data.version) });
    remember('allocation', { id: data.id, label: `Evento ${data.eventId} / Patio ${data.parkingFacilityId}`, version: data.version, snapshot: { ...data } });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<AllocationResponse>(`/api/v1/events/${Number(eventId)}/parking-allocations`, {
        parkingFacilityId: Number(form.parkingFacilityId), startsAt: toApiDateTime(form.startsAt), endsAt: toApiDateTime(form.endsAt), ...capacities(),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data);
      void queryClient.invalidateQueries({ queryKey: allocationKey });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  const update = async () => {
    setLoading(true); setError(null);
    try {
      const response = await api.patch<AllocationResponse>(`/api/v1/parking-allocations/${Number(allocationRef.id)}`, capacities(), { headers: ifMatchHeaders(Number(allocationRef.version)) });
      accept(response.data);
      void queryClient.invalidateQueries({ queryKey: allocationKey });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  const choose = (id: string) => {
    setAllocationRef((current) => ({ ...current, id }));
    const snapshot = recentSnapshot<AllocationResponse>(allocations, id);
    if (snapshot) {
      accept(snapshot);
      setForm((current) => ({ ...current, operationalCapacity: String(snapshot.operationalCapacity), sellableCapacity: String(snapshot.sellableCapacity), reservedCapacity: String(snapshot.reservedCapacity) }));
    }
  };
  return (
    <Stack spacing={2}>
    <Card><Stack spacing={1.5} sx={{ p: 2 }}><TextField select label="Evento para listar alocacoes"
      value={eventId} onChange={(event) => setEventId(event.target.value)} fullWidth>
      {events.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name} #{item.id}</MenuItem>)}
    </TextField>{catalog.isLoading ? <CircularProgress size={24} /> : catalog.isError
      ? <Alert severity="error">{describeError(catalog.error)}</Alert> : eventId && catalog.data?.length === 0
        ? <Alert severity="info">Nenhuma alocacao neste evento.</Alert> : catalog.data && catalog.data.length > 0
          ? <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Patio</TableCell>
            <TableCell>Operacional</TableCell><TableCell>Vendavel</TableCell><TableCell>Reservada</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>{catalog.data.map((item) => <TableRow key={item.id} hover selected={allocationRef.id === String(item.id)}>
              <TableCell>#{item.parkingFacilityId}</TableCell><TableCell>{item.operationalCapacity}</TableCell>
              <TableCell>{item.sellableCapacity}</TableCell><TableCell>{item.reservedCapacity}</TableCell>
              <TableCell><Button size="small" onClick={() => { accept(item); setForm((current) => ({ ...current,
                operationalCapacity: String(item.operationalCapacity), sellableCapacity: String(item.sellableCapacity),
                reservedCapacity: String(item.reservedCapacity) })); }}>Selecionar</Button></TableCell>
            </TableRow>)}</TableBody></Table></TableContainer> : null}</Stack></Card>
    {canManage && <OperationCard title="Alocacao evento-patio" description="Capacidade vendavel + reservada nao pode superar a operacional." error={error} result={result ? <ResourceSnapshot data={{ id: result.id, eventId: result.eventId, parkingFacilityId: result.parkingFacilityId, operationalCapacity: result.operationalCapacity, sellableCapacity: result.sellableCapacity, reservedCapacity: result.reservedCapacity, version: result.version }} /> : undefined}>
      <Stack component="form" spacing={2} onSubmit={(event) => void create(event)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ResourceIdField label="ID do evento" value={eventId} onChange={setEventId} recent={recent('event')} />
          <ResourceIdField label="ID do patio" value={form.parkingFacilityId} onChange={(parkingFacilityId) => setForm((current) => ({ ...current, parkingFacilityId }))} recent={recent('facility')} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Inicio da alocacao" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
          <TextField label="Fim da alocacao" type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {(['operationalCapacity', 'sellableCapacity', 'reservedCapacity'] as const).map((field) => <TextField key={field} label={{ operationalCapacity: 'Capacidade operacional', sellableCapacity: 'Capacidade vendavel', reservedCapacity: 'Capacidade reservada' }[field]} type="number" value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} inputProps={{ min: field === 'operationalCapacity' ? 1 : 0 }} required fullWidth />)}
        </Stack>
        <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <InventoryOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar alocacao</Button>
      </Stack>
      <Alert severity="info">Selecione uma alocacao da listagem acima para alterar suas capacidades.</Alert>
      <ResourceIdField label="ID da alocacao" value={allocationRef.id} onChange={choose} recent={allocations} />
      <TextField label="Versao da alocacao" type="number" value={allocationRef.version} onChange={(event) => setAllocationRef((current) => ({ ...current, version: event.target.value }))} inputProps={{ min: 0 }} required />
      <Button variant="outlined" disabled={loading || !allocationRef.id} onClick={() => void update()} sx={{ alignSelf: 'flex-start' }}>Atualizar capacidades</Button>
    </OperationCard>}
    </Stack>
  );
}

function ProductSetup({ events }: { events: EventResponse[] }) {
  const { activeOrganization, permissions } = useAuth();
  const queryClient = useQueryClient();
  const orgId = activeOrganization?.organizationId;
  const canManage = permissions.includes('pricing:manage');
  const { recent, remember } = useOperationalWorkspace();
  const products = recent('product');
  const allocations = recent('allocation');
  const [eventId, setEventId] = useState('');
  const [form, setForm] = useState({ name: '', category: 'COMUM', allocationId: '', accessStartsAt: fromNowLocalInput(23 * 60), accessEndsAt: fromNowLocalInput(28 * 60), quota: '50', benefits: '', restrictions: '' });
  const [productRef, setProductRef] = useState({ id: '', version: '0' });
  const [result, setResult] = useState<ProductResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const productKey = orgId && eventId ? tenantQueryKey(orgId, 'event-products', Number(eventId))
    : ['event-products', Number(eventId)];
  const allocationKey = orgId && eventId ? tenantQueryKey(orgId, 'event-allocations', Number(eventId))
    : ['event-allocations', Number(eventId)];
  const catalog = useQuery({ queryKey: productKey, queryFn: () => eventCatalogApi.listProducts(Number(eventId)),
    enabled: !!orgId && !!eventId });
  const allocationCatalog = useQuery({ queryKey: allocationKey,
    queryFn: () => eventCatalogApi.listAllocations(Number(eventId)), enabled: !!orgId && !!eventId });
  const accept = (data: ProductResponse) => {
    setResult(data); setProductRef({ id: String(data.id), version: String(data.version) });
    remember('product', { id: data.id, label: data.name, version: data.version, snapshot: { ...data } });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<ProductResponse>(`/api/v1/events/${Number(eventId)}/parking-products`, {
        name: form.name, category: form.category, parkingAllocationId: Number(form.allocationId),
        accessStartsAt: toApiDateTime(form.accessStartsAt), accessEndsAt: toApiDateTime(form.accessEndsAt),
        right: 'ESTACIONAMENTO_EVENTO', quota: Number(form.quota),
        benefits: form.benefits.split(',').map((item) => item.trim()).filter(Boolean),
        restrictions: form.restrictions.split(',').map((item) => item.trim()).filter(Boolean),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data);
      void queryClient.invalidateQueries({ queryKey: productKey });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  const publish = async () => {
    setLoading(true); setError(null);
    try {
      const response = await api.post<ProductResponse>(`/api/v1/parking-products/${Number(productRef.id)}/publication`, { confirmed: true }, { headers: ifMatchHeaders(Number(productRef.version)) });
      accept(response.data);
      void queryClient.invalidateQueries({ queryKey: productKey });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  const choose = (id: string) => {
    setProductRef((current) => ({ ...current, id }));
    const snapshot = recentSnapshot<ProductResponse>(products, id); if (snapshot) accept(snapshot);
  };
  const chooseAllocation = (allocationId: string) => {
    const allocation = allocationCatalog.data?.find((item) => item.id === Number(allocationId))
      ?? recentSnapshot<AllocationResponse>(allocations, allocationId);
    setForm((current) => allocation ? {
      ...current,
      allocationId,
      accessStartsAt: fromApiDateTime(allocation.startsAt),
      accessEndsAt: fromApiDateTime(allocation.endsAt),
      quota: String(allocation.sellableCapacity),
    } : { ...current, allocationId });
    if (allocation) setEventId(String(allocation.eventId));
  };
  return (
    <Stack spacing={2}>
    <Card><Stack spacing={1.5} sx={{ p: 2 }}><TextField select label="Evento para listar produtos"
      value={eventId} onChange={(event) => setEventId(event.target.value)} fullWidth>
      {events.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name} #{item.id}</MenuItem>)}
    </TextField>{catalog.isLoading ? <CircularProgress size={24} /> : catalog.isError
      ? <Alert severity="error">{describeError(catalog.error)}</Alert> : eventId && catalog.data?.length === 0
        ? <Alert severity="info">Nenhum produto neste evento.</Alert> : catalog.data && catalog.data.length > 0
          ? <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Produto</TableCell><TableCell>Categoria</TableCell>
            <TableCell>Quota</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead><TableBody>
            {catalog.data.map((item) => <TableRow key={item.id} hover selected={productRef.id === String(item.id)}>
              <TableCell>{item.name}<Typography variant="caption" display="block" color="text.secondary">#{item.id}</Typography></TableCell>
              <TableCell>{item.category}</TableCell><TableCell>{item.quota}</TableCell><TableCell><Chip size="small" label={item.status} /></TableCell>
              <TableCell><Button size="small" onClick={() => accept(item)}>Selecionar</Button></TableCell>
            </TableRow>)}</TableBody></Table></TableContainer> : null}</Stack></Card>
    {canManage && <OperationCard title="Produto de estacionamento" description="A quota pertence a uma unica alocacao de patio e o direito da Fase 1 e estacionamento de evento." error={error} result={result ? <ResourceSnapshot data={{ id: result.id, eventId: result.eventId, name: result.name, category: result.category, quota: result.quota, status: result.status, version: result.version }} /> : undefined}>
      <Stack component="form" spacing={2} onSubmit={(event) => void create(event)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ResourceIdField label="ID do evento" value={eventId} onChange={setEventId} recent={recent('event')} />
          <ResourceIdField label="ID da alocacao" value={form.allocationId}
            onChange={chooseAllocation} recent={allocations} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
          <TextField select label="Categoria" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} fullWidth>{facilityCategories.map((category) => <MenuItem key={category} value={category}>{category}</MenuItem>)}</TextField>
          <TextField label="Quota" type="number" value={form.quota} onChange={(event) => setForm((current) => ({ ...current, quota: event.target.value }))} inputProps={{ min: 1 }} required fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Inicio do acesso" type="datetime-local" value={form.accessStartsAt} onChange={(event) => setForm((current) => ({ ...current, accessStartsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
          <TextField label="Fim do acesso" type="datetime-local" value={form.accessEndsAt} onChange={(event) => setForm((current) => ({ ...current, accessEndsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
        </Stack>
        <TextField label="Beneficios (separados por virgula)" value={form.benefits} onChange={(event) => setForm((current) => ({ ...current, benefits: event.target.value }))} />
        <TextField label="Restricoes (separadas por virgula)" value={form.restrictions} onChange={(event) => setForm((current) => ({ ...current, restrictions: event.target.value }))} />
        <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PriceChangeOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar produto</Button>
      </Stack>
      <ResourceIdField label="ID do produto para publicacao" value={productRef.id} onChange={choose} recent={products} />
      <TextField label="Versao do produto" type="number" value={productRef.version} onChange={(event) => setProductRef((current) => ({ ...current, version: event.target.value }))} inputProps={{ min: 0 }} required />
      <Button variant="outlined" disabled={loading || !productRef.id} onClick={() => void publish()} startIcon={<PublishOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Publicar produto</Button>
    </OperationCard>}
    </Stack>
  );
}

function PriceTierSetup({ events }: { events: EventResponse[] }) {
  const { activeOrganization, permissions } = useAuth();
  const queryClient = useQueryClient();
  const orgId = activeOrganization?.organizationId;
  const canManage = permissions.includes('pricing:manage');
  const { recent, remember } = useOperationalWorkspace();
  const [eventId, setEventId] = useState('');
  const [productId, setProductId] = useState('');
  const [form, setForm] = useState({ name: 'Lote 1', price: '50.00', currency: 'BRL', salesStartsAt: fromNowLocalInput(0), salesEndsAt: fromNowLocalInput(20 * 60), quantity: '50', priority: '0' });
  const [result, setResult] = useState<PriceTierResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const productKey = orgId && eventId ? tenantQueryKey(orgId, 'event-products', Number(eventId))
    : ['event-products', Number(eventId)];
  const tierKey = orgId && productId ? tenantQueryKey(orgId, 'product-price-tiers', Number(productId))
    : ['product-price-tiers', Number(productId)];
  const productsCatalog = useQuery({ queryKey: productKey,
    queryFn: () => eventCatalogApi.listProducts(Number(eventId)), enabled: !!orgId && !!eventId });
  const tiersCatalog = useQuery({ queryKey: tierKey,
    queryFn: () => eventCatalogApi.listPriceTiers(Number(productId)), enabled: !!orgId && !!productId });
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<PriceTierResponse>(`/api/v1/parking-products/${Number(productId)}/price-tiers`, {
        name: form.name, price: Number(form.price), currency: form.currency.toUpperCase(),
        salesStartsAt: toApiDateTime(form.salesStartsAt), salesEndsAt: toApiDateTime(form.salesEndsAt),
        quantity: Number(form.quantity), priority: Number(form.priority),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      setResult(response.data);
      remember('priceTier', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      void queryClient.invalidateQueries({ queryKey: tierKey });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <Stack spacing={2}>
    <Card><Stack spacing={1.5} sx={{ p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField select label="Evento" value={eventId} onChange={(event) => { setEventId(event.target.value); setProductId(''); }} fullWidth>
        {events.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name} #{item.id}</MenuItem>)}</TextField>
      <TextField select label="Produto para listar lotes" value={productId} onChange={(event) => setProductId(event.target.value)} fullWidth>
        {(productsCatalog.data ?? []).map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name} #{item.id}</MenuItem>)}</TextField>
    </Stack>{tiersCatalog.isLoading ? <CircularProgress size={24} /> : tiersCatalog.isError
      ? <Alert severity="error">{describeError(tiersCatalog.error)}</Alert> : productId && tiersCatalog.data?.length === 0
        ? <Alert severity="info">Nenhum lote de preco neste produto.</Alert> : tiersCatalog.data && tiersCatalog.data.length > 0
          ? <TableContainer><Table size="small"><TableHead><TableRow><TableCell>Lote</TableCell><TableCell>Preco</TableCell>
            <TableCell>Quantidade</TableCell><TableCell>Prioridade</TableCell></TableRow></TableHead><TableBody>
            {tiersCatalog.data.map((item) => <TableRow key={item.id} hover><TableCell>{item.name} #{item.id}</TableCell>
              <TableCell>{item.currency} {Number(item.price).toFixed(2)}</TableCell><TableCell>{item.quantity}</TableCell>
              <TableCell>{item.priority}</TableCell></TableRow>)}</TableBody></Table></TableContainer> : null}</Stack></Card>
    {canManage && <OperationCard title="Lote de preco" description="Janelas de venda, quantidade e prioridade determinam o lote vigente." error={error} result={result ? <ResourceSnapshot data={{ id: result.id, parkingProductId: result.parkingProductId, name: result.name, price: result.price, currency: result.currency, quantity: result.quantity, priority: result.priority, version: result.version }} /> : undefined}>
      <Stack component="form" spacing={2} onSubmit={(event) => void submit(event)}>
        <ResourceIdField label="ID do produto" value={productId} onChange={setProductId} recent={recent('product')} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
          <TextField label="Preco" type="number" value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} required fullWidth />
          <TextField label="Moeda" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} inputProps={{ maxLength: 3 }} required fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Inicio das vendas" type="datetime-local" value={form.salesStartsAt} onChange={(event) => setForm((current) => ({ ...current, salesStartsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
          <TextField label="Fim das vendas" type="datetime-local" value={form.salesEndsAt} onChange={(event) => setForm((current) => ({ ...current, salesEndsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Quantidade" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 1 }} required fullWidth />
          <TextField label="Prioridade" type="number" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} inputProps={{ min: 0 }} required fullWidth />
        </Stack>
        <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PriceChangeOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar lote</Button>
      </Stack>
    </OperationCard>}
    </Stack>
  );
}

function AvailabilityPanel({ events }: { events: EventResponse[] }) {
  const { recent } = useOperationalWorkspace();
  const [eventId, setEventId] = useState('');
  const [category, setCategory] = useState('');
  const [result, setResult] = useState<AvailabilityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const response = await api.get<AvailabilityResponse>(`/api/v1/events/${Number(eventId)}/availability`, { params: { category: category || undefined } });
      setResult(response.data);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationCard title="Disponibilidade publicada" description="Consulta forte de leitura. A disponibilidade somente e garantida depois da criacao de um hold." error={error}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField select label="Evento" value={eventId} onChange={(event) => setEventId(event.target.value)} fullWidth>
          {events.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name} #{item.id}</MenuItem>)}
          {events.length === 0 && recent('event').map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.label} #{item.id}</MenuItem>)}
        </TextField>
        <TextField select label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)} fullWidth><MenuItem value="">Todas</MenuItem>{facilityCategories.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}</TextField>
        <Button variant="contained" disabled={loading || !eventId} onClick={() => void load()} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <InventoryOutlinedIcon />}>Consultar</Button>
      </Stack>
      {result && (
        <Stack spacing={1.5}>
          <ResourceSnapshot data={{ eventId: result.eventId, asOf: result.asOf, totalAvailable: result.totalAvailable, guaranteesHold: result.guaranteesHold }} />
          {result.items.length === 0 ? <Alert severity="info">Nenhum produto disponivel para o filtro.</Alert> : result.items.map((item) => (
            <Box key={item.productId} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                <div><Typography variant="subtitle2">{item.name}</Typography><Typography variant="caption" color="text.secondary">{item.category} · Produto #{item.productId}</Typography></div>
                <div><Typography variant="h6">{item.availableQuantity} vagas</Typography><Typography variant="caption" color="text.secondary">{item.price != null ? `${item.currency} ${Number(item.price).toFixed(2)}` : 'Sem lote vigente'}</Typography></div>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </OperationCard>
  );
}

export function EventsPage() {
  const { permissions, activeOrganization } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const eventsKey = orgId ? tenantQueryKey(orgId, 'events') : ['events'];
  const eventsQuery = useQuery({ queryKey: eventsKey, queryFn: eventCatalogApi.listEvents,
    enabled: !!orgId && permissions.includes('events:read') });
  const events = eventsQuery.data?.content ?? [];
  const [tab, setTab] = useState(0);
  const panels = [
    (permissions.includes('events:read') || permissions.includes('events:create') || permissions.includes('events:publish') || permissions.includes('access:operate'))
      && { label: 'Evento', content: <EventSetup catalog={events} loadingCatalog={eventsQuery.isLoading}
        catalogError={eventsQuery.error} refreshCatalog={() => { void eventsQuery.refetch(); }} /> },
    (permissions.includes('inventory:read') || permissions.includes('inventory:manage'))
      && { label: 'Alocacao', content: <AllocationSetup events={events} /> },
    (permissions.includes('pricing:read') || permissions.includes('pricing:manage'))
      && { label: 'Produto', content: <ProductSetup events={events} /> },
    (permissions.includes('pricing:read') || permissions.includes('pricing:manage'))
      && { label: 'Lote de preco', content: <PriceTierSetup events={events} /> },
    { label: 'Disponibilidade', content: <AvailabilityPanel events={events} /> },
  ].filter(Boolean) as { label: string; content: ReactNode }[];
  useEffect(() => {
    if (tab >= panels.length) setTab(0);
  }, [panels.length, tab]);
  return (
    <Box>
      <PageHeader title="Eventos e ofertas" subtitle="Configure o evento, inventario vendavel, produto e preco antes de abrir vendas." />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>
        {panels.map((panel) => <Tab key={panel.label} label={panel.label} />)}
      </Tabs>
      {panels[tab]?.content}
    </Box>
  );
}
