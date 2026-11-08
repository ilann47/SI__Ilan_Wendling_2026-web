import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Alert, Box, Button, Card, Chip, Stack, useMediaQuery } from '@mui/material';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { useTheme } from '@mui/material/styles';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { describeError } from '../api/client';
import { inboundNotesApi, inboundNoteVersion } from '../api/inboundNotes';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { FilterBar } from '../components/crud/FilterBar';
import type { FilterConfig } from '../components/crud/resourceConfig';
import { hasResourceActionPermission } from '../components/crud/resourceConfig';
import { AppliedFilterChips } from '../components/listing/AppliedFilterChips';
import { EmptyState, EmptyStateAction } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingCards } from '../components/listing/ListingCards';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { countAppliedFilters, formatDetailValue } from '../components/listing/listingUtils';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { SecondaryActionsMenu, type SecondaryAction } from '../components/listing/SecondaryActionsMenu';
import { useSnackbar } from '../components/SnackbarProvider';
import { notaEntradaConfig } from '../resources/fiscal';
import type { NotaEntradaResponse } from '../types';
import { formatCurrencyMicros, formatDate } from '../utils/format';

const gridLocale = ptBR.components.MuiDataGrid.defaultProps.localeText;

const situacaoFilter: FilterConfig = {
  name: 'situacao',
  label: 'Situação',
  type: 'select',
  options: [
    { value: 'PENDENTE', label: 'Rascunho' },
    { value: 'CONFIRMADA', label: 'Confirmada' },
    { value: 'CANCELADA', label: 'Cancelada ou revertida' },
  ],
};

const noteStatus = (row: NotaEntradaResponse) => row.revertidaEm
  ? <Chip size="small" color="warning" label="Revertida" />
  : <StatusChip status={row.situacao} />;

function key(organizationId: number, ...parts: readonly unknown[]) {
  return tenantQueryKey(organizationId, 'notas-entrada', ...parts);
}

