import AddShoppingCartOutlinedIcon from '@mui/icons-material/AddShoppingCartOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CreditScoreOutlinedIcon from '@mui/icons-material/CreditScoreOutlined';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, describeError, ifMatchHeaders } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { OperationCard } from '../components/enterprise/OperationCard';
import { OperationalReferenceSelect } from '../components/enterprise/OperationalReferenceSelect';
import { ResourceSnapshot } from '../components/enterprise/ResourceSnapshot';
import { NumberField } from '../components/form/NumberField';
import { OperationalFormPage } from '../components/form/OperationalFormPage';
import { RecordDetailPage } from '../components/listing/RecordDetailPage';
import { useSnackbar } from '../components/SnackbarProvider';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { formatCurrency, formatStatusLabel } from '../utils/format';

interface HoldResponse {
  id: number; eventId: number; parkingProductId: number; quantity: number; channel: string;
  buyerReference?: string | null; priceTierId: number; unitPrice: number; currency: string;
  status: string; expiresAt: string; finalizationReason?: string | null; version: number;
}
interface OrderItem { id: number; productName: string; category: string; quantity: number; unitPrice: number; total: number; parkingFacilityId: number }
interface OrderResponse {
  id: number; eventId: number; inventoryHoldId: number; number: string; channel: string;
  vehiclePlate?: string | null; status: string; buyer: { name: string; email: string; maskedDocument?: string | null };
  items: OrderItem[]; total: number; currency: string; expiresAt?: string | null; finalizedAt?: string | null;
  version: number; createdAt: string;
}
interface OrderPage { items: OrderResponse[]; nextCursor?: number | null; hasMore: boolean }
interface CancellationResponse {
  id: number; orderId: number; orderStatus: string; refundRequired: boolean; releasedQuantity: number;
  blockedCredentials: number; reason: string; orderVersion: number; version: number; requestedAt: string;
}
interface CredentialResponse {
  id: number; eventId: number; parkingFacilityId: number; orderId: number; orderItemId: number;
  publicCode: string; unitNumber: number; origin: string; category: string; right: string;
  validFrom: string; validUntil: string; preferredMedium: string; vehiclePlate?: string | null;
  status: string; qrVersion: number; blockedAt?: string | null; blockingReason?: string | null; version: number;
}
interface QrResponse {
  id: number; credentialId: number; representationVersion: number; token: string;
  issuedAt: string; expiresAt: string; credentialVersion: number;
}

function HoldPanel() {
  const { remember } = useOperationalWorkspace();
  const { open } = useSalesNavigation('reservas');
  const [form, setForm] = useState({ productId: '', quantity: '1', channel: 'WEB', buyerReference: '' });
  const [holdId, setHoldId] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const create = async (event: FormEvent) => {
    event.preventDefault(); setLoading('create'); setError(null);
    try {
      const response = await api.post<HoldResponse>('/api/v1/inventory-holds', {
        parkingProductId: Number(form.productId), quantity: Number(form.quantity),
        channel: form.channel.toUpperCase(), buyerReference: form.buyerReference.trim() || null,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      const data = response.data;
      remember('hold', { id: data.id, label: `Produto ${data.parkingProductId} · ${formatStatusLabel(data.status)}`, version: data.version });
      open(data.id);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  return (
    <Stack spacing={2}>
      <OperationCard title="Reservar vaga temporariamente" description="A reserva escolhe o lote vigente e impede a sobrevenda durante sua validade." error={error}>
        <Stack component="form" spacing={2} onSubmit={(event) => void create(event)}>
          <OperationalReferenceSelect kind="sales-products" label="Produto" value={form.productId} onChange={(productId) => setForm((current) => ({ ...current, productId }))} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <NumberField label="Quantidade" value={form.quantity} min={1} required fullWidth
              onValueChange={(quantity) => setForm((current) => ({ ...current, quantity }))} />
            <TextField label="Canal" value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))} required fullWidth />
            <TextField label="Referência do comprador" value={form.buyerReference} onChange={(event) => setForm((current) => ({ ...current, buyerReference: event.target.value }))} fullWidth />
          </Stack>
          <Button type="submit" variant="contained" disabled={loading !== null} startIcon={loading === 'create' ? <CircularProgress size={18} color="inherit" /> : <AddShoppingCartOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Reservar vaga</Button>
        </Stack>
      </OperationCard>
      <OperationCard title="Consultar reserva" description="Somente reservas próprias são visíveis para o usuário autenticado.">
        <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); if (positiveId(holdId)) open(Number(holdId)); }}>
          <OperationalReferenceSelect kind="sales-holds" label="Reserva" value={holdId} onChange={setHoldId} />
          <Button type="submit" variant="outlined" disabled={!positiveId(holdId)} startIcon={<SearchOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Abrir reserva</Button>
        </Stack>
      </OperationCard>
    </Stack>
  );
}

