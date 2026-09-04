import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { Box, Card, Stack, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
} from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { describeError } from '../../api/client';
import {
  createResourceApi,
  isResourcePreconditionConflict,
  type Page,
  type PageParams,
} from '../../api/resource';
import { useAuth } from '../../auth/AuthContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PageHeader } from '../common/PageHeader';
import { ResourceFormDialog } from '../form/ResourceFormDialog';
import { AppliedFilterChips } from '../listing/AppliedFilterChips';
import { DetailDrawer } from '../listing/DetailDrawer';
import { EmptyState, EmptyStateAction } from '../listing/EmptyState';
import { ErrorState } from '../listing/ErrorState';
import { ListingCards } from '../listing/ListingCards';
import { ListingSkeleton } from '../listing/ListingSkeleton';
import { ListingToolbar } from '../listing/ListingToolbar';
import { countAppliedFilters, formatDetailValue, primarySearchFilter } from '../listing/listingUtils';
import { PrimaryButton } from '../listing/PrimaryButton';
import { ResourceDetailBody } from '../listing/ResourceDetailBody';
import { SecondaryActionsMenu, type SecondaryAction } from '../listing/SecondaryActionsMenu';
import { useSnackbar } from '../SnackbarProvider';
import { ActionRunner } from './ActionRunner';
import { FilterBar } from './FilterBar';
import {
  hasResourceActionPermission,
  resourceQueryKey,
  type FilterConfig,
  type ResourceConfig,
  type RowAction,
} from './resourceConfig';

const gridLocale = ptBR.components.MuiDataGrid.defaultProps.localeText;

const idFilter: FilterConfig = { name: 'id', label: 'ID', type: 'number' };

type ResourceRow = Record<string, unknown> & { id: number };

function pageVazia(size: number): Page<ResourceRow> {
  return {
    content: [], totalElements: 0, totalPages: 0, number: 0, size,
    first: true, last: true, numberOfElements: 0, empty: true,
  };
}

function pageUnica(row: ResourceRow, size: number): Page<ResourceRow> {
  return {
    content: [row], totalElements: 1, totalPages: 1, number: 0, size,
    first: true, last: true, numberOfElements: 1, empty: false,
  };
}

function asRow(value: unknown): ResourceRow | null {
  if (!value || typeof value !== 'object' || !('id' in value)) return null;
  const id = Number((value as { id: unknown }).id);
  if (!Number.isFinite(id)) return null;
  return { ...(value as Record<string, unknown>), id };
}

