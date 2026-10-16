import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import { Alert, Autocomplete, Box, Button, Card, Checkbox, Chip, Divider, FormControlLabel, Stack, Step, StepLabel, Stepper, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { api, describeError } from '../api/client';
import { inboundImportsApi, validateXmlFile, type InboundImport, type ReconcileImportRequest } from '../api/inboundImports';
import { purchaseApi } from '../api/purchases';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { ReferenceSelect } from '../components/form/ReferenceSelect';
import { EmptyState } from '../components/listing/EmptyState';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { useSnackbar } from '../components/SnackbarProvider';
import type { ProdutoResponse } from '../types';
import { formatCurrency, formatDate, formatNumber } from '../utils/format';

const stages = ['Importar', 'Conciliar produtos', 'Conferir mercadoria', 'Confirmar lançamentos'];
const statusLabel = { IMPORTADA: 'Importada', CONCILIADA: 'Conciliada', CONFERIDA: 'Conferida', CONFIRMADA: 'Confirmada internamente' };
type EditItem = { sequencia: number; produtoId: number | null; fatorConversao: number; valorUnitario: number; itemOrdemCompraId?: number; motivoDivergencia: string; quantidadeConferida: string };

function ProductUnit({ org, id }: { org: number; id: number | null }) {
  const product = useQuery({ queryKey: tenantQueryKey(org, 'reference-one', '/api/produtos', id),
    queryFn: () => api.get<ProdutoResponse>(`/api/produtos/${id}`).then((r) => r.data), enabled: !!id, staleTime: 60_000 });
  return <Typography variant="caption" color="text.secondary">Unidade do cadastro: {product.isError ? describeError(product.error) : product.data?.unidadeMedidaSigla ?? (id ? 'Carregando…' : 'selecione um produto')}</Typography>;
}

function Reconciliation({ value, org, onUpdated, onReload }: { value: InboundImport; org: number; onUpdated: (v: InboundImport) => void; onReload: () => void }) {
  const { permissions } = useAuth();
  const canManage = permissions.includes('fiscal:manage');
  const canReconcile = canManage && ['suppliers:read', 'stock:read', 'catalog:read'].every((p) => permissions.includes(p));
  const canPurchase = permissions.includes('purchases:read');
  const [supplier, setSupplier] = useState<number | null>(value.fornecedorId ?? null);
  const [location, setLocation] = useState<number | null>(value.localEstoqueId ?? null);
  const [condition, setCondition] = useState<number | null>(value.condicaoPagamentoId ?? null);
  const [order, setOrder] = useState<number | null>(value.ordemCompraId ?? null);
  const [receipt, setReceipt] = useState<number | null>(value.recebimentoCompraId ?? null);
  const [newReceipt, setNewReceipt] = useState(value.registrarNovoRecebimento ?? false);
  const [items, setItems] = useState<EditItem[]>(() => value.documento.itens.map((row) => {
    const saved = value.itens.find((item) => item.sequencia === row.sequencia);
    return { sequencia: row.sequencia, produtoId: saved?.produtoId ?? null, fatorConversao: saved?.fatorConversao ?? 1,
      valorUnitario: saved?.valorUnitario ?? row.valorUnitario, itemOrdemCompraId: saved?.itemOrdemCompraId ?? undefined,
      motivoDivergencia: saved?.motivoDivergencia ?? '', quantidadeConferida: saved?.quantidadeConferida == null ? '' : String(saved.quantidadeConferida) };
  }));
  const [dirty, setDirty] = useState(false);
  const [countDirty, setCountDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const confirmed = value.status === 'CONFIRMADA';
  const selectedOrder = useQuery({ queryKey: tenantQueryKey(org, 'xml-purchase', order), queryFn: () => purchaseApi.get(order!), enabled: !!order && canPurchase });
  const receipts = useQuery({ queryKey: tenantQueryKey(org, 'xml-receipts', order), queryFn: () => purchaseApi.receipts(order!), enabled: !!order && canPurchase });
  const save = useMutation({ mutationFn: async () => {
    if (!supplier || !location) throw new Error('Selecione o fornecedor e o local de estoque.');
    if (items.some((item) => !item.produtoId || !Number.isFinite(item.fatorConversao) || item.fatorConversao <= 0 || !Number.isFinite(item.valorUnitario) || item.valorUnitario < 0)) {
      throw new Error('Relacione todos os produtos e confira os fatores de conversão e valores.');
    }
    if (order && items.some((item) => !item.itemOrdemCompraId)) throw new Error('Relacione cada produto ao item correspondente da compra.');
    if (order && !receipt && !newReceipt) throw new Error('Selecione o recebimento já registrado ou confirme explicitamente que a mercadoria ainda não foi recebida.');
    const body: ReconcileImportRequest = { fornecedorId: supplier, localEstoqueId: location,
      ...(condition ? { condicaoPagamentoId: condition } : {}), ...(order ? { ordemCompraId: order } : {}),
      ...(receipt ? { recebimentoCompraId: receipt } : {}), registrarNovoRecebimento: !!order && !receipt && newReceipt,
      itens: items.map((item) => ({ sequencia: item.sequencia, produtoId: item.produtoId!,
        fatorConversao: item.fatorConversao, valorUnitario: item.valorUnitario,
        ...(order && item.itemOrdemCompraId ? { itemOrdemCompraId: item.itemOrdemCompraId } : {}),
        ...(item.motivoDivergencia.trim() ? { motivoDivergencia: item.motivoDivergencia.trim() } : {}) })) };
    return inboundImportsApi.reconcile(value.id, value.version, body);
  }, onSuccess: (updated) => { setDirty(false); setCountDirty(false); setError(null); onUpdated(updated); }, onError: (e) => setError(describeError(e)) });
  const count = useMutation({ mutationFn: () => {
    if (items.some((item) => item.quantidadeConferida.trim() === '' || !Number.isFinite(Number(item.quantidadeConferida)) || Number(item.quantidadeConferida) < 0)) {
      throw new Error('Informe a quantidade fisicamente conferida de todos os produtos.');
    }
    return inboundImportsApi.count(value.id, value.version, items.map((item) => ({ sequencia: item.sequencia, quantidadeConferida: Number(item.quantidadeConferida) })));
  }, onSuccess: (updated) => { setCountDirty(false); setError(null); onUpdated(updated); }, onError: (e) => setError(describeError(e)) });
  const confirm = useMutation({ mutationFn: () => inboundImportsApi.confirm(value.id, value.version), onSuccess: onUpdated,
    onError: (e) => { setConfirming(false); setError(describeError(e)); } });
  const busy = save.isPending || count.isPending || confirm.isPending;
  const patchItem = (sequence: number, patch: Partial<EditItem>, reconciliation = true) => {
    setItems((current) => current.map((item) => item.sequencia === sequence ? { ...item, ...patch } : item));
    if (reconciliation) setDirty(true);
    else setCountDirty(true);
  };
  const step = { IMPORTADA: 1, CONCILIADA: 2, CONFERIDA: 3, CONFIRMADA: 4 }[value.status];

  return <Stack spacing={2.5}>
    <Card sx={{ p: { xs: 2, md: 3 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
        <Box><Typography variant="h5" component="h2">Nota {value.documento.numero} · série {value.documento.serie}</Typography>
          <Typography color="text.secondary">{value.documento.emitenteNome} · {formatDate(value.documento.emissao)}</Typography></Box>
        <Box><Chip label={statusLabel[value.status]} color={confirmed ? 'success' : 'info'} /><Typography variant="h6" sx={{ mt: 1 }}>{formatCurrency(value.documento.total)}</Typography></Box>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, overflowWrap: 'anywhere' }}>Chave do documento: {value.documento.chave}</Typography>
      <Typography variant="body2" color="text.secondary">Emitente: {value.documento.emitenteDocumento} · Destinatário: {value.documento.destinatarioDocumento}</Typography>
      <Stepper activeStep={step} alternativeLabel sx={{ mt: 3, display: { xs: 'none', md: 'flex' } }}>{stages.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}</Stepper>
      <Typography sx={{ mt: 2, display: { md: 'none' } }}>{confirmed ? 'Lançamentos registrados' : `Etapa ${step + 1}: ${stages[step]}`}</Typography>
    </Card>
    <Alert severity="info">Importar e conciliar não movimenta estoque nem cria contas. O XML não comprova, por esta tela, autorização fiscal nem verificação de assinatura.</Alert>
    {value.divergencias.length > 0 && <Alert severity="warning"><Typography fontWeight={700}>Confira as divergências antes de continuar</Typography>{value.divergencias.map((d, i) => <Typography key={i} variant="body2">{d}</Typography>)}</Alert>}
    {error && <Alert severity="error" action={<Button color="inherit" onClick={onReload}>Recarregar registro</Button>}>{error}</Alert>}
    {confirmed && value.notaEntradaId && <Alert severity="success" action={<Button component={RouterLink} to={`/app/notas-entrada/${value.notaEntradaId}`}>Ver nota e contas</Button>}>Nota registrada internamente. Estoque e financeiro podem ser consultados no documento.</Alert>}
    {!confirmed && canManage && !canReconcile && <Alert severity="warning">A conciliação exige acesso ao cadastro de fornecedores, produtos e locais de estoque.</Alert>}
    {!confirmed && canReconcile && <Card sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
      <Typography variant="h6">1. Relacione os cadastros</Typography>
      <Typography color="text.secondary">O documento do fornecedor precisa corresponder ao emitente do XML.</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
        <ReferenceSelect label="Fornecedor do documento" value={supplier} required disabled={busy} onChange={(id) => { setSupplier(id); setDirty(true); }} reference={{ basePath: '/api/fornecedores', labelField: 'nome', readPermissions: ['suppliers:read'] }} />
        <ReferenceSelect label="Local de estoque" value={location} required disabled={busy} onChange={(id) => { setLocation(id); setDirty(true); }} reference={{ basePath: '/api/v1/stock-locations', labelField: 'nome', readPermissions: ['stock:read'], params: { ativo: true } }} />
      </Stack>
      {permissions.includes('payments:read') && <ReferenceSelect label="Condição de pagamento (opcional)" value={condition} disabled={busy} onChange={(id) => { setCondition(id); setDirty(true); }} reference={{ basePath: '/api/condicoes-pagamento', labelField: 'nome', readPermissions: ['payments:read'] }} />}
      {canPurchase && <>
        <ReferenceSelect label="Compra (opcional)" value={order} disabled={busy} onChange={(id) => { setOrder(id); setReceipt(null); setNewReceipt(false); setItems((rows) => rows.map((item) => ({ ...item, itemOrdemCompraId: undefined }))); setDirty(true); }} reference={{ basePath: '/api/v1/purchase-orders', labelField: 'numeroNota', readPermissions: ['purchases:read'], params: { status: 'APROVADA,RECEBIDA' } }} />
        {order && <Autocomplete options={receipts.data ?? []} value={(receipts.data ?? []).find((r) => r.id === receipt) ?? null}
          getOptionLabel={(r) => `${r.localEstoqueNome} · ${formatDate(r.recebidoEm)} · ${r.atorNome}`}
          isOptionEqualToValue={(a, b) => a.id === b.id} disabled={busy} loading={receipts.isLoading}
          onChange={(_, r) => { setReceipt(r?.id ?? null); setNewReceipt(false); if (r) setLocation(r.localEstoqueId); setDirty(true); }}
          renderInput={(params) => <TextField {...params} label="Recebimento já registrado (opcional)" helperText="Selecione somente se o estoque desta entrega já entrou. Sem seleção, um recebimento será registrado ao confirmar." />} />}
        {order && !receipt && <Alert severity="warning"><FormControlLabel control={<Checkbox checked={newReceipt} disabled={busy}
          onChange={(e) => { setNewReceipt(e.target.checked); setDirty(true); }} />}
          label="Esta mercadoria ainda não foi recebida; registrar novo recebimento ao confirmar" />
          <Typography variant="body2">Se esta entrega já entrou no estoque, selecione o recebimento existente acima para não duplicar a entrada.</Typography></Alert>}
        {(receipts.isError || selectedOrder.isError) && <Alert severity="error">{describeError(receipts.error ?? selectedOrder.error)}</Alert>}
      </>}
    </Stack></Card>}
    <Card sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
      <Typography variant="h6">2. Produtos e conversão de unidades</Typography>
      <Typography color="text.secondary">Fator 1 mantém a quantidade. Exemplo: uma caixa com 12 unidades usa fator 12; confira também o preço por unidade do cadastro.</Typography>
      {value.documento.itens.map((xmlItem) => {
        const item = items.find((row) => row.sequencia === xmlItem.sequencia)!;
        const persisted = value.itens.find((row) => row.sequencia === xmlItem.sequencia);
        return <Box key={xmlItem.sequencia} sx={{ pt: 1 }}><Divider sx={{ mb: 2 }} />
          <Typography fontWeight={700}>{xmlItem.descricao}</Typography>
          <Typography variant="body2" color="text.secondary">{xmlItem.codigo} · {formatNumber(xmlItem.quantidade, 3)} {xmlItem.unidade} × {formatCurrency(xmlItem.valorUnitario)} · desconto {formatCurrency(xmlItem.desconto)}</Typography>
          {canReconcile && !confirmed ? <Stack spacing={1.5} sx={{ mt: 2 }}>
            <ReferenceSelect label="Produto correspondente" value={item.produtoId} required disabled={busy} onChange={(id) => patchItem(item.sequencia, { produtoId: id })} reference={{ basePath: '/api/produtos', labelField: 'nome', readPermissions: ['catalog:read'], params: { ativo: true } }} />
            <ProductUnit org={org} id={item.produtoId} />
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
              <TextField label="Fator de conversão" type="number" value={item.fatorConversao} disabled={busy} inputProps={{ min: 0.001, step: 'any' }} onChange={(e) => patchItem(item.sequencia, { fatorConversao: Number(e.target.value) })} />
              <TextField label="Valor por unidade do cadastro" type="number" value={item.valorUnitario} disabled={busy} inputProps={{ min: 0, step: 0.01 }} onChange={(e) => patchItem(item.sequencia, { valorUnitario: Number(e.target.value) })} />
            </Stack>
            <Typography variant="body2">Quantidade convertida: {formatNumber(xmlItem.quantidade * item.fatorConversao, 3)}</Typography>
            {order && <Autocomplete options={selectedOrder.data?.itens ?? []} value={selectedOrder.data?.itens.find((row) => row.id === item.itemOrdemCompraId) ?? null}
              getOptionLabel={(row) => `${row.produtoNome} · pendente ${formatNumber(row.quantidadePendente, 3)}`}
              isOptionEqualToValue={(a, b) => a.id === b.id} disabled={busy} onChange={(_, row) => patchItem(item.sequencia, { itemOrdemCompraId: row?.id })}
              renderInput={(params) => <TextField {...params} label="Item correspondente do pedido" required />} />}
            <TextField label="Motivo de divergência (quando necessário)" value={item.motivoDivergencia} disabled={busy} onChange={(e) => patchItem(item.sequencia, { motivoDivergencia: e.target.value })} />
          </Stack> : persisted && <Typography sx={{ mt: 1 }}>{persisted.produtoNome} · {formatNumber(persisted.quantidade, 3)} {persisted.unidadeDestino}</Typography>}
        </Box>;
      })}
      {canReconcile && !confirmed && <PrimaryButton disabled={busy} onClick={() => { setError(null); save.mutate(); }} sx={{ alignSelf: 'flex-start' }}>Salvar conciliação</PrimaryButton>}
    </Stack></Card>
    {value.status !== 'IMPORTADA' && !confirmed && canManage && <Card sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
      <Typography variant="h6">3. Confira a mercadoria recebida</Typography>
      <Typography color="text.secondary">Informe a contagem física na unidade do cadastro. Não use o valor esperado sem conferir a entrega.</Typography>
      {value.itens.map((row) => <TextField key={row.sequencia} label={`Quantidade conferida — ${row.produtoNome}`}
        type="number" inputProps={{ min: 0, step: 'any' }} value={items.find((item) => item.sequencia === row.sequencia)?.quantidadeConferida ?? ''}
        helperText={`Esperado: ${formatNumber(row.quantidade, 3)} ${row.unidadeDestino}`} disabled={busy || dirty}
        onChange={(e) => patchItem(row.sequencia, { quantidadeConferida: e.target.value }, false)} />)}
      {dirty && <Alert severity="info">Salve as alterações da conciliação antes de conferir ou confirmar.</Alert>}
      {countDirty && <Alert severity="info">Salve a contagem alterada antes de confirmar os lançamentos.</Alert>}
      <PrimaryButton disabled={busy || dirty} onClick={() => { setError(null); count.mutate(); }} sx={{ alignSelf: 'flex-start' }}>Salvar conferência física</PrimaryButton>
    </Stack></Card>}
    {value.status === 'CONFERIDA' && canManage && !dirty && !countDirty && <Card sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
      <Typography variant="h6">4. Confirme os lançamentos</Typography>
      <Typography>{receipt ? 'O estoque pertence ao recebimento selecionado e não será somado novamente.' : order ? 'A confirmação registra o recebimento do pedido e a nota na mesma operação.' : 'A confirmação registra a entrada de estoque desta nota.'} As contas a pagar serão geradas somente agora.</Typography>
      {order && !receipt && !permissions.includes('purchases:manage') ? <Alert severity="warning">Seu perfil não permite registrar o recebimento da compra. Solicite essa operação a um responsável.</Alert>
        : <PrimaryButton disabled={busy} onClick={() => setConfirming(true)} sx={{ alignSelf: 'flex-start' }}>Confirmar lançamentos</PrimaryButton>}
    </Stack></Card>}
    <ConfirmDialog open={confirming} title="Confirmar entrada e contas a pagar" message="Os lançamentos serão registrados internamente. Esta ação não transmite documento fiscal nem efetua pagamento bancário. Conferiu os produtos, quantidades e valores?"
      confirmLabel="Confirmar lançamentos" loading={confirm.isPending} onClose={() => setConfirming(false)} onConfirm={() => confirm.mutate()} />
  </Stack>;
}

export function XmlInboundImportPage() {
  const { activeOrganization, permissions } = useAuth();
  const org = activeOrganization?.organizationId;
  const [params, setParams] = useSearchParams();
  const id = Number(params.get('importacao'));
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { notify } = useSnackbar();
  const queryClient = useQueryClient();
  const canRead = permissions.includes('fiscal:read');
  const canManage = permissions.includes('fiscal:manage');
  const listKey = org ? tenantQueryKey(org, 'inbound-imports') : ['inbound-imports'];
  const detailKey = org ? tenantQueryKey(org, 'inbound-import', id) : ['inbound-import'];
  const list = useQuery({ queryKey: [...listKey, page], queryFn: () => inboundImportsApi.list(page), enabled: !!org && canRead });
  const detail = useQuery({ queryKey: detailKey, queryFn: () => inboundImportsApi.get(id), enabled: !!org && canRead && Number.isSafeInteger(id) && id > 0 });
  const select = (value: InboundImport) => {
    queryClient.setQueryData(tenantQueryKey(org!, 'inbound-import', value.id), value);
    setParams((current) => { const next = new URLSearchParams(current); next.set('importacao', String(value.id)); return next; });
    void queryClient.invalidateQueries({ queryKey: listKey });
  };
  const upload = useMutation({ mutationFn: async (file: File) => { validateXmlFile(file); return inboundImportsApi.upload(file); },
    onSuccess: (value) => { setError(null); select(value); notify('Documento importado. Confira os cadastros e a mercadoria antes de lançar.', 'success'); },
    onError: (e) => setError(describeError(e)) });
  if (!org || !canRead) return <Alert severity="warning">Seu contexto não possui permissão fiscal de leitura.</Alert>;
  return <Box>
    <PageHeader title="Importar nota do fornecedor" subtitle="Importe o XML, relacione os produtos e confira a entrega antes de movimentar estoque e contas."
      action={<Button component={RouterLink} to="/app/notas-entrada">Voltar às notas de entrada</Button>} />
    <Stack spacing={3}>
      {canManage && <Card sx={{ p: 2.5 }}><Stack spacing={1}>
        <Button component="label" variant="contained" startIcon={<UploadFileOutlinedIcon />} disabled={upload.isPending} sx={{ alignSelf: 'flex-start' }}>
          {upload.isPending ? 'Importando…' : 'Importar arquivo XML'}
          <input aria-label="Arquivo XML da nota" type="file" accept=".xml,application/xml,text/xml" hidden disabled={upload.isPending} onChange={(e) => { const file = e.target.files?.[0]; if (file) upload.mutate(file); e.target.value = ''; }} />
        </Button><Typography variant="body2" color="text.secondary">Arquivo XML de até 2 MB. Reimportar o mesmo documento recupera o registro existente, sem duplicar lançamentos.</Typography>
      </Stack></Card>}
      {error && <Alert severity="error">{error}</Alert>}
      {detail.isLoading && <ListingSkeleton />}
      {detail.isError && <ErrorState message={describeError(detail.error)} onRetry={() => void detail.refetch()} />}
      {detail.data && <Reconciliation key={`${org}:${detail.data.id}:${detail.data.version}`} value={detail.data} org={org} onUpdated={select} onReload={() => void detail.refetch()} />}
      <Card sx={{ p: 2.5 }}><Typography variant="h6" gutterBottom>Importações anteriores</Typography>
        {list.isLoading && <ListingSkeleton />}
        {list.isError && <ErrorState message={describeError(list.error)} onRetry={() => void list.refetch()} />}
        {list.data?.content.length === 0 && <EmptyState title="Nenhum documento importado" description="As importações ficam salvas para continuar a conferência depois." />}
        <Stack spacing={1}>{list.data?.content.map((row) => <Button key={row.id} variant={id === row.id ? 'outlined' : 'text'}
          onClick={() => setParams({ importacao: String(row.id) })} sx={{ textAlign: 'left', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <span>Nota {row.numero} · {row.emitenteNome}</span><span>{formatCurrency(row.total)} · {statusLabel[row.status]}</span>
        </Button>)}</Stack>
        {list.data && list.data.totalPages > 1 && <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <Typography>Página {page + 1} de {list.data.totalPages}</Typography>
          <Button disabled={page + 1 >= list.data.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </Stack>}
      </Card>
    </Stack>
  </Box>;
}
