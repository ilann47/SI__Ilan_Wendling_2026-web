import AddIcon from '@mui/icons-material/Add';
import { Alert, Box, Button, Card, Chip,
  MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow,
  TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { describeError } from '../api/client';
import { financialAccountsApi, financialOriginLabels, financialOriginPermission,
  type FinancialAccount, type FinancialAccountType, type SettlementRequest } from '../api/financialAccounts';
import { tenantQueryKey } from '../api/queryKeys';
import { clearSettlementAttempt, persistSettlementAttempt, readSettlementAttempt, settlementAttemptStorageKey } from '../api/financialSettlementAttempt';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { AppDialog } from '../components/common/AppDialog';
import { FilterBar } from '../components/crud/FilterBar';
import { hasResourceActionPermission, type FilterConfig } from '../components/crud/resourceConfig';
import { ResourceFormDialog } from '../components/form/ResourceFormDialog';
import { AppliedFilterChips } from '../components/listing/AppliedFilterChips';
import { DetailDrawer } from '../components/listing/DetailDrawer';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingCards } from '../components/listing/ListingCards';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { ListingToolbar } from '../components/listing/ListingToolbar';
import { SecondaryActionsMenu, type SecondaryAction } from '../components/listing/SecondaryActionsMenu';
import { useSnackbar } from '../components/SnackbarProvider';
import { useLinkedDetail } from '../hooks/useLinkedDetail';
import { contaPagarConfig, contaReceberConfig } from '../resources/financeiro';
import { formatCurrency, formatDate, formatStatusLabel } from '../utils/format';

const filterNames = ['search', 'situacao', 'fornecedorId', 'clienteId', 'dataVencimentoDe', 'dataVencimentoAte',
  'origem', 'notaEntradaId', 'notaSaidaId', 'notaServicoId', 'vendaAdministrativaId'];
const settlementDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** Página operacional compartilhada entre pagar/receber; dados e totais são sempre do servidor. */
export function FinancialAccountsPage({ tipo }: { tipo: FinancialAccountType }) {
  const pagar = tipo === 'pagar';
  const config = pagar ? contaPagarConfig : contaReceberConfig;
  const { activeOrganization, permissions, user } = useAuth();
  const org = activeOrganization?.organizationId;
  const canRead = !!org && permissions.includes('finance:read');
  const canManage = canRead && permissions.includes('finance:manage');
  const canCreate = canManage && hasResourceActionPermission(config, 'create', permissions);
  const resource = useMemo(() => financialAccountsApi(tipo), [tipo]);
  const client = useQueryClient();
  const { notify } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const isMobile = useMediaQuery(useTheme().breakpoints.down('md'));
  const filters = Object.fromEntries(filterNames.filter((key) => params.get(key)).map((key) => [key, params.get(key)!]));
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState('dataVencimento,asc');
  const [createOpen, setCreateOpen] = useState(false);
  const [settling, setSettling] = useState<FinancialAccount | null>(null);
  const [canceling, setCanceling] = useState<FinancialAccount | null>(null);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(settlementDate);
  const [attempt, setAttempt] = useState<{ key: string; body: SettlementRequest } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const attemptKey = (id: number) => settlementAttemptStorageKey(org!, user?.login ?? 'sessao', tipo, id);
  const list = useQuery({ queryKey: tenantQueryKey(org ?? 0, 'financial-accounts', tipo, filters, page, size, sort),
    queryFn: () => resource.list({ ...filters, page, size, sort }), enabled: canRead });
  const summary = useQuery({ queryKey: tenantQueryKey(org ?? 0, 'financial-summary', tipo, filters),
    queryFn: () => resource.summary(filters), enabled: canRead });
  const linked = useLinkedDetail(org, config.key, resource.get, canRead);
  const detail = linked.data;
  const history = useQuery({ queryKey: tenantQueryKey(org ?? 0, 'financial-history', tipo, detail?.id),
    queryFn: () => resource.history(detail!.id), enabled: canRead && !!detail });
  const refresh = async () => { if (org) await client.invalidateQueries({ queryKey: ['tenant', org] }); };
  const create = useMutation({ mutationFn: resource.create, onSuccess: async () => {
    setCreateOpen(false); notify('Título registrado.', 'success'); await refresh();
  } });
  const settle = useMutation({ mutationFn: ({ id, body, key }: { id: number; body: SettlementRequest; key: string }) => resource.settle(id, body, key),
    onSuccess: async (_, variables) => { clearSettlementAttempt(attemptKey(variables.id)); setSettling(null); setAttempt(null); notify('Baixa registrada no sistema.', 'success'); await refresh(); } });
  const cancel = useMutation({ mutationFn: resource.cancel, onSuccess: async () => { setCanceling(null); await refresh(); } });
  const changeFilters = (next: Record<string, unknown>) => {
    setPage(0);
    setParams((current) => {
      const url = new URLSearchParams(current);
      for (const key of filterNames) {
        if (next[key] !== '' && next[key] != null) url.set(key, String(next[key])); else url.delete(key);
      }
      return url;
    }, { replace: true });
  };
  const open = (row: FinancialAccount) => setParams((current) => {
    const url = new URLSearchParams(current); url.set('detail', String(row.id)); return url;
  });
  const openSettlement = (row: FinancialAccount) => {
    try {
      const pending = readSettlementAttempt(attemptKey(row.id));
      setSettling(row); setValor(String(pending?.body.valor ?? row.saldo)); setData(pending?.body.data ?? settlementDate());
      setAttempt(pending); setLocalError(null); settle.reset();
    } catch (error) { notify(describeError(error), 'error'); }
  };
  const beginSettlement = () => {
    if (!settling || !canManage) return;
    const amount = Number(valor);
    if (!attempt && (!Number.isFinite(amount) || amount <= 0 || amount > settling.saldo || !/^\d+(\.\d{1,2})?$/.test(valor))) {
      setLocalError('Informe um valor positivo, com até duas casas decimais, que não exceda o saldo.'); return;
    }
    setLocalError(null);
    const next = attempt ?? { key: crypto.randomUUID(), body: { valor: amount, ...(data ? { data } : {}) } };
    try { persistSettlementAttempt(attemptKey(settling.id), next); }
    catch { setLocalError('Não foi possível guardar a tentativa com segurança. Verifique o armazenamento do navegador antes de continuar.'); return; }
    setAttempt(next); settle.mutate({ id: settling.id, ...next });
  };
  const actions = (row: FinancialAccount): SecondaryAction[] => {
    if (!canManage || row.situacao === 'CANCELADA' || row.saldo <= 0) return [];
    const result: SecondaryAction[] = [{ key: 'baixa', label: pagar ? 'Registrar pagamento' : 'Registrar recebimento', onClick: () => openSettlement(row) }];
    if (Number(row.valorPago ?? row.valorRecebido ?? 0) === 0) result.push({ key: 'cancelar', label: 'Cancelar título', danger: true,
      onClick: () => { cancel.reset(); setCanceling(row); } });
    return result;
  };
  const filterConfigs: FilterConfig[] = [
    { name: 'search', label: 'Busca', type: 'text' },
    ...(config.filters ?? []).filter((f) => !['search', 'notaEntradaId'].includes(f.name)
      && (f.type !== 'reference' || permissions.includes(pagar ? 'suppliers:read' : 'customers:read'))),
    ...(!pagar && permissions.includes('customers:read') ? [{ name: 'clienteId', label: 'Cliente', type: 'reference' as const,
      reference: { basePath: '/api/clientes', labelField: 'nome' } }] : []),
    { name: 'dataVencimentoDe', label: 'Vencimento de', type: 'text' },
    { name: 'dataVencimentoAte', label: 'Vencimento até', type: 'text' },
    { name: 'origem', label: 'Origem', type: 'select', options: Object.entries(financialOriginLabels)
      .filter(([key]) => pagar ? ['MANUAL', 'NOTA_ENTRADA'].includes(key) : key !== 'NOTA_ENTRADA')
      .map(([value, label]) => ({ value, label })) },
  ];
  const origin = (row: FinancialAccount) => {
    const source = row.origem;
    if (!source) return 'Origem não informada';
    const label = `${financialOriginLabels[source.tipo] ?? 'Documento'}${source.numero ? ` ${source.numero}` : ''}`;
    const permission = financialOriginPermission(source.tipo);
    return source.url && permission && permissions.includes(permission)
      ? <Button component={RouterLink} to={source.url} size="small" onClick={(e) => e.stopPropagation()}>{label}</Button> : label;
  };
  if (!canRead) return <Alert severity="warning">Selecione uma organização com permissão para consultar o financeiro.</Alert>;

  return <Box>
    <PageHeader title={pagar ? 'Contas a pagar' : 'Contas a receber'} count={list.data?.totalElements}
      subtitle="Consulte vencimentos, documentos de origem, baixas e o saldo de cada título."
      action={canCreate ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => { create.reset(); setCreateOpen(true); }}>Novo lançamento</Button> : undefined} />
    <ListingToolbar searchValue={filters.search ?? ''} searchLabel="Buscar por nome, documento, nota ou observação"
      onSearchChange={(search) => changeFilters({ ...filters, search })} appliedCount={Object.keys(filters).length}
      onClear={() => changeFilters({})} filterForm={<Stack gap={2}>
        <FilterBar filters={filterConfigs.filter((f) => !['search', 'dataVencimentoDe', 'dataVencimentoAte'].includes(f.name))} values={filters} onChange={changeFilters} />
        {['dataVencimentoDe', 'dataVencimentoAte'].map((key, index) => <TextField key={key} type="date" size="small"
          label={index === 0 ? 'Vencimento de' : 'Vencimento até'} InputLabelProps={{ shrink: true }} value={filters[key] ?? ''}
          onChange={(e) => changeFilters({ ...filters, [key]: e.target.value })} />)}
      </Stack>} />
    <AppliedFilterChips filters={filterConfigs} values={filters} onRemove={(key) => changeFilters({ ...filters, [key]: undefined })} onClear={() => changeFilters({})} />
    {summary.isError ? <ErrorState message={describeError(summary.error)} onRetry={() => { void summary.refetch(); }} /> : summary.isPending ? <ListingSkeleton />
      : <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} sx={{ mb: 2 }}>
        {[['Valor dos títulos', summary.data.valorTotal], [pagar ? 'Pago' : 'Recebido', summary.data.valorBaixado], ['Saldo em aberto', summary.data.saldo]].map(([label, value]) =>
          <Card key={String(label)} sx={{ p: 2, flex: 1 }}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="h6">{formatCurrency(Number(value))}</Typography></Card>)}
      </Stack>}
    <Typography variant="caption" color="text.secondary">Totais de todos os títulos filtrados. O saldo em aberto desconsidera cancelados.</Typography>
    <Box sx={{ my: 2 }}><TextField select size="small" label="Ordenar por" value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}>
      <MenuItem value="dataVencimento,asc">Vencimento mais próximo</MenuItem><MenuItem value="dataVencimento,desc">Vencimento mais distante</MenuItem>
      <MenuItem value="valorTotal,desc">Maior valor</MenuItem><MenuItem value="id,desc">Mais recentes</MenuItem>
    </TextField></Box>
    {list.isError ? <ErrorState message={describeError(list.error)} onRetry={() => { void list.refetch(); }} /> : list.isPending ? <ListingSkeleton />
      : !list.data.content.length ? <EmptyState title="Nenhum título encontrado" description="Revise os filtros ou registre um novo lançamento." />
        : isMobile ? <ListingCards rows={list.data.content} getKey={(r) => r.id} getTitle={(r) => r.fornecedorNome ?? r.clienteNome}
          onOpen={open} getActions={actions} getFields={(r) => [{ label: 'Parcela', value: `${r.numeroParcela}/${r.totalParcelas}` },
            { label: 'Vencimento', value: formatDate(r.dataVencimento) }, { label: 'Saldo', value: formatCurrency(r.saldo) }, { label: 'Situação', value: formatStatusLabel(r.situacao) }]} />
          : <TableContainer component={Card}><Table size="small" stickyHeader aria-label={pagar ? 'Títulos a pagar' : 'Títulos a receber'}>
            <TableHead><TableRow>{[pagar ? 'Fornecedor' : 'Cliente', 'Origem', 'Parcela', 'Vencimento', 'Original', pagar ? 'Pago' : 'Recebido', 'Saldo', 'Situação', 'Ações'].map((h) => <TableCell key={h}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>{list.data.content.map((r) => <TableRow key={r.id} hover onClick={() => open(r)} tabIndex={0}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(r); } }} sx={{ cursor: 'pointer' }}>
              <TableCell>{r.fornecedorNome ?? r.clienteNome}</TableCell><TableCell>{origin(r)}</TableCell><TableCell>{r.numeroParcela}/{r.totalParcelas}</TableCell>
              <TableCell>{formatDate(r.dataVencimento)}</TableCell><TableCell>{formatCurrency(r.valorOriginal)}</TableCell>
              <TableCell>{formatCurrency(r.valorPago ?? r.valorRecebido)}</TableCell><TableCell>{formatCurrency(r.saldo)}</TableCell>
              <TableCell><Chip label={formatStatusLabel(r.situacao)} size="small" /></TableCell><TableCell><SecondaryActionsMenu actions={actions(r)} /></TableCell>
            </TableRow>)}</TableBody></Table></TableContainer>}
    <TablePagination component="div" count={list.data?.totalElements ?? 0} page={page} rowsPerPage={size} rowsPerPageOptions={[10, 25, 50]}
      onPageChange={(_, next) => setPage(next)} onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0); }} labelRowsPerPage="Por página"
      labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
    <DetailDrawer open={linked.requested} title={detail ? `Título ${detail.id} — ${detail.fornecedorNome ?? detail.clienteNome}` : 'Detalhes do título'}
      onClose={linked.close} actions={detail && <Stack direction="row" gap={1}>{actions(detail).map((a) => <Button key={a.key} variant={a.danger ? 'outlined' : 'contained'} color={a.danger ? 'error' : 'primary'} onClick={a.onClick}>{a.label}</Button>)}</Stack>}>
      {linked.isError ? <ErrorState message={describeError(linked.error)} onRetry={() => { void linked.refetch(); }} /> : !detail ? <ListingSkeleton /> : <>
        <Chip label={formatStatusLabel(detail.situacao)} sx={{ alignSelf: 'start' }} /><Typography variant="h5">Saldo: {formatCurrency(detail.saldo)}</Typography>
        <Typography>Parcela {detail.numeroParcela} de {detail.totalParcelas} · Vence em {formatDate(detail.dataVencimento)}</Typography>
        <Box>{origin(detail)}</Box>
        <Stack gap={0.5}><Typography>Original: {formatCurrency(detail.valorOriginal)}</Typography><Typography>Desconto: {formatCurrency(detail.valorDesconto)}</Typography>
          <Typography>Juros e multa: {formatCurrency(Number(detail.valorJuros ?? 0) + Number(detail.valorMulta ?? 0))}</Typography>
          <Typography>Total: {formatCurrency(detail.valorTotal)}</Typography><Typography>Baixado: {formatCurrency(detail.valorPago ?? detail.valorRecebido)}</Typography></Stack>
        {detail.observacao && <Typography>{detail.observacao}</Typography>}
        <Typography variant="h6">Histórico de {pagar ? 'pagamentos' : 'recebimentos'}</Typography>
        {history.isError ? <ErrorState message={describeError(history.error)} onRetry={() => { void history.refetch(); }} /> : history.isPending ? <ListingSkeleton />
          : history.data.length === 0 ? <Typography color="text.secondary">Nenhuma baixa registrada.</Typography> : history.data.map((h) => <Card key={h.id} variant="outlined" sx={{ p: 2 }}>
            <Typography fontWeight={700}>{formatCurrency(h.valor)}</Typography><Typography>{h.data ? formatDate(h.data) : 'Data anterior não disponível'}</Typography>
            <Typography variant="body2" color="text.secondary">{h.saldoAnterior ? 'Saldo acumulado anterior ao histórico detalhado; pagamentos individuais não disponíveis.' : h.atorNome ?? 'Autor não informado'}</Typography>
          </Card>)}
      </>}
    </DetailDrawer>
    <ResourceFormDialog open={createOpen} title="Novo lançamento" fields={config.fields} submitting={create.isPending}
      conflictMessage={create.isError ? describeError(create.error) : null} onClose={() => { if (!create.isPending) setCreateOpen(false); }} onSubmit={(body) => { if (canCreate) create.mutate(body); }} />
    <AppDialog open={!!settling} onClose={() => { if (!attempt) setSettling(null); }}
      title={pagar ? 'Registrar pagamento' : 'Registrar recebimento'} maxWidth="sm"
      fullScreenOnMobile busy={settle.isPending} actions={<>
        <Button disabled={settle.isPending} onClick={() => { setSettling(null); }}>Fechar</Button>
        <Button variant="contained" disabled={settle.isPending} onClick={beginSettlement}>Confirmar registro</Button>
      </>}>
        <Alert severity="info" sx={{ mb: 2 }}>Esta ação registra uma baixa no sistema; não executa uma transferência bancária.</Alert>
        {attempt && !settle.isError && <Alert severity="info" sx={{ mb: 2 }}>Esta tentativa está preservada. A confirmação utiliza os mesmos dados para evitar duplicidade.</Alert>}
        {settling && <Typography sx={{ mb: 2 }}>Saldo atual: {formatCurrency(settling.saldo)}</Typography>}
        <Stack gap={2}><TextField label="Valor da baixa" value={valor} type="number" disabled={!!attempt} onChange={(e) => setValor(e.target.value)} inputProps={{ min: 0.01, step: 0.01 }} />
          <TextField label="Data da baixa" value={data} type="date" disabled={!!attempt} onChange={(e) => setData(e.target.value)} InputLabelProps={{ shrink: true }} /></Stack>
        {(localError || settle.isError) && <Alert severity="error" sx={{ mt: 2 }}>{localError ?? describeError(settle.error)}</Alert>}
        {settle.isError && attempt && <Alert severity="warning" sx={{ mt: 1 }}>O resultado pode ter sido registrado. Tente novamente com os mesmos dados para consultar ou concluir esta baixa sem duplicá-la.</Alert>}
    </AppDialog>
    <AppDialog open={!!canceling} onClose={() => setCanceling(null)} title="Cancelar título"
      maxWidth="xs" role="alertdialog" busy={cancel.isPending} contentDividers={false}
      actions={<><Button onClick={() => setCanceling(null)} disabled={cancel.isPending} autoFocus>Voltar</Button>
        <Button color="error" variant="contained" onClick={() => { if (canceling && canManage) cancel.mutate(canceling.id); }} disabled={cancel.isPending}>Cancelar título</Button></>}>
      <Typography>O título deixará de compor o saldo em aberto. Lançamentos com baixa não podem ser cancelados.</Typography>
      {cancel.isError && <ErrorState message={describeError(cancel.error)} />}
    </AppDialog>
  </Box>;
}
