import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box, Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, useMediaQuery, useTheme,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { describeError } from '../../api/client';
import { installationCatalogKey, listInstallations, spaceStatusLabels, updateSpaceStatus,
  type InstallationManagementKind, type InstallationRow, type SpaceRow, type SpaceStatus } from '../../api/installationCatalog';
import { isResourcePreconditionConflict, type Page } from '../../api/resource';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { InstallationReferenceSelect } from '../../components/enterprise/InstallationReferenceSelect';
import { EmptyState } from '../../components/listing/EmptyState';
import { ErrorState } from '../../components/listing/ErrorState';
import { ListingCards } from '../../components/listing/ListingCards';
import { ListingSkeleton } from '../../components/listing/ListingSkeleton';
import { ListingToolbar } from '../../components/listing/ListingToolbar';
import { SecondaryActionsMenu } from '../../components/listing/SecondaryActionsMenu';
import { useSnackbar } from '../../components/SnackbarProvider';
import { facilityCategoryLabel } from './spaceImport';

const PAGE_SIZE = 20;
const labels = { venues: 'locais', facilities: 'pátios', sectors: 'setores', spaces: 'vagas' };
const number = new Intl.NumberFormat('pt-BR');
const capacity = (value?: number) => value == null ? '—' : number.format(value);
const active = (value: boolean) => <Chip size="small" label={value ? 'Ativo' : 'Inativo'}
  color={value ? 'success' : 'default'} variant="outlined" />;
const statusActions = [
  { status: 'BLOQUEADA', label: 'Bloquear', title: 'Bloquear vaga?', result: 'Vaga bloqueada.' },
  { status: 'MANUTENCAO', label: 'Colocar em manutenção', title: 'Colocar vaga em manutenção?', result: 'Vaga colocada em manutenção.' },
  { status: 'LIVRE', label: 'Liberar', title: 'Liberar vaga?', result: 'Vaga liberada.' },
] as const satisfies ReadonlyArray<{ status: SpaceStatus; label: string; title: string; result: string }>;
type StatusChange = { row: SpaceRow; action: (typeof statusActions)[number] };

type Row = InstallationRow | SpaceRow;
const title = (row: Row) => 'sectorId' in row ? row.code : row.name;
const spaceLabel = (row: SpaceRow) => `vaga ${row.code} · ${row.sectorName} · ${row.parkingFacilityName}`;

function fields(kind: InstallationManagementKind, row: Row) {
  if ('sectorId' in row) return [
    { label: 'Setor', value: row.sectorName },
    { label: 'Pátio', value: row.parkingFacilityName },
    { label: 'Categoria', value: facilityCategoryLabel(row.type) },
    { label: 'Acessível', value: row.accessible ? 'Sim' : 'Não' },
    { label: 'Posição', value: row.position ?? '—' },
    { label: 'Situação', value: <Chip size="small" label={spaceStatusLabels[row.status]} variant="outlined"
      color={row.status === 'LIVRE' ? 'success' : row.status === 'MANUTENCAO' ? 'warning' : 'error'} /> },
  ];
  const status = { label: 'Situação', value: active(row.active) };
  switch (kind) {
    case 'venues': return [status];
    case 'facilities': return [
      { label: 'Capacidade física', value: capacity(row.physicalCapacity) },
      { label: 'Capacidade operacional', value: capacity(row.operationalCapacity) }, status,
    ];
    case 'sectors': return [
      { label: 'Pátio', value: row.parkingFacilityName ?? '—' },
      { label: 'Código', value: row.code ?? '—' },
      { label: 'Capacidade', value: capacity(row.capacity) }, status,
    ];
    default: return [status];
  }
}