export function CrudResourcePage({ config }: { config: ResourceConfig }) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const { activeOrganization, permissions } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const resource = useMemo(() => createResourceApi<ResourceRow, Record<string, unknown>>(config.basePath), [config.basePath]);

  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editConflict, setEditConflict] = useState<string | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [reloadingEdit, setReloadingEdit] = useState(false);
  const [deleting, setDeleting] = useState<ResourceRow | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const [running, setRunning] = useState<{ action: RowAction; row: ResourceRow } | null>(null);
  const [detail, setDetail] = useState<ResourceRow | null>(null);

  const canCreate = config.canCreate !== false
    && hasResourceActionPermission(config, 'create', permissions);
  const canEdit = config.canEdit !== false
    && hasResourceActionPermission(config, 'update', permissions);
  const canDelete = config.canDelete !== false
    && hasResourceActionPermission(config, 'delete', permissions);

  const filtersWithId = useMemo<FilterConfig[]>(
    () => [idFilter, ...(config.filters ?? [])],
    [config.filters],
  );
  const searchFilter = useMemo(
    () => config.searchFilter
      ? filtersWithId.find((filter) => filter.name === config.searchFilter)
      : primarySearchFilter(filtersWithId),
    [config.searchFilter, filtersWithId],
  );
  const advancedFilters = useMemo(
    () => filtersWithId.filter((filter) => filter.name !== searchFilter?.name),
    [filtersWithId, searchFilter],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryFilters = useMemo(() => {
    const next = { ...filters };
    if (searchFilter && debouncedSearch) next[searchFilter.name] = debouncedSearch;
    return next;
  }, [debouncedSearch, filters, searchFilter]);

  const params: PageParams = {
    page: pagination.page,
    size: pagination.pageSize,
    ...(config.defaultSort ? { sort: config.defaultSort } : {}),
    ...queryFilters,
  };

  const buscaId = queryFilters.id != null && `${queryFilters.id}`.trim() !== ''
    ? `${queryFilters.id}`.trim() : null;

  const listQuery = useQuery({
    queryKey: resourceQueryKey(
      config,
      activeOrganization?.organizationId,
      'list',
      config.basePath,
      pagination,
      queryFilters,
    ),
    queryFn: async (): Promise<Page<ResourceRow>> => {
      if (buscaId !== null) {
        const numId = Number(buscaId);
        if (!Number.isInteger(numId) || numId <= 0) return pageVazia(pagination.pageSize);
        try {
          const row = asRow(await resource.get(numId));
          return row ? pageUnica(row, pagination.pageSize) : pageVazia(pagination.pageSize);
        } catch {
          return pageVazia(pagination.pageSize);
        }
      }
      const page = await resource.list(params);
      return { ...page, content: page.content.map((row) => asRow(row)).filter((row): row is ResourceRow => !!row) };
    },
    placeholderData: keepPreviousData,
  });

  const detailQuery = useQuery({
    queryKey: resourceQueryKey(config, activeOrganization?.organizationId, 'detail', config.basePath, detail?.id),
    queryFn: async () => {
      const row = asRow(await resource.get(detail!.id));
      return row ?? detail;
    },
    enabled: detail !== null,
  });

  const invalidate = () => queryClient.invalidateQueries({
    queryKey: resourceQueryKey(config, activeOrganization?.organizationId, 'list', config.basePath),
  });

  const expectedVersion = (version: number | null) => {
    if (version === null) throw new Error('A versão esperada do recurso não está disponível.');
    return version;
  };

  const loadEditing = async (row: ResourceRow) => {
    if (!config.optimisticLocking) {
      setEditing(row);
      setEditingVersion(null);
      setEditConflict(null);
      setFormOpen(true);
      return;
    }
    try {
      const current = await resource.getVersioned(row.id);
      const next = asRow(current.data);
      if (!next) throw new Error('Registro inválido.');
      setEditing(next);
      setEditingVersion(current.version);
      setEditConflict(null);
      setFormRevision((revision) => revision + 1);
      setFormOpen(true);
    } catch (error) {
      notify(describeError(error), 'error');
    }
  };

  const reloadEditing = async () => {
    if (!editing) return;
    setReloadingEdit(true);
    try {
      const current = await resource.getVersioned(editing.id);
      const next = asRow(current.data);
      if (!next) throw new Error('Registro inválido.');
      setEditing(next);
      setEditingVersion(current.version);
      setEditConflict(null);
      setFormRevision((revision) => revision + 1);
    } catch (error) {
      notify(describeError(error), 'error');
    } finally {
      setReloadingEdit(false);
    }
  };

  const loadDeleting = async (row: ResourceRow) => {
    if (!config.optimisticLocking) {
      setDeleting(row);
      setDeletingVersion(null);
      setDeleteConflict(false);
      return;
    }
    try {
      const current = await resource.getVersioned(row.id);
      const next = asRow(current.data);
      if (!next) throw new Error('Registro inválido.');
      setDeleting(next);
      setDeletingVersion(current.version);
      setDeleteConflict(false);
    } catch (error) {
      notify(describeError(error), 'error');
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (editing) {
        if (config.optimisticLocking) {
          await resource.updateVersioned(editing.id, values, expectedVersion(editingVersion));
        } else {
          await resource.update(editing.id, values);
        }
        return;
      }
      if (config.optimisticLocking) {
        await resource.createVersioned(values);
      } else {
        await resource.create(values);
      }
    },
    onSuccess: () => {
      notify(`${config.singular} salvo com sucesso.`, 'success');
      setFormOpen(false);
      setEditing(null);
      setEditingVersion(null);
      setEditConflict(null);
      invalidate();
    },
    onError: (error) => {
      if (config.optimisticLocking && editing && isResourcePreconditionConflict(error)) {
        setEditConflict(
          'Este registro foi alterado desde que você abriu o formulário. Recarregue os dados antes de tentar novamente.',
        );
        void invalidate();
        return;
      }
      notify(describeError(error), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (row: ResourceRow) => config.optimisticLocking
      ? resource.removeVersioned(row.id, expectedVersion(deletingVersion))
      : resource.remove(row.id),
    onSuccess: () => {
      notify(`${config.singular} excluído.`, 'success');
      setDeleting(null);
      setDeletingVersion(null);
      setDeleteConflict(false);
      setDetail(null);
      invalidate();
    },
    onError: async (error) => {
      if (config.optimisticLocking && deleting && isResourcePreconditionConflict(error)) {
        notify(describeError(error), 'warning');
        try {
          const current = await resource.getVersioned(deleting.id);
          const next = asRow(current.data);
          if (!next) throw new Error('Registro inválido.');
          setDeleting(next);
          setDeletingVersion(current.version);
          setDeleteConflict(true);
          void invalidate();
        } catch (reloadError) {
          notify(describeError(reloadError), 'error');
          setDeleting(null);
          setDeletingVersion(null);
          setDeleteConflict(false);
        }
        return;
      }
      notify(describeError(error), 'error');
      setDeleting(null);
      setDeletingVersion(null);
      setDeleteConflict(false);
    },
  });

  const visibleActions = (row: ResourceRow): SecondaryAction[] => {
    const items: SecondaryAction[] = [];
    if (canEdit) {
      items.push({
        key: 'edit',
        label: 'Editar',
        icon: <EditOutlinedIcon fontSize="small" />,
        onClick: () => void loadEditing(row),
      });
    }
    (config.rowActions ?? []).forEach((action) => {
      if (action.visible && !action.visible(row)) return;
      items.push({
        key: action.key,
        label: action.label,
        icon: action.icon,
        danger: action.color === 'error',
        onClick: () => setRunning({ action, row }),
      });
    });
    if (canDelete) {
      items.push({
        key: 'delete',
        label: 'Excluir',
        icon: <DeleteOutlineIcon fontSize="small" />,
        danger: true,
        onClick: () => void loadDeleting(row),
      });
    }
    return items;
  };

  const actionsCol: GridColDef = {
    field: '__actions',
    headerName: 'Ações',
    width: 72,
    sortable: false,
    filterable: false,
    disableColumnMenu: true,
    align: 'right',
    headerAlign: 'right',
    renderCell: (params) => (
      <SecondaryActionsMenu actions={visibleActions(params.row as ResourceRow)} />
    ),
  };
  const temIdCol = config.columns.some((column) => column.field === 'id');
  const columns: GridColDef[] = temIdCol
    ? [...config.columns, actionsCol]
    : [{ field: 'id', headerName: 'ID', width: 80 } as GridColDef, ...config.columns, actionsCol];

  const rows = listQuery.data?.content ?? [];
  const appliedFilters = { ...filters, ...(searchFilter && debouncedSearch ? { [searchFilter.name]: debouncedSearch } : {}) };
  const appliedCount = countAppliedFilters(filters);
  const clearFilters = () => {
    setFilters({});
    setSearch('');
    setDebouncedSearch('');
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const removeFilter = (name: string) => {
    if (name === searchFilter?.name) {
      setSearch('');
      setDebouncedSearch('');
    }
    setFilters((current) => ({ ...current, [name]: undefined }));
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const openCreate = () => {
    setEditing(null);
    setEditingVersion(null);
    setEditConflict(null);
    setFormOpen(true);
  };
  const cardFields = (row: ResourceRow) => config.columns
    .filter((column) => column.field !== 'id' && column.field !== '__actions')
    .slice(0, 4)
    .map((column) => ({
      label: String(column.headerName ?? column.field),
      value: formatDetailValue(row[column.field], column.field),
    }));

  const initialValues = editing ? (config.toFormValues ? config.toFormValues(editing) : editing) : null;
  const detailRow = detailQuery.data ?? detail;

  return (
    <Box>
      <PageHeader
        title={config.plural}
        subtitle={config.subtitle}
        count={listQuery.data?.totalElements}
        action={canCreate ? (
          <PrimaryButton startIcon={<AddIcon />} onClick={openCreate}>
            Novo {config.singular.toLowerCase()}
          </PrimaryButton>
        ) : undefined}
      />

      <ListingToolbar
        searchValue={search}
        searchLabel={searchFilter ? `Buscar por ${searchFilter.label.toLowerCase()}` : 'Buscar'}
        onSearchChange={(value) => {
          setSearch(value);
          setPagination((current) => ({ ...current, page: 0 }));
        }}
        filterForm={<FilterBar filters={advancedFilters} values={filters} onChange={(value) => {
          setFilters(value);
          setPagination((current) => ({ ...current, page: 0 }));
        }} />}
        appliedCount={appliedCount}
        onClear={clearFilters}
      />
      <AppliedFilterChips
        filters={filtersWithId}
        values={appliedFilters}
        onRemove={removeFilter}
        onClear={clearFilters}
      />

      {listQuery.isError && (
        <Box sx={{ mb: 2 }}>
          <ErrorState message={describeError(listQuery.error)} onRetry={() => void listQuery.refetch()} />
        </Box>
      )}
      {listQuery.isLoading && !listQuery.data && <ListingSkeleton />}
      {!listQuery.isLoading && !listQuery.isError && rows.length === 0 && (
        <EmptyState
          title={`Nenhum ${config.singular.toLowerCase()} encontrado`}
          description={appliedCount > 0 || debouncedSearch
            ? 'Nenhum registro corresponde aos filtros atuais.'
            : `Ainda não há ${config.plural.toLowerCase()} neste contexto.`}
          action={canCreate && !debouncedSearch && appliedCount === 0
            ? <EmptyStateAction label={`Novo ${config.singular.toLowerCase()}`} onClick={openCreate} />
            : undefined}
        />
      )}
      {rows.length > 0 && (
        <>
          <ListingCards
            rows={rows}
            getKey={(row) => row.id}
            getTitle={(row) => String(row.nome ?? row.numero ?? row.placa ?? row.descricao ?? `#${row.id}`)}
            getFields={cardFields}
            getActions={visibleActions}
            onOpen={setDetail}
          />
          <Card sx={{ display: { xs: 'none', md: 'block' } }}>
            <DataGrid
              autoHeight
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
              loading={listQuery.isFetching}
              localeText={gridLocale}
              rowCount={listQuery.data?.totalElements ?? 0}
              paginationMode="server"
              sortingMode="server"
              paginationModel={pagination}
              onPaginationModelChange={setPagination}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              disableColumnMenu
              onRowClick={(params) => setDetail(params.row as ResourceRow)}
              sx={{
                border: 0,
                '--DataGrid-overlayHeight': '280px',
                '& .MuiDataGrid-columnHeaders': { position: 'sticky', top: 0, zIndex: 1 },
                '& .MuiDataGrid-row': { cursor: 'pointer' },
              }}
            />
          </Card>
          {isMobile && (
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
              <PrimaryButton
                variant="outlined"
                color="inherit"
                disabled={pagination.page === 0}
                onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
              >
                Anterior
              </PrimaryButton>
              <PrimaryButton
                variant="outlined"
                color="inherit"
                disabled={(listQuery.data?.last ?? true)}
                onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
              >
                Próxima
              </PrimaryButton>
            </Stack>
          )}
        </>
      )}

      <DetailDrawer
        open={!!detail}
        title={detail ? `${config.singular} #${detail.id}` : config.singular}
        subtitle={detail ? String(detail.nome ?? detail.numero ?? detail.placa ?? '') : undefined}
        onClose={() => setDetail(null)}
        actions={detail ? (
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {visibleActions(detail).map((action) => (
              <PrimaryButton
                key={action.key}
                variant={action.danger ? 'outlined' : 'contained'}
                color={action.danger ? 'error' : 'primary'}
                onClick={action.onClick}
              >
                {action.label}
              </PrimaryButton>
            ))}
          </Stack>
        ) : undefined}
      >
        {detailRow && (
          <ResourceDetailBody
            row={detailRow}
            unavailable={config.unavailableRelations ?? []}
          />
        )}
      </DetailDrawer>

      <ResourceFormDialog
        open={formOpen}
        title={editing ? `Editar ${config.singular}` : `Novo ${config.singular}`}
        fields={config.fields}
        initialValues={initialValues}
        submitting={saveMutation.isPending}
        conflictMessage={editConflict}
        onReload={config.optimisticLocking && editing ? () => void reloadEditing() : undefined}
        reloading={reloadingEdit}
        resetKey={formRevision}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setEditingVersion(null);
          setEditConflict(null);
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
      />

      <ConfirmDialog
        open={!!deleting}
        title={`Excluir ${config.singular}`}
        message={deleteConflict
          ? 'Este registro foi alterado. A versão atual foi recarregada; revise e confirme novamente a exclusão.'
          : 'Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.'}
        confirmLabel={deleteConflict ? 'Tentar novamente' : 'Excluir'}
        confirmColor="error"
        loading={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onClose={() => {
          setDeleting(null);
          setDeletingVersion(null);
          setDeleteConflict(false);
        }}
      />

      {running && (
        <ActionRunner
          basePath={config.basePath}
          action={running.action}
          row={running.row}
          onClose={() => setRunning(null)}
          onDone={() => {
            setRunning(null);
            invalidate();
          }}
        />
      )}
    </Box>
  );
}