function HoldDetailPage({ holdId }: { holdId: number }) {
  const { activeOrganization } = useAuth();
  const { remember } = useOperationalWorkspace();
  const { goBack } = useSalesNavigation('reservas');
  const queryClient = useQueryClient();
  const queryKey = tenantQueryKey(activeOrganization!.organizationId, 'hold-detail', activeOrganization?.membershipId, holdId);
  const query = useQuery({
    queryKey,
    queryFn: () => api.get<HoldResponse>(`/api/v1/inventory-holds/${holdId}`).then((response) => response.data),
  });
  const hold = query.isError ? undefined : query.data;
  useEffect(() => {
    if (hold) remember('hold', { id: hold.id, label: `Produto ${hold.parkingProductId} · ${formatStatusLabel(hold.status)}`, version: hold.version });
  }, [hold, remember]);
  const [releaseReason, setReleaseReason] = useState('LIBERACAO_SOLICITADA');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const release = async () => {
    if (saving || hold?.status !== 'MANTIDA') return;
    setSaving(true); setError(null);
    try {
      const { data } = await api.post<HoldResponse>(`/api/v1/inventory-holds/${holdId}/release`, { reason: releaseReason.toUpperCase() });
      queryClient.setQueryData(queryKey, data);
    } catch (cause) { setError(describeError(cause)); } finally { setSaving(false); }
  };
  return <RecordDetailPage title={`Reserva #${holdId}`} subtitle="Consulte a reserva temporária e libere a vaga, quando necessário." onBack={goBack}>
    {query.isLoading && <CircularProgress size={24} />}
    {query.isError && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>}>{describeError(query.error)}</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    {hold && <ResourceSnapshot data={{ id: hold.id, eventId: hold.eventId, parkingProductId: hold.parkingProductId, quantity: hold.quantity, status: hold.status, unitPrice: hold.unitPrice, currency: hold.currency, expiresAt: hold.expiresAt, finalizationReason: hold.finalizationReason, version: hold.version }} />}
    {hold?.status === 'MANTIDA' && <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Motivo da liberação" value={releaseReason} onChange={(event) => setReleaseReason(event.target.value)} required fullWidth />
      <Button color="warning" variant="outlined" disabled={saving || !releaseReason.trim()} onClick={() => void release()}>Liberar reserva</Button>
    </Stack>}
  </RecordDetailPage>;
}

