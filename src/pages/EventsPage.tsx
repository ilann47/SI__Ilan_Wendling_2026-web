import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import InventoryOutlinedIcon from '@mui/icons-material/InventoryOutlined';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, describeError, ifMatchHeaders } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { NumberField } from '../components/form/NumberField';
import { OperationalFormPage } from '../components/form/OperationalFormPage';
import { useFormPageLocation } from '../components/form/useFormPageLocation';
import { ListingCards } from '../components/listing/ListingCards';
import { RecordDetailPage } from '../components/listing/RecordDetailPage';
import { OperationCard } from '../components/enterprise/OperationCard';
import { NamedResourceSelect, namedOptions } from '../components/enterprise/NamedResourceSelect';
import { InstallationReferenceSelect } from '../components/enterprise/InstallationReferenceSelect';
import { ResourceSnapshot } from '../components/enterprise/ResourceSnapshot';
import { facilityCategories, facilityCategoryLabel, type FacilityCategory } from '../features/facilities/spaceImport';
import { FacilityForm, VenueForm } from './FacilitiesPage';
import { fromApiDateTime, fromNowLocalInput, supportsTimeZone, toApiDateTime, validateLocalInterval } from '../utils/dateTime';
import { MAX_INT32, requiredTextError, wholeNumber } from '../utils/formValidation';
import { DECIMAL_STEP, exactDecimal } from '../utils/fixedDecimal';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import type { WorkspaceResource } from '../workspace/workspaceStore';
import { useAuth } from '../auth/AuthContext';
import { allowsAccess, EVENT_ALLOCATION_ACCESS, EVENT_PRICING_ACCESS, EVENT_PRODUCT_WRITE_ACCESS, PATIO_PAGE_ACCESS } from '../auth/accessPolicy';
import { tenantQueryKey } from '../api/queryKeys';
import { getInstallation, installationCatalogKey, type InstallationRow } from '../api/installationCatalog';
import { useFacilityPeriodAvailability } from '../api/facilityAvailability';
import { eventCatalogApi, eventDetailKey, eventDetailPath, eventsCatalogKey, firstEventKey, parseEventId, type AllocationResponse, type EventResponse,
  type EventServiceOption, type PriceTierResponse, type ProductResponse } from '../api/eventCatalog';
import { isPreparingPortaria } from '../api/eventPatioSummary';
import { formatCurrency, formatStatusLabel } from '../utils/format';
import { EventPatioOperation } from '../features/events/EventPatioOperation';
import { FacilityEventSchedule } from '../features/events/FacilityEventSchedule';
import { EventServiceSelect } from '../features/events/EventServiceSelect';

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

function scopedRecent(items: WorkspaceResource[], eventId: string) {
  return eventId ? items.filter((item) => String(item.snapshot?.eventId) === eventId) : items;
}

function allocationLabel(item: AllocationResponse) {
  const name = item.parkingFacilityName ?? `Pátio #${item.parkingFacilityId}`;
  return `${name} · ${new Date(item.startsAt).toLocaleString('pt-BR')}`;
}

const eventStartLabel = (event: EventResponse) => {
  if (!supportsTimeZone(event.timeZone)) return new Date(event.startsAt).toLocaleString('pt-BR');
  const [date, time] = fromApiDateTime(event.startsAt, event.timeZone).split('T');
  return `${date.split('-').reverse().join('/')} ${time}`;
};