export function FacilitiesList({ kind, org, search, page, sectorId, onSearch, onPage, onSector, onEdit, onOpenFacility }: {
  kind: InstallationManagementKind;
  org?: number;
  search: string;
  page: number;
  sectorId?: number;
  onSearch: (value: string) => void;
  onPage: (page: number) => void;
  onSector?: (id: string) => void;
  onEdit: (id: number) => void;
  onOpenFacility?: (id: number) => void;
}) {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [term, setTerm] = useState(search.trim());
  const [pendingChange, setPendingChange] = useState<StatusChange | null>(null);
  const queries = useQueryClient();
  const { notify } = useSnackbar();
  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  const changing = term !== search.trim();
  const spaces = kind === 'spaces';
  const filtered = !!search.trim() || (spaces && !!sectorId);
  const catalogKey = installationCatalogKey(org, kind);
  const queryKey = [...catalogKey, 'management', term, page, sectorId ?? null];
  const query = useQuery({
    queryKey,
    enabled: !!org && !changing,
    queryFn: ({ signal }) => listInstallations(kind, term, page, signal, sectorId),
  });
  const total = query.data?.totalElements ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  useEffect(() => {
    if (!changing && query.isSuccess && page > lastPage) onPage(lastPage);
  }, [changing, lastPage, onPage, page, query.isSuccess]);
  const rows = query.data?.content ?? [];
  const changeStatus = useMutation({
    mutationFn: ({ row, action }: StatusChange) => updateSpaceStatus(row, action.status),
    onSuccess: (updated, { action }) => {
      queries.setQueryData<Page<Row>>(queryKey, (current) => current
        ? { ...current, content: current.content.map((row) => row.id === updated.id ? updated : row) }
        : current);
      notify(action.result, 'success');
    },
    onError: (error) => notify(isResourcePreconditionConflict(error)
      ? 'Outra alteração foi salva nesta vaga. Confira a situação atual antes de tentar novamente.'
      : describeError(error), 'error'),
    onSettled: () => {
      setPendingChange(null);
      void queries.invalidateQueries({ queryKey: catalogKey });
    },
  });
  const edit = (row: Row) => <Button startIcon={<EditOutlinedIcon />} size="small"
    aria-label={`Editar ${'sectorId' in row ? spaceLabel(row) : row.name}`}
    onClick={() => onEdit(row.id)} sx={{ minHeight: 44 }}>Editar</Button>;
  const rowActions = (row: Row) => 'sectorId' in row ? <Stack direction="row" justifyContent="flex-end"
    alignItems="center" sx={{ '& .MuiIconButton-root': { minWidth: 44, minHeight: 44 } }}>
    {edit(row)}
    <SecondaryActionsMenu label={`Situação da ${spaceLabel(row)}`} actions={statusActions
      .filter((action) => action.status !== row.status)
      .map((action) => ({ key: action.status, label: action.label, onClick: () => setPendingChange({ row, action }) }))} />
  </Stack> : kind === 'facilities' && onOpenFacility
    ? <Stack direction="row" justifyContent="flex-end" gap={1} flexWrap="wrap">
      <Button size="small" aria-label={`Abrir ${row.name}`} onClick={() => onOpenFacility(row.id)} sx={{ minHeight: 44 }}>
        Setores e vagas
      </Button>
      {edit(row)}
    </Stack> : edit(row);

  return <>
    <ListingToolbar searchLabel={`Buscar ${labels[kind]} por ${spaces ? 'código' : 'nome'}`} searchValue={search}
      onSearchChange={(value) => onSearch(value.slice(0, spaces ? 40 : 160))}
      sortControl={spaces && onSector ? <Box sx={{ width: { xs: '100%', sm: 300 }, flexShrink: 0 }}>
        <InstallationReferenceSelect kind="sectors" allSectors label="Setor" value={sectorId ? String(sectorId) : ''}
          onChange={onSector} emptyText="Nenhum setor cadastrado." />
      </Box> : undefined} />
    {(changing || query.isPending || (query.isSuccess && page > lastPage)) ? <ListingSkeleton />
      : query.isError ? <ErrorState message={describeError(query.error)} onRetry={() => void query.refetch()} />
      : rows.length === 0 ? <EmptyState title={filtered ? 'Nenhum resultado encontrado' : 'Nenhum cadastro nesta aba'}
        description={filtered ? (spaces ? 'Confira o código ou limpe o filtro de setor.' : 'Tente outro nome ou limpe a busca.')
          : (spaces ? 'Use Nova vaga para cadastrar uma vaga ou Importar vagas para cadastrar em lote.' : 'Use o botão no topo para fazer o primeiro cadastro.')} />
      : <>
        {desktop ? <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label={`Lista de ${labels[kind]}`}>
            <TableHead><TableRow><TableCell>{spaces ? 'Código' : 'Nome'}</TableCell>
              {fields(kind, rows[0]).map(({ label }) => <TableCell key={label}>{label}</TableCell>)}
              <TableCell align="right">Ações</TableCell>
            </TableRow></TableHead>
            <TableBody>{rows.map((row) => <TableRow key={row.id}>
              <TableCell component="th" scope="row" sx={{ fontWeight: 650, overflowWrap: 'anywhere' }}>{title(row)}</TableCell>
              {fields(kind, row).map(({ label, value }) => <TableCell key={label}>{value}</TableCell>)}
              <TableCell align="right">{rowActions(row)}</TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </TableContainer> : <ListingCards rows={rows} getKey={(row) => row.id}
          getTitle={title} getFields={(row) => [...fields(kind, row), { label: spaces ? 'Ações' : 'Cadastro', value: rowActions(row) }]} />}
        {total > PAGE_SIZE && <TablePagination component="div" count={total} page={page} rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[]} onPageChange={(_, next) => onPage(next)}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
          getItemAriaLabel={(type) => type === 'next' ? 'Próxima página' : type === 'previous' ? 'Página anterior' : 'Ir para a página'} />}
      </>}
    {pendingChange && <ConfirmDialog open title={pendingChange.action.title}
      message={`Vaga ${pendingChange.row.code} · ${pendingChange.row.sectorName} · ${pendingChange.row.parkingFacilityName}. Nova situação: ${spaceStatusLabels[pendingChange.action.status]}.`}
      confirmLabel={pendingChange.action.label} loading={changeStatus.isPending}
      onClose={() => { if (!changeStatus.isPending) setPendingChange(null); }}
      onConfirm={() => { if (!changeStatus.isPending) changeStatus.mutate(pendingChange); }} />}
  </>;
}