export function InboundNotesPage() {
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('numero') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(params.get('numero') ?? '');
  const [filters, setFilters] = useState<Record<string, unknown>>({ situacao: params.get('situacao') ?? '', fornecedorId: params.get('fornecedorId') ?? '' });
  const [cancelling, setCancelling] = useState<NotaEntradaResponse | null>(null);
  const [deleting, setDeleting] = useState<NotaEntradaResponse | null>(null);

  const canRead = permissions.includes('fiscal:read');
  const canCreate = hasResourceActionPermission(notaEntradaConfig, 'create', permissions);
  const canManage = permissions.includes('fiscal:manage');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryFilters = useMemo(() => {
    const next = { ...filters };
    if (debouncedSearch) next.numero = debouncedSearch;
    return next;
  }, [debouncedSearch, filters]);

  const list = useQuery({
    queryKey: organizationId
      ? key(organizationId, 'list', pagination, queryFilters)
      : ['notas-entrada'],
    queryFn: () => inboundNotesApi.list({
      page: pagination.page,
      size: pagination.pageSize,
      sort: 'dataEmissao,desc',
      ...queryFilters,
    }),
    enabled: !!organizationId && canRead,
    placeholderData: (previous, query) => query?.queryKey[1] === organizationId ? keepPreviousData(previous) : undefined,
  });

  const invalidate = () => organizationId
    && queryClient.invalidateQueries({ queryKey: ['tenant', organizationId] });
  const failure = (error: unknown) => notify(describeError(error), 'error');

  const cancelMutation = useMutation({
    mutationFn: (note: NotaEntradaResponse) => inboundNotesApi.cancel(note.id, inboundNoteVersion(note)),
    onSuccess: () => {
      setCancelling(null);
      notify('Nota de entrada cancelada.', 'success');
      void invalidate();
    },
    onError: failure,
  });
  const deleteMutation = useMutation({
    mutationFn: (note: NotaEntradaResponse) => inboundNotesApi.deleteDraft(note.id, inboundNoteVersion(note)),
    onSuccess: () => {
      setDeleting(null);
      notify('Nota de entrada excluída.', 'success');
      void invalidate();
    },
    onError: failure,
  });

  if (!organizationId || !canRead) {
    return <Alert severity="warning">Seu contexto não possui permissão fiscal de leitura.</Alert>;
  }

  const rows = list.data?.content ?? [];
  const appliedFilters = {
    ...filters,
    ...(debouncedSearch ? { numero: debouncedSearch } : {}),
  };
  const appliedCount = countAppliedFilters(filters);
  const clearFilters = () => {
    setFilters({}); setParams({});
    setSearch('');
    setDebouncedSearch('');
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const removeFilter = (name: string) => {
    if (name === 'numero') {
      setSearch('');
      setDebouncedSearch('');
    }
    setFilters((current) => ({ ...current, [name]: undefined }));
    setParams((current) => { const next = new URLSearchParams(current); next.delete(name); return next; }, { replace: true });
    setPagination((current) => ({ ...current, page: 0 }));
  };

  const rowActions = (row: NotaEntradaResponse): SecondaryAction[] => {
    const actions: SecondaryAction[] = [];
    if (canManage && row.situacao === 'PENDENTE') {
      actions.push({
        key: 'confirmar',
        label: 'Conferir / editar rascunho',
        icon: <CheckCircleOutlineIcon fontSize="small" />,
        onClick: () => navigate(`/app/notas-entrada/${row.id}/editar`),
      });
      actions.push({
        key: 'cancelar',
        label: 'Cancelar',
        icon: <CancelOutlinedIcon fontSize="small" />,
        danger: true,
        onClick: () => setCancelling(row),
      });
    }
    if (canManage && row.situacao !== 'CONFIRMADA' && !row.revertidaEm) {
      actions.push({
        key: 'excluir',
        label: 'Excluir',
        icon: <DeleteOutlineIcon fontSize="small" />,
        danger: true,
        onClick: () => setDeleting(row),
      });
    }
    return actions;
  };

  const columns: GridColDef<NotaEntradaResponse>[] = [
    { field: 'numero', headerName: 'Número', width: 120 },
    { field: 'serie', headerName: 'Série', width: 85 },
    { field: 'modelo', headerName: 'Modelo', width: 90 },
    { field: 'fornecedorNome', headerName: 'Fornecedor', flex: 1, minWidth: 160 },
    {
      field: 'dataEmissao',
      headerName: 'Emissão',
      width: 120,
      valueFormatter: (value) => formatDate(value as string),
    },
    {
      field: 'valorTotal',
      headerName: 'Total',
      width: 130,
      align: 'right',
      headerAlign: 'right',
      valueFormatter: (value) => formatCurrencyMicros(value as number),
    },
    {
      field: 'situacao',
      headerName: 'Situação',
      width: 140,
      renderCell: ({ row }) => noteStatus(row),
    },
    {
      field: '__actions',
      headerName: 'Ações',
      width: 72,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => <SecondaryActionsMenu actions={rowActions(params.row)} />,
    },
  ];

  const openCreate = () => navigate('/app/notas-entrada/nova');
  const openDetail = (row: NotaEntradaResponse) => navigate(`/app/notas-entrada/${row.id}`);

  const chipFilters: FilterConfig[] = [
    { name: 'numero', label: 'Número', type: 'text' },
    situacaoFilter,
    { name: 'fornecedorId', label: 'Fornecedor', type: 'select', options: [{ value: String(filters.fornecedorId ?? ''), label: 'Selecionado no filtro' }] },
  ];

  return (
    <Box>
      <PageHeader
        title="Notas de Entrada"
        subtitle={notaEntradaConfig.subtitle}
        count={list.data?.totalElements}
        action={<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button startIcon={<UploadFileOutlinedIcon />} onClick={() => navigate('/app/notas-entrada/importar')}>
            {canManage ? 'Importar XML' : 'Consultar importações'}
          </Button>
          {canCreate && <PrimaryButton startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            Nova nota
          </PrimaryButton>}
        </Stack>}
      />
      <ListingToolbar
        searchValue={search}
        searchLabel="Buscar por número"
        onSearchChange={(value) => {
          setSearch(value);
          setParams((current) => { const next = new URLSearchParams(current); if (value.trim()) next.set('numero', value.trim()); else next.delete('numero'); return next; }, { replace: true });
          setPagination((current) => ({ ...current, page: 0 }));
        }}
        filterForm={(
          <FilterBar
            filters={[situacaoFilter, ...(permissions.includes('suppliers:read') ? [{ name: 'fornecedorId', label: 'Fornecedor', type: 'reference' as const, reference: { basePath: '/api/fornecedores', labelField: 'nome' } }] : [])]}
            values={filters}
            onChange={(value) => {
              setFilters(value);
              setParams((current) => { const next = new URLSearchParams(current); for (const field of ['situacao', 'fornecedorId']) { if (value[field]) next.set(field, String(value[field])); else next.delete(field); } return next; }, { replace: true });
              setPagination((current) => ({ ...current, page: 0 }));
            }}
          />
        )}
        appliedCount={appliedCount}
        onClear={clearFilters}
      />
      <AppliedFilterChips
        filters={chipFilters}
        values={appliedFilters}
        onRemove={removeFilter}
        onClear={clearFilters}
      />

      {list.isError && (
        <Box sx={{ mb: 2 }}>
          <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />
        </Box>
      )}
      {list.isLoading && !list.data && <ListingSkeleton />}
      {!list.isLoading && !list.isError && rows.length === 0 && (
        <EmptyState
          title="Nenhuma nota de entrada encontrada"
          description={appliedCount > 0 || debouncedSearch
            ? 'Nenhum registro corresponde aos filtros atuais.'
            : 'Ainda não há notas de entrada neste contexto.'}
          action={canCreate && !debouncedSearch && appliedCount === 0
            ? <EmptyStateAction label="Nova nota" onClick={openCreate} />
            : undefined}
        />
      )}
      {rows.length > 0 && (
        <>
          <ListingCards
            rows={rows}
            getKey={(row) => row.id}
            getTitle={(row) => row.numero}
            getFields={(row) => [
              { label: 'Fornecedor', value: formatDetailValue(row.fornecedorNome) },
              { label: 'Série / modelo', value: `${row.serie} / ${row.modelo}` },
              { label: 'Emissão', value: formatDate(row.dataEmissao) },
              { label: 'Total', value: formatCurrencyMicros(row.valorTotal) },
              { label: 'Situação', value: noteStatus(row) },
            ]}
            getActions={rowActions}
            onOpen={openDetail}
          />
          <Card sx={{ display: { xs: 'none', md: 'block' } }}>
            <DataGrid
              autoHeight
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              loading={list.isFetching}
              localeText={gridLocale}
              rowCount={list.data?.totalElements ?? 0}
              paginationMode="server"
              paginationModel={pagination}
              onPaginationModelChange={setPagination}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              disableColumnMenu
              onRowClick={(params) => openDetail(params.row)}
              sx={{
                border: 0,
                '--DataGrid-overlayHeight': '280px',
                '& .MuiDataGrid-columnHeaders': { position: 'sticky', top: 0, zIndex: 1 },
                '& .MuiDataGrid-row': { cursor: 'pointer' },
              }}
            />
          </Card>
          {isMobile && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <PrimaryButton
                variant="outlined"
                color="inherit"
                fullWidth
                disabled={pagination.page === 0}
                onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
              >
                Anterior
              </PrimaryButton>
              <PrimaryButton
                variant="outlined"
                color="inherit"
                fullWidth
                disabled={list.data?.last ?? true}
                onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
              >
                Próxima
              </PrimaryButton>
            </Stack>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!cancelling}
        title="Cancelar nota de entrada"
        message="Cancelar esta nota pendente?"
        confirmLabel="Cancelar nota"
        confirmColor="error"
        loading={cancelMutation.isPending}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancelMutation.mutate(cancelling)}
      />
      <ConfirmDialog
        open={!!deleting}
        title="Excluir nota de entrada"
        message="Excluir permanentemente esta nota de entrada?"
        confirmLabel="Excluir"
        confirmColor="error"
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </Box>
  );
}
