import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, ButtonBase, Chip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../api/client';
import { operationalPendencies, pendencyPermissions } from '../api/operationalPendencies';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { componentRadius, getThemeTokens } from '../theme/hubTokens';
import { useColorMode } from '../context/ColorModeContext';
import { OrganizationStartGuide } from '../features/onboarding/OrganizationStartGuide';
import { formatCurrency, formatDate } from '../utils/format';
import type { EstoqueMinimoResponse } from '../types';

const INITIAL_ITEMS = 3;
const categories: Record<string, { title: string; description: string; path: string; order: number }> = {
  CONTA_PAGAR_VENCIDA: { title: 'Contas a pagar', description: 'Pagamentos vencidos que precisam de atenção.', path: '/app/contas-pagar', order: 0 },
  CONTA_RECEBER_VENCIDA: { title: 'Contas a receber', description: 'Recebimentos com vencimento em aberto.', path: '/app/contas-receber', order: 1 },
  NOTA_ENTRADA_PENDENTE: { title: 'Notas de entrada', description: 'Documentos aguardando conferência e confirmação.', path: '/app/notas-entrada', order: 2 },
  SERVICO_SEM_NOTA: { title: 'Ordens de serviço', description: 'Serviços concluídos aguardando documento.', path: '/app/ordens-servico', order: 3 },
  ESTOQUE_MINIMO: { title: 'Estoque', description: 'Produtos abaixo do estoque mínimo.', path: '/app/relatorios?tab=estoque', order: 4 },
};
interface Pendency {
  id: string;
  title: string;
  counterparty?: string;
  amount?: number;
  date?: string;
  path: string;
}
interface PendencyGroup {
  type: string;
  total: number;
  items: Pendency[];
}
const normalized = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ').trim();

