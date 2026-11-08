import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, ButtonBase, Typography } from '@mui/material';
import { useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../api/client';
import { operationalPendencies, pendencyPermissions } from '../api/operationalPendencies';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { getThemeTokens } from '../theme/hubTokens';
import { useColorMode } from '../context/ColorModeContext';
import { formatCurrency, formatDate } from '../utils/format';
import type { EstoqueMinimoResponse } from '../types';

interface Pendency {
  id: string;
  title: string;
  message: string;
  path: string;
  tone: 'urgent' | 'warning' | 'info';
}

/**
 * Home Kaneko: saudação e pendências da organização.
 */
export function HubHomePage() {
  const { user, activeOrganization, permissions } = useAuth();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const organizationId = activeOrganization?.organizationId;
  const firstName = (user?.login ?? 'Operador').split(/[.@]/)[0] ?? 'Operador';

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
  const pendencyQueries = [
    canReadOperational ? operational : null,
    permissions.includes('stock:read') ? estoque : null,
  ].filter((query) => query !== null);

  const operationalGroups = (operational.data?.grupos ?? [])
    .filter((group) => permissions.includes(pendencyPermissions[group.tipo] ?? ''));
  const operationalTotal = operationalGroups.reduce((total, group) => total + group.total, 0);
  const operationalShown = operationalGroups.reduce((total, group) => total + group.itens.length, 0);

  const pendencies = useMemo<Pendency[]>(() => {
    const items: Pendency[] = [];
    (operational.data?.grupos ?? []).filter((group) => permissions.includes(pendencyPermissions[group.tipo] ?? ''))
      .forEach((group) => group.itens.forEach((item) => items.push({
        id: `${group.tipo}-${item.id}`, title: item.titulo, path: item.caminho,
        message: [item.contraparte, item.valor != null ? formatCurrency(item.valor) : null,
          item.data ? formatDate(item.data) : null].filter(Boolean).join(' · '),
        tone: group.tipo.endsWith('_VENCIDA') ? 'urgent' : 'info',
      })));
    if (permissions.includes('stock:read') && (estoque.data?.total ?? 0) > 0) {
      items.push({
        id: 'estoque-minimo',
        title: 'Estoque abaixo do mínimo',
        message: `${estoque.data!.total} produto(s) na posição consolidada`,
        path: '/app/relatorios?tab=estoque',
        tone: 'warning',
      });
    }
    return items;
  }, [operational.data, estoque.data, permissions]);

  const toneStyles = {
    urgent: { bg: 'rgba(229,57,53,0.1)', color: colors.danger },
    warning: { bg: 'rgba(249,168,37,0.14)', color: '#C88700' },
    info: { bg: 'rgba(107,70,254,0.1)', color: colors.purple },
  } as const;

  const pendencyIcon = (tone: Pendency['tone'], title: string) => {
    if (title.toLowerCase().includes('estoque')) return <Inventory2OutlinedIcon />;
    if (title.toLowerCase().includes('ordem')) return <ShoppingCartCheckoutOutlinedIcon />;
    if (tone === 'urgent') return <ReportProblemOutlinedIcon />;
    return <AssignmentLateOutlinedIcon />;
  };

  return (
    <Box
      sx={{
        py: 1.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'flex-start' },
          gap: { xs: 2, lg: 2.5 },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, order: { xs: 1, lg: 1 } }}>
          <Typography component="h1"
            sx={{ color: colors.purple, fontWeight: 850, fontSize: { xs: '1.25rem', md: '1.5rem' }, letterSpacing: -0.5 }}>
            Olá, {firstName} 👋
          </Typography>
        </Box>

        <Box sx={{ width: { xs: '100%', md: 300, lg: 340 }, flexShrink: 0, order: { xs: 2, lg: 2 }, ml: { xs: 0, md: 'auto' } }}>
          <Box
            sx={{
              bgcolor: colors.card,
              borderRadius: { xs: 3, md: 4 },
              p: 2,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 28px rgba(26, 31, 44, 0.06)',
              minHeight: { lg: 200 },
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <PushPinOutlinedIcon sx={{ fontSize: 18, color: colors.purple }} />
                <Typography variant="caption" sx={{ color: colors.purple, fontWeight: 700 }}>O que pede atenção</Typography>
              </Box>
              <Typography component="h2" sx={{ fontWeight: 800, color: colors.text, mt: 0.25, mb: 0.35, fontSize: { xs: '1.15rem', md: '1.35rem' } }}>
                Pendências
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textMuted, lineHeight: 1.5 }}>
                Abra o item para resolver, sem procurar novamente.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, maxHeight: 310, overflowY: 'auto' }}>
              {pendencyQueries.some((query) => query.isLoading) && (
                <Typography role="status" color="text.secondary">Carregando pendências…</Typography>
              )}
              {pendencyQueries.some((query) => query.isError) && (
                <Alert severity="warning" action={<Button size="small" onClick={() => pendencyQueries.filter((q) => q.isError).forEach((q) => void q.refetch())}>Tentar novamente</Button>}>Não foi possível consultar todas as pendências.</Alert>
              )}
              {pendencyQueries.length === 0 && (
                <Typography color="text.secondary">Não há consultas de pendências disponíveis para o seu acesso.</Typography>
              )}
              {pendencies.length === 0 && pendencyQueries.length > 0 && pendencyQueries.every((query) => query.isSuccess) ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'grid',
                    placeItems: 'center',
                    py: 3,
                    px: 2,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    border: `1px dashed ${colors.border}`,
                    bgcolor: colors.sidebarHover,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: colors.text, mb: 0.5 }}>
                    Nenhuma pendência nas consultas disponíveis
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Nenhum item aguardando ação nos módulos disponíveis para seu acesso.
                  </Typography>
                </Box>
              ) : (
                pendencies.map((item) => {
                  const tone = toneStyles[item.tone];
                  return (
                    <ButtonBase
                      key={item.id}
                      component={RouterLink}
                      to={item.path}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        width: '100%',
                        minHeight: 64,
                        borderRadius: 2.5,
                        px: 1.25,
                        py: 1.1,
                        border: `1px solid ${colors.border}`,
                        bgcolor: colors.background,
                        textAlign: 'left',
                        WebkitTapHighlightColor: 'transparent',
                        '&:active': { bgcolor: colors.brandHover },
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: tone.bg,
                          color: tone.color,
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          '& .MuiSvgIcon-root': { fontSize: 22 },
                        }}
                      >
                        {pendencyIcon(item.tone, item.title)}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: colors.text, lineHeight: 1.25 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: colors.textMuted, lineHeight: 1.35, mt: 0.2 }}>
                          {item.message}
                        </Typography>
                      </Box>
                      <ArrowForwardRoundedIcon sx={{ color: colors.textMuted, fontSize: 20, flexShrink: 0 }} />
                    </ButtonBase>
                  );
                })
              )}
            </Box>
            {permissions.includes('finance:read') && <Typography variant="caption" color="text.secondary">Contas vencidas incluem todo o histórico.</Typography>}
            {operational.isSuccess && operationalTotal > operationalShown && <Typography variant="caption" color="text.secondary">
              Mostrando {operationalShown} de {operationalTotal} pendências operacionais, até {operational.data.limitePorGrupo} por categoria. Abra as listagens para consultar as demais.
            </Typography>}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
