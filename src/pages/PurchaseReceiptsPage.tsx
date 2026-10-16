import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Fragment, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { describeError } from '../api/client';
import { tenantQueryKey } from '../api/queryKeys';
import {
  purchaseApi,
  type PurchaseOrder,
  type PurchaseReceipt,
} from '../api/purchases';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import {
  inboundNoteFromReceiptPath,
  PurchaseProcessStrip,
} from '../components/purchases/PurchaseProcessStrip';
import { formatDateTime, formatStatusLabel } from '../utils/format';

const RECEIVABLE_STATUSES = 'APROVADA,PARCIALMENTE_RECEBIDA,RECEBIDA';

function key(organizationId: number, ...parts: readonly unknown[]) {
  return tenantQueryKey(organizationId, 'purchase-receipts', ...parts);
}

function statusColor(status: PurchaseOrder['status']): 'default' | 'success' | 'warning' | 'info' {
  if (status === 'RECEBIDA') return 'success';
  if (status === 'PARCIALMENTE_RECEBIDA') return 'warning';
  if (status === 'APROVADA') return 'info';
  return 'default';
}

function OrderReceipts({
  organizationId,
  order,
  selectedReceiptId,
  onSelect,
}: {
  organizationId: number;
  order: PurchaseOrder;
  selectedReceiptId: number | null;
  onSelect: (receipt: PurchaseReceipt) => void;
}) {
  const { permissions } = useAuth();
  const receipts = useQuery({
    queryKey: key(organizationId, order.id, 'receipts'),
    queryFn: () => purchaseApi.receipts(order.id),
  });
  const documents = useQuery({
    queryKey: key(organizationId, order.id, 'documents'),
    queryFn: () => purchaseApi.documents(order.id),
  });

  if (receipts.isLoading) {
    return <Typography variant="body2" color="text.secondary">Carregando recebimentos…</Typography>;
  }
  if (receipts.isError) {
    return <ErrorState message={describeError(receipts.error)} onRetry={() => void receipts.refetch()} />;
  }
  const rows = receipts.data ?? [];
  if (rows.length === 0) {
    return <Typography variant="body2" color="text.secondary">Nenhum recebimento registrado nesta ordem.</Typography>;
  }

  return (
    <TableContainer><Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Recebimento</TableCell>
          <TableCell>Local</TableCell>
          <TableCell>Data</TableCell>
          <TableCell>Responsável</TableCell>
          <TableCell align="right">Itens</TableCell>
          <TableCell align="right">Ação</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((receipt) => {
          const selected = selectedReceiptId === receipt.id;
          const note = documents.data?.notas?.find((item) => item.recebimentoCompraId === receipt.id);
          return (
            <TableRow
              key={receipt.id}
              hover
              selected={selected}
              onClick={() => onSelect(receipt)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>#{receipt.id}</TableCell>
              <TableCell>{receipt.localEstoqueNome}</TableCell>
              <TableCell>{formatDateTime(receipt.recebidoEm)}</TableCell>
              <TableCell>{receipt.atorNome}</TableCell>
              <TableCell align="right">{receipt.itens.length}</TableCell>
              <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                {note && permissions.includes('fiscal:read') ? <Button component={RouterLink} to={`/app/notas-entrada/${note.id}`}>
                  Ver nota {note.numero}
                </Button> : permissions.includes('fiscal:manage') && <Button
                  size="small"
                  variant="contained"
                  component={RouterLink}
                  to={inboundNoteFromReceiptPath(order.id, receipt.id)}
                  startIcon={<NoteAddOutlinedIcon />}
                >
                  Gerar nota de entrada
                </Button>}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table></TableContainer>
  );
}

export function PurchaseReceiptsPage() {
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedByOrder, setSelectedByOrder] = useState<Record<number, number>>({});

  const list = useQuery({
    queryKey: organizationId ? key(organizationId, 'list', page, search) : ['purchase-receipts'],
    queryFn: () => purchaseApi.list({
      page,
      size: 10,
      sort: 'dataEmissao,desc',
      status: RECEIVABLE_STATUSES,
      ...(search.trim() ? { numero: search.trim() } : {}),
    }),
    enabled: !!organizationId && permissions.includes('purchases:read'),
  });

  if (!organizationId || !permissions.includes('purchases:read')) {
    return <Alert severity="warning">Seu contexto não possui permissão de compras.</Alert>;
  }

  const orders = list.data?.content ?? [];
  const clearFilters = () => { setSearch(''); setPage(0); };

  return (
    <Box>
      <PageHeader
        title="Recebimentos"
        subtitle="Recebimentos físicos vinculados a ordens de compra. Use um recebimento para gerar a nota de entrada."
        count={list.data?.totalElements}
      />
      <PurchaseProcessStrip active="recebimento" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
        <Button component={RouterLink} to="/app/ordens-compra" size="small" variant="outlined">
          Ordens de compra
        </Button>
        <Button component={RouterLink} to="/app/notas-entrada" size="small" variant="outlined">
          Notas de entrada
        </Button>
      </Stack>
      <ListingToolbar
        searchValue={search}
        searchLabel="Buscar por número"
        onSearchChange={(value) => { setSearch(value); setPage(0); }}
        appliedCount={search.trim() ? 1 : 0}
        onClear={clearFilters}
      />
      {list.isLoading && <ListingSkeleton />}
      {list.isError && (
        <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />
      )}
      {!list.isLoading && !list.isError && orders.length === 0 && (
        <EmptyState
          title="Nenhuma ordem com recebimento elegível"
          description="Só aparecem ordens APROVADA, PARCIALMENTE RECEBIDA ou RECEBIDA."
        />
      )}
      {orders.length > 0 && (
        <Card sx={{ display: { xs: 'none', md: 'block' } }}>
          <TableContainer>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell width={48} />
                  <TableCell>Número</TableCell>
                  <TableCell>Fornecedor</TableCell>
                  <TableCell>Situação</TableCell>
                  <TableCell align="right">Recebimento selecionado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => {
                  const open = expandedId === order.id;
                  const selectedId = selectedByOrder[order.id] ?? null;
                  return (
                    <Fragment key={order.id}>
                      <TableRow
                        hover
                        onClick={() => setExpandedId(open ? null : order.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </TableCell>
                        <TableCell>{order.numeroNota}</TableCell>
                        <TableCell>{order.fornecedorNome}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={formatStatusLabel(order.status)}
                            color={statusColor(order.status)}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {selectedId != null ? `#${selectedId}` : '—'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={5} sx={{ py: 0, borderBottom: open ? undefined : 0 }}>
                          <Collapse in={open} timeout="auto" unmountOnExit>
                            <Box sx={{ py: 2, px: 1 }}>
                              <OrderReceipts
                                organizationId={organizationId}
                                order={order}
                                selectedReceiptId={selectedId}
                                onSelect={(receipt) => {
                                  setSelectedByOrder((current) => ({
                                    ...current,
                                    [order.id]: receipt.id,
                                  }));
                                }}
                              />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
      {orders.length > 0 && (
        <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
          {orders.map((order) => {
            const open = expandedId === order.id;
            const selectedId = selectedByOrder[order.id] ?? null;
            return (
              <Card key={order.id} sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  onClick={() => setExpandedId(open ? null : order.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <Box>
                    <Typography fontWeight={700}>Nota {order.numeroNota}</Typography>
                    <Typography variant="body2">{order.fornecedorNome}</Typography>
                    <Chip
                      size="small"
                      sx={{ mt: 1 }}
                      label={formatStatusLabel(order.status)}
                      color={statusColor(order.status)}
                    />
                  </Box>
                  {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Stack>
                <Collapse in={open} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 2 }}>
                    <OrderReceipts
                      organizationId={organizationId}
                      order={order}
                      selectedReceiptId={selectedId}
                      onSelect={(receipt) => {
                        setSelectedByOrder((current) => ({
                          ...current,
                          [order.id]: receipt.id,
                        }));
                      }}
                    />
                  </Box>
                </Collapse>
              </Card>
            );
          })}
        </Stack>
      )}
      {list.data && list.data.totalPages > 1 && (
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Button disabled={page === 0} onClick={() => setPage((current) => current - 1)}>
            Anterior
          </Button>
          <Button disabled={list.data.last} onClick={() => setPage((current) => current + 1)}>
            Próxima
          </Button>
        </Stack>
      )}
    </Box>
  );
}