/** Home: pendências agrupadas, com as mesmas consultas e permissões do tenant. */
export function HubHomePage() {
  const { user, activeOrganization, permissions } = useAuth();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const organizationId = activeOrganization?.organizationId;
  const firstName = (user?.login ?? 'Operador').split(/[.@]/)[0] ?? 'Operador';
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const groupKey = (type: string) => `${organizationId}:${type}`;
  const canReadOperational = Object.values(pendencyPermissions).some((permission) => permissions.includes(permission));
  const operational = useQuery({
    queryKey: tenantQueryKey(organizationId, 'dashboard', 'operational-pendencies', permissions),
    enabled: !!organizationId && canReadOperational,
    queryFn: operationalPendencies,
    staleTime: 30_000,
  });
  const estoque = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'dashboard', 'estoque-minimo') : ['hub', 'estoque'],
    enabled: !!organizationId && permissions.includes('stock:read'),
    queryFn: () => api.get<EstoqueMinimoResponse>('/api/relatorios/estoque-minimo').then((response) => response.data),
    staleTime: 60_000,
  });
  const pendencyQueries = [canReadOperational ? operational : null, permissions.includes('stock:read') ? estoque : null]
    .filter((query) => query !== null);

  const groups = useMemo<PendencyGroup[]>(() => {
    const result: PendencyGroup[] = (operational.data?.grupos ?? [])
      .filter((group) => permissions.includes(pendencyPermissions[group.tipo] ?? '') && categories[group.tipo]
        && (group.total > 0 || group.itens.length > 0))
      .map((group) => ({ type: group.tipo, total: group.total, items: group.itens.map((item) => ({
        id: `${group.tipo}-${item.id}`, title: item.titulo, path: item.caminho,
        counterparty: item.contraparte, amount: item.valor, date: item.data,
      })) }));
    if (permissions.includes('stock:read') && (estoque.data?.total ?? 0) > 0) {
      result.push({ type: 'ESTOQUE_MINIMO', total: estoque.data!.total, items: [{
        id: 'estoque-minimo', title: 'Estoque abaixo do mínimo',
        counterparty: `${estoque.data!.total} produto(s) na posição consolidada`, path: categories.ESTOQUE_MINIMO.path,
      }] });
    }
    return result.sort((a, b) => categories[a.type].order - categories[b.type].order);
  }, [operational.data, estoque.data, permissions]);
  const operationalGroups = groups.filter((group) => group.type !== 'ESTOQUE_MINIMO');
  const operationalTotal = operationalGroups.reduce((total, group) => total + group.total, 0);
  const operationalShown = operationalGroups.reduce((total, group) => total
    + (expanded[groupKey(group.type)] ? group.items.length : Math.min(INITIAL_ITEMS, group.items.length)), 0);

  return (
    <Box sx={{ py: 1.5, minWidth: 0 }}>
      <Typography component="h1" sx={{ color: colors.purple, fontWeight: 850, fontSize: { xs: '1.25rem', md: '1.5rem' }, letterSpacing: -0.5, mb: 3 }}>
        Olá, {firstName} 👋
      </Typography>
      {organizationId && <OrganizationStartGuide key={organizationId} orgId={organizationId} permissions={permissions} />}
      <Box component="section" aria-labelledby="home-pendencies-heading" sx={{ width: '100%', minWidth: 0 }}>
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <PushPinOutlinedIcon sx={{ fontSize: 18, color: colors.purple }} />
            <Typography variant="caption" sx={{ color: colors.purple, fontWeight: 750, textTransform: 'uppercase', letterSpacing: '0.045em' }}>O que pede atenção</Typography>
          </Box>
          <Typography id="home-pendencies-heading" component="h2" sx={{ fontWeight: 800, color: colors.text, fontSize: { xs: '1.35rem', md: '1.6rem' }, mb: 0.5 }}>
            Pendências
          </Typography>
          <Typography variant="body2" sx={{ color: colors.textMuted }}>Escolha uma pendência para abrir o registro e resolver.</Typography>
        </Box>

        {pendencyQueries.some((query) => query.isLoading) && <Typography role="status" sx={{ mb: 2 }}>Carregando pendências…</Typography>}
        {pendencyQueries.some((query) => query.isError) && <Alert severity="warning" sx={{ mb: 2 }}
          action={<Button size="small" onClick={() => pendencyQueries.filter((q) => q.isError).forEach((q) => void q.refetch())}>Tentar novamente</Button>}>
          Não foi possível consultar todas as pendências.
        </Alert>}
        {pendencyQueries.length === 0 && <Typography color="text.secondary">Não há consultas de pendências disponíveis para o seu acesso.</Typography>}
        {groups.length === 0 && pendencyQueries.length > 0 && pendencyQueries.every((query) => query.isSuccess) && (
          <Box sx={{ border: `1px solid ${colors.border}`, bgcolor: colors.card, borderRadius: `${componentRadius.surface}px`, p: 3 }}>
            <Typography sx={{ fontWeight: 700, color: colors.text, mb: 0.5 }}>Nenhuma pendência nas consultas disponíveis</Typography>
            <Typography variant="body2" color="text.secondary">Nenhum item aguardando ação nos módulos disponíveis para seu acesso.</Typography>
          </Box>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2.5, alignItems: 'start' }}>
          {groups.map((group) => {
            const category = categories[group.type];
            const key = groupKey(group.type);
            const isExpanded = !!expanded[key];
            const visible = isExpanded ? group.items : group.items.slice(0, INITIAL_ITEMS);
            const isStock = group.type === 'ESTOQUE_MINIMO';
            const overdue = group.type.endsWith('_VENCIDA');
            const tone = overdue ? colors.danger : isStock ? colors.warning : colors.purple;
            const headingId = `pendency-heading-${group.type}`;
            const listId = `pendency-list-${group.type}`;
            return (
              <Box component="section" aria-labelledby={headingId} key={key} sx={{
                minWidth: 0, bgcolor: colors.card, border: `1px solid ${colors.border}`,
                borderRadius: `${componentRadius.surface}px`, p: { xs: 1.5, sm: 2.5 },
              }}>
                <Box sx={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 0.75 }}>
                  <Typography component="h3" id={headingId} sx={{ color: colors.text, fontSize: '1.1rem', fontWeight: 750 }}>{category.title}</Typography>
                  <Chip size="small" label={`${group.total} ${isStock ? 'produto(s)' : 'pendência(s)'}`} sx={{ bgcolor: alpha(tone, 0.1), color: tone, fontWeight: 700 }} />
                </Box>
                <Typography variant="body2" sx={{ color: colors.textMuted, mb: 2 }}>{category.description}</Typography>
                {visible.length === 0 && <Typography variant="body2" sx={{ color: colors.textMuted, mb: 2 }}>Abra a listagem para consultar os registros desta categoria.</Typography>}
                <Box component="ul" id={listId} sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.25 }}>
                  {visible.map((item) => (
                    <Box component="li" key={item.id} sx={{ minWidth: 0 }}>
                      <ButtonBase component={RouterLink} to={item.path} sx={{
                        display: 'grid', gridTemplateColumns: '32px minmax(0, 1fr) 18px', alignItems: 'start', gap: { xs: 1, sm: 1.5 },
                        width: '100%', height: 'auto', minHeight: 88, flexShrink: 0,
                        borderRadius: `${componentRadius.control}px`, p: { xs: 1.25, sm: 1.5 },
                        border: `1px solid ${colors.border}`, bgcolor: colors.background, textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent', '&:hover, &:active': { bgcolor: colors.brandHover },
                      }}>
                        <Box sx={{ width: 32, height: 32, mt: 0.25, borderRadius: '50%', bgcolor: alpha(tone, 0.1), color: tone, display: 'grid', placeItems: 'center', '& .MuiSvgIcon-root': { fontSize: 19 } }}>
                          {isStock ? <Inventory2OutlinedIcon /> : group.type === 'SERVICO_SEM_NOTA' ? <ShoppingCartCheckoutOutlinedIcon />
                            : overdue ? <ReportProblemOutlinedIcon /> : <AssignmentLateOutlinedIcon />}
                        </Box>
                        <Box sx={{ minWidth: 0, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.25, justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0, flex: 1, overflowWrap: 'anywhere' }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: colors.text, lineHeight: 1.5 }}>{item.title}</Typography>
                            {item.counterparty && !normalized(item.title).includes(normalized(item.counterparty)) && (
                              <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.25, lineHeight: 1.5 }}>{item.counterparty}</Typography>
                            )}
                            {item.date && <Typography variant="caption" sx={{ color: colors.textMuted, display: 'block', mt: 0.5, lineHeight: 1.6 }}>
                              {overdue ? 'Venceu em ' : 'Data: '}<time dateTime={item.date}>{formatDate(item.date)}</time>
                            </Typography>}
                          </Box>
                          {item.amount != null && <Typography sx={{ fontWeight: 750, fontSize: '0.95rem', color: colors.text, lineHeight: 1.5, overflowWrap: 'anywhere', maxWidth: { sm: '45%' }, textAlign: { sm: 'right' }, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.amount)}</Typography>}
                        </Box>
                        <ArrowForwardRoundedIcon sx={{ color: colors.textMuted, fontSize: 18, mt: 0.5 }} />
                      </ButtonBase>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                  {!isStock && <Typography variant="caption" color="text.secondary">{visible.length} de {group.total} pendências</Typography>}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, ml: 'auto' }}>
                    {group.items.length > INITIAL_ITEMS && <Button size="small" aria-expanded={isExpanded} aria-controls={listId}
                      aria-label={`${isExpanded ? 'Ver menos' : 'Ver mais'} de ${category.title}`}
                      onClick={() => setExpanded((current) => ({ ...current, [key]: !current[key] }))}>
                      {isExpanded ? 'Ver menos' : `Ver mais (${group.items.length - visible.length})`}
                    </Button>}
                    <Button size="small" component={RouterLink} to={category.path} aria-label={`Abrir listagem de ${category.title}`} endIcon={<ArrowForwardRoundedIcon />}>Abrir listagem</Button>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
        {permissions.includes('finance:read') && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Contas vencidas incluem todo o histórico.</Typography>}
        {operational.isSuccess && operationalTotal > operationalShown && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Mostrando {operationalShown} de {operationalTotal} pendências operacionais, até {operational.data.limitePorGrupo} por categoria. Abra as listagens para consultar as demais.
        </Typography>}
      </Box>
    </Box>
  );
}
