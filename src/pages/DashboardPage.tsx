import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api, describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { KpiCard } from '../components/common/KpiCard';
import { PageHeader } from '../components/common/PageHeader';
import { ResourceIdField } from '../components/enterprise/ResourceIdField';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';

interface AvailabilityResponse {
  eventId: number;
  totalAvailable: number;
  guaranteesHold: boolean;
  items: unknown[];
}

interface AttemptPage {
  items: Array<{ id: number; decision: 'AUTORIZADA' | 'RECUSADA' }>;
  hasMore: boolean;
}

export function DashboardPage() {
  const { activeOrganization, permissions } = useAuth();
  const { recent } = useOperationalWorkspace();
  const organizationId = activeOrganization!.organizationId;
  const events = recent('event');
  const orders = recent('order');
  const credentials = recent('credential');
  const [eventId, setEventId] = useState(() => events[0] ? String(events[0].id) : '');
  const canOperateAccess = ['access:validate', 'access:checkin', 'access:checkout']
    .some((permission) => permissions.includes(permission));
  const canReadAudit = permissions.includes('audit:read');
  const organizationName = activeOrganization?.tradeName
    || activeOrganization?.legalName
    || 'organizacao ativa';

  useEffect(() => {
    if (!eventId && events[0]) setEventId(String(events[0].id));
  }, [eventId, events]);

  const availability = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard-availability', eventId),
    enabled: !!eventId,
    queryFn: () => api.get<AvailabilityResponse>(`/api/v1/events/${Number(eventId)}/availability`)
      .then((response) => response.data),
    refetchInterval: 30_000,
  });
  const attempts = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard-access-attempts', eventId),
    enabled: canReadAudit,
    queryFn: () => api.get<AttemptPage>('/api/v1/access-attempts', {
      params: { eventId: eventId ? Number(eventId) : undefined, limit: 20 },
    }).then((response) => response.data),
    refetchInterval: 20_000,
  });
  const authorized = attempts.data?.items.filter((item) => item.decision === 'AUTORIZADA').length;
  const refused = attempts.data?.items.filter((item) => item.decision === 'RECUSADA').length;

  return (
    <Box>
      <PageHeader
        title="Operacao de eventos"
        subtitle={`Contexto isolado: ${organizationName}. Indicadores abaixo usam apenas respostas reais da API.`}
      />

      <Stack spacing={2.5}>
        {events.length > 0 ? (
          <Card variant="outlined">
            <CardContent>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle1">Evento monitorado</Typography>
                  <Typography variant="body2" color="text.secondary">A disponibilidade atualiza a cada 30 segundos; somente um hold garante a vaga.</Typography>
                </Box>
                <Box sx={{ minWidth: { md: 360 } }}>
                  <ResourceIdField label="ID do evento" value={eventId} onChange={setEventId} recent={events} />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Alert severity="info" action={<Button component={RouterLink} to="/app/eventos">Configurar evento</Button>}>
            Nenhum evento real foi registrado neste navegador. A API atual ainda nao oferece listagem.
          </Alert>
        )}

        {(availability.isError || attempts.isError) && (
          <Alert severity="error">
            {describeError(availability.error ?? attempts.error)}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 2 }}>
          <KpiCard title="Vagas disponiveis" value={availability.data?.totalAvailable ?? '—'} subtitle={eventId ? `Evento #${eventId}` : 'Selecione um evento'} icon={<EventAvailableOutlinedIcon />} />
          <KpiCard title="Acessos autorizados" value={authorized ?? '—'} subtitle="Ultimas 20 decisoes" icon={<CheckCircleOutlineIcon />} color="success.main" />
          <KpiCard title="Acessos recusados" value={refused ?? '—'} subtitle="Ultimas 20 decisoes" icon={<ReportProblemOutlinedIcon />} color="error.main" />
          <KpiCard title="Referencias recentes" value={orders.length + credentials.length} subtitle={`${orders.length} pedidos · ${credentials.length} credenciais neste navegador`} icon={<FactCheckOutlinedIcon />} color="secondary.main" />
        </Box>

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <div>
                <Typography variant="h6">Acoes operacionais</Typography>
                <Typography variant="body2" color="text.secondary">Os atalhos respeitam as permissoes efetivas do tenant.</Typography>
              </div>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                {canOperateAccess && <Button component={RouterLink} to="/app/acesso-eventos" variant="contained" startIcon={<QrCodeScannerOutlinedIcon />}>Abrir console de acesso</Button>}
                {canReadAudit && <Button component={RouterLink} to="/app/tentativas-acesso" variant="outlined" startIcon={<FactCheckOutlinedIcon />}>Consultar tentativas</Button>}
                <Button component={RouterLink} to="/app/eventos" variant="text">Configurar eventos</Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