function EventSetup({ catalog, loadingCatalog, catalogError, refreshCatalog }: {
  catalog: EventResponse[]; loadingCatalog: boolean; catalogError: unknown;
  refreshCatalog: () => void;
}) {
  const { activeOrganization, permissions } = useAuth();
  const { remember } = useOperationalWorkspace();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const canCreate = permissions.includes('events:create');
  const canCreateVenue = permissions.includes('organizations:admin');
  const organizationId = activeOrganization?.organizationId;
  const canChooseFacility = !!organizationId && permissions.includes('events:read') && permissions.includes('inventory:read')
    && permissions.includes('inventory:manage') && permissions.includes('facilities:manage');
  const organizationZone = activeOrganization?.timeZone;
  const timeZone = supportsTimeZone(organizationZone) ? organizationZone : undefined;
  const [formDefaults] = useState(() => ({
    name: '', venueId: '', facilityId: '', startsAt: '', endsAt: '', externalId: '', service: null as EventServiceOption | null,
  }));
  const [form, setForm] = useState(formDefaults);
  const [creatingVenue, setCreatingVenue] = useState(false);
  const [creatingFacility, setCreatingFacility] = useState(false);
  const [newVenue, setNewVenue] = useState<{ id: number; label: string }>();
  const [newFacility, setNewFacility] = useState<{ id: number; label: string }>();
  const formLocation = useFormPageLocation();
  const resetCreate = () => {
    setError(null); setForm(formDefaults); setCreatingVenue(false); setNewVenue(undefined);
    setCreatingFacility(false); setNewFacility(undefined);
  };
  const closeCreate = () => { formLocation.close(); resetCreate(); };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameError = requiredTextError(form.name, 'o nome do evento', 180);
  const referenceError = form.externalId.length > 160 ? 'Use até 160 caracteres.' : undefined;
  const interval = validateLocalInterval(form.startsAt, form.endsAt, timeZone);
  const venueId = parseEventId(form.venueId);
  const choosingFacility = canCreate && canChooseFacility && formLocation.name === 'evento';
  const facilityId = choosingFacility ? parseEventId(form.facilityId) : undefined;
  const availability = useFacilityPeriodAvailability(organizationId, facilityId, form.startsAt, form.endsAt, timeZone);
  const canSave = !!venueId && !!form.service && !!timeZone && !nameError && !referenceError
    && !!interval.startsAt && !!interval.endsAt && !interval.startError && !interval.endError
    && (!choosingFacility || (!!facilityId && availability.isSuccess && !availability.isFetching && availability.data.availableCapacity > 0));

  const openDetail = (data: EventResponse, created = false) => {
    remember('event', { id: data.id, label: data.name, version: data.version, snapshot: { ...data } });
    if (created && activeOrganization) queryClient.setQueryData(eventDetailKey(activeOrganization.organizationId, data.id), data);
    if (created) formLocation.allowNavigation();
    navigate(eventDetailPath(data.id) + (created && facilityId ? `?patio=${facilityId}` : ''), { replace: created });
  };

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate || !canSave || !form.service || loading) return;
    setLoading(true); setError(null);
    try {
      const response = await api.post<EventResponse>('/api/v1/events', {
        name: form.name.trim(),
        venueId,
        serviceId: form.service.id,
        startsAt: interval.startsAt,
        endsAt: interval.endsAt,
        timeZone,
        externalId: form.externalId.trim() || null,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      refreshCatalog();
      openDetail(response.data, true);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };

  if (canCreate && canCreateVenue && creatingVenue && formLocation.name === 'evento') return <VenueForm
    onClose={() => setCreatingVenue(false)} navigationAllowed={formLocation.navigationAllowed}
    onSaved={(venue) => {
      setNewVenue({ id: venue.id, label: venue.name });
      setForm((current) => ({ ...current, venueId: String(venue.id) }));
    }} />;

  if (choosingFacility && creatingFacility) return <FacilityForm
    onClose={() => setCreatingFacility(false)} navigationAllowed={formLocation.navigationAllowed}
    onSaved={(facility) => {
      setNewFacility({ id: facility.id, label: facility.name });
      setForm((current) => ({ ...current, facilityId: String(facility.id), startsAt: '', endsAt: '' }));
    }} />;

  if (canCreate && formLocation.name === 'evento') return <OperationalFormPage onClose={closeCreate} navigationAllowed={formLocation.navigationAllowed}
        title="Novo evento" description={choosingFacility
          ? 'Escolha o pátio e consulte os horários disponíveis. As vagas só são reservadas ao salvar a configuração da portaria.'
          : 'Escolha o período em que a portaria poderá operar. O evento não abre sozinho.'}
        id="event-create-form" submitLabel="Criar evento" busy={loading} submitDisabled={!canSave} error={error}
        dirty={JSON.stringify(form) !== JSON.stringify(formDefaults)} onSubmit={(event) => void create(event)}>
        <TextField label="Nome do evento" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          error={form.name !== '' && !!nameError} helperText={form.name !== '' ? nameError : undefined} inputProps={{ maxLength: 180 }} required />
        {organizationId && <EventServiceSelect value={form.service} disabled={loading}
          onChange={(service) => setForm((current) => ({ ...current, service }))} />}
        <InstallationReferenceSelect kind="venues" label="Local do evento" value={form.venueId} existingOption={newVenue}
          onChange={(venueId) => setForm((current) => ({ ...current, venueId }))} required
          onCreate={canCreateVenue ? { label: 'Cadastrar local', run: () => setCreatingVenue(true) } : undefined}
          emptyText={canCreateVenue ? 'Nenhum local ativo. Use Cadastrar local.' : 'Nenhum local ativo. Peça o cadastro a um administrador.'} />
        {choosingFacility ? <>
          <InstallationReferenceSelect kind="facilities" label="Pátio do evento" value={form.facilityId}
            existingOption={newFacility} required emptyText="Nenhum pátio ativo. Use Cadastrar pátio."
            onCreate={{ label: 'Cadastrar pátio', run: () => setCreatingFacility(true) }}
            onChange={(id) => setForm((current) => ({ ...current, facilityId: id, startsAt: '', endsAt: '' }))} />
          {organizationId && facilityId && timeZone ? <FacilityEventSchedule key={`${organizationId}:${facilityId}`}
            organizationId={organizationId} facilityId={facilityId} timeZone={timeZone}
            startsAt={form.startsAt} endsAt={form.endsAt} onChange={(period) => setForm((current) => ({ ...current, ...period }))} />
            : !facilityId && <Typography variant="body2" color="text.secondary">
              Selecione o pátio para ver os dias e horários livres.
            </Typography>}
        </> : <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Início" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
            error={!!interval.startError} helperText={interval.startError} InputLabelProps={{ shrink: true }} required fullWidth />
          <TextField label="Fim" type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
            error={!!interval.endError} helperText={interval.endError} InputLabelProps={{ shrink: true }} required fullWidth />
        </Stack>}
        {timeZone ? <Typography variant="body2" color="text.secondary">Horários no fuso da organização: {timeZone}.</Typography>
          : <Alert severity="warning">O fuso da organização não está disponível. Recarregue a página ou confira os dados da organização.</Alert>}
        <TextField label="Referência externa (opcional)" value={form.externalId} onChange={(event) => setForm((current) => ({ ...current, externalId: event.target.value }))}
          error={!!referenceError} helperText={referenceError} inputProps={{ maxLength: 160 }} fullWidth />
      </OperationalFormPage>;

  return (
    <Stack spacing={2}>
      {canCreate && <Button variant="contained" startIcon={<EventAvailableOutlinedIcon />}
        onClick={() => { resetCreate(); formLocation.open('evento'); }} sx={{ alignSelf: 'flex-start' }}>
        Novo evento
      </Button>}
      <Card>
        {loadingCatalog ? <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}><CircularProgress /></Box>
          : catalogError ? <Alert severity="error">{describeError(catalogError)}</Alert>
            : catalog.length === 0 ? <Alert severity="info">Nenhum evento cadastrado.</Alert>
              : <>
                <ListingCards rows={catalog} getKey={(item) => item.id} getTitle={(item) => item.name}
                  getFields={(item) => [
                    { label: 'Início', value: eventStartLabel(item) },
                    { label: 'Situação', value: <Chip size="small" label={formatStatusLabel(item.status)} /> },
                  ]}
                  onOpen={(item) => openDetail(item)}
                  getOpenLabel={(item) => `Abrir detalhes de ${item.name}`}
                />
                <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}><Table size="small"><TableHead><TableRow>
                <TableCell>Evento</TableCell><TableCell>Início</TableCell><TableCell>Situação</TableCell>
                <TableCell>Ações</TableCell>
                </TableRow></TableHead><TableBody>{catalog.map((item) => <TableRow key={item.id} hover>
                <TableCell>{item.name}</TableCell>
                <TableCell>{eventStartLabel(item)}</TableCell>
                <TableCell><Chip size="small" label={formatStatusLabel(item.status)} /></TableCell>
                <TableCell><Button size="small" aria-label={`Abrir detalhes de ${item.name}`} onClick={() => openDetail(item)}>Abrir detalhes</Button></TableCell>
              </TableRow>)}</TableBody></Table></TableContainer></>}
      </Card>
    </Stack>
  );
}

