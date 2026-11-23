import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, ClickAwayListener,
  Drawer, IconButton, Link, Paper, Popper, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useAuth } from '../auth/AuthContext';
import { useColorMode } from '../context/ColorModeContext';
import { componentRadius, getThemeTokens } from '../theme/hubTokens';
import { areaMenus, visibleProcessGroups, type AreaProcessGroup } from './areaNavigation';

type Props = {
  activeModuleId?: string;
  requestedArea?: string | null;
  onAreaOpened?: () => void;
};

function ProcessLinks({ groups, onNavigate }: { groups: AreaProcessGroup[]; onNavigate: () => void }) {
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const location = useLocation();
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `repeat(${groups.length}, minmax(0, 1fr))` }, gap: { xs: 2, md: 3 } }}>
    {groups.map((group) => <Box key={group.label}>
      <Typography component="h3" sx={{ px: 1.25, mb: 0.75, fontSize: '0.73rem', fontWeight: 750, color: colors.purple, letterSpacing: '0.045em', textTransform: 'uppercase' }}>
        {group.label}
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {group.items.map((item) => <Link
          key={item.path}
          component={RouterLink}
          to={item.path}
          onClick={onNavigate}
          aria-current={`${location.pathname}${location.search}` === item.path ? 'page' : undefined}
          underline="none"
          sx={{
            display: 'flex', alignItems: 'center', minHeight: { xs: 44, md: 36 }, px: 1.25, py: 0.75,
            borderRadius: 1, color: colors.textMuted, fontSize: '0.82rem', fontWeight: 600,
            '&:hover, &:focus-visible, &[aria-current="page"]': { bgcolor: colors.brandHover, color: colors.purple },
          }}
        >{item.label}</Link>)}
      </Box>
    </Box>)}
  </Box>;
}

