import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { api, describeError } from '../../api/client';
import { tenantQueryKey } from '../../api/queryKeys';
import type { Page } from '../../api/resource';
import type { ReferenceConfig } from './fieldConfig';
import { useQuickCreate } from '../../context/quickCreateCore';
import { useAuth } from '../../auth/AuthContext';
import { hasResourceActionPermission } from '../crud/resourceConfig';
import { AppDialog } from '../common/AppDialog';

export interface RefOption {
  id: number;
  [key: string]: unknown;
}

export interface ReferenceSource {
  options?: readonly RefOption[];
  list?: (term: string, signal: AbortSignal) => Promise<{ content: RefOption[]; totalElements: number }>;
  lookup?: (id: number, signal: AbortSignal) => Promise<RefOption | undefined>;
  cacheKey?: readonly unknown[];
  onCreate?: { label: string; run: () => void };
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
  source?: ReferenceSource;
  emptyText?: string;
  allowCatalogChanges?: boolean;
  /** Nome do recurso no singular (ex.: 'Cidade'), para titulos e botoes. */
  singular: string;
  value: number | null | undefined;
  onSelect: (id: number, option?: RefOption) => void;
  onClose: () => void;
}

/**
 * Seletor de referencia em dialogo: lista os registros existentes (com busca),
 * permite selecionar um e oferece um botao para cadastrar um novo. O cadastro
 * reusa o "criar na hora" (recursivo), de modo que, ao cadastrar uma Cidade,
 * pode-se abrir este mesmo seletor para o Estado e, dentro dele, para o Pais.
 */
export function ReferencePickerDialog({ open, reference, source, emptyText, allowCatalogChanges = true, singular, value, onSelect, onClose }: Props) {
  const quick = useQuickCreate();
  const queries = useQueryClient();
  const resourceConfig = quick?.configFor(reference.basePath);
  const createConfig = reference.createSeparatelyAt ? quick?.configFor(reference.createSeparatelyAt) : resourceConfig;
  const { activeOrganization, permissions } = useAuth();
  const orgId = activeOrganization?.organizationId;
  const canRead = (!!orgId || (resourceConfig && !resourceConfig.tenantAware))
    && (!resourceConfig || hasResourceActionPermission(resourceConfig, 'read', permissions))
    && (reference.readPermissions?.every((permission) => permissions.includes(permission)) ?? true);
  const canCreate = allowCatalogChanges && !!canRead && !!quick && !!createConfig && createConfig.canCreate !== false
    && hasResourceActionPermission(createConfig, 'create', permissions);
  const canEdit = allowCatalogChanges && !!quick && !!resourceConfig && resourceConfig.canEdit !== false
    && hasResourceActionPermission(resourceConfig, 'update', permissions);

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [created, setCreated] = useState(false);

  // limpa a busca sempre que o dialogo reabre
  useEffect(() => {
    if (open) {
      setSearch('');
      setDebounced('');
      setCreated(false);
    }
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const prefix = source?.cacheKey ?? (orgId ? tenantQueryKey(orgId, 'reference-picker', reference.basePath)
    : ['reference-picker', 'global', reference.basePath]);
  const { data, isFetching, isError, error, refetch } = useQuery({
    queryKey: [...prefix, debounced, reference.params],
    queryFn: ({ signal }) => source?.list
      ? source.list(debounced.trim(), signal)
      : api
        .get<Page<RefOption>>(reference.basePath, {
          params: { size: 50, [reference.searchField ?? resourceConfig?.searchFilter ?? reference.labelField]: debounced || undefined, ...reference.params },
        })
        .then((r) => r.data),
    enabled: open && !!canRead && !source?.options,
    staleTime: 30_000,
  });

  const term = (source?.options ? search : debounced).trim().toLowerCase();
  const searching = !source?.options && search !== debounced;
  const options = (source?.options ?? data?.content ?? [])
    .filter((o) => !term || (!source?.options && (source?.list || reference.searchOnServer))
      || optionLabel(o, reference).toLowerCase().includes(term))
    .sort((a, b) => optionLabel(a, reference).localeCompare(optionLabel(b, reference), 'pt-BR'));

  const nomeSingular = singular.toLowerCase();

  const handleCreate = async () => {
    if (!quick || !createConfig || !canCreate) return;
    const id = await quick.openCreate(createConfig);
    if (id != null) {
      if (reference.createSeparatelyAt) {
        setSearch('');
        setDebounced('');
        setCreated(true);
        await queries.invalidateQueries({ queryKey: prefix });
        return;
      }
      const created = await api.get<RefOption>(`${reference.basePath}/${id}`)
        .then((response) => response.data)
        .catch(() => undefined);
      onSelect(id, created);
      onClose();
    }
  };

  const handleEdit = async (option: RefOption) => {
    if (!quick || !resourceConfig || !canEdit) return;
    setEditingId(option.id);
    try {
      await quick.openEdit(resourceConfig, option.id);
    } finally {
      setEditingId(null);
    }
  };

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={`Selecionar ${nomeSingular}`}
      maxWidth="xs"
      fullScreenOnMobile
      actions={(
        <>
          {allowCatalogChanges && canRead && source?.onCreate ? (
            <Button type="button" startIcon={<AddCircleOutlineIcon />} onClick={() => {
              onClose();
              source.onCreate?.run();
            }}>{source.onCreate.label}</Button>
          ) : canCreate ? (
            <Button startIcon={<AddCircleOutlineIcon />} onClick={handleCreate}>
              Cadastrar {reference.createSeparatelyAt ? createConfig.singular.toLowerCase() : nomeSingular}
            </Button>
          ) : <span />}
          <Button onClick={onClose} color="inherit">Fechar</Button>
        </>
      )}
    >
        <TextField
          autoFocus
          disabled={!canRead}
          inputProps={{ 'aria-label': `Pesquisar ${nomeSingular}`, maxLength: reference.maxSearchLength }}
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
        {created && <Alert severity="success" sx={{ mb: 1 }}>Cadastro salvo. Selecione o registro na lista ou pesquise pelo nome.</Alert>}
        {!canRead ? <Alert severity="warning">Você não possui contexto ou permissão para consultar este cadastro.</Alert>
          : isFetching || searching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={22} />
          </Box>
        ) : isError ? <Alert severity="error" action={<Button color="inherit" onClick={() => void refetch()}>Tentar novamente</Button>}>
          {describeError(error)}
        </Alert> : options.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            {term ? 'Nenhum registro encontrado.' : emptyText ?? 'Nenhum registro encontrado.'}
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 320, overflow: 'auto' }}>
            {options.map((o) => (
              <ListItem
                key={o.id}
                disablePadding
                secondaryAction={canEdit ? (
                  <Tooltip title="Editar cadastro">
                    <span>
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label={`Editar ${optionLabel(o, reference)}`}
                        disabled={editingId !== null}
                        onClick={() => void handleEdit(o)}
                      >
                        {editingId === o.id ? <CircularProgress size={18} /> : <EditOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : undefined}
              >
                <ListItemButton
                  selected={o.id === value}
                  sx={{ pr: canEdit ? 7 : 2 }}
                  onClick={() => {
                    onSelect(o.id, o);
                    onClose();
                  }}
                >
                  <ListItemText primary={optionLabel(o, reference)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
        {!searching && !isFetching && !isError && data && data.totalElements > data.content.length && <Typography variant="caption" color="text.secondary">
          Exibindo até {data.content.length} registros. Refine a pesquisa para localizar o cadastro.
        </Typography>}
    </AppDialog>
  );
}