function EventDetailContent({ event, onChanged }: {
  event: EventResponse;
  onChanged: (event: EventResponse) => void;
}) {
  const { permissions } = useAuth();
  const [params] = useSearchParams();
  const canPublish = permissions.includes('events:publish');
  const canOperate = permissions.includes('access:operate');
  const allowedActions = [
    canPublish && isPreparingPortaria(event.status) && { value: 'publication', label: 'Publicar evento' },
    canPublish && event.status === 'PUBLICADO' && { value: 'sales-opening', label: 'Abrir vendas' },
    canPublish && event.status === 'VENDAS_ABERTAS' && { value: 'sales-closing', label: 'Encerrar vendas' },
    canOperate && event.status === 'VENDAS_ENCERRADAS' && { value: 'operation-start', label: 'Iniciar operação' },
    canOperate && event.status === 'EM_OPERACAO' && { value: 'operation-closing', label: 'Encerrar operação' },
  ].filter((item) => item !== false);
  const [selectedAction, setAction] = useState('');
  const action = allowedActions.find(({ value }) => value === selectedAction)?.value ?? allowedActions[0]?.value;
  const transition = useMutation({
    mutationFn: async () => {
      if (!action) throw new Error('Nenhuma operação disponível.');
      const path = `/api/v1/events/${event.id}`;
      const headers = ifMatchHeaders(event.version);
      const payload = action === 'sales-opening' ? { startsAt: null }
        : action === 'operation-closing' ? { confirmed: true, financialPendingAcknowledged: true } : { confirmed: true };
      return (await api.post<EventResponse>(`${path}/${action}`, payload, { headers })).data;
    },
    onSuccess: onChanged,
  });

  const canPresale = allowsAccess(permissions, EVENT_PRICING_ACCESS);
  const advanced = (action || canPresale) ? <>
    {action && (
      <OperationCard title="Ciclo de vida" description="Gerencie as etapas e a política de reentrada deste evento."
        error={transition.error ? describeError(transition.error) : null}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField select label="Operação" value={action} disabled={transition.isPending} fullWidth
            onChange={(change) => { transition.reset(); setAction(change.target.value); }}>
            {allowedActions.map(({ value, label }) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
          </TextField>
        </Stack>
        {action === 'sales-opening' && <Alert severity="info">Este comando abre as vendas agora. A abertura agendada não está disponível.</Alert>}
        {action === 'operation-closing' && <Alert severity="warning">Confirme que eventuais pendências financeiras externas foram reconhecidas antes do encerramento.</Alert>}
        <Button variant="contained" disabled={transition.isPending} onClick={() => transition.mutate()}
          startIcon={transition.isPending ? <CircularProgress size={18} color="inherit" /> : <PublishOutlinedIcon />}
          sx={{ alignSelf: 'flex-start' }}>Executar operação</Button>
        {transition.isSuccess && <Alert severity="success">Operação registrada.</Alert>}
      </OperationCard>
    )}
    {canPresale && <Button component={RouterLink}
      to={`/app/eventos?aba=produto&venda-antecipada=sim&evento-catalogo=${event.id}`}
      sx={{ alignSelf: 'flex-start' }}>Configurar venda antecipada</Button>}
  </> : undefined;
  return <EventPatioOperation event={event} initialFacilityId={parseEventId(params.get('patio'))} onChanged={onChanged} advanced={advanced} />;
}

function EventDetail({ eventId }: { eventId?: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { remember } = useOperationalWorkspace();
  const { activeOrganization, permissions } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const canRead = !!orgId && !!eventId && permissions.includes('events:read');
  const queryKey = orgId && eventId ? eventDetailKey(orgId, eventId) : ['event-detail', 'inactive'];
  const query = useQuery({
    queryKey, enabled: canRead, retry: false,
    queryFn: ({ signal }) => {
      if (!eventId) throw new Error('Evento inválido.');
      return eventCatalogApi.getEvent(eventId, signal);
    },
  });
  const event = canRead && !query.isError ? query.data : undefined;
  const onChanged = (updated: EventResponse) => {
    if (!orgId) return;
    queryClient.setQueryData(queryKey, updated);
    void queryClient.invalidateQueries({ queryKey: eventsCatalogKey(orgId) });
    void queryClient.invalidateQueries({ queryKey: firstEventKey(orgId) });
    remember('event', { id: updated.id, label: updated.name, version: updated.version, snapshot: { ...updated } });
  };
  return <RecordDetailPage title={event?.name ?? 'Detalhes do evento'}
    subtitle={event ? `Início previsto: ${eventStartLabel(event)}` : undefined}
    actions={event && <Chip label={formatStatusLabel(event.status)} />}
    onBack={() => navigate('/app/eventos', { replace: true })}>
    {!canRead && <Alert severity="warning">Evento indisponível neste contexto.</Alert>}
    {canRead && query.isPending && <CircularProgress size={24} aria-label="Carregando evento" />}
    {canRead && query.isError && <Alert severity="error">{describeError(query.error)}</Alert>}
    {event?.serviceName && <Typography variant="body2" sx={{ mb: 2 }}>Serviço: {event.serviceName}</Typography>}
    {event && orgId && <EventDetailContent key={`${orgId}:${event.id}`} event={event} onChanged={onChanged} />}
  </RecordDetailPage>;
}

function useOfferNavigation() {
  const [params, setParams] = useSearchParams();
  const formPage = useFormPageLocation();
  const creating = formPage.name === 'oferta';
  const [draftEvent, setDraftEvent] = useState<string | null>(null);
  const [draftProduct, setDraftProduct] = useState<string | null>(null);
  const eventId = (creating ? draftEvent : null) ?? String(parseEventId(params.get('evento-catalogo')) ?? '');
  const productId = (creating ? draftProduct : null) ?? String(parseEventId(params.get('produto-catalogo')) ?? '');
  const update = (values: Record<string, string>, replace = false) => setParams((current) => {
    const next = new URLSearchParams(current);
    Object.entries(values).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    return next;
  }, { replace });
  return {
    eventId, productId, creating,
    detailId: parseEventId(params.get('detalhe')),
    chooseEvent: (id: string) => { if (creating) { setDraftEvent(id); setDraftProduct(''); } else update({ 'evento-catalogo': id, 'produto-catalogo': '' }, true); },
    chooseProduct: (id: string) => { if (creating) setDraftProduct(id); else update({ 'produto-catalogo': id }, true); },
    openForm: () => formPage.open('oferta'),
    closeForm: formPage.close,
    navigationAllowed: formPage.navigationAllowed,
    openDetail: (id: number) => update({ detalhe: String(id) }),
    openCreated: (id: number) => { formPage.allowNavigation(); update({ formulario: '', detalhe: String(id), 'evento-catalogo': eventId, 'produto-catalogo': productId }, true); },
    closeDetail: () => { formPage.allowNavigation(); update({ detalhe: '' }, true); },
  };
}

function OfferDetailState({ title, onBack, error, pending }: { title: string; onBack: () => void; error: unknown; pending: boolean }) {
  return <RecordDetailPage title={title} onBack={onBack}>
    {pending ? <CircularProgress size={24} aria-label="Carregando detalhes" />
      : <Alert severity={error ? 'error' : 'warning'}>{error ? describeError(error) : 'Registro indisponível neste contexto.'}</Alert>}
  </RecordDetailPage>;
}

function AllocationSetup({ events }: { events: EventResponse[] }) {
  const { activeOrganization, permissions } = useAuth();
  const queryClient = useQueryClient();
  const orgId = activeOrganization?.organizationId;
  const canManage = permissions.includes('inventory:manage');
  const { recent, remember } = useOperationalWorkspace();
  const navigation = useOfferNavigation();
  const { eventId, detailId, creating, chooseEvent } = navigation;
  const [defaults] = useState(() => ({
    parkingFacilityId: '', startsAt: '', endsAt: '',
    operationalCapacity: '100', sellableCapacity: '90', reservedCapacity: '10',
  }));
  const [form, setForm] = useState(defaults);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const allocationKey = orgId && eventId
    ? tenantQueryKey(orgId, 'event-allocations', Number(eventId))
    : ['event-allocations', Number(eventId)];
  const catalog = useQuery({ queryKey: allocationKey,
    queryFn: () => eventCatalogApi.listAllocations(Number(eventId)),
    enabled: !!orgId && !!eventId });
  const selectedEvent = events.find((item) => item.id === Number(eventId))
    ?? recentSnapshot<EventResponse>(recent('event'), eventId);
  const zone = supportsTimeZone(selectedEvent?.timeZone) ? selectedEvent.timeZone : undefined;
  const interval = validateLocalInterval(form.startsAt, form.endsAt, zone);
  const wrongPeriod = !!interval.startsAt && !!interval.endsAt && !!selectedEvent
    && (Date.parse(interval.startsAt) >= Date.parse(selectedEvent.endsAt) || Date.parse(interval.endsAt) <= Date.parse(selectedEvent.startsAt));
  const facilityId = parseEventId(form.parkingFacilityId);
  const facilityLimit = useAllocationLimit(facilityId, canManage && creating);
  const capacities = checkCapacities(form, facilityLimit.max);
  const canSave = !!selectedEvent && !!facilityId && !!interval.startsAt && !!interval.endsAt
    && !interval.startError && !interval.endError && !wrongPeriod && !facilityLimit.error && !capacities.error;
  const accept = (data: AllocationResponse) => {
    queryClient.setQueryData<AllocationResponse[]>(allocationKey, (current) => [...(current ?? []).filter((item) => item.id !== data.id), data]);
    remember('allocation', { id: data.id, label: allocationLabel(data), version: data.version, snapshot: { ...data } });
    void queryClient.invalidateQueries({ queryKey: allocationKey });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !canSave || loading) return;
    setLoading(true); setError(null);
    try {
      const response = await api.post<AllocationResponse>(`/api/v1/events/${Number(eventId)}/parking-allocations`, {
        parkingFacilityId: facilityId, startsAt: interval.startsAt, endsAt: interval.endsAt,
        operationalCapacity: Number(form.operationalCapacity), sellableCapacity: Number(form.sellableCapacity), reservedCapacity: Number(form.reservedCapacity),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data);
      navigation.openCreated(response.data.id);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  if (detailId) {
    const item = catalog.data?.find((entry) => entry.id === detailId);
    if (!item) return <OfferDetailState title="Detalhes da alocação" onBack={navigation.closeDetail} error={catalog.error} pending={catalog.isLoading} />;
    return <AllocationDetails key={item.id} item={item} canManage={canManage} onSaved={accept} onBack={navigation.closeDetail}
      navigationAllowed={navigation.navigationAllowed} />;
  }
  if (creating && canManage) return <OperationalFormPage title="Nova alocação"
    description="A soma das capacidades vendável e reservada não pode superar a operacional."
    id="event-allocation" onClose={navigation.closeForm} navigationAllowed={navigation.navigationAllowed}
    onSubmit={(event) => void create(event)} submitLabel="Criar alocação" submitDisabled={!canSave}
    busy={loading} error={error} dirty={form !== defaults}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <NamedResourceSelect label="Evento" value={eventId} onChange={chooseEvent} options={namedOptions(events)} recent={recent('event')} required disabled={loading} />
      <InstallationReferenceSelect kind="facilities" label="Pátio" value={form.parkingFacilityId}
        onChange={(parkingFacilityId) => setForm((current) => ({ ...current, parkingFacilityId }))}
        required emptyText="Nenhum pátio ativo. Cadastre em Instalações → Pátios." />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Início da alocação" type="datetime-local" value={form.startsAt} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
        error={!!interval.startError} helperText={interval.startError} InputLabelProps={{ shrink: true }} required fullWidth />
      <TextField label="Fim da alocação" type="datetime-local" value={form.endsAt} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))}
        error={!!interval.endError || wrongPeriod} helperText={interval.endError ?? (wrongPeriod ? 'O período da alocação deve coincidir em parte com o do evento.' : undefined)}
        InputLabelProps={{ shrink: true }} required fullWidth />
    </Stack>
    {zone && <Typography variant="body2" color="text.secondary">Horários no fuso do evento: {zone}.</Typography>}
    {!zone && eventId && <Alert severity="warning">Não foi possível consultar o fuso do evento.</Alert>}
    {facilityLimit.error && <Alert severity="info">{facilityLimit.error}</Alert>}
    <CapacityFields values={form} limit={facilityLimit.max} error={capacities.error}
      onChange={(field, value) => setForm((current) => ({ ...current, [field]: value }))} />
  </OperationalFormPage>;
  return (
    <Stack spacing={2}>
    {canManage && <Button variant="contained" onClick={navigation.openForm} sx={{ alignSelf: 'flex-start' }}>Nova alocação</Button>}
    <Card><Stack spacing={1.5} sx={{ p: 2 }}><NamedResourceSelect label="Evento para listar alocações"
      value={eventId} onChange={chooseEvent} options={namedOptions(events)} recent={recent('event')} disabled={loading} />
      {catalog.isLoading ? <CircularProgress size={24} /> : catalog.isError
      ? <Alert severity="error">{describeError(catalog.error)}</Alert> : eventId && catalog.data?.length === 0
        ? <Alert severity="info">Nenhuma alocação neste evento.</Alert> : catalog.data && catalog.data.length > 0
          ? <>
            <ListingCards rows={catalog.data} getKey={(item) => item.id}
              getTitle={allocationLabel}
              getFields={(item) => [
                { label: 'Operacional', value: item.operationalCapacity },
                { label: 'Vendável', value: item.sellableCapacity },
                { label: 'Reservada', value: item.reservedCapacity },
              ]}
              onOpen={(item) => navigation.openDetail(item.id)}
              getOpenLabel={(item) => `Abrir alocação: ${allocationLabel(item)}`}
            />
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}><Table size="small"><TableHead><TableRow><TableCell>Pátio</TableCell>
            <TableCell>Operacional</TableCell><TableCell>Vendável</TableCell><TableCell>Reservada</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>{catalog.data.map((item) => <TableRow key={item.id} hover>
              <TableCell>{allocationLabel(item)}</TableCell><TableCell>{item.operationalCapacity}</TableCell>
              <TableCell>{item.sellableCapacity}</TableCell><TableCell>{item.reservedCapacity}</TableCell>
              <TableCell><Button size="small" onClick={() => navigation.openDetail(item.id)}>Abrir alocação</Button></TableCell>
            </TableRow>)}</TableBody></Table></TableContainer></> : null}</Stack></Card>
    </Stack>
  );
}

const capacityLabels = { operationalCapacity: 'Capacidade operacional', sellableCapacity: 'Capacidade vendável', reservedCapacity: 'Capacidade reservada' } as const;
type CapacityField = keyof typeof capacityLabels;

function useAllocationLimit(facilityId: number | undefined, enabled: boolean) {
  const { activeOrganization, permissions } = useAuth();
  const org = activeOrganization?.organizationId;
  const allowed = enabled && !!org && !!facilityId && permissions.includes('facilities:manage');
  const query = useQuery({ queryKey: [...installationCatalogKey(org, 'facilities'), 'detail', facilityId], enabled: allowed,
    queryFn: ({ signal }) => getInstallation<InstallationRow>('facilities', facilityId!, signal) });
  if (!allowed) return { max: MAX_INT32 };
  if (query.isPending) return { max: MAX_INT32, error: 'Consultando a capacidade do pátio…' };
  const max = query.data?.operationalCapacity;
  if (query.isError || !query.data?.active || max === undefined || !Number.isInteger(max) || max < 0) {
    return { max: MAX_INT32, error: 'Não foi possível confirmar a capacidade do pátio ativo.' };
  }
  return { max };
}

function checkCapacities(values: Record<CapacityField, string>, max: number) {
  const operational = wholeNumber(values.operationalCapacity, 1, max);
  const sellable = wholeNumber(values.sellableCapacity, 0);
  const reserved = wholeNumber(values.reservedCapacity, 0);
  if (operational === null) return { error: max < MAX_INT32 ? `A capacidade operacional deve respeitar o limite do pátio: ${max} carros.`
    : 'Informe um número inteiro positivo para a capacidade operacional.' };
  if (sellable === null || reserved === null) return { error: 'Informe números inteiros para as capacidades vendável e reservada, inclusive zero.' };
  return { error: sellable + reserved > operational ? 'A soma das capacidades vendável e reservada não pode superar a operacional.' : undefined };
}

function capacityValues(item: AllocationResponse) {
  return { operationalCapacity: String(item.operationalCapacity), sellableCapacity: String(item.sellableCapacity), reservedCapacity: String(item.reservedCapacity) };
}

function CapacityFields({ values, onChange, limit, error }: {
  values: Record<CapacityField, string>; onChange: (field: CapacityField, value: string) => void; limit: number; error?: string;
}) {
  return <><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
    {(Object.keys(capacityLabels) as CapacityField[]).map((field) => <NumberField key={field} label={capacityLabels[field]}
      value={values[field]} min={field === 'operationalCapacity' ? 1 : 0} max={field === 'operationalCapacity' ? limit : MAX_INT32}
      onValueChange={(value) => onChange(field, value)} required fullWidth />)}
  </Stack>{error && <Alert severity="warning">{error}</Alert>}</>;
}

function AllocationDetails({ item, onBack, onSaved, canManage, navigationAllowed }: {
  item: AllocationResponse; onBack: () => void; onSaved: (item: AllocationResponse) => void;
  canManage: boolean; navigationAllowed: () => boolean;
}) {
  const [draft, setDraft] = useState(() => capacityValues(item));
  const [original, setOriginal] = useState(draft);
  const [version, setVersion] = useState(item.version);
  const limit = useAllocationLimit(item.parkingFacilityId, canManage);
  const invalid = checkCapacities(draft, limit.max).error;
  const update = useMutation({
    mutationFn: () => api.patch<AllocationResponse>(`/api/v1/parking-allocations/${item.id}`, {
      operationalCapacity: Number(draft.operationalCapacity), sellableCapacity: Number(draft.sellableCapacity),
      reservedCapacity: Number(draft.reservedCapacity),
    }, { headers: ifMatchHeaders(version) }).then(({ data }) => data),
    onSuccess: (data) => { const saved = capacityValues(data); setDraft(saved); setOriginal(saved); setVersion(data.version); onSaved(data); },
  });
  const title = allocationLabel(item);
  const interval = `${new Date(item.startsAt).toLocaleString('pt-BR')} a ${new Date(item.endsAt).toLocaleString('pt-BR')}`;
  if (!canManage) return <RecordDetailPage title={title} subtitle={interval} onBack={onBack}>
    {Object.entries(capacityLabels).map(([field, label]) => <Typography key={field}>{label}: {item[field as CapacityField]}</Typography>)}
  </RecordDetailPage>;
  return <OperationalFormPage title={title} description={interval} id={`allocation-${item.id}`}
    onClose={onBack} navigationAllowed={navigationAllowed} error={update.error ? describeError(update.error) : null}
    dirty={Object.keys(capacityLabels).some((field) => draft[field as CapacityField] !== original[field as CapacityField])}
    submitLabel="Atualizar capacidades" busy={update.isPending} submitDisabled={!!limit.error || !!invalid}
    onSubmit={(event) => { event.preventDefault(); if (!invalid && !limit.error && !update.isPending) update.mutate(); }}>
    {limit.error && <Alert severity="info">{limit.error}</Alert>}
    {update.isSuccess && <Alert severity="success" role="status">Capacidades atualizadas.</Alert>}
    <CapacityFields values={draft} limit={limit.max} error={invalid}
      onChange={(field, value) => { update.reset(); setDraft((current) => ({ ...current, [field]: value })); }} />
  </OperationalFormPage>;
}

function ProductSetup({ events }: { events: EventResponse[] }) {
  const { activeOrganization, permissions } = useAuth();
  const queryClient = useQueryClient();
  const orgId = activeOrganization?.organizationId;
  const canManage = allowsAccess(permissions, EVENT_PRODUCT_WRITE_ACCESS);
  const { recent, remember } = useOperationalWorkspace();
  const allocations = recent('allocation');
  const navigation = useOfferNavigation();
  const { eventId, detailId, creating } = navigation;
  const [defaults] = useState(() => ({ name: '', category: 'COMUM', allocationId: '', accessStartsAt: fromNowLocalInput(23 * 60), accessEndsAt: fromNowLocalInput(28 * 60), quota: '50', benefits: '', restrictions: '' }));
  const [form, setForm] = useState(defaults);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const productKey = orgId && eventId ? tenantQueryKey(orgId, 'event-products', Number(eventId))
    : ['event-products', Number(eventId)];
  const allocationKey = orgId && eventId ? tenantQueryKey(orgId, 'event-allocations', Number(eventId))
    : ['event-allocations', Number(eventId)];
  const catalog = useQuery({ queryKey: productKey, queryFn: () => eventCatalogApi.listProducts(Number(eventId)),
    enabled: !!orgId && !!eventId });
  const allocationCatalog = useQuery({ queryKey: allocationKey,
    queryFn: () => eventCatalogApi.listAllocations(Number(eventId)), enabled: !!orgId && !!eventId && canManage && creating });
  const accept = (data: ProductResponse) => {
    queryClient.setQueryData<ProductResponse[]>(productKey, (current) => [...(current ?? []).filter((item) => item.id !== data.id), data]);
    remember('product', { id: data.id, label: data.name, version: data.version, snapshot: { ...data } });
    void queryClient.invalidateQueries({ queryKey: productKey });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!eventId || !form.allocationId) return;
    setLoading(true); setError(null);
    try {
      const response = await api.post<ProductResponse>(`/api/v1/events/${Number(eventId)}/parking-products`, {
        name: form.name, category: form.category, parkingAllocationId: Number(form.allocationId),
        accessStartsAt: toApiDateTime(form.accessStartsAt), accessEndsAt: toApiDateTime(form.accessEndsAt),
        right: 'ESTACIONAMENTO_EVENTO', quota: Number(form.quota),
        benefits: form.benefits.split(',').map((item) => item.trim()).filter(Boolean),
        restrictions: form.restrictions.split(',').map((item) => item.trim()).filter(Boolean),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data);
      navigation.openCreated(response.data.id);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  const chooseEvent = (id: string) => {
    navigation.chooseEvent(id);
    setForm((current) => ({ ...current, allocationId: '' }));
  };
  const chooseAllocation = (allocationId: string) => {
    const allocation = allocationCatalog.data?.find((item) => item.id === Number(allocationId))
      ?? recentSnapshot<AllocationResponse>(scopedRecent(allocations, eventId), allocationId);
    setForm((current) => allocation ? {
      ...current,
      allocationId,
      accessStartsAt: fromApiDateTime(allocation.startsAt),
      accessEndsAt: fromApiDateTime(allocation.endsAt),
      quota: String(allocation.sellableCapacity),
    } : { ...current, allocationId });
    if (allocation) navigation.chooseEvent(String(allocation.eventId));
  };
  const item = catalog.data?.find((entry) => entry.id === detailId);
  const publish = useMutation({
    mutationFn: (product: ProductResponse) => api.post<ProductResponse>(`/api/v1/parking-products/${product.id}/publication`,
      { confirmed: true }, { headers: ifMatchHeaders(product.version) }).then(({ data }) => data),
    onSuccess: accept,
  });
  if (detailId) return item ? <RecordDetailPage title={item.name} subtitle="Produto de estacionamento" onBack={navigation.closeDetail}
    actions={canManage && <Button variant="contained" disabled={publish.isPending} onClick={() => publish.mutate(item)}
      startIcon={<PublishOutlinedIcon />}>Publicar produto</Button>}>
    {publish.error && <Alert severity="error">{describeError(publish.error)}</Alert>}
    {publish.isSuccess && <Alert severity="success" role="status">Produto publicado.</Alert>}
    <Typography>Categoria: {facilityCategoryLabel(item.category as FacilityCategory)}</Typography>
    <Typography>Cota: {item.quota}</Typography>
    <Typography>Situação: {formatStatusLabel(item.status)}</Typography>
    <Typography>Janela de acesso: {new Date(item.accessStartsAt).toLocaleString('pt-BR')} a {new Date(item.accessEndsAt).toLocaleString('pt-BR')}</Typography>
    {!!item.benefits?.length && <Typography>Benefícios: {item.benefits.join(', ')}</Typography>}
    {!!item.restrictions?.length && <Typography>Restrições: {item.restrictions.join(', ')}</Typography>}
  </RecordDetailPage> : <OfferDetailState title="Detalhes do produto" onBack={navigation.closeDetail} error={catalog.error} pending={catalog.isLoading} />;
  if (creating && canManage) return <OperationalFormPage title="Novo produto" id="event-product"
    description="A cota pertence a uma única alocação de pátio e representa o direito de estacionamento no evento."
    onClose={navigation.closeForm} navigationAllowed={navigation.navigationAllowed} submitLabel="Criar produto"
    onSubmit={(event) => void create(event)} busy={loading} error={error} submitDisabled={!eventId || !form.allocationId}
    dirty={form !== defaults}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <NamedResourceSelect label="Evento" value={eventId} onChange={chooseEvent} options={namedOptions(events)} recent={recent('event')} required disabled={loading} />
      <NamedResourceSelect label="Alocação" value={form.allocationId} onChange={chooseAllocation}
        options={(allocationCatalog.data ?? []).map((item) => ({ id: item.id, label: allocationLabel(item) }))}
        recent={scopedRecent(allocations, eventId)} required disabled={loading}
        emptyText={eventId ? 'Nenhuma alocação encontrada neste evento.' : 'Selecione um evento para ver suas alocações.'} />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
      <TextField select label="Categoria" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} fullWidth>{facilityCategories.map((category) => <MenuItem key={category} value={category}>{facilityCategoryLabel(category)}</MenuItem>)}</TextField>
      <NumberField label="Cota" value={form.quota} min={1} required fullWidth
        onValueChange={(quota) => setForm((current) => ({ ...current, quota }))} />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Início do acesso" type="datetime-local" value={form.accessStartsAt} onChange={(event) => setForm((current) => ({ ...current, accessStartsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
      <TextField label="Fim do acesso" type="datetime-local" value={form.accessEndsAt} onChange={(event) => setForm((current) => ({ ...current, accessEndsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
    </Stack>
    <TextField label="Benefícios (separados por vírgula)" value={form.benefits} onChange={(event) => setForm((current) => ({ ...current, benefits: event.target.value }))} />
    <TextField label="Restrições (separadas por vírgula)" value={form.restrictions} onChange={(event) => setForm((current) => ({ ...current, restrictions: event.target.value }))} />
  </OperationalFormPage>;
  return (
    <Stack spacing={2}>
    {canManage && <Button variant="contained" onClick={navigation.openForm} sx={{ alignSelf: 'flex-start' }}>Novo produto</Button>}
    <Card><Stack spacing={1.5} sx={{ p: 2 }}><NamedResourceSelect label="Evento para listar produtos"
      value={eventId} onChange={chooseEvent} options={namedOptions(events)} recent={recent('event')} disabled={loading} />
      {catalog.isLoading ? <CircularProgress size={24} /> : catalog.isError
      ? <Alert severity="error">{describeError(catalog.error)}</Alert> : eventId && catalog.data?.length === 0
        ? <Alert severity="info">Nenhum produto neste evento.</Alert> : catalog.data && catalog.data.length > 0
          ? <>
            <ListingCards rows={catalog.data} getKey={(item) => item.id} getTitle={(item) => item.name}
              getFields={(item) => [
                { label: 'Categoria', value: facilityCategoryLabel(item.category as FacilityCategory) },
                { label: 'Cota', value: item.quota },
                { label: 'Situação', value: <Chip size="small" label={formatStatusLabel(item.status)} /> },
              ]}
              onOpen={(item) => navigation.openDetail(item.id)}
              getOpenLabel={(item) => `Abrir produto ${item.name}`}
            />
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}><Table size="small"><TableHead><TableRow><TableCell>Produto</TableCell><TableCell>Categoria</TableCell>
            <TableCell>Cota</TableCell><TableCell>Status</TableCell><TableCell /></TableRow></TableHead><TableBody>
            {catalog.data.map((item) => <TableRow key={item.id} hover>
              <TableCell>{item.name}<Typography variant="caption" display="block" color="text.secondary">#{item.id}</Typography></TableCell>
              <TableCell>{facilityCategoryLabel(item.category as FacilityCategory)}</TableCell><TableCell>{item.quota}</TableCell><TableCell><Chip size="small" label={formatStatusLabel(item.status)} /></TableCell>
              <TableCell><Button size="small" onClick={() => navigation.openDetail(item.id)}>Abrir produto</Button></TableCell>
            </TableRow>)}</TableBody></Table></TableContainer></> : null}</Stack></Card>
    </Stack>
  );
}

function PriceTierSetup({ events }: { events: EventResponse[] }) {
  const { activeOrganization, permissions } = useAuth();
  const queryClient = useQueryClient();
  const orgId = activeOrganization?.organizationId;
  const canManage = permissions.includes('pricing:manage');
  const { recent, remember } = useOperationalWorkspace();
  const navigation = useOfferNavigation();
  const { eventId, productId, detailId, creating, chooseEvent, chooseProduct } = navigation;
  const [defaults] = useState(() => ({ name: 'Lote 1', price: '50.00', currency: 'BRL', salesStartsAt: fromNowLocalInput(0), salesEndsAt: fromNowLocalInput(20 * 60), quantity: '50', priority: '0' }));
  const [form, setForm] = useState(defaults);
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
    event.preventDefault();
    if (!productId) return;
    setLoading(true); setError(null);
    try {
      const response = await api.post<PriceTierResponse>(`/api/v1/parking-products/${Number(productId)}/price-tiers`, {
        name: form.name, price: exactDecimal(form.price, 'Preço'), currency: form.currency.toUpperCase(),
        salesStartsAt: toApiDateTime(form.salesStartsAt), salesEndsAt: toApiDateTime(form.salesEndsAt),
        quantity: Number(form.quantity), priority: Number(form.priority),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      queryClient.setQueryData<PriceTierResponse[]>(tierKey, (current) => [...(current ?? []).filter((item) => item.id !== response.data.id), response.data]);
      remember('priceTier', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      void queryClient.invalidateQueries({ queryKey: tierKey });
      navigation.openCreated(response.data.id);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  if (detailId) {
    const item = tiersCatalog.data?.find((entry) => entry.id === detailId);
    if (!item) return <OfferDetailState title="Detalhes do lote" onBack={navigation.closeDetail} error={tiersCatalog.error} pending={tiersCatalog.isLoading} />;
    return <RecordDetailPage title={item.name} subtitle="Lote de preço" onBack={navigation.closeDetail}>
      <Typography>Preço: {formatCurrency(Number(item.price), item.currency, 6)}</Typography>
      <Typography>Quantidade: {item.quantity}</Typography>
      <Typography>Prioridade: {item.priority}</Typography>
      <Typography>Janela de vendas: {new Date(item.salesStartsAt).toLocaleString('pt-BR')} a {new Date(item.salesEndsAt).toLocaleString('pt-BR')}</Typography>
    </RecordDetailPage>;
  }
  if (creating && canManage) return <OperationalFormPage title="Novo lote de preço" id="event-price-tier"
    description="Janelas de venda, quantidade e prioridade determinam o lote vigente."
    onClose={navigation.closeForm} navigationAllowed={navigation.navigationAllowed} submitLabel="Criar lote" submitDisabled={!productId}
    onSubmit={(event) => void submit(event)} busy={loading} error={error} dirty={form !== defaults}>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <NamedResourceSelect label="Evento" value={eventId} onChange={chooseEvent}
        options={namedOptions(events)} recent={recent('event')} disabled={loading} />
      <NamedResourceSelect label="Produto" value={productId} onChange={chooseProduct}
        options={namedOptions(productsCatalog.data ?? [])} recent={scopedRecent(recent('product'), eventId)} required disabled={loading} />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
      <TextField type="number" label="Preço" value={form.price} required fullWidth
        inputProps={{ min: 0, step: DECIMAL_STEP, inputMode: 'decimal' }}
        onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} />
      <TextField label="Moeda" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} inputProps={{ maxLength: 3 }} required fullWidth />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Início das vendas" type="datetime-local" value={form.salesStartsAt} onChange={(event) => setForm((current) => ({ ...current, salesStartsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
      <TextField label="Fim das vendas" type="datetime-local" value={form.salesEndsAt} onChange={(event) => setForm((current) => ({ ...current, salesEndsAt: event.target.value }))} InputLabelProps={{ shrink: true }} required fullWidth />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <NumberField label="Quantidade" value={form.quantity} min={1} required fullWidth onValueChange={(quantity) => setForm((current) => ({ ...current, quantity }))} />
      <NumberField label="Prioridade" value={form.priority} min={0} required fullWidth onValueChange={(priority) => setForm((current) => ({ ...current, priority }))} />
    </Stack>
  </OperationalFormPage>;
  return (
    <Stack spacing={2}>
    {canManage && <Button variant="contained" onClick={navigation.openForm} sx={{ alignSelf: 'flex-start' }}>Novo lote de preço</Button>}
    <Card><Stack spacing={1.5} sx={{ p: 2 }}><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <NamedResourceSelect label="Evento" value={eventId} onChange={chooseEvent}
        options={namedOptions(events)} recent={recent('event')} disabled={loading} />
      <NamedResourceSelect label="Produto para listar lotes" value={productId} onChange={chooseProduct}
        options={namedOptions(productsCatalog.data ?? [])} recent={scopedRecent(recent('product'), eventId)} disabled={loading} />
    </Stack>{tiersCatalog.isLoading ? <CircularProgress size={24} /> : tiersCatalog.isError
      ? <Alert severity="error">{describeError(tiersCatalog.error)}</Alert> : productId && tiersCatalog.data?.length === 0
        ? <Alert severity="info">Nenhum lote de preço neste produto.</Alert> : tiersCatalog.data && tiersCatalog.data.length > 0
          ? <>
            <ListingCards rows={tiersCatalog.data} getKey={(item) => item.id} getTitle={(item) => item.name}
              getFields={(item) => [
                { label: 'Preço', value: formatCurrency(Number(item.price), item.currency, 6) },
                { label: 'Quantidade', value: item.quantity },
                { label: 'Prioridade', value: item.priority },
              ]}
              onOpen={(item) => navigation.openDetail(item.id)}
              getOpenLabel={(item) => `Abrir lote ${item.name}`}
            />
            <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}><Table size="small"><TableHead><TableRow><TableCell>Lote</TableCell><TableCell>Preço</TableCell>
            <TableCell>Quantidade</TableCell><TableCell>Prioridade</TableCell><TableCell /></TableRow></TableHead><TableBody>
            {tiersCatalog.data.map((item) => <TableRow key={item.id} hover><TableCell>{item.name} #{item.id}</TableCell>
              <TableCell>{formatCurrency(Number(item.price), item.currency, 6)}</TableCell><TableCell>{item.quantity}</TableCell>
              <TableCell>{item.priority}</TableCell><TableCell><Button size="small" onClick={() => navigation.openDetail(item.id)}>Abrir lote</Button></TableCell>
            </TableRow>)}</TableBody></Table></TableContainer></> : null}</Stack></Card>
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
    <OperationCard title="Disponibilidade publicada" description="A disponibilidade só é garantida depois da reserva temporária da vaga." error={error}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <NamedResourceSelect label="Evento" value={eventId} onChange={(id) => { setEventId(id); setResult(null); setError(null); }}
          options={namedOptions(events)} recent={recent('event')} disabled={loading} />
        <TextField select label="Categoria" value={category} onChange={(event) => setCategory(event.target.value)} fullWidth><MenuItem value="">Todas</MenuItem>{facilityCategories.map((item) => <MenuItem key={item} value={item}>{facilityCategoryLabel(item)}</MenuItem>)}</TextField>
        <Button variant="contained" disabled={loading || !eventId} onClick={() => void load()} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <InventoryOutlinedIcon />}>Consultar</Button>
      </Stack>
      {result && (
        <Stack spacing={1.5}>
          <ResourceSnapshot data={{ eventId: result.eventId, asOf: result.asOf, totalAvailable: result.totalAvailable, guaranteesHold: result.guaranteesHold }} />
          {result.items.length === 0 ? <Alert severity="info">Nenhum produto disponível para o filtro.</Alert> : result.items.map((item) => (
            <Box key={item.productId} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                <div><Typography variant="subtitle2">{item.name}</Typography><Typography variant="caption" color="text.secondary">{facilityCategoryLabel(item.category as FacilityCategory)} · Produto #{item.productId}</Typography></div>
                <div><Typography variant="h6">{item.availableQuantity} vagas</Typography><Typography variant="caption" color="text.secondary">{item.price != null ? formatCurrency(Number(item.price), item.currency) : 'Sem lote vigente'}</Typography></div>
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
    </OperationCard>
  );
}

function EventCatalogPage() {
  const { permissions, activeOrganization } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const orgId = activeOrganization?.organizationId;
  const legacyEventId = !params.has('formulario') ? parseEventId(params.get('evento')) : undefined;
  const eventsKey = orgId ? eventsCatalogKey(orgId) : ['events'];
  const eventsQuery = useQuery({ queryKey: eventsKey, queryFn: ({ signal }) => eventCatalogApi.listEventCatalog(signal),
    enabled: !!orgId && !legacyEventId && permissions.includes('events:read') });
  const events = eventsQuery.data?.content ?? [];
  const refreshCatalog = () => {
    if (!orgId) return;
    void queryClient.invalidateQueries({ queryKey: eventsKey });
    void queryClient.invalidateQueries({ queryKey: firstEventKey(orgId) });
  };
  const canConfigureEvent = ['events:read', 'events:create', 'events:publish', 'access:operate']
    .some((permission) => permissions.includes(permission));
  const canReturnToPatio = allowsAccess(permissions, { anyOf: PATIO_PAGE_ACCESS });
  const tab = params.get('aba') ?? 'evento';
  const detail = parseEventId(params.get('detalhe'));
  const creatingOffer = params.get('formulario') === 'oferta';
  const showPresale = !canConfigureEvent || params.get('venda-antecipada') === 'sim' || ['produto', 'lote', 'disponibilidade'].includes(tab);
  const selectTab = (nextTab: string, presale = showPresale) => setParams((current) => {
    const next = new URLSearchParams(current);
    if (nextTab === 'evento') next.delete('aba'); else next.set('aba', nextTab);
    if (presale) next.set('venda-antecipada', 'sim'); else next.delete('venda-antecipada');
    if (nextTab !== tab) {
      next.delete('detalhe'); next.delete('formulario'); next.delete('produto-catalogo');
    }
    return next;
  });
  const offerKey = `${orgId}:${detail ?? (creatingOffer ? 'new' : 'list')}`;
  const panels = [
    (permissions.includes('events:read') || permissions.includes('events:create') || permissions.includes('events:publish') || permissions.includes('access:operate'))
      && { id: 'evento', label: 'Evento', content: <EventSetup key={orgId}
        catalog={events} loadingCatalog={eventsQuery.isLoading} catalogError={eventsQuery.error}
        refreshCatalog={refreshCatalog} /> },
    allowsAccess(permissions, EVENT_ALLOCATION_ACCESS)
      && { id: 'alocacao', label: 'Alocação', content: <AllocationSetup key={offerKey} events={events} /> },
    showPresale && allowsAccess(permissions, EVENT_PRICING_ACCESS)
      && { id: 'produto', label: 'Produto', content: <ProductSetup key={offerKey} events={events} /> },
    showPresale && allowsAccess(permissions, EVENT_PRICING_ACCESS)
      && { id: 'lote', label: 'Lote de preço', content: <PriceTierSetup key={offerKey} events={events} /> },
    showPresale && { id: 'disponibilidade', label: 'Disponibilidade', content: <AvailabilityPanel events={events} /> },
  ].filter(Boolean) as { id: string; label: string; content: ReactNode }[];
  const activePanel = panels.find(({ id }) => id === tab) ?? panels[0];
  if (legacyEventId) return <Navigate to={eventDetailPath(legacyEventId)} replace />;
  const canCreateOffer = tab === 'alocacao' ? permissions.includes('inventory:manage')
    : tab === 'produto' ? allowsAccess(permissions, EVENT_PRODUCT_WRITE_ACCESS)
    : tab === 'lote' && permissions.includes('pricing:manage');
  if (activePanel?.id === tab && ['alocacao', 'produto', 'lote'].includes(tab) && (detail || (creatingOffer && canCreateOffer))) return activePanel.content;
  if (activePanel?.id === 'evento' && params.get('formulario') === 'evento' && permissions.includes('events:create')) return activePanel.content;
  return (
    <Box>
      <PageHeader title="Eventos e ofertas"
        subtitle="Prepare local, pátio, capacidade e cobrança para operar pela placa. Venda antecipada é opcional."
        count={eventsQuery.data?.totalElements} />
      {(canConfigureEvent || canReturnToPatio) && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        {canReturnToPatio && <Button component={RouterLink} to="/app/patio" variant="contained">Voltar à portaria</Button>}
        {canConfigureEvent && (showPresale
          ? <Button variant="outlined" onClick={() => selectTab('evento', false)}>Voltar à lista de eventos</Button>
          : <Button variant="outlined" onClick={() => selectTab(tab, true)}>Configurar venda antecipada</Button>)}
      </Stack>}
      <Tabs value={activePanel?.id ?? false} onChange={(_, value: string) => selectTab(value)} variant="scrollable"
        scrollButtons="auto" allowScrollButtonsMobile aria-label="Etapas da configuração do evento" sx={{ mb: 2 }}>
        {panels.map((panel) => <Tab key={panel.id} value={panel.id} label={panel.label} />)}
      </Tabs>
      {activePanel?.content}
    </Box>
  );
}

export function EventsPage() {
  const { eventId } = useParams<'eventId'>();
  return eventId === undefined ? <EventCatalogPage /> : <EventDetail eventId={parseEventId(eventId)} />;
}