const emptyOrder = { holdId: '', name: '', email: '', document: '', vehiclePlate: '', channel: 'WEB' };
const orderStatuses = ['CRIADO', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADO', 'ATENDIDO', 'CONCLUIDO', 'EXPIRADO', 'CANCELADO', 'EM_REEMBOLSO', 'REEMBOLSADO', 'CANCELADO_COM_PENDENCIA'];
const positiveId = (value: string | null | undefined) => !!value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;

function useSalesNavigation(tab: string) {
  const navigate = useNavigate();
  const { search, state, pathname } = useLocation();
  const listParams = new URLSearchParams(search);
  listParams.set('tab', tab);
  const listSearch = '?' + listParams.toString();
  const listPath = '/app/vendas' + listSearch;
  return {
    goBack: () => state?.fromSalesList ? navigate(-1) : navigate(listPath, { replace: true }),
    open: (id: string | number, replace = false) => navigate('/app/vendas/' + tab + '/' + id + listSearch, {
      replace, state: { fromSalesList: pathname === '/app/vendas' || !!state?.fromSalesList },
    }),
  };
}

function OrderPanel() {
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization!.organizationId;
  const canCreate = permissions.includes('orders:create');
  const canRead = permissions.includes('orders:read');
  const canManual = permissions.includes('orders:manual-confirm');
  const canCancel = permissions.includes('orders:cancel');
  const { open } = useSalesNavigation('pedidos');
  const [searchParams, setSearchParams] = useSearchParams();
  const eventFilter = searchParams.get('evento');
  const statusFilter = searchParams.get('situacao');
  const filters = {
    eventId: positiveId(eventFilter) ? eventFilter! : '',
    status: statusFilter && orderStatuses.includes(statusFilter) ? statusFilter : '',
    channel: searchParams.get('canal') ?? '',
  };
  const cursorHistory = [null, ...(searchParams.get('paginas')?.split(',').filter(positiveId).map(Number) ?? [])];
  const cursor = cursorHistory.at(-1) ?? null;
  const changeFilter = (key: string, value: string) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.set('tab', 'pedidos');
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('paginas');
    return next;
  }, { replace: true });
  const changeCursor = (history: (number | null)[]) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    next.set('tab', 'pedidos');
    if (history.length > 1) next.set('paginas', history.slice(1).join(','));
    else next.delete('paginas');
    return next;
  });
  const [orderId, setOrderId] = useState('');
  const queryKey = tenantQueryKey(organizationId, 'orders', activeOrganization?.membershipId, cursor, filters);
  const orders = useQuery({
    queryKey,
    enabled: canRead,
    queryFn: () => api.get<OrderPage>('/api/v1/orders', { params: {
      cursor: cursor ?? undefined, eventId: filters.eventId ? Number(filters.eventId) : undefined,
      status: filters.status || undefined, channel: filters.channel || undefined, limit: 25,
    } }).then((response) => response.data),
  });
  return <Stack spacing={2}>
    {canCreate && <Button variant="contained" startIcon={<AddShoppingCartOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}
      onClick={() => open('novo')}>Criar pedido</Button>}
    {canRead && (
      <OperationCard title="Meus pedidos" description="Pedidos disponíveis para o usuário autenticado." error={orders.isError ? describeError(orders.error) : null}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <NumberField label="Evento" value={filters.eventId} min={1} fullWidth onValueChange={(eventId) => changeFilter('evento', eventId)} />
          <TextField select label="Estado" value={filters.status} onChange={(event) => changeFilter('situacao', event.target.value)} fullWidth><MenuItem value="">Todos</MenuItem>{orderStatuses.map((status) => <MenuItem key={status} value={status}>{formatStatusLabel(status)}</MenuItem>)}</TextField>
          <TextField label="Canal" value={filters.channel} onChange={(event) => changeFilter('canal', event.target.value.toUpperCase())} fullWidth />
        </Stack>
        {orders.isLoading ? <CircularProgress /> : (orders.data?.items ?? []).map((item) => (
          <Card key={item.id} variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><div><Typography variant="subtitle1">{item.number}</Typography><Typography variant="body2" color="text.secondary">{item.buyer.name} · Evento #{item.eventId}</Typography></div><Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap"><StatusChip status={item.status} /><Typography variant="subtitle1">{formatCurrency(Number(item.total), item.currency)}</Typography><Button size="small" onClick={() => open(item.id)}>Ver detalhes</Button></Stack></Stack></CardContent></Card>
        ))}
        <Stack direction="row" justifyContent="space-between"><Button disabled={cursorHistory.length === 1} onClick={() => changeCursor(cursorHistory.slice(0, -1))}>Anterior</Button><Button disabled={!orders.data?.hasMore || !orders.data.nextCursor} onClick={() => orders.data?.nextCursor && changeCursor([...cursorHistory, orders.data.nextCursor])}>Próxima</Button></Stack>
      </OperationCard>
    )}
    {(canRead || canManual || canCancel) && <OperationCard title="Localizar pedido" description="Busque pelo número do pedido.">
      <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); if (positiveId(orderId)) open(Number(orderId)); }}>
        <OperationalReferenceSelect kind="sales-orders" label="Pedido" value={orderId} onChange={setOrderId} />
        <Button type="submit" variant="outlined" disabled={!positiveId(orderId)} startIcon={<SearchOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Abrir pedido</Button>
      </Stack>
    </OperationCard>}
  </Stack>;
}

