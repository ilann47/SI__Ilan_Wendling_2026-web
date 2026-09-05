import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import {
  Box, Button, ButtonBase, Chip, Dialog, DialogContent, DialogTitle,
  Divider, InputAdornment, LinearProgress, List, ListItemButton, ListItemText,
  Stack, TextField, Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { describeError } from '../../api/client';
import { globalSearchApi, type GlobalSearchResult } from '../../api/globalSearch';
import { tenantQueryKey } from '../../api/queryKeys';
import { useAuth } from '../../auth/AuthContext';
import { rememberRecentSearch } from '../../preferences/uiPreferences';
import { highlightTerm } from '../listing/listingUtils';
import { ErrorState } from '../listing/ErrorState';

const RECENT_KEY = 'kaneko.search.recent';

function readRecent(): string[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).filter((item) => typeof item === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}

function Highlight({ text, term }: { text: string; term: string }) {
  return (
    <>
      {highlightTerm(text, term).map((part, index) => (
        <Box key={`${part.text}-${index}`} component="span" sx={part.match ? { bgcolor: 'warning.light', fontWeight: 700 } : undefined}>
          {part.text}
        </Box>
      ))}
    </>
  );
}

export function GlobalSearch() {
  const { activeOrganization } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [recent, setRecent] = useState<string[]>(readRecent);

  useEffect(() => {
    const listener = (event: globalThis.KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(input.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (open) {
      setSelected(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, query]);

  const organizationId = activeOrganization?.organizationId;
  const search = useQuery({
    queryKey: organizationId ? tenantQueryKey(organizationId, 'global-search', query) : ['global-search', query],
    queryFn: () => globalSearchApi.search(query),
    enabled: open && !!organizationId && query.length >= 2,
  });

  const flat = useMemo<GlobalSearchResult[]>(
    () => search.data?.grupos.flatMap((group) => group.resultados) ?? [],
    [search.data],
  );

  const close = () => { setOpen(false); setInput(''); setQuery(''); setSelected(0); };
  const openResult = (result: GlobalSearchResult) => {
    setRecent((current) => {
      const next = rememberRecentSearch(current, query || result.titulo);
      sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
    navigate(result.caminho);
    close();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((current) => Math.min(current + 1, Math.max(flat.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && flat[selected]) {
      event.preventDefault();
      openResult(flat[selected]);
    } else if (event.key === 'Escape') {
      close();
    }
  };

  return (
    <>
      <ButtonBase aria-label="Buscar em toda a plataforma" onClick={() => setOpen(true)} sx={{
        display: { xs: 'none', sm: 'flex' }, width: '100%', maxWidth: 520, px: 1.75, py: 0.85,
        border: '1px solid', borderColor: 'divider', borderRadius: 999,
        bgcolor: 'background.default', justifyContent: 'space-between',
        '&:hover': { borderColor: 'primary.light', bgcolor: 'action.hover' },
      }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <SearchOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
            Buscar em toda a plataforma…
          </Typography>
        </Stack>
        <Chip label="Ctrl K" size="small" variant="outlined" sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem' }} />
      </ButtonBase>
      <ButtonBase aria-label="Buscar em toda a plataforma" onClick={() => setOpen(true)}
        sx={{ display: { xs: 'flex', sm: 'none' }, p: 1, borderRadius: 2, minWidth: 40, minHeight: 40 }}>
        <SearchOutlinedIcon />
      </ButtonBase>
      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth aria-labelledby="busca-global-titulo">
        <DialogTitle id="busca-global-titulo" sx={{ pb: 1 }}>Buscar em toda a plataforma</DialogTitle>
        <DialogContent sx={{ px: 0 }}>
          <Box sx={{ px: 3, pb: 2 }}>
            <TextField
              inputRef={inputRef}
              autoFocus
              fullWidth
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Cliente, CPF, placa, pedido, nota, conta ou evento…"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment> } }}
            />
          </Box>
          {search.isFetching && <LinearProgress aria-label="Buscando" />}
          <Divider />
          {query.length < 2 && recent.length > 0 && (
            <Box sx={{ px: 3, py: 2 }}>
              <Typography variant="overline" color="text.secondary">Pesquisas recentes</Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                {recent.map((term) => (
                  <Chip key={term} label={term} size="small" onClick={() => setInput(term)} />
                ))}
              </Stack>
            </Box>
          )}
          {!search.isFetching && query.length < 2 && recent.length === 0 && (
            <Typography color="text.secondary" sx={{ p: 3 }}>
              Digite ao menos dois caracteres para pesquisar nos módulos permitidos.
            </Typography>
          )}
          {search.isError && (
            <Box sx={{ p: 3 }}>
              <ErrorState message={describeError(search.error) || 'Não foi possível concluir a busca. Tente novamente.'}
                onRetry={() => void search.refetch()} />
            </Box>
          )}
          {!search.isFetching && !search.isError && search.data?.total === 0 && (
            <Typography color="text.secondary" sx={{ p: 3 }}>Nenhum resultado encontrado.</Typography>
          )}
          {!search.isError && search.data?.grupos.map((group) => (
            <Box key={group.grupo}>
              <Typography variant="overline" color="text.secondary" sx={{ px: 3, pt: 2, display: 'block' }}>{group.grupo}</Typography>
              <List disablePadding>
                {group.resultados.map((result) => {
                  const index = flat.findIndex((item) => item.tipo === result.tipo && item.id === result.id);
                  return (
                    <ListItemButton
                      key={`${result.tipo}-${result.id}`}
                      selected={index === selected}
                      onClick={() => openResult(result)}
                      sx={{ px: 3 }}
                    >
                      <ListItemText
                        primary={<Highlight text={result.titulo} term={query} />}
                        secondary={result.subtitulo ? <Highlight text={result.subtitulo} term={query} /> : undefined}
                      />
                      {result.status && <Chip label={result.status.replace(/_/g, ' ')} size="small" variant="outlined" />}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))}
          {search.isError && (
            <Box sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => void search.refetch()}>Tentar novamente</Button>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