/** Acesso direto aos processos; usa o mesmo catálogo e RBAC das áreas. */
export function HeaderAreaNavigation({ activeModuleId, requestedArea, onAreaOpened }: Props) {
  const { permissions, user } = useAuth();
  const profile = user?.perfil;
  const { mode } = useColorMode();
  const colors = getThemeTokens(mode);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [openArea, setOpenArea] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(activeModuleId ?? null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusFirstLink = useRef(false);
  const menus = areaMenus.map((menu) => ({ ...menu, groups: visibleProcessGroups(menu, permissions, profile) }))
    .filter((menu) => menu.groups.length > 0);
  const selected = menus.find((menu) => menu.areaId === openArea);

  const close = () => {
    setOpenArea(null);
    setDrawerOpen(false);
  };

  useEffect(() => {
    setOpenArea(null);
    setDrawerOpen(false);
  }, [location.key, mobile, permissions, profile]);

  useEffect(() => {
    if (mobile) setMobileExpanded(activeModuleId ?? null);
  }, [activeModuleId, mobile]);

  useEffect(() => {
    if (!requestedArea) return;
    const menu = areaMenus.find((candidate) => candidate.areaId === requestedArea);
    if (menu && visibleProcessGroups(menu, permissions, profile).length > 0) {
      if (mobile) {
        setDrawerOpen(true);
        setMobileExpanded(requestedArea);
      } else {
        setAnchor(triggerRefs.current[requestedArea]);
        focusFirstLink.current = true;
      }
      setOpenArea(requestedArea);
    }
    onAreaOpened?.();
  }, [requestedArea, onAreaOpened, mobile, permissions, profile]);

  const keyboard = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      anchor?.focus();
    }
  };

  if (mobile) return <>
    <IconButton aria-label="Abrir áreas e processos" aria-haspopup="dialog" aria-expanded={drawerOpen}
      onClick={() => {
        setMobileExpanded(openArea ?? activeModuleId ?? null);
        setDrawerOpen(true);
      }} sx={{ width: 44, height: 44, color: `var(--kaneko-area-fg, ${colors.purple})`, '&:hover': { bgcolor: `var(--kaneko-area-hover, ${colors.brandHover})` } }}><MenuRoundedIcon /></IconButton>
    <Drawer open={drawerOpen} onClose={close}
      PaperProps={{ role: 'dialog', 'aria-label': 'Áreas e processos', sx: { width: 'min(360px, 100vw)', bgcolor: colors.appBar, p: 2, pb: 'max(16px, env(safe-area-inset-bottom))' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography component="h2" sx={{ fontSize: '1rem', fontWeight: 800 }}>Áreas e processos</Typography>
        <IconButton aria-label="Fechar áreas e processos" onClick={close}><CloseRoundedIcon /></IconButton>
      </Box>
      {menus.map((menu) => <Accordion key={menu.areaId} expanded={mobileExpanded === menu.areaId}
        onChange={(_, expanded) => setMobileExpanded(expanded ? menu.areaId : null)} disableGutters elevation={0}
        sx={{ bgcolor: 'transparent', '&::before': { display: 'none' }, borderBottom: `1px solid ${colors.border}` }}>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} aria-controls={`mobile-area-${menu.areaId}`} id={`mobile-trigger-${menu.areaId}`}
          sx={{ px: 0.5, minHeight: 48, color: menu.areaId === activeModuleId ? colors.purple : colors.text, fontWeight: 700 }}>
          {menu.title}
        </AccordionSummary>
        <AccordionDetails sx={{ px: 0 }}><ProcessLinks groups={menu.groups} onNavigate={close} /></AccordionDetails>
      </Accordion>)}
    </Drawer>
  </>;

  return <ClickAwayListener onClickAway={close} mouseEvent="onMouseDown" touchEvent="onTouchStart">
    <Box component="nav" aria-label="Áreas da plataforma" onKeyDown={keyboard}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget) && !panelRef.current?.contains(event.relatedTarget)) close();
      }} sx={{ display: 'flex', gap: 0.25, alignItems: 'center', height: '100%' }}>
      {menus.map((menu, index) => <Button key={menu.areaId}
        ref={(element) => { triggerRefs.current[menu.areaId] = element; }}
        id={`area-trigger-${menu.areaId}`} aria-expanded={menu.areaId === openArea}
        aria-controls={menu.areaId === openArea ? 'header-area-processes' : undefined}
        onClick={(event) => {
          setAnchor(event.currentTarget);
          setOpenArea((current) => current === menu.areaId ? null : menu.areaId);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusFirstLink.current = true;
            setAnchor(event.currentTarget);
            setOpenArea(menu.areaId);
            if (openArea === menu.areaId) panelRef.current?.querySelector('a')?.focus();
          }
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const next = menus[(index + (event.key === 'ArrowRight' ? 1 : -1) + menus.length) % menus.length];
            triggerRefs.current[next.areaId]?.focus();
          }
        }}
        endIcon={<ExpandMoreRoundedIcon />}
        sx={{
          minWidth: 0, minHeight: 40, px: 1.25, fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap',
          color: menu.areaId === activeModuleId || menu.areaId === openArea ? colors.purple : `var(--kaneko-area-fg, ${colors.text})`,
          bgcolor: menu.areaId === activeModuleId || menu.areaId === openArea ? colors.card : 'transparent',
          borderRadius: `${componentRadius.pill}px`,
          boxShadow: menu.areaId === activeModuleId || menu.areaId === openArea ? `inset 0 0 0 1px ${colors.border}` : 'none',
          '& .MuiButton-endIcon': { ml: 0.35, '& svg': { fontSize: 16 } },
          '&:hover': { bgcolor: menu.areaId === activeModuleId || menu.areaId === openArea ? colors.card : `var(--kaneko-area-hover, ${colors.brandHover})` },
        }}>
        {menu.title}
      </Button>)}
      <Popper open={Boolean(selected)} anchorEl={anchor} placement="bottom-start" sx={{ zIndex: theme.zIndex.appBar + 1 }}
        modifiers={[{ name: 'offset', options: { offset: [0, 8] } }, { name: 'preventOverflow', options: { padding: 12 } }]}>
        {selected && <Paper
          ref={(node: HTMLDivElement | null) => {
            panelRef.current = node;
            if (node && focusFirstLink.current) {
              node.querySelector('a')?.focus();
              focusFirstLink.current = false;
            }
          }}
          id="header-area-processes" role="region" aria-label={`Processos de ${selected.title}`}
          sx={{ p: 2, width: Math.max(280, selected.groups.length * 235), maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100dvh - 140px)', overflowY: 'auto',
            bgcolor: colors.card, border: `1px solid ${colors.border}`, borderRadius: `${componentRadius.surface}px`, boxShadow: colors.raisedShadow }}>
          <ProcessLinks groups={selected.groups} onNavigate={close} />
        </Paper>}
      </Popper>
    </Box>
  </ClickAwayListener>;
}
