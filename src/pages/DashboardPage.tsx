import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { Link as RouterLink } from 'react-router-dom';
import { api, describeError } from '../api/client';
import { eventCatalogApi } from '../api/eventCatalog';
import { purchaseApi } from '../api/purchases';
import { tenantQueryKey } from '../api/queryKeys';
import { serviceOrdersApi } from '../api/serviceOrders';
import { administrativeSalesApi } from '../api/administrativeSales';
import { useAuth } from '../auth/AuthContext';
import { KpiCard } from '../components/common/KpiCard';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorState } from '../components/listing/ErrorState';
import { formatCurrency } from '../utils/format';
import type {
  ContasAVencerResponse,
  EstoqueMinimoResponse,
  PatioAtualResponse,
} from '../types';

interface AttemptPage {
  items: Array<{ id: number; decision: 'AUTORIZADA' | 'RECUSADA' }>;
  hasMore: boolean;
}

function Shortcut({
  to, title, description, show,
}: { to: string; title: string; description: string; show: boolean }) {
  if (!show) return null;
  return (
    <Card>
      <CardActionArea component={RouterLink} to={to} sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="body2" color="text.secondary">{description}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export function DashboardPage() {
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization!.organizationId;
  const organizationName = activeOrganization?.tradeName
    || activeOrganization?.legalName
    || 'organização ativa';
  const canOperateAccess = ['access:validate', 'access:checkin', 'access:checkout']
    .some((permission) => permissions.includes(permission));
  const canReadAudit = permissions.includes('audit:read');
  const canOperations = permissions.includes('operations:read');
  const canFinance = permissions.includes('finance:read');
  const canStock = permissions.includes('stock:read');
  const canPurchases = permissions.includes('purchases:read');
  const canSales = permissions.includes('sales:read');
  const canService = permissions.includes('service_orders:read');
  const canEvents = permissions.includes('events:read');
  const today = dayjs().format('YYYY-MM-DD');
  const horizon = dayjs().add(7, 'day').format('YYYY-MM-DD');

  const patio = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'patio'),
    enabled: canOperations,
    queryFn: () => api.get<PatioAtualResponse>('/api/relatorios/patio').then((response) => response.data),
    staleTime: 15_000,
  });
  const contas = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'contas', today, horizon),
    enabled: canFinance,
    queryFn: () => api.get<ContasAVencerResponse>('/api/relatorios/contas-a-vencer', {
      params: { inicio: today, fim: horizon },
    }).then((response) => response.data),
    staleTime: 30_000,
  });
  const estoque = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'estoque-minimo'),
    enabled: canStock,
    queryFn: () => api.get<EstoqueMinimoResponse>('/api/relatorios/estoque-minimo').then((response) => response.data),
    staleTime: 60_000,
  });
  const events = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'events'),
    enabled: canEvents,
    queryFn: eventCatalogApi.listEvents,
    staleTime: 30_000,
  });
  const attempts = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'access-attempts'),
    enabled: canReadAudit,
    queryFn: () => api.get<AttemptPage>('/api/v1/access-attempts', { params: { limit: 20 } })
      .then((response) => response.data),
    refetchInterval: 20_000,
  });
  const purchases = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'purchase-orders'),
    enabled: canPurchases,
    queryFn: () => purchaseApi.list({ size: 20, sort: 'dataEmissao,desc' }),
    staleTime: 30_000,
  });
  const sales = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'sales'),
    enabled: canSales,
    queryFn: () => administrativeSalesApi.list({ size: 10, sort: 'dataEmissao,desc' }),
    staleTime: 30_000,
  });
  const services = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'service-orders'),
    enabled: canService,
    queryFn: () => serviceOrdersApi.list({ size: 20, sort: 'dataAbertura,desc' }),
    staleTime: 30_000,
  });

  const refused = attempts.data?.items.filter((item) => item.decision === 'RECUSADA').length;
  const authorized = attempts.data?.items.filter((item) => item.decision === 'AUTORIZADA').length;
  const awaitingReceipt = (purchases.data?.content ?? [])
    .filter((order) => order.status === 'APROVADA' || order.status === 'PARCIALMENTE_RECEBIDA');
  const openServices = (services.data?.content ?? [])
    .filter((order) => order.status === 'RASCUNHO' || order.status === 'EM_EXECUCAO');
  const incompleteEvents = (events.data?.content ?? []).filter((event) => {
    const checklist = event.configurationChecklist;
    return checklist ? Object.values(checklist).some((item) => item === false) : false;
  });
  const purchaseComplete = purchases.data
    ? purchases.data.totalElements <= purchases.data.content.length : false;
  const serviceComplete = services.data
    ? services.data.totalElements <= services.data.content.length : false;

  const errors = [patio, contas, estoque, events, attempts, purchases, sales, services]
    .filter((query) => query.isError);

  return (
    <Box>
      <PageHeader
        title="Visão operacional"
        subtitle={`O que precisa da sua atenção em ${organizationName}. Os números abaixo vêm só de respostas reais da API.`}
      />

      <Stack spacing={3}>
        {errors.length > 0 && (
          <ErrorState
            message={describeError(errors[0].error)}
            onRetry={() => { errors.forEach((query) => void query.refetch()); }}
          />
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 2 }}>
          {canOperations && (
            <Box component={RouterLink} to="/app/patio" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Veículos no pátio" value={patio.data?.resumo.totalVeiculos ?? '—'}
                subtitle={patio.data ? `${patio.data.resumo.avulsos} avulsos · ${patio.data.resumo.mensalistas} mensalistas` : 'Aguardando leitura'}
                icon={<LocalParkingOutlinedIcon />} />
            </Box>
          )}
          {canFinance && (
            <Box component={RouterLink} to="/app/relatorios" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Contas vencidas" value={contas.data
                ? formatCurrency((contas.data.vencidoAPagar ?? 0) + (contas.data.vencidoAReceber ?? 0)) : '—'}
                subtitle="Saldo vencido a pagar e a receber"
                icon={<TrendingDownOutlinedIcon />} color="error.main" />
            </Box>
          )}
          {canFinance && (
            <Box component={RouterLink} to="/app/relatorios" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Vencendo em 7 dias" value={contas.data
                ? formatCurrency((contas.data.totalAPagar ?? 0) + (contas.data.totalAReceber ?? 0)) : '—'}
                subtitle="Títulos no horizonte de uma semana"
                icon={<AssignmentLateOutlinedIcon />} color="warning.main" />
            </Box>
          )}
          {canStock && (
            <Box component={RouterLink} to="/app/estoque" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Estoque abaixo do mínimo" value={estoque.data?.total ?? '—'}
                subtitle="Posição consolidada do relatório"
                icon={<Inventory2OutlinedIcon />} color="warning.main" />
            </Box>
          )}
          {canPurchases && (
            <Box component={RouterLink} to="/app/ordens-compra" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Ordens aguardando recebimento"
                value={purchaseComplete ? awaitingReceipt.length : awaitingReceipt.length === 0 ? '—' : `${awaitingReceipt.length}+`}
                subtitle={purchaseComplete ? 'Todas as ordens carregadas' : 'Nas últimas 20 ordens consultadas'}
                icon={<ShoppingCartCheckoutOutlinedIcon />} color="warning.main" />
            </Box>
          )}
          {canService && (
            <Box component={RouterLink} to="/app/ordens-servico" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Ordens de serviço abertas"
                value={serviceComplete ? openServices.length : `${openServices.length}+`}
                subtitle="Rascunho ou em execução"
                icon={<FactCheckOutlinedIcon />} />
            </Box>
          )}
          {canEvents && (
            <Box component={RouterLink} to="/app/eventos" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Eventos cadastrados" value={events.data?.totalElements ?? '—'}
                subtitle={incompleteEvents.length > 0
                  ? `${incompleteEvents.length} com configuração incompleta na página atual`
                  : 'Checklist ausente ou completo nesta consulta'}
                icon={<EventAvailableOutlinedIcon />} />
            </Box>
          )}
          {canReadAudit && (
            <Box component={RouterLink} to="/app/tentativas-acesso" sx={{ textDecoration: 'none' }}>
              <KpiCard title="Acessos recusados" value={refused ?? '—'}
                subtitle={`${authorized ?? '—'} autorizados nas últimas 20 decisões`}
                icon={<ReportProblemOutlinedIcon />} color="error.main" />
            </Box>
          )}
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6">Pendências e atividades recentes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Atalhos respeitam as permissões efetivas. Nada aqui é estimado.
            </Typography>
            <Stack spacing={1.25}>
              {canSales && (sales.data?.content ?? []).slice(0, 5).map((sale) => (
                <Stack key={sale.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
                  <Typography variant="body2">Venda {sale.numero} · {sale.clienteNome}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatCurrency(sale.valorTotal)} · {sale.status.replace(/_/g, ' ')}</Typography>
                </Stack>
              ))}
              {canPurchases && awaitingReceipt.slice(0, 5).map((order) => (
                <Stack key={order.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
                  <Typography variant="body2">Ordem {order.numero} aguarda recebimento</Typography>
                  <Typography variant="body2" color="text.secondary">{order.fornecedorNome}</Typography>
                </Stack>
              ))}
              {canOperations && patio.data && patio.data.itens.length === 0 && (
                <Typography variant="body2" color="text.secondary">Nenhum veículo no pátio agora.</Typography>
              )}
              {!canSales && !canPurchases && !canOperations && (
                <Alert severity="info">Seu perfil não possui indicadores adicionais além dos atalhos permitidos.</Alert>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 2 }}>
          <Shortcut to="/app/patio" title="Operação de pátio" description="Entrada, saída e ocupação atual." show={canOperations || true} />
          <Shortcut to="/app/acesso-eventos" title="Check-in de eventos" description="Validar credencial e registrar presença." show={canOperateAccess} />
          <Shortcut to="/app/tentativas-acesso" title="Auditoria de acesso" description="Últimas decisões autorizadas e recusadas." show={canReadAudit} />
          <Shortcut to="/app/contas-pagar" title="Contas a pagar" description="Títulos e baixas de fornecedores." show={canFinance} />
          <Shortcut to="/app/contas-receber" title="Contas a receber" description="Títulos e baixas de clientes." show={canFinance} />
          <Shortcut to="/app/estoque" title="Estoque" description="Posição, mínimos e ajustes." show={canStock} />
        </Box>

        {canOperateAccess && (
          <Button component={RouterLink} to="/app/acesso-eventos" variant="contained" startIcon={<QrCodeScannerOutlinedIcon />}
            sx={{ alignSelf: 'flex-start', minHeight: 48 }}>
            Abrir console de acesso
          </Button>
        )}
      </Stack>
    </Box>
  );
}
