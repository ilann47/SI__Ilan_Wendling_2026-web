import { type ReactElement, useMemo, useState } from 'react';
import { Box, Button, Card } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  DataGrid,
  GridActionsCellItem,
  type GridActionsCellItemProps,
  type GridColDef,
} from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { describeError } from '../../api/client';
import {
  createResourceApi,
  isResourcePreconditionConflict,
  type Page,
  type PageParams,
} from '../../api/resource';
import { useSnackbar } from '../SnackbarProvider';
import { ResourceFormDialog } from '../form/ResourceFormDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { PageHeader } from '../common/PageHeader';
import { FilterBar } from './FilterBar';
import { ActionRunner } from './ActionRunner';
import {
  hasResourceActionPermission,
  resourceQueryKey,
  type FilterConfig,
  type ResourceConfig,
  type RowAction,
} from './resourceConfig';
import { useAuth } from '../../auth/AuthContext';

const gridLocale = ptBR.components.MuiDataGrid.defaultProps.localeText;

/** Filtro de ID disponivel em todas as listagens (busca o registro exato). */
const idFilter: FilterConfig = { name: 'id', label: 'ID', type: 'number' };

function pageVazia(size: number): Page<any> {
  return { content: [], totalElements: 0, totalPages: 0, number: 0, size, first: true, last: true, numberOfElements: 0, empty: true };
}

function pageUnica(row: any, size: number): Page<any> {
  return { content: [row], totalElements: 1, totalPages: 1, number: 0, size, first: true, last: true, numberOfElements: 1, empty: false };
}

