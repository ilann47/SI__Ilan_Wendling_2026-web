import { Alert, Box, Button, Card, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api, describeError, ifMatchHeaders } from '../../api/client';
import { eventCatalogApi, type AllocationResponse, type EventResponse } from '../../api/eventCatalog';
import { eventPatioKey, eventPatioSummaryQuery, isPreparingPortaria } from '../../api/eventPatioSummary';
import { installationCatalogKey, searchInstallationCatalog } from '../../api/installationCatalog';
import { facilityAvailabilityKey, useFacilityAvailability } from '../../api/facilityAvailability';
import { tenantQueryKey } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { PATIO_PAGE_ACCESS } from '../../auth/accessPolicy';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { InstallationReferenceSelect } from '../../components/enterprise/InstallationReferenceSelect';
import { NumberField } from '../../components/form/NumberField';
import { FacilityForm } from '../../pages/FacilitiesPage';
import { formatDateTime } from '../../utils/format';
import { fromApiDateTime, supportsTimeZone } from '../../utils/dateTime';
import { wholeNumber } from '../../utils/formValidation';
import { previewNewCharge } from './chargePreview';

type ChargeMode = 'ENTRADA' | 'SAIDA';
type Charge = { modo: ChargeMode; valor: string };
const chargeLabel = (mode: ChargeMode) => mode === 'ENTRADA' ? 'na entrada' : 'na saída';
const compareChargeValue = (value: string) => value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
const canEditCharge = (status: string) => !['CANCELADO', 'FINALIZADO', 'OPERACAO_ENCERRADA', 'EM_CONCILIACAO'].includes(status);
const validMode = (mode: string): mode is ChargeMode => mode === 'ENTRADA' || mode === 'SAIDA';
const validPolicy = (policy: string) => policy === 'ENTRADA_UNICA' || policy === 'REENTRADA_PERMITIDA';

function duringEvent(event: EventResponse, now = Date.now()) {
  return Date.parse(event.startsAt) <= now && now < Date.parse(event.endsAt);
}

function useEventClock(startsAt: string, endsAt: string) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const next = [Date.parse(startsAt), Date.parse(endsAt)].find((time) => time > now);
    if (next === undefined) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(next - Date.now(), 2_147_483_647)));
    return () => window.clearTimeout(timer);
  }, [now, startsAt, endsAt]);
  return now;
}

function startLabel(event: EventResponse) {
  if (!supportsTimeZone(event.timeZone)) return formatDateTime(event.startsAt);
  const [date, time] = fromApiDateTime(event.startsAt, event.timeZone).split('T');
  return `${date.split('-').reverse().join('/')} às ${time}`;
}

export function formatEventMoney(value: string) {
  const [integer, rawFraction = ''] = value.split('.');
  const fraction = rawFraction.replace(/0+$/, '').padEnd(2, '0');
  const formattedInteger = BigInt(integer).toLocaleString('pt-BR');
  return `R$ ${integer.startsWith('-') && BigInt(integer) === 0n ? '-' : ''}${formattedInteger},${fraction}`;
}