function NewOrderPage() {
  const { activeOrganization, permissions } = useAuth();
  const { remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const queryClient = useQueryClient();
  const organizationId = activeOrganization!.organizationId;
  const { goBack, open } = useSalesNavigation('pedidos');
  const [form, setForm] = useState(emptyOrder);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = useRef(false);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !positiveId(form.holdId)) return;
    setBusy(true); setError(null);
    try {
      const { data } = await api.post<OrderResponse>('/api/v1/orders', {
        inventoryHoldId: Number(form.holdId),
        buyer: { name: form.name, email: form.email, document: form.document.trim() || null },
        vehiclePlate: form.vehiclePlate.trim() || null, channel: form.channel.toUpperCase(),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      remember('order', { id: data.id, label: `${data.number} · ${formatStatusLabel(data.status)}`, version: data.version });
      await queryClient.invalidateQueries({ queryKey: ['tenant', organizationId, 'orders'] });
      submitted.current = true;
      notify('Pedido criado.', 'success');
      if (permissions.some((value) => ['orders:read', 'orders:manual-confirm', 'orders:cancel'].includes(value))) open(data.id, true);
      else goBack();
    } catch (cause) { setError(describeError(cause)); } finally { setBusy(false); }
  };
  return <OperationalFormPage title="Criar pedido" description="Converte a reserva do próprio usuário em pedido e preserva o preço selecionado." onClose={goBack}
    onSubmit={(event) => void create(event)} dirty={Object.keys(emptyOrder).some((key) => form[key as keyof typeof form] !== emptyOrder[key as keyof typeof form])}
    navigationAllowed={() => submitted.current} submitLabel="Criar pedido" submitDisabled={!positiveId(form.holdId)} busy={busy} error={error}>
    <OperationalReferenceSelect kind="ordering-holds" label="Reserva" value={form.holdId} onChange={(holdId) => setForm((current) => ({ ...current, holdId }))} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Nome do comprador" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
      <TextField label="E-mail" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required fullWidth />
      <TextField label="Documento" value={form.document} onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))} fullWidth />
    </Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Placa do veículo" value={form.vehiclePlate} onChange={(event) => setForm((current) => ({ ...current, vehiclePlate: event.target.value.toUpperCase() }))} inputProps={{ maxLength: 10 }} fullWidth />
      <TextField label="Canal" value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value.toUpperCase() }))} required fullWidth />
    </Stack>
  </OperationalFormPage>;
}

