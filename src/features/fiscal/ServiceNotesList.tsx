import AddIcon from '@mui/icons-material/Add';
import { Card, Chip, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { describeError } from '../../api/client';
import { parkingFiscalDraftPagePath } from '../../api/parkingFiscalDrafts';
import { serviceNotesListQueryKey } from '../../api/queryKeys';
import { serviceNotesApi, type ServiceNoteListParams, type ServiceNoteListRow, type ServiceNoteOrigin } from '../../api/serviceNotes';
import { PageHeader } from '../../components/common/PageHeader';
import { FilterBar } from '../../components/crud/FilterBar';
import type { FilterConfig } from '../../components/crud/resourceConfig';
import { EmptyState } from '../../components/listing/EmptyState';
import { ErrorState } from '../../components/listing/ErrorState';
import { ListingCards } from '../../components/listing/ListingCards';
import { ListingSkeleton } from '../../components/listing/ListingSkeleton';
import { ListingToolbar } from '../../components/listing/ListingToolbar';
import { PrimaryButton } from '../../components/listing/PrimaryButton';
import { ListPagination } from '../../components/listing/ListViewControls';
import { useCorrectListPage, useListView } from '../../components/listing/useListView';
import { formatDateTime } from '../../utils/format';
import { currency } from '../patio/operation';
import { serviceNoteListSearch, serviceNotesPath } from './serviceNoteNavigation';

const origins: Record<ServiceNoteOrigin, string> = {
  ESTACIONAMENTO: 'Pátio', MANUAL: 'Lançamento manual', ORDEM_SERVICO: 'Ordem de serviço',
};
const statusLabels: Record<ServiceNoteListRow['situacao'], string> = {
  PENDENTE_EMISSAO: 'Rascunho fiscal', PENDENTE: 'Pendente', EMITIDA: 'Registrada internamente', CANCELADA: 'Cancelada',
};
const situationOptions = [
  { value: 'PENDENTE', label: 'Pendentes e rascunhos' },
  { value: 'EMITIDA', label: statusLabels.EMITIDA },
  { value: 'CANCELADA', label: statusLabels.CANCELADA },
];
const filters: FilterConfig[] = [
  { name: 'origem', label: 'Origem', type: 'select', options: Object.entries(origins).map(([value, label]) => ({ value, label })) },
  { name: 'situacao', label: 'Situação', type: 'select', options: situationOptions },
];
const withClientFilter: FilterConfig[] = [...filters, {
  name: 'clienteId', label: 'Cliente da nota interna', type: 'reference', reference: { basePath: '/api/clientes', labelField: 'nome' },
}];
const byRegistration = [{ value: 'criadoEm,desc', label: 'Registro mais recente' }];
const rowKey = (row: ServiceNoteListRow) => `${row.origem}:${row.id}`;

function readFilters(params: URLSearchParams) {
  const origem = params.get('origem') as ServiceNoteOrigin | null;
  const situacao = params.get('situacao');
  const clienteId = Number(params.get('clienteId'));
  return {
    origem: origem && Object.prototype.hasOwnProperty.call(origins, origem) ? origem : undefined,
    situacao: situationOptions.find((option) => option.value === situacao)?.value as ServiceNoteListParams['situacao'],
    clienteId: Number.isSafeInteger(clienteId) && clienteId > 0 ? clienteId : undefined,
  };
}

export function ServiceNotesList({ org, showClientFilter, onCreate }: {
  org: number; showClientFilter: boolean; onCreate?: () => void;
}) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const view = useListView(byRegistration);
  const search = params.get('busca') ?? params.get('buscaPatio') ?? params.get('numero') ?? '';
  const clean = search.trim().slice(0, 100);
  const [settledSearch, setSettledSearch] = useState(clean);
  const searchReady = clean === settledSearch;
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledSearch(clean), 280);
    return () => window.clearTimeout(timer);
  }, [clean]);
  const values = readFilters(params);
  const selection = { ...values, busca: settledSearch || undefined, page: view.page, size: view.size };
  const query = useQuery({
    queryKey: [...serviceNotesListQueryKey(org), 'unificada', selection],
    queryFn: () => serviceNotesApi.list(selection),
    enabled: searchReady,
  });
  const total = searchReady ? query.data?.totalElements : undefined;
  useCorrectListPage(view, total);
  const rows = searchReady && !query.isError ? query.data?.content ?? [] : [];
  const active = Object.values(values).filter(Boolean).length;
  const detailHref = (row: ServiceNoteListRow) => (row.origem === 'ESTACIONAMENTO'
    ? parkingFiscalDraftPagePath(row.id) : `${serviceNotesPath}/${row.id}`) + serviceNoteListSearch(params);

  return <>
    <PageHeader title="Notas de Serviço" subtitle="Consulte os rascunhos do pátio e as notas registradas no sistema."
      count={total} action={onCreate && <PrimaryButton startIcon={<AddIcon />} onClick={onCreate}>Nova nota de serviço</PrimaryButton>} />
    <ListingToolbar searchLabel="Buscar por número, OS, placa, evento ou cliente" searchValue={search}
      onSearchChange={(value) => view.change({ busca: value.slice(0, 100), buscaPatio: null, numero: null, page: null })}
      appliedCount={active} onClear={() => view.change({ origem: null, situacao: null, clienteId: null, page: null })}
      filterForm={<FilterBar filters={showClientFilter ? withClientFilter : filters} values={values}
        onChange={(next) => view.change({
          origem: typeof next.origem === 'string' ? next.origem : null,
          situacao: typeof next.situacao === 'string' ? next.situacao : null,
          clienteId: typeof next.clienteId === 'number' ? next.clienteId : null,
          page: null,
        })} />} />
    {(!searchReady || query.isPending) && <ListingSkeleton />}
    {searchReady && query.isError && <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />}
    {searchReady && query.isSuccess && rows.length === 0 && <EmptyState title="Nenhuma nota de serviço encontrada"
      description={active || settledSearch ? 'Nenhum registro corresponde à busca ou aos filtros.'
        : 'Estadias concluídas e notas lançadas aparecem nesta lista.'} />}
    {rows.length > 0 && <>
      <ListingCards rows={rows} getKey={rowKey} getTitle={(row) => row.referencia}
        getFields={(row) => [
          { label: 'Origem', value: origins[row.origem] },
          { label: 'Descrição', value: row.descricao },
          { label: 'Registrada em', value: formatDateTime(row.criadoEm) },
          { label: 'Total', value: currency(row.valor) },
          { label: 'Situação', value: statusLabels[row.situacao] },
        ]}
        getOpenLabel={(row) => `Abrir ${row.referencia}`}
        onOpen={(row) => void navigate(detailHref(row))} />
      <TableContainer component={Card} variant="outlined" sx={{ display: { xs: 'none', md: 'block' } }}>
        <Table size="small" aria-label="Notas de serviço">
          <TableHead><TableRow>
            <TableCell>Número / referência</TableCell><TableCell>Origem</TableCell><TableCell>Descrição</TableCell>
            <TableCell>Registrada em</TableCell><TableCell align="right">Total</TableCell><TableCell>Situação</TableCell>
          </TableRow></TableHead>
          <TableBody>{rows.map((row) => <TableRow key={rowKey(row)}>
            <TableCell><Link component={RouterLink} to={detailHref(row)}>{row.referencia}</Link></TableCell>
            <TableCell>{origins[row.origem]}</TableCell><TableCell>{row.descricao}</TableCell>
            <TableCell>{formatDateTime(row.criadoEm)}</TableCell><TableCell align="right">{currency(row.valor)}</TableCell>
            <TableCell><Chip size="small" label={statusLabels[row.situacao]}
              color={row.situacao === 'EMITIDA' ? 'success' : row.situacao === 'CANCELADA' ? 'default' : 'warning'} /></TableCell>
          </TableRow>)}</TableBody>
        </Table>
      </TableContainer>
    </>}
    <ListPagination view={view} total={total} />
  </>;
}
