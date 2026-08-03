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
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { api, describeError, ifMatchHeaders } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { OperationCard } from '../components/enterprise/OperationCard';
import { ResourceIdField } from '../components/enterprise/ResourceIdField';
import { ResourceSnapshot } from '../components/enterprise/ResourceSnapshot';
import { useSnackbar } from '../components/SnackbarProvider';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import type { WorkspaceResource } from '../workspace/workspaceStore';

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

function snapshot<T>(items: WorkspaceResource[], id: string): T | null {
  return items.find((item) => item.id === Number(id))?.snapshot as T ?? null;
}

function HoldPanel() {
  const { recent, remember } = useOperationalWorkspace();
  const holds = recent('hold');
  const [form, setForm] = useState({ productId: '', quantity: '1', channel: 'WEB', buyerReference: '' });
  const [holdId, setHoldId] = useState('');
  const [releaseReason, setReleaseReason] = useState('LIBERACAO_SOLICITADA');
  const [result, setResult] = useState<HoldResponse | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accept = (data: HoldResponse) => {
    setResult(data); setHoldId(String(data.id));
    remember('hold', { id: data.id, label: `Produto ${data.parkingProductId} · ${data.status}`, version: data.version, snapshot: { ...data } });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); setLoading('create'); setError(null);
    try {
      const response = await api.post<HoldResponse>('/api/v1/inventory-holds', {
        parkingProductId: Number(form.productId), quantity: Number(form.quantity),
        channel: form.channel.toUpperCase(), buyerReference: form.buyerReference.trim() || null,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const load = async () => {
    setLoading('read'); setError(null);
    try { accept((await api.get<HoldResponse>(`/api/v1/inventory-holds/${Number(holdId)}`)).data); }
    catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const release = async () => {
    setLoading('release'); setError(null);
    try { accept((await api.post<HoldResponse>(`/api/v1/inventory-holds/${Number(holdId)}/release`, { reason: releaseReason.toUpperCase() })).data); }
    catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const choose = (id: string) => { setHoldId(id); const found = snapshot<HoldResponse>(holds, id); if (found) setResult(found); };
  return (
    <Stack spacing={2}>
      <OperationCard title="Reservar inventario" description="O hold e temporario, escolhe o lote vigente e impede sobrevenda durante sua validade." error={error}>
        <Stack component="form" spacing={2} onSubmit={(event) => void create(event)}>
          <ResourceIdField label="ID do produto" value={form.productId} onChange={(productId) => setForm((current) => ({ ...current, productId }))} recent={recent('product')} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Quantidade" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 1 }} required fullWidth />
            <TextField label="Canal" value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))} required fullWidth />
            <TextField label="Referencia do comprador" value={form.buyerReference} onChange={(event) => setForm((current) => ({ ...current, buyerReference: event.target.value }))} fullWidth />
          </Stack>
          <Button type="submit" variant="contained" disabled={loading !== null} startIcon={loading === 'create' ? <CircularProgress size={18} color="inherit" /> : <AddShoppingCartOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar hold</Button>
        </Stack>
      </OperationCard>
      <OperationCard title="Consultar ou liberar hold" description="Somente holds proprios sao visiveis para o ator autenticado." error={error} result={result ? <ResourceSnapshot data={{ id: result.id, eventId: result.eventId, parkingProductId: result.parkingProductId, quantity: result.quantity, status: result.status, unitPrice: result.unitPrice, currency: result.currency, expiresAt: result.expiresAt, finalizationReason: result.finalizationReason, version: result.version }} /> : undefined}>
        <ResourceIdField label="ID do hold" value={holdId} onChange={choose} recent={holds} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="outlined" disabled={!holdId || loading !== null} onClick={() => void load()} startIcon={loading === 'read' ? <CircularProgress size={18} /> : <SearchOutlinedIcon />}>Consultar</Button>
          <TextField label="Motivo da liberacao" value={releaseReason} onChange={(event) => setReleaseReason(event.target.value)} required fullWidth />
          <Button color="warning" variant="outlined" disabled={!holdId || loading !== null || result?.status !== 'MANTIDA'} onClick={() => void release()}>Liberar hold</Button>
        </Stack>
      </OperationCard>
    </Stack>
  );
}

function OrderPanel() {
  const { activeOrganization, permissions } = useAuth();
  const { recent, remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const queryClient = useQueryClient();
  const organizationId = activeOrganization!.organizationId;
  const canCreate = permissions.includes('orders:create');
  const canRead = permissions.includes('orders:read');
  const canManual = permissions.includes('orders:manual-confirm');
  const canCancel = permissions.includes('orders:cancel');
  const [form, setForm] = useState({ holdId: '', name: '', email: '', document: '', vehiclePlate: '', channel: 'WEB' });
  const [filters, setFilters] = useState({ eventId: '', status: '', channel: '' });
  const [cursorHistory, setCursorHistory] = useState<(number | null)[]>([null]);
  const cursor = cursorHistory.at(-1) ?? null;
  const queryKey = tenantQueryKey(organizationId, 'orders', cursor, filters);
  const orders = useQuery({
    queryKey,
    enabled: canRead,
    queryFn: () => api.get<OrderPage>('/api/v1/orders', { params: {
      cursor: cursor ?? undefined, eventId: filters.eventId ? Number(filters.eventId) : undefined,
      status: filters.status || undefined, channel: filters.channel || undefined, limit: 25,
    } }).then((response) => response.data),
  });
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [orderId, setOrderId] = useState('');
  const [version, setVersion] = useState('0');
  const [manual, setManual] = useState({ paymentMethod: 'DINHEIRO', evidenceReference: '', reason: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accept = (data: OrderResponse) => {
    setOrder(data); setOrderId(String(data.id)); setVersion(String(data.version));
    remember('order', { id: data.id, label: `${data.number} · ${data.status}`, version: data.version, snapshot: { ...data } });
  };
  const create = async (event: FormEvent) => {
    event.preventDefault(); setLoading('create'); setError(null);
    try {
      const response = await api.post<OrderResponse>('/api/v1/orders', {
        inventoryHoldId: Number(form.holdId),
        buyer: { name: form.name, email: form.email, document: form.document.trim() || null },
        vehiclePlate: form.vehiclePlate.trim() || null, channel: form.channel.toUpperCase(),
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data); await queryClient.invalidateQueries({ queryKey: ['tenant', organizationId, 'orders'] });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const load = async () => {
    setLoading('read'); setError(null);
    try { accept((await api.get<OrderResponse>(`/api/v1/orders/${Number(orderId)}`)).data); }
    catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const confirmManual = async () => {
    setLoading('manual'); setError(null);
    try {
      const response = await api.post<OrderResponse>(`/api/v1/orders/${Number(orderId)}/manual-confirmation`, manual, { headers: { ...ifMatchHeaders(Number(version)), 'Idempotency-Key': crypto.randomUUID() } });
      accept(response.data); notify('Pedido confirmado e inventario consolidado.', 'success');
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const cancel = async () => {
    setLoading('cancel'); setError(null);
    try {
      const response = await api.post<CancellationResponse>(`/api/v1/orders/${Number(orderId)}/cancellation`, { reason: cancelReason }, { headers: { ...ifMatchHeaders(Number(version)), 'Idempotency-Key': crypto.randomUUID() } });
      setVersion(String(response.data.orderVersion));
      setOrder((current) => current ? { ...current, status: response.data.orderStatus, version: response.data.orderVersion } : current);
      notify(response.data.refundRequired ? 'Cancelamento aceito com reembolso externo pendente.' : 'Pedido cancelado.', 'success');
      setConfirmCancel(false);
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const choose = (id: string) => { setOrderId(id); const found = snapshot<OrderResponse>(recent('order'), id); if (found) accept(found); };
  return (
    <Stack spacing={2}>
      {canCreate && <OperationCard title="Criar pedido" description="Consome um hold mantido do proprio ator e preserva o preco capturado." error={error}>
        <Stack component="form" spacing={2} onSubmit={(event) => void create(event)}>
          <ResourceIdField label="ID do hold" value={form.holdId} onChange={(holdId) => setForm((current) => ({ ...current, holdId }))} recent={recent('hold')} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Nome do comprador" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
            <TextField label="E-mail" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required fullWidth />
            <TextField label="Documento" value={form.document} onChange={(event) => setForm((current) => ({ ...current, document: event.target.value }))} fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Placa do veiculo" value={form.vehiclePlate} onChange={(event) => setForm((current) => ({ ...current, vehiclePlate: event.target.value.toUpperCase() }))} inputProps={{ maxLength: 10 }} fullWidth />
            <TextField label="Canal" value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value.toUpperCase() }))} required fullWidth />
          </Stack>
          <Button type="submit" variant="contained" disabled={loading !== null} startIcon={loading === 'create' ? <CircularProgress size={18} color="inherit" /> : <AddShoppingCartOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar pedido</Button>
        </Stack>
      </OperationCard>}
      {canRead && (
        <OperationCard title="Meus pedidos" description="A listagem e paginada por cursor e limitada aos pedidos do ator autenticado." error={orders.isError ? describeError(orders.error) : null}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField label="Evento" type="number" value={filters.eventId} onChange={(event) => { setFilters((current) => ({ ...current, eventId: event.target.value })); setCursorHistory([null]); }} fullWidth />
            <TextField select label="Estado" value={filters.status} onChange={(event) => { setFilters((current) => ({ ...current, status: event.target.value })); setCursorHistory([null]); }} fullWidth><MenuItem value="">Todos</MenuItem>{['CRIADO','AGUARDANDO_PAGAMENTO','CONFIRMADO','ATENDIDO','CONCLUIDO','EXPIRADO','CANCELADO','EM_REEMBOLSO','REEMBOLSADO','CANCELADO_COM_PENDENCIA'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}</TextField>
            <TextField label="Canal" value={filters.channel} onChange={(event) => { setFilters((current) => ({ ...current, channel: event.target.value.toUpperCase() })); setCursorHistory([null]); }} fullWidth />
          </Stack>
          {orders.isLoading ? <CircularProgress /> : (orders.data?.items ?? []).map((item) => (
            <Card key={item.id} variant="outlined"><CardContent><Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}><div><Typography variant="subtitle1">{item.number}</Typography><Typography variant="body2" color="text.secondary">{item.buyer.name} · Evento #{item.eventId}</Typography></div><Stack direction="row" spacing={1} alignItems="center"><StatusChip status={item.status} /><Typography variant="subtitle1">{item.currency} {Number(item.total).toFixed(2)}</Typography><Button size="small" onClick={() => accept(item)}>Operar</Button></Stack></Stack></CardContent></Card>
          ))}
          <Stack direction="row" justifyContent="space-between"><Button disabled={cursorHistory.length === 1} onClick={() => setCursorHistory((current) => current.slice(0, -1))}>Anterior</Button><Button disabled={!orders.data?.hasMore || !orders.data.nextCursor} onClick={() => orders.data?.nextCursor && setCursorHistory((current) => [...current, orders.data!.nextCursor!])}>Proxima</Button></Stack>
        </OperationCard>
      )}
      {(canRead || canManual || canCancel) && <OperationCard title="Operar pedido" description={canRead ? 'Consulte para obter a versao mais recente antes de confirmar ou cancelar.' : 'Informe o ID e a versao conhecida para executar somente a operacao autorizada.'} error={error} result={order ? <ResourceSnapshot data={{ id: order.id, number: order.number, eventId: order.eventId, buyer: order.buyer.name, status: order.status, total: `${order.currency} ${Number(order.total).toFixed(2)}`, vehiclePlate: order.vehiclePlate, version: order.version }} /> : undefined}>
        <ResourceIdField label="ID do pedido" value={orderId} onChange={choose} recent={recent('order')} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Versao" type="number" value={version} onChange={(event) => setVersion(event.target.value)} inputProps={{ min: 0 }} required fullWidth />{canRead && <Button variant="outlined" disabled={!orderId || loading !== null} onClick={() => void load()} startIcon={<SearchOutlinedIcon />}>Consultar</Button>}</Stack>
        {canManual && <Stack spacing={2}><Typography variant="subtitle2">Confirmacao manual</Typography><Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Metodo" value={manual.paymentMethod} onChange={(event) => setManual((current) => ({ ...current, paymentMethod: event.target.value.toUpperCase() }))} fullWidth /><TextField label="Referencia da evidencia" value={manual.evidenceReference} onChange={(event) => setManual((current) => ({ ...current, evidenceReference: event.target.value }))} fullWidth /></Stack><TextField label="Motivo" value={manual.reason} onChange={(event) => setManual((current) => ({ ...current, reason: event.target.value }))} /><Button variant="contained" disabled={loading !== null || !orderId || !manual.evidenceReference || !manual.reason} onClick={() => void confirmManual()} startIcon={<CreditScoreOutlinedIcon />}>Confirmar manualmente</Button></Stack>}
        {canCancel && <Stack spacing={1}><TextField label="Motivo do cancelamento" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} multiline minRows={2} /><Button color="error" variant="outlined" disabled={loading !== null || !orderId || !cancelReason} onClick={() => setConfirmCancel(true)}>Cancelar pedido</Button></Stack>}
      </OperationCard>}
      <ConfirmDialog open={confirmCancel} title="Cancelar pedido" message="Esta acao pode liberar inventario, bloquear credenciais e gerar pendencia externa de reembolso." confirmLabel="Confirmar cancelamento" confirmColor="error" loading={loading === 'cancel'} onClose={() => setConfirmCancel(false)} onConfirm={() => void cancel()} />
    </Stack>
  );
}

function CredentialPanel() {
  const { recent, remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const credentials = recent('credential');
  const [orderId, setOrderId] = useState('');
  const [medium, setMedium] = useState('QR');
  const [credentialId, setCredentialId] = useState('');
  const [version, setVersion] = useState('0');
  const [credential, setCredential] = useState<CredentialResponse | null>(null);
  const [qr, setQr] = useState<QrResponse | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accept = (data: CredentialResponse) => {
    setCredential(data); setCredentialId(String(data.id)); setVersion(String(data.version));
    remember('credential', { id: data.id, label: `${data.publicCode} · ${data.status}`, version: data.version, snapshot: { ...data } });
  };
  const issue = async () => {
    setLoading('issue'); setError(null);
    try { accept((await api.post<CredentialResponse>(`/api/v1/orders/${Number(orderId)}/credentials`, { preferredMedium: medium }, { headers: { 'Idempotency-Key': crypto.randomUUID() } })).data); }
    catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const load = async () => {
    setLoading('read'); setError(null);
    try { accept((await api.get<CredentialResponse>(`/api/v1/credentials/${Number(credentialId)}`)).data); }
    catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const generateQr = async () => {
    setLoading('qr'); setError(null);
    try {
      const response = await api.post<QrResponse>(`/api/v1/credentials/${Number(credentialId)}/qr-code`, null, { headers: ifMatchHeaders(Number(version)) });
      setQr(response.data); setVersion(String(response.data.credentialVersion));
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(null); }
  };
  const choose = (id: string) => { setCredentialId(id); const found = snapshot<CredentialResponse>(credentials, id); if (found) accept(found); };
  const copyToken = async () => { if (!qr) return; await navigator.clipboard.writeText(qr.token); notify('Token QR copiado com seguranca.', 'success'); };
  return (
    <Stack spacing={2}>
      <OperationCard title="Emitir credencial" description="Cada chamada emite a proxima unidade elegivel de um pedido confirmado." error={error}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <ResourceIdField label="ID do pedido" value={orderId} onChange={setOrderId} recent={recent('order')} />
          <TextField select label="Meio preferido" value={medium} onChange={(event) => setMedium(event.target.value)} fullWidth><MenuItem value="QR">QR</MenuItem><MenuItem value="PLACA">Placa</MenuItem><MenuItem value="RFID">RFID</MenuItem></TextField>
          <Button variant="contained" disabled={!orderId || loading !== null} onClick={() => void issue()} startIcon={loading === 'issue' ? <CircularProgress size={18} color="inherit" /> : <QrCode2OutlinedIcon />}>Emitir</Button>
        </Stack>
      </OperationCard>
      <OperationCard title="Consultar e gerar QR" description="O token e segredo operacional: nao e persistido no workspace nem exibido em listagens." error={error} result={credential ? <ResourceSnapshot data={{ id: credential.id, publicCode: credential.publicCode, eventId: credential.eventId, parkingFacilityId: credential.parkingFacilityId, status: credential.status, preferredMedium: credential.preferredMedium, vehiclePlate: credential.vehiclePlate, validFrom: credential.validFrom, validUntil: credential.validUntil, qrVersion: credential.qrVersion, version: credential.version }} /> : undefined}>
        <ResourceIdField label="ID da credencial" value={credentialId} onChange={choose} recent={credentials} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}><TextField label="Versao" type="number" value={version} onChange={(event) => setVersion(event.target.value)} inputProps={{ min: 0 }} required fullWidth /><Button variant="outlined" disabled={!credentialId || loading !== null} onClick={() => void load()}>Consultar</Button><Button variant="contained" disabled={!credentialId || loading !== null || credential?.status === 'BLOQUEADA'} onClick={() => void generateQr()} startIcon={<QrCode2OutlinedIcon />}>Gerar QR</Button></Stack>
        {qr && <Alert severity="success" icon={<QrCode2OutlinedIcon />}><Stack spacing={1}><Typography variant="subtitle2">Representacao {qr.representationVersion} valida ate {new Date(qr.expiresAt).toLocaleString('pt-BR')}</Typography><TextField label="Token QR" type="password" value={qr.token} InputProps={{ readOnly: true }} fullWidth /><Button size="small" startIcon={<ContentCopyOutlinedIcon />} onClick={() => void copyToken()} sx={{ alignSelf: 'flex-start' }}>Copiar token</Button></Stack></Alert>}
      </OperationCard>
    </Stack>
  );
}

export function SalesPage() {
  const { permissions } = useAuth();
  const [tab, setTab] = useState(0);
  const hasOrders = ['orders:create', 'orders:read', 'orders:manual-confirm', 'orders:cancel']
    .some((permission) => permissions.includes(permission));
  const panels = [
    permissions.includes('inventory:hold') && { label: 'Holds', content: <HoldPanel /> },
    hasOrders && { label: 'Pedidos', content: <OrderPanel /> },
    permissions.includes('credentials:issue') && { label: 'Credenciais', content: <CredentialPanel /> },
  ].filter(Boolean) as { label: string; content: ReactNode }[];
  useEffect(() => {
    if (tab >= panels.length) setTab(0);
  }, [panels.length, tab]);
  return (
    <Box>
      <PageHeader title="Vendas e credenciais" subtitle="Do bloqueio temporario de inventario ate a credencial pronta para acesso." />
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>{panels.map((panel) => <Tab key={panel.label} label={panel.label} />)}</Tabs>
      {panels[tab]?.content ?? <Alert severity="warning">Nenhuma operacao comercial disponivel.</Alert>}
    </Box>
  );
}