export function EventPatioOperation({ event, onChanged, advanced, initialFacilityId }: {
  event: EventResponse; onChanged: (event: EventResponse) => void; advanced?: ReactNode; initialFacilityId?: number;
}) {
  const { permissions, activeOrganization } = useAuth();
  const org = activeOrganization?.organizationId;
  const queryClient = useQueryClient();
  const [facility, setFacility] = useState(initialFacilityId ? String(initialFacilityId) : '');
  const [capacity, setCapacity] = useState('');
  const [newFacility, setNewFacility] = useState(false);
  const [createdFacility, setCreatedFacility] = useState<{ id: number; label: string }>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [draftCharge, setDraftCharge] = useState<{ modo?: ChargeMode; valor?: string }>({});
  const [draftPolicy, setDraftPolicy] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [registered, setRegistered] = useState<AllocationResponse>();
  const [review, setReview] = useState<{ event: EventResponse; message: string }>();
  const allocationAttempt = useRef<{ draft: string; key: string } | null>(null);
  const canRead = permissions.includes('events:read');
  const canAllocate = permissions.includes('inventory:manage') && permissions.includes('facilities:manage')
    && permissions.includes('inventory:read');
  const canConfigure = permissions.includes('events:create') && canEditCharge(event.status);
  const canSetPolicy = permissions.includes('events:create') && event.status === 'RASCUNHO';
  const canStart = permissions.includes('access:operate') && permissions.includes('events:publish');
  const canTeam = permissions.includes('organizations:admin');
  const canReadVenue = canConfigure || permissions.includes('facilities:manage') || canTeam;
  const preparing = isPreparingPortaria(event.status);
  const now = useEventClock(event.startsAt, event.endsAt);
  const path = `/api/v1/events/${event.id}`;
  const chargeKey = tenantQueryKey(org ?? 0, 'event-patio-cobranca', event.id);
  const invalidateSummary = () => { if (org) void queryClient.invalidateQueries({ queryKey: eventPatioKey(org, event.id) }); };
  const summary = useQuery(eventPatioSummaryQuery(org, event, canRead));
  const data = summary.data?.preparacao ? summary.data : undefined;
  const venue = useQuery({ queryKey: [...installationCatalogKey(org, 'venues'), 'id', String(event.venueId)],
    enabled: !!org && canRead && canReadVenue,
    queryFn: ({ signal }) => searchInstallationCatalog('venues', { id: event.venueId }, signal) });
  const charge = useQuery({ queryKey: chargeKey, enabled: !!org && canRead && canConfigure && (preparing || showAdvanced),
    queryFn: () => api.get<Charge | ''>(`${path}/cobranca-patio`).then(({ data: current }) => current || null) });
  const allocationKey = org ? tenantQueryKey(org, 'event-patio-allocations', event.id) : ['event-patio-allocations', 'inactive'];
  const allocations = useQuery({ queryKey: allocationKey,
    enabled: !!org && canRead && permissions.includes('inventory:read'),
    queryFn: () => eventCatalogApi.listAllocations(event.id) });
  const registerFacility = preparing && canAllocate && !!data?.preparacao.localAtivo && !data.preparacao.alocacao && !registered;
  const facilityId = Number(facility);
  const availability = useFacilityAvailability(org, canRead && registerFacility && facilityId ? facilityId : undefined,
    event.startsAt, event.endsAt);
  const availableCapacity = availability.data?.availableCapacity;
  const capacityLimit = availability.isSuccess && availableCapacity !== undefined
    && Number.isSafeInteger(availableCapacity) && availableCapacity >= 0 ? availableCapacity : undefined;
  const knownCharge = charge.data ? { ...charge.data, valor: String(charge.data.valor) } : null;
  const mode = draftCharge.modo ?? knownCharge?.modo ?? '';
  const value = draftCharge.valor ?? knownCharge?.valor.replace('.', ',') ?? '';
  const chargePreview = previewNewCharge(value);
  const policy = draftPolicy ?? event.reentryPolicy ?? 'ENTRADA_UNICA';
  const nextCharge = canConfigure && validMode(mode) && chargePreview ? { modo: mode, valor: value.replace(',', '.') } : null;
  const changedCharge = nextCharge && (!knownCharge || nextCharge.modo !== knownCharge.modo ||
    compareChargeValue(nextCharge.valor) !== compareChargeValue(knownCharge.valor));
  const changedPolicy = canSetPolicy && validPolicy(policy) && policy !== event.reentryPolicy;
  const list = Array.isArray(allocations.data) ? allocations.data : [];
  const facilities = registered && !list.some((item) => item.id === registered.id) ? [...list, registered] : list;
  const facilitySummary = (entries: AllocationResponse[]) => entries.map((item) =>
    `${item.parkingFacilityName ?? 'Pátio cadastrado'} — ${item.operationalCapacity - item.sellableCapacity - item.reservedCapacity} vagas para entrada pela placa`);
  const save = useMutation({
    mutationFn: async () => {
      let current = event;
      let entries = facilities;
      let currentCharge = knownCharge;
      if (registerFacility) {
        const payload = { parkingFacilityId: Number(facility), startsAt: event.startsAt, endsAt: event.endsAt,
          operationalCapacity: Number(capacity), sellableCapacity: 0, reservedCapacity: 0 };
        const draft = JSON.stringify(payload);
        if (allocationAttempt.current?.draft !== draft) allocationAttempt.current = { draft, key: crypto.randomUUID() };
        const { data: allocation } = await api.post<AllocationResponse>(`${path}/parking-allocations`, payload,
          { headers: { 'Idempotency-Key': allocationAttempt.current.key } });
        const item = { ...allocation, ...payload, parkingFacilityName: allocation.parkingFacilityName ?? createdFacility?.label };
        setRegistered(item);
        entries = [...entries, item];
      }
      if (changedCharge && nextCharge) {
        currentCharge = (await api.put<Charge>(`${path}/cobranca-patio`, nextCharge)).data;
        queryClient.setQueryData(chargeKey, currentCharge);
        setDraftCharge({});
      }
      if (changedPolicy) {
        current = (await api.patch<EventResponse>(path, { reentryPolicy: policy }, { headers: ifMatchHeaders(event.version) })).data;
        onChanged(current);
        setDraftPolicy(undefined);
      }
      const check = eventPatioSummaryQuery(org, current, canRead);
      await queryClient.invalidateQueries({ queryKey: check.queryKey, exact: true, refetchType: 'none' });
      const latest = await queryClient.fetchQuery(check);
      const total = currentCharge && previewNewCharge(String(currentCharge.valor));
      const message = [
        ...facilitySummary(entries),
        total && currentCharge && `${formatEventMoney(total.due)} por carro, ${chargeLabel(currentCharge.modo)}.`,
        current.reentryPolicy === 'REENTRADA_PERMITIDA' ? 'Reentrada permitida.' : 'Entrada única.',
        'A portaria será aberta para veículos pela placa. A venda antecipada continuará fechada.',
      ].filter(Boolean).join(' ');
      return { current, ready: latest.preparacao.pronto, message };
    },
    onMutate: () => { setSaved(false); },
    onSuccess: ({ current, ready, message }) => {
      setSaved(Boolean(registerFacility || changedCharge || changedPolicy));
      if (canStart && ready && duringEvent(current)) setReview({ event: current, message });
    },
    onSettled: () => {
      invalidateSummary();
      if (permissions.includes('inventory:read')) void queryClient.invalidateQueries({ queryKey: allocationKey });
      if (org && registerFacility && facilityId) {
        void queryClient.invalidateQueries({ queryKey: facilityAvailabilityKey(org, facilityId) });
      }
    },
  });
  const start = useMutation({
    mutationFn: (current: EventResponse) => {
      if (!canStart || !duringEvent(current)) throw new Error('A portaria só pode abrir durante o horário do evento.');
      return api.post<EventResponse>(`${path}/patio-operation-start`, { confirmed: true }, { headers: ifMatchHeaders(current.version) });
    },
    onSuccess: ({ data }) => {
      setReview(undefined); onChanged(data);
      invalidateSummary();
    },
    onError: () => { setReview(undefined); invalidateSummary(); },
  });
  if (!canRead) return null;
  if (newFacility && registerFacility) return <FacilityForm onClose={() => setNewFacility(false)} navigationAllowed={() => false} onSaved={(item) => {
    setCreatedFacility({ id: item.id, label: item.name });
    setFacility(String(item.id));
  }} />;
  const busy = save.isPending || start.isPending;
  const pendingWindow = now < Date.parse(event.startsAt);
  const canOpenNow = duringEvent(event, now);
  const canReview = canStart && !!data?.preparacao.pronto && canOpenNow;
  const canEdit = registerFacility || canConfigure || canSetPolicy;
  const validCapacity = !availability.isFetching && capacityLimit !== undefined && wholeNumber(capacity, 1, capacityLimit) !== null;
  const unsaved = registerFacility || changedCharge || changedPolicy;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || !data || (registerFacility && !validCapacity) || (canConfigure && (!charge.isSuccess || !nextCharge))) return;
    if ((canSetPolicy && !validPolicy(policy)) || (!unsaved && !canReview)) return;
    save.mutate();
  };
  const chargeFields = canConfigure && <>
    {charge.isPending && <Typography role="status">Consultando cobrança…</Typography>}
    {charge.isError && <Alert severity="error" action={<Button onClick={() => void charge.refetch()}>Tentar novamente</Button>}>
      {describeError(charge.error)}</Alert>}
    {charge.isSuccess && <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Valor por carro (R$)" value={value} fullWidth required disabled={busy}
          inputProps={{ inputMode: 'decimal', maxLength: 15 }} error={value !== '' && !chargePreview}
          helperText={value && !chargePreview ? 'Informe um valor que resulte em pelo menos R$ 0,01, com até 6 casas.' : undefined}
          onChange={(e) => {
            const valor = e.target.value;
            if (valor && !/^\d{1,8}(?:[.,]\d{0,6})?$/.test(valor)) return;
            setSaved(false); setDraftCharge((draft) => ({ ...draft, valor }));
          }} />
        <TextField select fullWidth label="Quando cobrar" value={mode} disabled={busy} required
          onChange={(e) => { setSaved(false); setDraftCharge((draft) => ({ ...draft, modo: e.target.value as ChargeMode })); }}>
          <MenuItem value="ENTRADA">Na entrada</MenuItem><MenuItem value="SAIDA">Na saída</MenuItem>
        </TextField>
      </Stack>
      {chargePreview && chargePreview.adjustment !== '0.000000' && <Typography variant="body2" color="text.secondary">
        Total por carro: {formatEventMoney(chargePreview.due)} (ajuste de {formatEventMoney(chargePreview.adjustment)}).
        Estadias anteriores não serão recalculadas.
      </Typography>}
    </>}
  </>;
  return <Stack spacing={2}>
    <Card variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
          <Typography component="h2" variant="h6">{event.status === 'EM_OPERACAO' ? 'Portaria aberta' : 'Preparar portaria'}</Typography>
          {event.status === 'EM_OPERACAO' && PATIO_PAGE_ACCESS.some((permission) => permissions.includes(permission)) &&
            <Button component={RouterLink} to="/app/patio">Ir para o pátio</Button>}
        </Stack>
        {preparing && <Typography color="text.secondary">Configure a entrada de carros pela placa, sem reserva e sem venda antecipada.</Typography>}
        <Typography variant="body2"><strong>Local do evento:</strong> {venue.data?.options[0]?.label ||
          (data?.preparacao.localAtivo ? 'Local já cadastrado' : 'Consulte a configuração do evento')}</Typography>
        {summary.isPending && <Typography role="status">Consultando preparação…</Typography>}
        {summary.error && <Alert severity="error" action={<Button onClick={() => void summary.refetch()}>Tentar novamente</Button>}>
          {describeError(summary.error)}</Alert>}
        {summary.isSuccess && !data && <Alert severity="warning" action={<Button onClick={() => void summary.refetch()}>Atualizar</Button>}>
          Não foi possível obter a preparação do evento.</Alert>}
        {facilities.map((item) => <Typography key={item.id} variant="body2">{facilitySummary([item])[0]}</Typography>)}
        {preparing && data && <Stack component="form" aria-label="Configurar portaria" spacing={2} onSubmit={submit}>
          {registerFacility && <>
            <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'start' }} spacing={2}>
              <InstallationReferenceSelect kind="facilities" label="Pátio do evento" value={facility} onChange={setFacility}
                existingOption={createdFacility} disabled={busy} required emptyText="Nenhum pátio ativo cadastrado."
                onCreate={permissions.includes('facilities:manage') ? { label: 'Cadastrar pátio', run: () => setNewFacility(true) } : undefined} />
              <NumberField label="Quantos carros podem entrar?" value={capacity} onValueChange={setCapacity} min={1} max={capacityLimit}
                disabled={busy || !capacityLimit} error={capacityLimit !== undefined && !!capacity && !validCapacity}
                helperText={capacityLimit === 0 ? 'Sem vagas durante todo o evento. Escolha outro pátio.'
                  : capacityLimit !== undefined ? (capacityLimit === 1 ? '1 vaga disponível durante todo o evento.'
                    : `${capacityLimit} vagas disponíveis durante todo o evento.`)
                    : !facility ? 'Selecione o pátio para consultar o saldo.' : availability.isPending ? 'Consultando o saldo do pátio…' : 'Saldo do pátio indisponível.'}
                fullWidth required />
            </Stack>
            {availability.isError && <Alert severity="error" action={<Button type="button" disabled={busy} onClick={() => void availability.refetch()}>
              Tentar novamente</Button>}>{describeError(availability.error)}</Alert>}
          </>}
          {chargeFields}
          {canSetPolicy && <TextField select fullWidth label="Permitir reentrada?" value={policy} disabled={busy}
            onChange={(e) => { setSaved(false); setDraftPolicy(e.target.value); }}>
            <MenuItem value="ENTRADA_UNICA">Não, entrada única</MenuItem>
            <MenuItem value="REENTRADA_PERMITIDA">Sim, permitir reentrada</MenuItem>
          </TextField>}
          {data.preparacao.pendencias.filter((item) =>
            !(registerFacility && item.startsWith('Vincule um pátio')) &&
            !(canConfigure && item.startsWith('Defina o preço')) && !(canSetPolicy && item.startsWith('Defina a política')))
            .map((item) => <Alert key={item} severity="info">{item}</Alert>)}
          {!canEdit && !canReview && <Typography color="text.secondary">Seu acesso permite consultar a configuração da portaria.</Typography>}
          {pendingWindow && data.preparacao.pronto && <Alert severity="info">
            {unsaved ? 'O evento está em rascunho.' : 'Configuração salva. A portaria está fechada.'}
            {' '}A abertura é manual e fica disponível a partir de {startLabel(event)}.
          </Alert>}
          {!pendingWindow && !canOpenNow && <Alert severity="warning">O horário do evento já terminou. Não é possível abrir a portaria.</Alert>}
          {(unsaved || canReview) && <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start' }}
            disabled={busy || (registerFacility && !validCapacity) || (canConfigure && (!charge.isSuccess || !nextCharge))
              || (canSetPolicy && !validPolicy(policy))}>
            {canStart && canOpenNow ? (unsaved ? 'Salvar e revisar abertura' : 'Revisar abertura') : 'Salvar configuração'}
          </Button>}
        </Stack>}
        {saved && !review && !(pendingWindow && data?.preparacao.pronto) && <Alert severity="success">Configuração salva.</Alert>}
        {save.isError && <Alert severity="error">{describeError(save.error)} As etapas já salvas não precisam ser repetidas.</Alert>}
        {start.error && <Alert severity="error">{describeError(start.error)}</Alert>}
      </Stack>
    </Card>
    {data && !preparing && <Card variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        <Typography component="h2" variant="h6">Resumo da portaria</Typography>
        <Typography variant="body2" color="text.secondary">Movimento avulso pela placa neste evento. Credenciais aparecem separadamente;
          estes valores não incluem vendas antecipadas de ingressos.</Typography>
        <Stack direction="row" gap={1} flexWrap="wrap">
          <Chip label={`${data.operacao.entradas} entradas`} />
          <Chip label={`${data.operacao.abertos} veículos presentes`} />
          <Chip label={`${data.operacao.encerrados} saídas`} />
          <Chip label={`${data.operacao.cancelados} canceladas`} />
          <Chip variant="outlined" label={`${data.operacao.ocupacaoCredenciais} presentes por credencial`} />
        </Stack>
        {data.financeiro && <>
          <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4,1fr)' }, gap: 2, m: 0 }}>
            {[['Dinheiro', data.financeiro.dinheiro], ['Pix', data.financeiro.pix], ['Cartão', data.financeiro.cartao],
              ['Total líquido', data.financeiro.total]].map(([label, value]) => <Box key={label}>
              <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
              <Typography component="dd" sx={{ m: 0, fontWeight: 700 }}>{formatEventMoney(value)}</Typography>
            </Box>)}
          </Box>
          <Typography variant="body2">Turnos envolvidos: {data.financeiro.turnosAbertos} abertos e {data.financeiro.turnosFechados} fechados.
            Diferença de dinheiro dos turnos fechados: {formatEventMoney(data.financeiro.diferencaDinheiro)}.</Typography>
          {data.financeiro.turnosMistos > 0 && <Alert severity="info">{data.financeiro.turnosMistos} turno(s) também atendem outros eventos ou pátio comum.
            A diferença é do turno inteiro, não atribuída somente a este evento.</Alert>}
          <Typography variant="caption" color="text.secondary">Recebimentos registrados menos devoluções e correções.
            Não comprova liquidação de Pix ou cartão pelo banco.</Typography>
        </>}
        {data.fiscal && <>
          <Typography component="h3" variant="subtitle1">NFS-e pendentes: {data.fiscal.pendentes}</Typography>
          <Typography variant="body2" color="text.secondary">Pendências vinculadas à estadia e à OS. Não são notas autorizadas.</Typography>
          {data.fiscal.itens.map((item) => <Stack key={item.movimentacaoId} direction={{ xs: 'column', sm: 'row' }} gap={1}
            justifyContent="space-between" sx={{ borderTop: 1, borderColor: 'divider', pt: 1 }}>
            <Typography>{item.placa} · OS {item.ordemServicoNumero} · {formatDateTime(item.criadoEm)}</Typography>
            {permissions.includes('service_orders:read') && <Button component={RouterLink}
              to={`/app/ordens-servico?detail=${item.ordemServicoId}`}>Consultar OS e pendência</Button>}
          </Stack>)}
          {data.fiscal.listaLimitada && <Alert severity="info">Mostrando as 100 pendências mais antigas.</Alert>}
        </>}
      </Stack>
    </Card>}
    {(advanced || canTeam || canAllocate || (!preparing && canConfigure)) && <Stack spacing={2}>
      <Button aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)} sx={{ alignSelf: 'flex-start' }}>Opções avançadas</Button>
      {showAdvanced && <>
        {advanced}
        {canAllocate && <Button component={RouterLink} to={`/app/eventos?aba=alocacao&evento-catalogo=${event.id}`}
          sx={{ alignSelf: 'flex-start' }}>Gerenciar pátios e capacidades</Button>}
        {canTeam && <Button component={RouterLink} to="/app/administracao" sx={{ alignSelf: 'flex-start' }}>Gerenciar equipe</Button>}
        {!preparing && canConfigure && data && <Card variant="outlined" sx={{ p: 2 }}>
          <Stack component="form" spacing={2} onSubmit={submit}>
            <Typography component="h3" variant="subtitle1">Cobrança para novas entradas</Typography>
            {chargeFields}
            <Button type="submit" disabled={busy || !changedCharge} sx={{ alignSelf: 'flex-start' }}>Salvar cobrança</Button>
          </Stack>
        </Card>}
      </>}
    </Stack>}
    <ConfirmDialog open={!!review && canStart} title="Abrir portaria?" message={review?.message ?? ''}
      confirmLabel="Abrir portaria" loading={start.isPending} onClose={() => { if (!start.isPending) setReview(undefined); }}
      onConfirm={() => { if (review && canStart && !start.isPending) start.mutate(review.event); }} />
  </Stack>;
}