export function CrudResourcePage({ config }: { config: ResourceConfig }) {
  const queryClient = useQueryClient();
  const { notify } = useSnackbar();
  const { activeOrganization, permissions } = useAuth();
  const resource = useMemo(() => createResourceApi<any, any>(config.basePath), [config.basePath]);

  const [pagination, setPagination] = useState({ page: 0, pageSize: 10 });
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [editingVersion, setEditingVersion] = useState<number | null>(null);
  const [editConflict, setEditConflict] = useState<string | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [reloadingEdit, setReloadingEdit] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, any> | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);
  const [deleteConflict, setDeleteConflict] = useState(false);
  const [running, setRunning] = useState<{ action: RowAction; row: Record<string, any> } | null>(null);

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

  const params: PageParams = {
    page: pagination.page,
    size: pagination.pageSize,
    ...(config.defaultSort ? { sort: config.defaultSort } : {}),
    ...filters,
  };

  const buscaId = filters.id != null && `${filters.id}`.trim() !== '' ? `${filters.id}`.trim() : null;

  const { data, isFetching } = useQuery({
    queryKey: resourceQueryKey(
      config,
      activeOrganization?.organizationId,
      'list',
      config.basePath,
      pagination,
      filters,
    ),
    queryFn: async (): Promise<Page<any>> => {
      // Busca por ID: retorna exatamente aquele registro (todo recurso tem GET /{id}).
      if (buscaId !== null) {
        const numId = Number(buscaId);
        if (!Number.isInteger(numId) || numId <= 0) return pageVazia(pagination.pageSize);
        try {
          const row = await resource.get(numId);
          return pageUnica(row, pagination.pageSize);
        } catch {
          return pageVazia(pagination.pageSize);
        }
      }
      return resource.list(params);
    },
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({
    queryKey: resourceQueryKey(
      config,
      activeOrganization?.organizationId,
      'list',
      config.basePath,
    ),
  });

  const expectedVersion = (version: number | null) => {
    if (version === null) throw new Error('A versao esperada do recurso nao esta disponivel.');
    return version;
  };

  const loadEditing = async (row: Record<string, any>) => {
    if (!config.optimisticLocking) {
      setEditing(row);
      setEditingVersion(null);
      setEditConflict(null);
      setFormOpen(true);
      return;
    }
    try {
      const current = await resource.getVersioned(row.id);
      setEditing(current.data);
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
      setEditing(current.data);
      setEditingVersion(current.version);
      setEditConflict(null);
      setFormRevision((revision) => revision + 1);
    } catch (error) {
      notify(describeError(error), 'error');
    } finally {
      setReloadingEdit(false);
    }
  };

  const loadDeleting = async (row: Record<string, any>) => {
    if (!config.optimisticLocking) {
      setDeleting(row);
      setDeletingVersion(null);
      setDeleteConflict(false);
      return;
    }
    try {
      const current = await resource.getVersioned(row.id);
      setDeleting(current.data);
      setDeletingVersion(current.version);
      setDeleteConflict(false);
    } catch (error) {
      notify(describeError(error), 'error');
    }
  };

  const saveMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      if (editing) {
        return config.optimisticLocking
          ? resource.updateVersioned(editing.id, values, expectedVersion(editingVersion))
          : resource.update(editing.id, values);
      }
      return config.optimisticLocking
        ? resource.createVersioned(values)
        : resource.create(values);
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
          'Este registro foi alterado desde que voce abriu o formulario. Recarregue os dados antes de tentar novamente.',
        );
        void invalidate();
        return;
      }
      notify(describeError(error), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (row: Record<string, any>) => config.optimisticLocking
      ? resource.removeVersioned(row.id, expectedVersion(deletingVersion))
      : resource.remove(row.id),
    onSuccess: () => {
      notify(`${config.singular} excluído.`, 'success');
      setDeleting(null);
      setDeletingVersion(null);
      setDeleteConflict(false);
      invalidate();
    },
    onError: async (error) => {
      if (config.optimisticLocking && deleting && isResourcePreconditionConflict(error)) {
        notify(describeError(error), 'warning');
        try {
          const current = await resource.getVersioned(deleting.id);
          setDeleting(current.data);
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

  const columns: GridColDef[] = (() => {
    const actionCount = (config.rowActions?.length ?? 0) + (canEdit ? 1 : 0) + (canDelete ? 1 : 0);
    const actionsCol: GridColDef = {
      field: '__actions',
      type: 'actions',
      headerName: 'Ações',
      width: Math.max(80, 44 + actionCount * 8),
      getActions: (p) => {
        const items: ReactElement<GridActionsCellItemProps>[] = [];
        if (canEdit) {
          items.push(
            <GridActionsCellItem
              key="edit"
              icon={<EditOutlinedIcon />}
              label="Editar"
              onClick={() => void loadEditing(p.row)}
            />,
          );
        }
        (config.rowActions ?? []).forEach((a) => {
          if (a.visible && !a.visible(p.row)) return;
          items.push(
            <GridActionsCellItem
              key={a.key}
              icon={a.icon ?? <span />}
              label={a.label}
              showInMenu
              onClick={() => setRunning({ action: a, row: p.row })}
            />,
          );
        });
        if (canDelete) {
          items.push(
            <GridActionsCellItem
              key="delete"
              icon={<DeleteOutlineIcon />}
              label="Excluir"
              showInMenu
              onClick={() => void loadDeleting(p.row)}
            />,
          );
        }
        return items;
      },
    };
    const temIdCol = config.columns.some((c) => c.field === 'id');
    const colunas = temIdCol
      ? config.columns
      : [{ field: 'id', headerName: 'ID', width: 80 } as GridColDef, ...config.columns];
    return [...colunas, actionsCol];
  })();

  const initialValues = editing ? (config.toFormValues ? config.toFormValues(editing) : editing) : null;

  return (
    <Box>
      <PageHeader
        title={config.plural}
        subtitle={config.subtitle}
        action={
          canCreate ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setEditingVersion(null);
                setEditConflict(null);
                setFormOpen(true);
              }}
            >
              Novo
            </Button>
          ) : undefined
        }
      />

      <FilterBar filters={filtersWithId} onChange={(v) => {
        setFilters(v);
        setPagination((p) => ({ ...p, page: 0 }));
      }} />


      <Card>
        <DataGrid
          autoHeight
          rows={data?.content ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isFetching}
          localeText={gridLocale}
          rowCount={data?.totalElements ?? 0}
          paginationMode="server"
          paginationModel={pagination}
          onPaginationModelChange={setPagination}
          pageSizeOptions={[10, 25, 50]}
          disableRowSelectionOnClick
          disableColumnMenu
          sx={{ border: 0, '--DataGrid-overlayHeight': '300px' }}
        />
      </Card>

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
          ? 'Este registro foi alterado. A versao atual foi recarregada; revise e confirme novamente a exclusao.'
          : `Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.`}
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
