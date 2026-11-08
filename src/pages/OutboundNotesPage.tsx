import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import { Alert, Box, Button, Card, Chip, Link, Stack, useMediaQuery, useTheme } from '@mui/material';
import { DataGrid, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { ptBR } from '@mui/x-data-grid/locales';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { describeError } from '../api/client';
import { outboundNotesApi } from '../api/outboundNotes';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { StatusChip } from '../components/common/StatusChip';
import { FilterBar } from '../components/crud/FilterBar';
import { hasResourceActionPermission, type FilterConfig } from '../components/crud/resourceConfig';
import { AppliedFilterChips } from '../components/listing/AppliedFilterChips';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingCards } from '../components/listing/ListingCards';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { notaSaidaConfig } from '../resources/fiscal';
import type { NotaSaidaResponse } from '../types';
import { formatCurrencyMicros as formatCurrency, formatDate } from '../utils/format';

const base = '/app/notas-saida';
const gridLocale = ptBR.components.MuiDataGrid.defaultProps.localeText;
const statusFilter: FilterConfig = {
  name: 'situacao', label: 'Situação', type: 'select',
  options: [
    { value: 'PENDENTE', label: 'Rascunho' },
    { value: 'CONFIRMADA', label: 'Confirmada' },
    { value: 'CANCELADA', label: 'Cancelada ou revertida' },
  ],
};
const filters: FilterConfig[] = [{ name: 'numero', label: 'Número', type: 'text' }, statusFilter];
const statusChip = (row: NotaSaidaResponse) => row.revertidaEm
  ? <Chip size="small" color="warning" label="Revertida" />
  : <StatusChip status={row.situacao === 'PENDENTE' ? 'RASCUNHO' : row.situacao} />;
const columns: GridColDef<NotaSaidaResponse>[] = [
  { field: 'numero', headerName: 'Número', width: 145, renderCell: ({ row, tabIndex }) => (
    <Link component={RouterLink} to={`${base}/${row.id}`} tabIndex={tabIndex}
      onClick={(event) => event.stopPropagation()}>{row.numero}</Link>
  ) },
  { field: 'serie', headerName: 'Série', width: 90 },
  { field: 'modelo', headerName: 'Modelo', width: 90 },
  { field: 'clienteNome', headerName: 'Cliente', minWidth: 165, flex: 1 },
  { field: 'dataEmissao', headerName: 'Emissão', width: 120, valueFormatter: (value) => formatDate(value) },
  { field: 'situacao', headerName: 'Situação', width: 140, renderCell: ({ row }) => statusChip(row) },
  { field: 'valorTotal', headerName: 'Total', width: 130, align: 'right', headerAlign: 'right',
    valueFormatter: (value) => formatCurrency(value) },
];

export function OutboundNotesPage() {
  const { activeOrganization, permissions } = useAuth();
  const [params] = useSearchParams();
  const org = activeOrganization?.organizationId;
  if (!org || !permissions.includes('fiscal:read')) return <Alert severity="warning">Seu contexto não possui permissão fiscal de leitura.</Alert>;
  const requestedDetail = Number(params.get('detail'));
  if (Number.isSafeInteger(requestedDetail) && requestedDetail > 0) return <Navigate to={`${base}/${requestedDetail}`} replace />;
  return <OutboundList key={org} org={org} canCreate={hasResourceActionPermission(notaSaidaConfig, 'create', permissions)} />;
}

function OutboundList({ org, canCreate }: { org: number; canCreate: boolean }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const [params, setParams] = useSearchParams();
  const numero = params.get('numero') ?? '';
  const situacao = statusFilter.options?.some(({ value }) => value === params.get('situacao')) ? params.get('situacao') ?? '' : '';
  const [debouncedSearch, setDebouncedSearch] = useState(numero.trim());
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(numero.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [numero]);
  const queryFilters = { numero: debouncedSearch, situacao };
  const list = useQuery({
    queryKey: tenantQueryKey(org, 'list', notaSaidaConfig.basePath, pagination, queryFilters),
    queryFn: () => outboundNotesApi.list({ page: pagination.page, size: pagination.pageSize, sort: 'dataEmissao,desc', ...queryFilters }),
    placeholderData: (previous, query) => query?.queryKey[1] === org ? previous : undefined,
  });
  const changeFilter = (name: string, value: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value); else next.delete(name);
      return next;
    }, { replace: true });
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const clearFilters = () => {
    setParams({}, { replace: true });
    setDebouncedSearch('');
    setPagination((current) => ({ ...current, page: 0 }));
  };
  const rows = list.data?.content ?? [];
  const open = (row: NotaSaidaResponse) => navigate(`${base}/${row.id}`);
  return <Box>
    <PageHeader title="Notas de Saída" subtitle="Confira as mercadorias que saem e as contas a receber da operação."
      count={list.data?.totalElements}
      action={canCreate && <PrimaryButton startIcon={<AddOutlinedIcon />} onClick={() => navigate(`${base}/nova`)}>Nova nota de saída</PrimaryButton>} />
    <ListingToolbar searchValue={numero} searchLabel="Buscar por número"
      onSearchChange={(value) => changeFilter('numero', value)}
      appliedCount={situacao ? 1 : 0} onClear={clearFilters}
      filterForm={<FilterBar filters={[statusFilter]} values={{ situacao }}
        onChange={(value) => changeFilter('situacao', String(value.situacao ?? ''))} />} />
    <AppliedFilterChips filters={filters} values={queryFilters} onRemove={(name) => changeFilter(name, '')} onClear={clearFilters} />
    {list.isError && <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />}
    {list.isPending && <ListingSkeleton />}
    {!list.isPending && !list.isError && rows.length === 0 && <EmptyState title="Nenhuma nota de saída encontrada"
      description={debouncedSearch || situacao ? 'Nenhuma nota corresponde aos filtros atuais.' : 'Ainda não há notas de saída nesta organização.'} />}
    {rows.length > 0 && <>
      <ListingCards rows={rows} getKey={(row) => row.id} getTitle={(row) => row.numero} onOpen={open}
        getOpenLabel={(row) => `Abrir nota ${row.numero}`} getFields={(row) => [
          { label: 'Cliente', value: row.clienteNome },
          { label: 'Emissão', value: formatDate(row.dataEmissao) },
          { label: 'Situação', value: statusChip(row) },
          { label: 'Total', value: formatCurrency(row.valorTotal) },
        ]} />
      <Card sx={{ display: { xs: 'none', md: 'block' } }}>
        <DataGrid autoHeight rows={rows} columns={columns} loading={list.isFetching} localeText={gridLocale}
          rowCount={list.data?.totalElements ?? 0} paginationMode="server" paginationModel={pagination}
          onPaginationModelChange={setPagination} pageSizeOptions={[10, 25, 50]}
          disableColumnSorting disableColumnMenu disableRowSelectionOnClick onRowClick={({ row }) => open(row)}
          sx={{ border: 0, '& .MuiDataGrid-row': { cursor: 'pointer' } }} />
      </Card>
      {mobile && <Stack direction="row" justifyContent="space-between" gap={1} sx={{ mt: 2 }}>
        <Button variant="outlined" disabled={list.isFetching || pagination.page === 0}
          onClick={() => setPagination((value) => ({ ...value, page: value.page - 1 }))}>Anterior</Button>
        <Button variant="outlined" disabled={list.isFetching || list.data?.last !== false}
          onClick={() => setPagination((value) => ({ ...value, page: value.page + 1 }))}>Próxima</Button>
      </Stack>}
    </>}
  </Box>;
}
