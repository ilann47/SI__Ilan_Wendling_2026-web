import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { Box, ButtonBase, IconButton, Tooltip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../context/ColorModeContext';
import { useUiPreferences } from '../preferences/useUiPreferences';
import { getThemeTokens } from '../theme/hubTokens';
import {
  areaMenuFor,
  filterNavItem,
  labelForPath,
  visibleProcessGroups,
  type AreaMenuDefinition,
} from '../layout/areaNavigation';
import { type NavItem } from '../layout/navigation';
import { hubModules, moduleNavItems } from '../layout/hubModules';
import { useAuth } from '../auth/AuthContext';

type Props = {
  areaId: string;
};

interface AreaQuickAction {
  label: string;
  description: string;
  path: string;
  permissions?: string[];
}

const AREA_QUICK_ACTIONS: Record<string, AreaQuickAction[]> = {
  operacao: [
    { label: 'Ver o pátio agora', description: 'Acompanhe entradas, saídas e ocupação.', path: '/app/patio' },
    { label: 'Validar acesso', description: 'Faça check-in ou check-out de eventos.', path: '/app/acesso-eventos', permissions: ['access:validate', 'access:checkin', 'access:checkout'] },
  ],
  comercial: [
    { label: 'Registrar uma venda', description: 'Crie uma venda administrativa.', path: '/app/vendas-administrativas', permissions: ['sales:read'] },
    { label: 'Abrir ordem de serviço', description: 'Organize serviços solicitados.', path: '/app/ordens-servico', permissions: ['service_orders:read'] },
  ],
  estoque: [
    { label: 'Fazer um pedido', description: 'Crie uma ordem de compra para o fornecedor.', path: '/app/ordens-compra', permissions: ['purchases:read'] },
    { label: 'Receber mercadoria', description: 'Registre o que chegou e atualize o estoque.', path: '/app/recebimentos', permissions: ['purchases:read'] },
    { label: 'Lançar nota de entrada', description: 'Confira documento, custos e pagamento.', path: '/app/notas-entrada/nova', permissions: ['fiscal:manage'] },
    { label: 'Consultar estoque', description: 'Veja posição, locais e movimentações.', path: '/app/estoque', permissions: ['stock:read'] },
  ],
  fiscal: [
    { label: 'Consultar notas de saída', description: 'Acompanhe documentos emitidos.', path: '/app/notas-saida', permissions: ['fiscal:read'] },
    { label: 'Consultar notas de serviço', description: 'Veja os serviços documentados.', path: '/app/notas-servico', permissions: ['fiscal:read'] },
  ],
  financeiro: [
    { label: 'Ver o que pagar', description: 'Acompanhe contas e vencimentos.', path: '/app/contas-pagar', permissions: ['finance:read'] },
    { label: 'Ver o que receber', description: 'Consulte valores a receber.', path: '/app/contas-receber', permissions: ['finance:read'] },
  ],
  cadastros: [
    { label: 'Consultar clientes', description: 'Encontre pessoas e seus dados.', path: '/app/clientes', permissions: ['customers:read'] },
    { label: 'Consultar produtos', description: 'Acesse o catálogo da operação.', path: '/app/produtos', permissions: ['catalog:read'] },
  ],
  admin: [
    { label: 'Administrar usuários', description: 'Gerencie acessos da organização.', path: '/app/administracao', permissions: ['organizations:admin', 'users:invite'] },
    { label: 'Configurar instalações', description: 'Organize unidades e pátios.', path: '/app/instalacoes', permissions: ['facilities:manage'] },
  ],
};

export function quickActionsFor(areaId: string, permissions: readonly string[]): AreaQuickAction[] {
  return (AREA_QUICK_ACTIONS[areaId] ?? []).filter((action) => (
    !action.permissions || action.permissions.some((permission) => permissions.includes(permission))
  ));
}

function ShortcutRow({
  path,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  path: string;
  favorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        borderRadius: 1.5,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.card,
        px: 1,
        py: 0.5,
      }}
    >
      <ButtonBase
        onClick={onOpen}
        sx={{
          flex: 1,
          justifyContent: 'flex-start',
          textAlign: 'left',
          px: 1,
          py: 0.75,
          borderRadius: 1,
          color: colors.text,
          fontWeight: 600,
          fontSize: '0.85rem',
        }}
      >
        {labelForPath(path)}
      </ButtonBase>
      <Tooltip title={favorite ? 'Remover dos favoritos' : 'Favoritar'}>
        <IconButton size="small" aria-label={favorite ? 'Remover favorito' : 'Favoritar'} onClick={onToggleFavorite}>
          {favorite
            ? <StarOutlinedIcon sx={{ fontSize: 18, color: colors.purple }} />
            : <StarBorderOutlinedIcon sx={{ fontSize: 18, color: colors.textMuted }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function ProcessItem({
  item,
  favorite,
  onOpen,
  onToggleFavorite,
}: {
  item: NavItem;
  favorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 1.5,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.card,
        overflow: 'hidden',
        '&:hover': { borderColor: colors.purple },
      }}
    >
      <ButtonBase
        onClick={onOpen}
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: 1.5,
          py: 1.25,
          justifyContent: 'flex-start',
          textAlign: 'left',
          color: colors.text,
        }}
      >
        <Box sx={{ color: colors.purple, display: 'grid', placeItems: 'center' }}>{item.icon}</Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.label}</Typography>
      </ButtonBase>
      <Tooltip title={favorite ? 'Remover dos favoritos' : 'Favoritar'}>
        <IconButton
          size="small"
          aria-label={favorite ? 'Remover favorito' : 'Favoritar'}
          onClick={onToggleFavorite}
          sx={{ mx: 0.5, alignSelf: 'center' }}
        >
          {favorite
            ? <StarOutlinedIcon sx={{ fontSize: 18, color: colors.purple }} />
            : <StarBorderOutlinedIcon sx={{ fontSize: 18, color: colors.textMuted }} />}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function MegaMenuBody({ menu }: { menu: AreaMenuDefinition }) {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const { prefs, toggleFavorite } = useUiPreferences();
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const groups = visibleProcessGroups(menu, permissions);
  const quickActions = quickActionsFor(menu.areaId, permissions);
  const favorites = prefs.favoritePaths.filter((path) => path.startsWith('/app'));
  const recents = prefs.recentPaths.filter((path) => path.startsWith('/app') && path !== '/app');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {quickActions.length > 0 && (
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.purple, mb: 1 }}>
            O que fazer agora
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
            {quickActions.map((action) => (
              <ButtonBase
                key={action.path}
                onClick={() => navigate(action.path)}
                sx={{
                  display: 'block',
                  textAlign: 'left',
                  borderRadius: 2,
                  border: `1px solid ${colors.border}`,
                  bgcolor: colors.card,
                  px: 2,
                  py: 1.5,
                  '&:hover': { borderColor: colors.purple, bgcolor: colors.brandHover },
                }}
              >
                <Typography sx={{ color: colors.text, fontWeight: 800 }}>{action.label}</Typography>
                <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.35 }}>
                  {action.description}
                </Typography>
              </ButtonBase>
            ))}
          </Box>
        </Box>
      )}
      {(favorites.length > 0 || recents.length > 0) && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <StarOutlinedIcon sx={{ fontSize: 18, color: colors.purple }} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.purple }}>
                Favoritos
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {favorites.length === 0 ? (
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Marque processos com a estrela para acesso rápido.
                </Typography>
              ) : favorites.map((path) => (
                <ShortcutRow
                  key={path}
                  path={path}
                  favorite
                  onOpen={() => navigate(path)}
                  onToggleFavorite={() => toggleFavorite(path)}
                />
              ))}
            </Box>
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <HistoryOutlinedIcon sx={{ fontSize: 18, color: colors.purple }} />
              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.purple }}>
                Recentes
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {recents.length === 0 ? (
                <Typography variant="body2" sx={{ color: colors.textMuted }}>
                  Os atalhos que você abrir aparecem aqui.
                </Typography>
              ) : recents.map((path) => (
                <ShortcutRow
                  key={path}
                  path={path}
                  favorite={favorites.includes(path)}
                  onOpen={() => navigate(path)}
                  onToggleFavorite={() => toggleFavorite(path)}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: `repeat(${Math.min(Math.max(groups.length, 1), 3)}, minmax(0, 1fr))`,
          },
          gap: 2.5,
        }}
      >
        {groups.map((group) => (
          <Box key={group.label}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: '0.72rem',
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                color: colors.textMuted,
                mb: 1,
              }}
            >
              {group.label}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {group.items.map((item) => (
                <ProcessItem
                  key={item.path}
                  item={item}
                  favorite={prefs.favoritePaths.includes(item.path)}
                  onOpen={() => navigate(item.path)}
                  onToggleFavorite={() => toggleFavorite(item.path)}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function FlatAreaBody({ areaId }: { areaId: string }) {
  const navigate = useNavigate();
  const { permissions } = useAuth();
  const { prefs, toggleFavorite } = useUiPreferences();
  const module = hubModules.find((candidate) => candidate.id === areaId);
  const items = module ? moduleNavItems(module, permissions) : [];
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.purple, mb: 1 }}>
            Favoritos
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {prefs.favoritePaths.length === 0 ? (
              <Typography variant="body2" sx={{ color: colors.textMuted }}>
                Marque processos com a estrela para acesso rápido.
              </Typography>
            ) : prefs.favoritePaths.map((path) => (
              <ShortcutRow
                key={path}
                path={path}
                favorite
                onOpen={() => navigate(path)}
                onToggleFavorite={() => toggleFavorite(path)}
              />
            ))}
          </Box>
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.6, textTransform: 'uppercase', color: colors.purple, mb: 1 }}>
            Recentes
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {prefs.recentPaths.length === 0 ? (
              <Typography variant="body2" sx={{ color: colors.textMuted }}>
                Os atalhos que você abrir aparecem aqui.
              </Typography>
            ) : prefs.recentPaths.map((path) => (
              <ShortcutRow
                key={path}
                path={path}
                favorite={prefs.favoritePaths.includes(path)}
                onOpen={() => navigate(path)}
                onToggleFavorite={() => toggleFavorite(path)}
              />
            ))}
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: '0.72rem', letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textMuted, mb: 1 }}>
          Processos
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 0.75,
          }}
        >
          {items.filter((item) => filterNavItem(item, permissions)).map((item) => (
            <ProcessItem
              key={item.path}
              item={item}
              favorite={prefs.favoritePaths.includes(item.path)}
              onOpen={() => navigate(item.path)}
              onToggleFavorite={() => toggleFavorite(item.path)}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

/** Landing de área com mega menu por processo + favoritos/recentes. */
export function AreaHomePage({ areaId }: Props) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const module = hubModules.find((candidate) => candidate.id === areaId);
  const menu = areaMenuFor(areaId);

  if (!module) {
    return (
      <Typography color="error">Área não encontrada.</Typography>
    );
  }

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Typography sx={{ color: colors.purple, fontWeight: 800, fontSize: '0.75rem', letterSpacing: 0.8, textTransform: 'uppercase' }}>
        Área
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '1.85rem' }, color: colors.text, mt: 0.35 }}>
        {module.label}
      </Typography>
      <Typography variant="body2" sx={{ color: colors.textMuted, mt: 0.5, mb: 3, maxWidth: 560 }}>
        {menu?.description ?? module.description}
      </Typography>
      {menu ? <MegaMenuBody menu={menu} /> : <FlatAreaBody areaId={areaId} />}
    </Box>
  );
}