function OrderDetailPage({ orderId }: { orderId: number }) {
  const { activeOrganization, permissions } = useAuth();
  const { recent, remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const queryClient = useQueryClient();
  const organizationId = activeOrganization!.organizationId;
  const canRead = permissions.includes('orders:read');
  const canManual = permissions.includes('orders:manual-confirm');
  const canCancel = permissions.includes('orders:cancel');
  const { goBack } = useSalesNavigation('pedidos');
  const detailKey = tenantQueryKey(organizationId, 'order-detail', activeOrganization?.membershipId, orderId);
  const orderQuery = useQuery({
    queryKey: detailKey,
    queryFn: () => api.get<OrderResponse>(`/api/v1/orders/${orderId}`).then((response) => response.data),
    enabled: canRead,
  });
  const order = canRead && !orderQuery.isError ? orderQuery.data : undefined;
  useEffect(() => {
    if (order) remember('order', { id: order.id, label: `${order.number} · ${formatStatusLabel(order.status)}`, version: order.version });
  }, [order, remember]);
  const [versionInput, setVersion] = useState(() => String(recent('order').find((item) => item.id === orderId)?.version ?? 0));
  const version = canRead ? order?.version : /^\d+$/.test(versionInput) ? Number(versionInput) : undefined;
  const isReady = Number.isSafeInteger(version) && !orderQuery.isError;
  const [manual, setManual] = useState({ paymentMethod: 'DINHEIRO', evidenceReference: '', reason: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshList = () => queryClient.invalidateQueries({ queryKey: ['tenant', organizationId, 'orders'] });
  const confirmManual = async () => {
    if (!canManual || !isReady || version === undefined || loading) return;
    setLoading('manual'); setError(null);
    try {
      const { data } = await api.post<OrderResponse>(`/api/v1/orders/${orderId}/manual-confirmation`, manual, { headers: { ...ifMatchHeaders(version), 'Idempotency-Key': crypto.randomUUID() } });
      if (canRead) queryClient.setQueryData(detailKey, data);
      setVersion(String(data.version));
      if (!canRead) remember('order', { id: data.id, label: `${data.number} · ${formatStatusLabel(data.status)}`, version: data.version });
      await refreshList();
      notify('Pedido confirmado e inventário consolidado.', 'success');
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const cancel = async () => {
    if (!canCancel || !isReady || version === undefined || loading) return;
    setLoading('cancel'); setError(null);
    try {
      const response = await api.post<CancellationResponse>(`/api/v1/orders/${orderId}/cancellation`, { reason: cancelReason }, { headers: { ...ifMatchHeaders(version), 'Idempotency-Key': crypto.randomUUID() } });
      setVersion(String(response.data.orderVersion));
      if (canRead) queryClient.setQueryData<OrderResponse>(detailKey, (current) => current ? { ...current, status: response.data.orderStatus, version: response.data.orderVersion } : current);
      await refreshList();
      notify(response.data.refundRequired ? 'Cancelamento aceito com reembolso externo pendente.' : 'Pedido cancelado.', 'success');
      setConfirmCancel(false);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  return (
    <RecordDetailPage title={order ? `Pedido ${order.number}` : `Pedido #${orderId}`}
      subtitle={canRead ? 'Consulte os dados do pedido e as ações disponíveis.' : 'Informe a revisão conhecida para executar somente a operação autorizada.'} onBack={goBack}>
      {canRead && orderQuery.isLoading && <CircularProgress size={24} />}
      {canRead && orderQuery.isError && <Alert severity="error" action={<Button onClick={() => void orderQuery.refetch()}>Tentar novamente</Button>}>{describeError(orderQuery.error)}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {order && !orderQuery.isError && <ResourceSnapshot data={{ id: order.id, number: order.number, eventId: order.eventId, buyer: order.buyer.name, status: order.status, total: formatCurrency(Number(order.total), order.currency), vehiclePlate: order.vehiclePlate, version: order.version }} />}
      {!canRead && <NumberField label="Revisão do pedido" value={versionInput} min={0} onValueChange={setVersion} required fullWidth />}
      {canManual && (!canRead || (order && !orderQuery.isError)) && <Stack spacing={2}><Typography variant="subtitle2">Confirmação manual</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Método" value={manual.paymentMethod} onChange={(event) => setManual((current) => ({ ...current, paymentMethod: event.target.value.toUpperCase() }))} fullWidth /><TextField label="Referência da evidência" value={manual.evidenceReference} onChange={(event) => setManual((current) => ({ ...current, evidenceReference: event.target.value }))} fullWidth /></Stack><TextField label="Motivo" value={manual.reason} onChange={(event) => setManual((current) => ({ ...current, reason: event.target.value }))} /><Button variant="contained" disabled={loading !== null || !isReady || !manual.evidenceReference || !manual.reason} onClick={() => void confirmManual()} startIcon={<CreditScoreOutlinedIcon />}>Confirmar manualmente</Button></Stack>}
      {canCancel && (!canRead || (order && !orderQuery.isError)) && <Stack spacing={1}><TextField label="Motivo do cancelamento" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} multiline minRows={2} /><Button color="error" variant="outlined" disabled={loading !== null || !isReady || !cancelReason} onClick={() => setConfirmCancel(true)}>Cancelar pedido</Button></Stack>}
      <ConfirmDialog open={confirmCancel} title="Cancelar pedido" message="Esta ação pode liberar inventário, bloquear credenciais e gerar pendência externa de reembolso." confirmLabel="Confirmar cancelamento" confirmColor="error" loading={loading === 'cancel'} onClose={() => setConfirmCancel(false)} onConfirm={() => void cancel()} />
    </RecordDetailPage>
  );
}

function CredentialPanel() {
  const { remember } = useOperationalWorkspace();
  const { open } = useSalesNavigation('credenciais');
  const [orderId, setOrderId] = useState('');
  const [medium, setMedium] = useState('QR');
  const [credentialId, setCredentialId] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const issue = async () => {
    if (!positiveId(orderId) || loading) return;
    setLoading('issue'); setError(null);
    try {
      const { data } = await api.post<CredentialResponse>(`/api/v1/orders/${Number(orderId)}/credentials`, { preferredMedium: medium }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      remember('credential', { id: data.id, label: `${data.publicCode} · ${formatStatusLabel(data.status)}`, version: data.version });
      open(data.id);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  return (
    <Stack spacing={2}>
      <OperationCard title="Emitir credencial" description="Emite a próxima credencial disponível de um pedido confirmado." error={error}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <OperationalReferenceSelect kind="issuing-orders" label="Pedido" value={orderId} onChange={setOrderId} />
          <TextField select label="Meio preferido" value={medium} onChange={(event) => setMedium(event.target.value)} fullWidth><MenuItem value="QR">QR</MenuItem><MenuItem value="PLACA">Placa</MenuItem><MenuItem value="RFID">RFID</MenuItem></TextField>
          <Button variant="contained" disabled={!positiveId(orderId) || loading !== null} onClick={() => void issue()} startIcon={loading === 'issue' ? <CircularProgress size={18} color="inherit" /> : <QrCode2OutlinedIcon />}>Emitir</Button>
        </Stack>
      </OperationCard>
      <OperationCard title="Consultar credencial" description="Abra os dados da credencial ou gere uma representação QR.">
        <Stack component="form" spacing={2} onSubmit={(event) => { event.preventDefault(); if (positiveId(credentialId)) open(Number(credentialId)); }}>
          <OperationalReferenceSelect kind="sales-credentials" label="Credencial" value={credentialId} onChange={setCredentialId} />
          <Button type="submit" variant="outlined" disabled={!positiveId(credentialId)} startIcon={<SearchOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Abrir credencial</Button>
        </Stack>
      </OperationCard>
    </Stack>
  );
}

function CredentialDetailPage({ credentialId }: { credentialId: number }) {
  const { activeOrganization } = useAuth();
  const { remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const { goBack } = useSalesNavigation('credenciais');
  const query = useQuery({
    queryKey: tenantQueryKey(activeOrganization!.organizationId, 'credential-detail', activeOrganization?.membershipId, credentialId),
    queryFn: () => api.get<CredentialResponse>(`/api/v1/credentials/${credentialId}`).then((response) => response.data),
  });
  const credential = query.isError ? undefined : query.data;
  useEffect(() => {
    if (credential) remember('credential', { id: credential.id, label: `${credential.publicCode} · ${formatStatusLabel(credential.status)}`, version: credential.version });
  }, [credential, remember]);
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generateQr = async () => {
    if (loading || !credential || credential.status === 'BLOQUEADA') return;
    setLoading(true); setError(null);
    try {
      const version = Math.max(credential.version, qr?.credentialVersion ?? credential.version);
      const { data } = await api.post<QrResponse>(`/api/v1/credentials/${credentialId}/qr-code`, null, { headers: ifMatchHeaders(version) });
      setQr(data);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  const copyToken = async () => {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.token);
      notify('Token QR copiado com segurança.', 'success');
    } catch {
      setError('Não foi possível copiar o token neste navegador.');
    }
  };
  return <RecordDetailPage title={credential ? `Credencial ${credential.publicCode}` : `Credencial #${credentialId}`} onBack={goBack}
    subtitle="O token QR não é armazenado no navegador nem aparece em listagens.">
    {query.isLoading && <CircularProgress size={24} />}
    {query.isError && <Alert severity="error" action={<Button onClick={() => void query.refetch()}>Tentar novamente</Button>}>{describeError(query.error)}</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    {credential && <ResourceSnapshot data={{ id: credential.id, publicCode: credential.publicCode, eventId: credential.eventId, parkingFacilityId: credential.parkingFacilityId, status: credential.status, preferredMedium: credential.preferredMedium, vehiclePlate: credential.vehiclePlate, validFrom: credential.validFrom, validUntil: credential.validUntil, qrVersion: qr?.representationVersion ?? credential.qrVersion, version: qr?.credentialVersion ?? credential.version }} />}
    {credential?.status && credential.status !== 'BLOQUEADA' && <Button variant="contained" disabled={loading} onClick={() => void generateQr()} startIcon={<QrCode2OutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Gerar QR</Button>}
    {credential?.status !== 'BLOQUEADA' && credential && qr && <Alert severity="success" icon={<QrCode2OutlinedIcon />}><Stack spacing={1}><Typography variant="subtitle2">Representação {qr.representationVersion} válida até {new Date(qr.expiresAt).toLocaleString('pt-BR')}</Typography><TextField label="Token QR" type="password" value={qr.token} InputProps={{ readOnly: true }} fullWidth /><Button size="small" startIcon={<ContentCopyOutlinedIcon />} onClick={() => void copyToken()} sx={{ alignSelf: 'flex-start' }}>Copiar token</Button></Stack></Alert>}
  </RecordDetailPage>;
}

export function SalesPage() {
  const { activeOrganization, permissions } = useAuth();
  const { pathname } = useLocation();
  const { detailId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const actorKey = `${activeOrganization?.organizationId}:${activeOrganization?.membershipId}`;
  const orderNavigation = useSalesNavigation('pedidos');
  const holdNavigation = useSalesNavigation('reservas');
  const credentialNavigation = useSalesNavigation('credenciais');
  const hasOrderDetail = ['orders:read', 'orders:manual-confirm', 'orders:cancel'].some((code) => permissions.includes(code));
  const hasOrders = ['orders:create', 'orders:read', 'orders:manual-confirm', 'orders:cancel']
    .some((permission) => permissions.includes(permission));
  const panels = [
    permissions.includes('inventory:hold') && { id: 'reservas', label: 'Reservas', content: <HoldPanel /> },
    hasOrders && { id: 'pedidos', label: 'Pedidos', content: <OrderPanel /> },
    permissions.includes('credentials:issue') && { id: 'credenciais', label: 'Credenciais', content: <CredentialPanel /> },
  ].filter(Boolean) as { id: string; label: string; content: ReactNode }[];
  const tab = panels.find((panel) => panel.id === searchParams.get('tab')) ?? panels[0];
  if (detailId && pathname.startsWith('/app/vendas/pedidos/')) {
    if (detailId === 'novo' && permissions.includes('orders:create')) return <NewOrderPage key={actorKey} />;
    if (positiveId(detailId) && hasOrderDetail) return <OrderDetailPage key={actorKey + ':' + detailId} orderId={Number(detailId)} />;
    return <RecordDetailPage title="Pedido indisponível" onBack={orderNavigation.goBack}>
      <Alert severity="warning">Não foi possível abrir o pedido com o acesso atual.</Alert>
    </RecordDetailPage>;
  }
  if (detailId && pathname.startsWith('/app/vendas/reservas/')) {
    if (positiveId(detailId) && permissions.includes('inventory:hold')) return <HoldDetailPage key={actorKey + ':' + detailId} holdId={Number(detailId)} />;
    return <RecordDetailPage title="Reserva indisponível" onBack={holdNavigation.goBack}>
      <Alert severity="warning">Não foi possível abrir a reserva com o acesso atual.</Alert>
    </RecordDetailPage>;
  }
  if (detailId && pathname.startsWith('/app/vendas/credenciais/')) {
    if (positiveId(detailId) && permissions.includes('credentials:issue')) return <CredentialDetailPage key={actorKey + ':' + detailId} credentialId={Number(detailId)} />;
    return <RecordDetailPage title="Credencial indisponível" onBack={credentialNavigation.goBack}>
      <Alert severity="warning">Não foi possível abrir a credencial com o acesso atual.</Alert>
    </RecordDetailPage>;
  }
  return (
    <Box>
      <PageHeader title="Vendas e credenciais" subtitle="Da reserva temporária da vaga até a credencial pronta para acesso." />
      <Tabs value={tab?.id ?? false} onChange={(_, value) => setSearchParams({ tab: value })} variant="scrollable" sx={{ mb: 2 }}>{panels.map((panel) => <Tab key={panel.id} value={panel.id} label={panel.label} />)}</Tabs>
      {tab?.content ?? <Alert severity="warning">Nenhuma operação comercial disponível.</Alert>}
    </Box>
  );
}
