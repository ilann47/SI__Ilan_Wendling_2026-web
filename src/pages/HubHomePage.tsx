import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingCartCheckoutOutlinedIcon from '@mui/icons-material/ShoppingCartCheckoutOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useQuery } from '@tanstack/react-query';
import { Box, ButtonBase, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { purchaseApi } from '../api/purchases';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { BrandMark } from '../components/brand/BrandMark';
import { HexMark } from '../components/brand/HexMark';
import { getThemeTokens } from '../theme/hubTokens';
import { useColorMode } from '../context/ColorModeContext';
import { formatCurrency } from '../utils/format';
import type { ContasAVencerResponse, EstoqueMinimoResponse } from '../types';
import { canOpenHubModule, hubModules } from '../layout/hubModules';

interface Pendency {
  id: string;
  title: string;
  message: string;
  path: string;
  tone: 'urgent' | 'warning' | 'info';
}

/**
 * Home no padrão Hub YES7: grade de módulos + pendências reais.
 */
export function HubHomePage() {
  const navigate = useNavigate();
  const { user, activeOrganization, permissions } = useAuth();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const organizationId = activeOrganization?.organizationId;
  const firstName = (user?.login ?? 'Operador').split(/[.@]/)[0] ?? 'Operador';
  const today = dayjs().format('YYYY-MM-DD');
  const horizon = dayjs().add(7, 'day').format('YYYY-MM-DD');

  const visibleModules = hubModules.filter((module) => canOpenHubModule(module, permissions));

  const contas = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'hub', 'contas', today, horizon) : ['hub', 'contas'],
    enabled: !!organizationId && permissions.includes('finance:read'),
    queryFn: () => api.get<ContasAVencerResponse>('/api/relatorios/contas-a-vencer', {
      params: { inicio: today, fim: horizon },
    }).then((response) => response.data),
  });
  const estoque = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'hub', 'estoque') : ['hub', 'estoque'],
    enabled: !!organizationId && permissions.includes('stock:read'),
    queryFn: () => api.get<EstoqueMinimoResponse>('/api/relatorios/estoque-minimo').then((response) => response.data),
  });
  const purchases = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'hub', 'oc') : ['hub', 'oc'],
    enabled: !!organizationId && permissions.includes('purchases:read'),
    queryFn: () => purchaseApi.list({ size: 20, sort: 'dataEmissao,desc' }),
  });

  const pendencies = useMemo<Pendency[]>(() => {
    const items: Pendency[] = [];
    const overdue = (contas.data?.vencidoAPagar ?? 0) + (contas.data?.vencidoAReceber ?? 0);
    if (contas.data && overdue > 0) {
      items.push({
        id: 'contas-vencidas',
        title: 'Conta vencida',
        message: `Saldo vencido de ${formatCurrency(overdue)}`,
        path: '/app/contas-pagar',
        tone: 'urgent',
      });
    }
    const dueSoon = (contas.data?.totalAPagar ?? 0) + (contas.data?.totalAReceber ?? 0);
    if (contas.data && dueSoon > 0) {
      items.push({
        id: 'contas-vencer',
        title: 'Vencendo em 7 dias',
        message: `Títulos no horizonte: ${formatCurrency(dueSoon)}`,
        path: '/app/relatorios',
        tone: 'warning',
      });
    }
    if ((estoque.data?.total ?? 0) > 0) {
      items.push({
        id: 'estoque-minimo',
        title: 'Estoque abaixo do mínimo',
        message: `${estoque.data!.total} produto(s) na posição consolidada`,
        path: '/app/estoque',
        tone: 'warning',
      });
    }
    const awaiting = (purchases.data?.content ?? [])
      .filter((order) => order.status === 'APROVADA' || order.status === 'PARCIALMENTE_RECEBIDA');
    awaiting.slice(0, 3).forEach((order) => {
      items.push({
        id: `oc-${order.id}`,
        title: `Ordem ${order.numero} aguarda recebimento`,
        message: order.fornecedorNome,
        path: '/app/ordens-compra',
        tone: 'info',
      });
    });
    return items.slice(0, 6);
  }, [contas.data, estoque.data, purchases.data]);

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
    <Box sx={{ minHeight: 'calc(100vh - 64px)', bgcolor: colors.background, px: { xs: 2, md: 3.5 }, py: { xs: 2.5, md: 3.5 } }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'stretch', lg: 'flex-start' },
          gap: 3,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: { lg: 920 } }}>
          <Typography sx={{ color: colors.purple, fontWeight: 800, fontSize: { xs: '1.55rem', md: '1.85rem' }, letterSpacing: -0.3 }}>
            Olá, {firstName} 👋
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, color: colors.text, mt: 0.35, mb: 0.5, fontSize: { xs: '1.35rem', md: '1.55rem' } }}>
            O que você deseja fazer hoje?
          </Typography>
          <Typography variant="body1" sx={{ color: colors.textMuted, mb: 3, maxWidth: 520 }}>
            Escolha um módulo para começar.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(2, minmax(0, 1fr))',
                sm: 'repeat(3, minmax(0, 1fr))',
                md: 'repeat(4, minmax(0, 1fr))',
                xl: 'repeat(5, minmax(0, 1fr))',
              },
              gap: 1.25,
            }}
          >
            {visibleModules.map((module) => (
              <Box
                key={module.id}
                component="button"
                type="button"
                onClick={() => navigate(module.homePath)}
                aria-label={`Abrir módulo ${module.label}`}
                sx={{
                  appearance: 'none',
                  border: `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  textAlign: 'center',
                  borderRadius: 2.5,
                  minHeight: { xs: 108, md: 118 },
                  p: 1.75,
                  bgcolor: colors.card,
                  color: colors.text,
                  boxShadow: '0 4px 14px rgba(27, 33, 64, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 10px 24px rgba(107, 70, 254, 0.12)',
                    borderColor: colors.purpleSoft,
                  },
                  '&:focus-visible': { outline: `2px solid ${colors.purple}`, outlineOffset: 3 },
                }}
              >
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: colors.brandHover,
                    color: colors.purple,
                    display: 'grid',
                    placeItems: 'center',
                    '& .MuiSvgIcon-root': { fontSize: 24 },
                  }}
                >
                  {module.icon}
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.84rem', lineHeight: 1.2 }}>
                  {module.label}
                </Typography>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              mt: 3,
              p: { xs: 2.25, md: 2.75 },
              borderRadius: 2.5,
              bgcolor: colors.card,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 4px 14px rgba(27, 33, 64, 0.04)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: colors.brandHover, display: 'grid', placeItems: 'center' }}>
              <HexMark size={36} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: colors.text }}>
                Hub operacional Kaneko
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: colors.textMuted, mt: 0.5, lineHeight: 1.45 }}>
                Pátio, eventos, compras e financeiro no mesmo contexto organizacional — só com dados reais da API.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ width: { xs: '100%', lg: 340 }, flexShrink: 0 }}>
          <Box
            sx={{
              bgcolor: colors.card,
              borderRadius: 4,
              p: { xs: 2.5, md: 3 },
              border: `1px solid ${colors.border}`,
              boxShadow: '0 8px 28px rgba(26, 31, 44, 0.06)',
              minHeight: { lg: 280 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                <PushPinOutlinedIcon sx={{ fontSize: 18, color: colors.purple }} />
                <Typography variant="overline" sx={{ color: colors.purple, fontWeight: 700, letterSpacing: 1 }}>
                  Pendências
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: colors.text, mt: 0.5, mb: 0.5 }}>
                Pendências
              </Typography>
              <Typography variant="body2" sx={{ color: colors.textMuted, lineHeight: 1.5 }}>
                Itens reais que pedem atenção agora.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              {pendencies.length === 0 ? (
                <Box
                  sx={{
                    flex: 1,
                    display: 'grid',
                    placeItems: 'center',
                    py: 4,
                    px: 2,
                    textAlign: 'center',
                    borderRadius: 2.5,
                    border: `1px dashed ${colors.border}`,
                    bgcolor: colors.sidebarHover,
                  }}
                >
                  <Typography sx={{ fontWeight: 700, color: colors.text, mb: 0.5 }}>
                    Nenhuma pendência
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quando houver alertas da API, eles aparecem aqui.
                  </Typography>
                </Box>
              ) : (
                pendencies.map((item) => {
                  const tone = toneStyles[item.tone];
                  return (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        borderRadius: 2.5,
                        px: 1.25,
                        py: 1,
                        border: `1px solid ${colors.border}`,
                        bgcolor: colors.background,
                      }}
                    >
                      <ButtonBase
                        onClick={() => navigate(item.path)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.25,
                          flex: 1,
                          minWidth: 0,
                          textAlign: 'left',
                          borderRadius: 2,
                          py: 0.25,
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
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: { xs: 'center', lg: 'flex-start' } }}>
        <BrandMark size={28} showName />
      </Box>
    </Box>
  );
}
