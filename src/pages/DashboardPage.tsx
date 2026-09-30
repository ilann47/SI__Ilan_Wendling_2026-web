import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Card, CardContent, List, ListItemButton, ListItemText, Stack, Typography } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { DetailDrawer } from '../components/listing/DetailDrawer';
import { financialRange, financialTitlePath, type FinancialPeriod } from './dashboardContext';
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
import { formatCurrency, formatDate, formatStatusLabel } from '../utils/format';
import type {
  ContasAVencerResponse,
  EstoqueMinimoResponse,
  PatioAtualResponse,
} from '../types';

interface AttemptPage {
  items: Array<{ id: number; decision: 'AUTORIZADA' | 'RECUSADA' }>;
  hasMore: boolean;
}

export function DashboardPage({ embedded = false, financialPeriod = 'week', headerActions }: { embedded?: boolean; financialPeriod?: FinancialPeriod; headerActions?: ReactNode }) {
  const [financialDetail, setFinancialDetail] = useState<'aPagar' | 'aReceber' | null>(null);
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization!.organizationId;
  const organizationName = activeOrganization?.tradeName
    || activeOrganization?.legalName
    || 'organização ativa';
  const canReadAudit = permissions.includes('audit:read');
  const canOperations = permissions.includes('operations:read');
  const canFinance = permissions.includes('finance:read');
  const canStock = permissions.includes('stock:read');
  const canPurchases = permissions.includes('purchases:read');
  const canSales = permissions.includes('sales:read');
  const canService = permissions.includes('service_orders:read');
  const canEvents = permissions.includes('events:read');
  const range = financialRange(financialPeriod);
  const today = range.inicio;
  const horizon = range.fim;

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
    enabled: canSales && !embedded,
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
  const hasIndicators = canOperations || canFinance || canStock || canPurchases || canService || canEvents || canReadAudit;
  const activityQueries = [canSales ? sales : null, canPurchases ? purchases : null, canOperations ? patio : null]
    .filter((query) => query !== null);
  const hasActivity = Boolean(sales.data?.content.length || awaitingReceipt.length
    || (patio.data && patio.data.itens.length === 0));

  return (
    <Box>
      {embedded ? <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Typography component="h2" variant="h5" sx={{ fontWeight: 800 }}>
        Resumo do dia
        </Typography>{headerActions}
      </Stack> : <PageHeader
        title="Resumo do dia"
        subtitle={`Acompanhe a operação e o que precisa de atenção em ${organizationName}.`}
      />}

      <Stack spacing={3}>
        {!hasIndicators && (embedded || !canSales) && (
          <Alert severity="info">O resumo não possui indicadores disponíveis para o seu acesso. Suas rotinas continuam no menu superior.</Alert>
        )}
        {errors.length > 0 && (
          <ErrorState
            message={describeError(errors[0].error)}
            onRetry={() => { errors.forEach((query) => void query.refetch()); }}
          />
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(180px, 1fr))' }, gap: 1.5 }}>
          {canOperations && (
            <Box>
              <KpiCard title="Veículos no pátio" value={patio.data?.resumo.totalVeiculos ?? '—'}
                subtitle={patio.data ? `${patio.data.resumo.avulsos} avulsos · ${patio.data.resumo.mensalistas} mensalistas` : 'Aguardando leitura'}
                icon={<LocalParkingOutlinedIcon />} />
            </Box>
          )}
          {canFinance && <>
            <Box><KpiCard title="Você precisa pagar" value={contas.data ? formatCurrency(contas.data.totalAPagar) : '—'}
              subtitle={<>{range.label}<br />Vencido neste período: {contas.data ? formatCurrency(contas.data.vencidoAPagar) : '—'}</>}
              icon={<TrendingDownOutlinedIcon />} color="warning.main"
              onClick={contas.data ? () => setFinancialDetail('aPagar') : undefined} actionLabel="Ver contas a pagar do período" /></Box>
            <Box><KpiCard title="Você tem a receber" value={contas.data ? formatCurrency(contas.data.totalAReceber) : '—'}
              subtitle={<>{range.label}<br />Vencido neste período: {contas.data ? formatCurrency(contas.data.vencidoAReceber) : '—'}</>}
              icon={<AssignmentLateOutlinedIcon />} color="success.main"
              onClick={contas.data ? () => setFinancialDetail('aReceber') : undefined} actionLabel="Ver contas a receber do período" /></Box>
          </>}
          {canStock && (
            <Box>
              <KpiCard title="Estoque abaixo do mínimo" value={estoque.data?.total ?? '—'}
                subtitle="Posição consolidada do relatório"
                icon={<Inventory2OutlinedIcon />} color="warning.main" />
            </Box>
          )}
          {canPurchases && (
            <Box>
              <KpiCard title="Ordens aguardando recebimento"
                value={purchaseComplete ? awaitingReceipt.length : awaitingReceipt.length === 0 ? '—' : `${awaitingReceipt.length}+`}
                subtitle={purchaseComplete ? 'Todas as ordens carregadas' : 'Total de pendências indisponível · amostra das últimas 20 ordens'}
                icon={<ShoppingCartCheckoutOutlinedIcon />} color="warning.main" />
            </Box>
          )}
          {canService && (
            <Box>
              <KpiCard title="Ordens de serviço abertas"
                value={!services.data ? '—' : serviceComplete ? openServices.length : openServices.length === 0 ? '—' : `${openServices.length}+`}
                subtitle={serviceComplete ? 'Rascunho ou em execução' : 'Amostra das últimas 20 ordens, não é o total de pendências'}
                icon={<FactCheckOutlinedIcon />} />
            </Box>
          )}
          {canEvents && (
            <Box>
              <KpiCard title="Eventos cadastrados" value={events.data?.totalElements ?? '—'}
                subtitle={incompleteEvents.length > 0
                  ? `${incompleteEvents.length} com configuração incompleta nesta consulta`
                  : 'Eventos encontrados na organização'}
                icon={<EventAvailableOutlinedIcon />} />
            </Box>
          )}
          {canReadAudit && (
            <Box>
              <KpiCard title="Acessos recusados" value={refused ?? '—'}
                subtitle={`${authorized ?? '—'} autorizados nas últimas 20 decisões`}
                icon={<ReportProblemOutlinedIcon />} color="error.main" />
            </Box>
          )}
        </Box>
        {canFinance && <Typography variant="caption" color="text.secondary">
          Financeiro por vencimento, somente no período indicado. Valores anteriores não estão incluídos. A pagar inclui despesas avulsas.
        </Typography>}

        {!embedded && activityQueries.length > 0 && <Card>
          <CardContent>
            <Typography variant="h6">Pendências e atividades recentes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Recebimentos aguardados, vendas recentes e situação do pátio nas consultas disponíveis.
            </Typography>
            <Stack spacing={1.25}>
              {canSales && (sales.data?.content ?? []).slice(0, 5).map((sale) => (
                <Stack key={sale.id} direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between">
                  <Typography variant="body2">Venda {sale.numero} · {sale.clienteNome}</Typography>
                  <Typography variant="body2" color="text.secondary">{formatCurrency(sale.valorTotal)} · {formatStatusLabel(sale.status)}</Typography>
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
              {activityQueries.some((query) => query.isLoading) && (
                <Typography role="status" variant="body2" color="text.secondary">Atualizando atividades…</Typography>
              )}
              {!hasActivity && activityQueries.every((query) => query.isSuccess) && (
                <Typography variant="body2" color="text.secondary">Nenhuma atividade adicional nas listas consultadas.</Typography>
              )}
            </Stack>
          </CardContent>
        </Card>}
      </Stack>
      <DetailDrawer open={canFinance && financialDetail !== null} title={financialDetail === 'aPagar' ? 'Contas a pagar do período' : 'Contas a receber do período'}
        subtitle={range.label} onClose={() => setFinancialDetail(null)}>
        {contas.isError ? <ErrorState message={describeError(contas.error)} onRetry={() => void contas.refetch()} />
          : contas.isFetching ? <Typography role="status">Atualizando contas…</Typography>
          : <>
            <Typography variant="body2" color="text.secondary">Abra uma conta para consultar os detalhes e as ações permitidas.</Typography>
            <List disablePadding>{(financialDetail ? contas.data?.[financialDetail] ?? [] : []).map((title) => {
              const path = financialTitlePath(title);
              const text = <ListItemText primary={title.contraparte} secondary={`${formatCurrency(title.saldo)} · ${formatDate(title.vencimento)}${title.vencido ? ' · Vencido' : ''}`} />;
              return path ? <ListItemButton key={`${title.origem}-${title.id}`} component={RouterLink} to={path}>{text}</ListItemButton>
                : <Box key={`${title.origem}-${title.id}`}>{text}<Typography variant="caption">Detalhe indisponível para esta origem.</Typography></Box>;
            })}</List>
            {financialDetail && (contas.data?.[financialDetail]?.length ?? 0) === 0 && <Typography>Nenhuma conta aberta neste período.</Typography>}
          </>}
      </DetailDrawer>
    </Box>
  );
}
