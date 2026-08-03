import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import { api } from '../../api/client';
import type { Page } from '../../api/resource';
import type { ReferenceConfig } from './fieldConfig';
import { useQuickCreate } from '../../context/quickCreateCore';
import { useAuth } from '../../auth/AuthContext';
import { hasResourceActionPermission, resourceQueryKey } from '../crud/resourceConfig';

export interface RefOption {
  id: number;
  [key: string]: unknown;
}

/** Rotulo de uma opcao: campo principal e (se houver) secundario apos um traco. */
export function optionLabel(option: RefOption, ref: ReferenceConfig): string {
  const main = option[ref.labelField];
  const text = main === undefined || main === null ? `#${option.id}` : String(main);
  if (ref.secondaryField) {
    const sec = option[ref.secondaryField];
    if (sec !== undefined && sec !== null && sec !== '') return `${text} — ${sec}`;
  }
  return text;
}

interface Props {
  open: boolean;
  reference: ReferenceConfig;
  /** Nome do recurso no singular (ex.: 'Cidade'), para titulos e botoes. */
  singular: string;
  value: number | null | undefined;
  onSelect: (id: number) => void;
  onClose: () => void;
}

/**
 * Seletor de referencia em dialogo: lista os registros existentes (com busca),
 * permite selecionar um e oferece um botao para cadastrar um novo. O cadastro
 * reusa o "criar na hora" (recursivo), de modo que, ao cadastrar uma Cidade,
 * pode-se abrir este mesmo seletor para o Estado e, dentro dele, para o Pais.
 */
export function ReferencePickerDialog({ open, reference, singular, value, onSelect, onClose }: Props) {
  const quick = useQuickCreate();
  const createConfig = quick?.configFor(reference.basePath);
  const { activeOrganization, permissions } = useAuth();
  const canCreate = !!quick && !!createConfig && createConfig.canCreate !== false
    && hasResourceActionPermission(createConfig, 'create', permissions);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // limpa a busca sempre que o dialogo reabre
  useEffect(() => {
    if (open) {
      setSearch('');
      setDebounced('');
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: createConfig
      ? resourceQueryKey(
        createConfig,
        activeOrganization?.organizationId,
        'reference-picker',
        reference.basePath,
        debounced,
        reference.params,
      )
      : ['reference-picker', reference.basePath, debounced, reference.params],
    queryFn: () =>
      api
        .get<Page<RefOption>>(reference.basePath, {
          params: { size: 50, nome: debounced || undefined, ...reference.params },
        })
        .then((r) => r.data.content),
    enabled: open,
    staleTime: 30_000,
  });

  const term = debounced.trim().toLowerCase();
  const options = (data ?? [])
    .filter((o) => !term || optionLabel(o, reference).toLowerCase().includes(term))
    .sort((a, b) => optionLabel(a, reference).localeCompare(optionLabel(b, reference), 'pt-BR'));

  const nomeSingular = singular.toLowerCase();

  const handleCreate = async () => {
    if (!quick || !createConfig) return;
    const id = await quick.openCreate(createConfig);
    if (id != null) {
      onSelect(id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Selecionar {nomeSingular}</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder={`Pesquisar ${nomeSingular}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1 }}
        />
        {isFetching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={22} />
          </Box>
        ) : options.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            Nenhum registro encontrado.
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
            {options.map((o) => (
              <ListItemButton
                key={o.id}
                selected={o.id === value}
                onClick={() => {
                  onSelect(o.id);
                  onClose();
                }}
              >
                <ListItemText primary={optionLabel(o, reference)} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        {canCreate ? (
          <Button startIcon={<AddCircleOutlineIcon />} onClick={handleCreate}>
            Cadastrar {nomeSingular}
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onClose} color="inherit">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
