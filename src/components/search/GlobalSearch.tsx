import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Box, ButtonBase, Chip, CircularProgress, Dialog, DialogContent, DialogTitle,
  Divider, InputAdornment, List, ListItemButton, ListItemText, Stack, TextField, Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearchApi } from '../../api/globalSearch';
import { tenantQueryKey } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';

export function GlobalSearch() {
  const { activeOrganization } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setOpen(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [input]);

  const organizationId = activeOrganization?.organizationId;
  const search = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'global-search', query) : ['global-search', query],
    queryFn: () => globalSearchApi.search(query),
    enabled: open && !!organizationId && query.length >= 2,
  });
  const close = () => { setOpen(false); setInput(''); setQuery(''); };

  return <>
    <ButtonBase aria-label="Buscar em toda a plataforma" onClick={() => setOpen(true)} sx={{
      display: { xs: 'none', sm: 'flex' }, width: { sm: 280, lg: 420 }, mx: 2, px: 1.5, py: 0.8,
      border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover', justifyContent: 'space-between',
    }}>
      <Stack direction="row" spacing={1} alignItems="center"><SearchOutlinedIcon fontSize="small" />
        <Typography variant="body2" color="text.secondary">Buscar em toda a plataforma…</Typography></Stack>
      <Chip label="Ctrl K" size="small" variant="outlined" />
    </ButtonBase>
    <ButtonBase aria-label="Buscar em toda a plataforma" onClick={() => setOpen(true)}
      sx={{ display: { xs: 'flex', sm: 'none' }, p: 1, borderRadius: 2 }}><SearchOutlinedIcon /></ButtonBase>
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Buscar em toda a plataforma</DialogTitle>
      <DialogContent sx={{ px: 0 }}>
        <Box sx={{ px: 3, pb: 2 }}><TextField autoFocus fullWidth value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Cliente, CPF, placa, pedido, nota, conta ou evento…"
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment> } }} /></Box>
        <Divider />
        {search.isFetching && <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}><CircularProgress size={28} /></Box>}
        {!search.isFetching && query.length < 2 && <Typography color="text.secondary" sx={{ p: 3 }}>
          Digite ao menos dois caracteres para pesquisar nos módulos permitidos.</Typography>}
        {!search.isFetching && search.isError && <Typography color="error" sx={{ p: 3 }}>
          Não foi possível concluir a busca. Tente novamente.</Typography>}
        {!search.isFetching && !search.isError && search.data?.total === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>
          Nenhum resultado encontrado.</Typography>}
        {!search.isFetching && search.data?.grupos.map((group) => <Box key={group.grupo}>
          <Typography variant="overline" color="text.secondary" sx={{ px: 3, pt: 2, display: 'block' }}>{group.grupo}</Typography>
          <List disablePadding>{group.resultados.map((result) => <ListItemButton key={`${result.tipo}-${result.id}`}
            onClick={() => { navigate(result.caminho); close(); }} sx={{ px: 3 }}>
            <ListItemText primary={result.titulo} secondary={result.subtitulo} />
            {result.status && <Chip label={result.status.replace(/_/g, ' ')} size="small" variant="outlined" />}
          </ListItemButton>)}</List>
        </Box>)}
      </DialogContent>
    </Dialog>
  </>;
}
