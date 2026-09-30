import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { purchaseReceiptValues } from '../api/purchaseReceiptValues';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { describeError } from '../api/client';
import {
  buildNotaEntradaPayload,
  inboundNotesApi,
  itemSubtotal,
  noteTotals,
} from '../api/inboundNotes';
import { purchaseApi, type PurchaseOrder, type PurchaseReceipt } from '../api/purchases';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { hasResourceActionPermission } from '../components/crud/resourceConfig';
import { ReferenceSelect } from '../components/form/ReferenceSelect';
import { PrimaryButton } from '../components/listing/PrimaryButton';
import { PurchaseProcessStrip } from '../components/purchases/PurchaseProcessStrip';
import { useSnackbar } from '../components/SnackbarProvider';
import { notaEntradaConfig } from '../resources/fiscal';
import { tipoFreteOptions } from '../resources/options';
import type { TipoFrete } from '../types';
import { formatCurrency, formatDateTime, formatStatusLabel } from '../utils/format';

const STEPS = [
  'Como chegou',
  'Identificar nota',
  'Conferir produtos',
  'Somar custos',
  'Guardar em',
  'Combinar pagamento',
  'Revisar e concluir',
] as const;

type OriginMode = 'manual' | 'recebimento';

export interface WizardItem {
  produtoId: number | null;
  produtoNome?: string;
  quantidade: number;
  valorUnitario: number;
  valorDesconto: number;
}

export interface WizardState {
  origin: OriginMode;
  ordemCompraId: number | null;
  recebimentoCompraId: number | null;
  numero: string;
  serie: string;
  modelo: string;
  tipoFrete: TipoFrete;
  dataEmissao: string;
  dataChegada: string;
  fornecedorId: number | null;
  observacao: string;
  itens: WizardItem[];
  valorFrete: number;
  valorSeguro: number;
  outrasDespesas: number;
  valorDesconto: number;
  localEstoqueId: number | null;
  condicaoPagamentoId: number | null;
}

const emptyItem = (): WizardItem => ({
  produtoId: null,
  quantidade: 1,
  valorUnitario: 0,
  valorDesconto: 0,
});

const initialState = (): WizardState => ({
  origin: 'manual',
  ordemCompraId: null,
  recebimentoCompraId: null,
  numero: '',
  serie: '',
  modelo: '',
  tipoFrete: 'CIF',
  dataEmissao: '',
  dataChegada: '',
  fornecedorId: null,
  observacao: '',
  itens: [emptyItem()],
  valorFrete: 0,
  valorSeguro: 0,
  outrasDespesas: 0,
  valorDesconto: 0,
  localEstoqueId: null,
  condicaoPagamentoId: null,
});

function applyReceipt(state: WizardState, order: PurchaseOrder, receipt: PurchaseReceipt, receipts: PurchaseReceipt[]): WizardState {
  return {
    ...state,
    origin: 'recebimento',
    ordemCompraId: order.id,
    recebimentoCompraId: receipt.id,
    fornecedorId: order.fornecedorId,
    numero: order.numeroNota,
    serie: order.serieNota,
    modelo: order.modeloNota,
    localEstoqueId: receipt.localEstoqueId,
    ...purchaseReceiptValues(order, receipt, receipts),
  };
}

export function validateInboundNoteStep(state: WizardState, index: number): string | null {
  if (index === 0 && state.origin === 'recebimento') {
    if (!state.ordemCompraId) return 'Selecione uma ordem de compra.';
    if (!state.recebimentoCompraId) return 'Selecione um recebimento.';
  }
  if (index === 1) {
    if (!state.numero.trim()) return 'Informe o número da nota.';
    if (!state.fornecedorId) return 'Selecione o fornecedor.';
    if (state.dataEmissao && state.dataChegada && state.dataChegada < state.dataEmissao) {
      return 'A data de chegada não pode ser anterior à emissão.';
    }
  }
  if (index === 2) {
    if (state.itens.length === 0) return 'Inclua ao menos um item.';
    if (state.itens.some((item) => !item.produtoId || !Number.isFinite(item.quantidade) || item.quantidade <= 0)) {
      return 'Cada item precisa de produto e quantidade positiva.';
    }
    if (state.itens.some((item) => !Number.isFinite(item.valorUnitario) || item.valorUnitario < 0)) {
      return 'O valor unitário dos itens não pode ser negativo.';
    }
    if (state.itens.some((item) => !Number.isFinite(item.valorDesconto) || item.valorDesconto < 0
      || item.valorDesconto > item.quantidade * item.valorUnitario)) {
      return 'O desconto de cada item deve estar entre zero e o valor bruto do item.';
    }
  }
  if (index === 3) {
    const costs = [state.valorFrete, state.valorSeguro, state.outrasDespesas, state.valorDesconto];
    if (costs.some((value) => !Number.isFinite(value) || value < 0)) {
      return 'Frete, seguro, outras despesas e desconto não podem ser negativos.';
    }
    const products = state.itens.reduce((sum, item) => sum + itemSubtotal(item), 0);
    if (state.valorDesconto > products + state.valorFrete + state.valorSeguro + state.outrasDespesas) {
      return 'O desconto da nota não pode exceder o valor da entrada.';
    }
  }
  if (index === 4 && !state.localEstoqueId) return 'Selecione o local de estoque.';
  return null;
}

export function InboundNoteWizardPage() {
  const { activeOrganization, permissions } = useAuth();
  const organizationId = activeOrganization?.organizationId;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { notify } = useSnackbar();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [draftKey] = useState(() => crypto.randomUUID());

  const canCreate = hasResourceActionPermission(notaEntradaConfig, 'create', permissions);
  const fromOrderId = Number(searchParams.get('ordemId'));
  const fromReceiptId = Number(searchParams.get('recebimentoId'));

  const orders = useQuery({
    queryKey: organizationId
      ? tenantQueryKey(organizationId, 'wizard-oc', orderSearch)
      : ['wizard-oc'],
    queryFn: () => purchaseApi.list({
      page: 0,
      size: 30,
      sort: 'dataEmissao,desc',
      ...(orderSearch.trim() ? { numero: orderSearch.trim() } : {}),
    }),
    enabled: !!organizationId && state.origin === 'recebimento' && permissions.includes('purchases:read'),
  });

  const receivableOrders = useMemo(
    () => (orders.data?.content ?? []).filter((order) => (
      order.status === 'APROVADA'
      || order.status === 'PARCIALMENTE_RECEBIDA'
      || order.status === 'RECEBIDA'
    )),
    [orders.data],
  );

  const receipts = useQuery({
    queryKey: organizationId && state.ordemCompraId
      ? tenantQueryKey(organizationId, 'wizard-receipts', state.ordemCompraId)
      : ['wizard-receipts'],
    queryFn: () => purchaseApi.receipts(state.ordemCompraId!),
    enabled: !!organizationId && !!state.ordemCompraId,
  });

  const selectedOrder = receivableOrders.find((order) => order.id === state.ordemCompraId)
    ?? (orders.data?.content ?? []).find((order) => order.id === state.ordemCompraId);

  useEffect(() => {
    if (!organizationId || !Number.isSafeInteger(fromOrderId) || fromOrderId <= 0) return;
    if (!Number.isSafeInteger(fromReceiptId) || fromReceiptId <= 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const [order, receiptList] = await Promise.all([
          purchaseApi.get(fromOrderId),
          purchaseApi.receipts(fromOrderId),
        ]);
        const receipt = receiptList.find((item) => item.id === fromReceiptId);
        if (!cancelled && receipt) {
          setState((current) => applyReceipt(current, order, receipt, receiptList));
          setStep(1);
        }
      } catch (error) {
        if (!cancelled) setFormError(describeError(error));
      }
    })();
    return () => { cancelled = true; };
  }, [fromOrderId, fromReceiptId, organizationId]);

  const totals = noteTotals({
    itens: state.itens
      .filter((item) => item.produtoId != null)
      .map((item) => ({
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorDesconto: item.valorDesconto,
      })),
    valorFrete: state.valorFrete,
    valorSeguro: state.valorSeguro,
    outrasDespesas: state.outrasDespesas,
    valorDesconto: state.valorDesconto,
  });

  const patch = (partial: Partial<WizardState>) => setState((current) => ({ ...current, ...partial }));

  const validateStep = (index: number): string | null => validateInboundNoteStep(state, index);

  const goNext = () => {
    const error = validateStep(step);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const buildValues = (): Record<string, unknown> => ({
    numero: state.numero,
    serie: state.serie,
    modelo: state.modelo,
    tipoFrete: state.tipoFrete,
    dataEmissao: state.dataEmissao,
    dataChegada: state.dataChegada,
    fornecedorId: state.fornecedorId,
    observacao: state.observacao,
    valorFrete: state.valorFrete,
    valorSeguro: state.valorSeguro,
    outrasDespesas: state.outrasDespesas,
    valorDesconto: state.valorDesconto,
    localEstoqueId: state.localEstoqueId,
    condicaoPagamentoId: state.condicaoPagamentoId,
    recebimentoCompraId: state.recebimentoCompraId,
    itens: state.itens.map((item) => ({
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorDesconto: item.valorDesconto,
    })),
  });

  const saveDraft = useMutation({
    mutationFn: async () => {
      const payload = buildNotaEntradaPayload(buildValues());
      return inboundNotesApi.createIdempotent(payload, draftKey);
    },
    onSuccess: (note) => {
      notify('Rascunho da nota salvo.', 'success');
      navigate(`/app/notas-entrada/${note.id}`);
    },
    onError: (error) => notify(describeError(error), 'error'),
  });

  const saveAndConfirm = useMutation({
    mutationFn: async () => {
      const payload = buildNotaEntradaPayload(buildValues());
      const created = await inboundNotesApi.createIdempotent(payload, draftKey);
      await inboundNotesApi.confirmRecoverable(created.id);
      return created;
    },
    onSuccess: (note) => {
      setConfirmOpen(false);
      notify(state.recebimentoCompraId
        ? 'Nota confirmada e contas a pagar geradas. O estoque permanece o do recebimento.'
        : 'Nota confirmada: estoque e contas a pagar atualizados.', 'success');
      navigate(`/app/notas-entrada/${note.id}`);
    },
    onError: (error) => {
      setConfirmOpen(false);
      notify(describeError(error), 'error');
    },
  });

  if (!organizationId || !canCreate) {
    return (
      <Alert severity="warning">
        Seu contexto não possui permissão para criar notas de entrada
        (fiscal:manage + leitura de fornecedores, catálogo e estoque).
      </Alert>
    );
  }

  const lockedFromReceipt = state.origin === 'recebimento' && !!state.recebimentoCompraId;

  return (
    <Box>
      <PageHeader
        title="Lançar nota de entrada"
        subtitle="Informe o que chegou, confira valores e escolha quando efetivar a entrada."
      />
      <PurchaseProcessStrip active="nota" />

      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3, display: { xs: 'none', md: 'flex' } }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>
      <Typography sx={{ display: { xs: 'block', md: 'none' }, fontWeight: 700, mb: 2 }}>
        Etapa {step + 1} de {STEPS.length}: {STEPS[step]}
      </Typography>

      {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

      {step === 0 && (
        <Stack spacing={2}>
          <FormControl>
            <Typography fontWeight={700} sx={{ mb: 1 }}>Como esta mercadoria chegou?</Typography>
            <RadioGroup
              value={state.origin}
              onChange={(_, value) => patch({
                origin: value as OriginMode,
                ...(value === 'manual'
                  ? { ordemCompraId: null, recebimentoCompraId: null }
                  : {}),
              })}
            >
              <FormControlLabel value="manual" control={<Radio />} label="Sem ordem de compra" />
              <FormControlLabel
                value="recebimento"
                control={<Radio />}
                label="Veio de uma ordem de compra já recebida"
              />
            </RadioGroup>
          </FormControl>

          {state.origin === 'recebimento' && (
            <Stack spacing={2}>
              <TextField
                label="Buscar pedido pelo número"
                size="small"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
              />
              <TextField
                select
                label="Pedido ao fornecedor"
                size="small"
                value={state.ordemCompraId ?? ''}
                onChange={(event) => patch({
                  ordemCompraId: event.target.value ? Number(event.target.value) : null,
                  recebimentoCompraId: null,
                })}
              >
                {receivableOrders.map((order) => (
                  <MenuItem key={order.id} value={order.id}>
                    Nota {order.numeroNota} · série {order.serieNota} — {order.fornecedorNome} ({formatStatusLabel(order.status)})
                  </MenuItem>
                ))}
              </TextField>
              {state.ordemCompraId && (
                <TextField
                  select
                  label="Recebimento"
                  size="small"
                  value={state.recebimentoCompraId ?? ''}
                  onChange={(event) => {
                    const receiptId = event.target.value ? Number(event.target.value) : null;
                    const receipt = (receipts.data ?? []).find((item) => item.id === receiptId);
                    if (receipt && selectedOrder) {
                      setState((current) => applyReceipt(current, selectedOrder, receipt, receipts.data ?? []));
                    } else {
                      patch({ recebimentoCompraId: receiptId });
                    }
                  }}
                  helperText={receipts.isLoading ? 'Carregando recebimentos…' : undefined}
                >
                  {(receipts.data ?? []).map((receipt) => (
                    <MenuItem key={receipt.id} value={receipt.id}>
                      #{receipt.id} — {receipt.localEstoqueNome} — {formatDateTime(receipt.recebidoEm)}
                      {' '}({receipt.itens.length} itens)
                    </MenuItem>
                  ))}
                </TextField>
              )}
              {lockedFromReceipt && (
                <Alert severity="info">
                  Produtos, fornecedor e local vieram do recebimento selecionado.
                  Confira valores e quantidades antes de continuar.
                </Alert>
              )}
            </Stack>
          )}
        </Stack>
      )}

      {step === 1 && (
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Número"
              required
              size="small"
              fullWidth
              disabled={lockedFromReceipt}
              value={state.numero}
              onChange={(event) => patch({ numero: event.target.value })}
            />
            <TextField
              label="Série"
              size="small"
              fullWidth
              disabled={lockedFromReceipt}
              value={state.serie}
              onChange={(event) => patch({ serie: event.target.value })}
            />
            <TextField
              label="Modelo"
              size="small"
              fullWidth
              disabled={lockedFromReceipt}
              value={state.modelo}
              onChange={(event) => patch({ modelo: event.target.value })}
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Tipo de frete"
              size="small"
              fullWidth
              value={state.tipoFrete}
              onChange={(event) => patch({ tipoFrete: event.target.value as TipoFrete })}
            >
              {tipoFreteOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Emissão"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={state.dataEmissao}
              onChange={(event) => patch({ dataEmissao: event.target.value })}
            />
            <TextField
              label="Chegada"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={state.dataChegada}
              onChange={(event) => patch({ dataChegada: event.target.value })}
            />
          </Stack>
          <ReferenceSelect
            label="Fornecedor"
            required
            disabled={lockedFromReceipt}
            value={state.fornecedorId}
            onChange={(value) => patch({ fornecedorId: value })}
            reference={{ basePath: '/api/fornecedores', labelField: 'nome', params: { ativo: true } }}
          />
          <TextField
            label="Observação"
            multiline
            minRows={2}
            value={state.observacao}
            onChange={(event) => patch({ observacao: event.target.value })}
          />
        </Stack>
      )}

      {step === 2 && (
        <Stack spacing={2}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Produto</TableCell>
                <TableCell align="right">Qtd.</TableCell>
                <TableCell align="right">Vlr. unit.</TableCell>
                <TableCell align="right">Desc.</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {state.itens.map((item, index) => (
                <TableRow key={`${item.produtoId ?? 'new'}-${index}`}>
                  <TableCell sx={{ minWidth: 220 }}>
                    <ReferenceSelect
                      label="Produto"
                      required
                      value={item.produtoId}
                      onChange={(value) => {
                        const next = [...state.itens];
                        next[index] = { ...item, produtoId: value, produtoNome: undefined };
                        patch({ itens: next });
                      }}
                      reference={{ basePath: '/api/produtos', labelField: 'nome', params: { ativo: true } }}
                    />
                    {item.produtoNome && (
                      <Typography variant="caption" color="text.secondary">{item.produtoNome}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={item.quantidade}
                      inputProps={{ min: 0, step: 0.001 }}
                      onChange={(event) => {
                        const next = [...state.itens];
                        next[index] = { ...item, quantidade: Number(event.target.value) };
                        patch({ itens: next });
                      }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={item.valorUnitario}
                      inputProps={{ min: 0, step: 0.01 }}
                      onChange={(event) => {
                        const next = [...state.itens];
                        next[index] = { ...item, valorUnitario: Number(event.target.value) };
                        patch({ itens: next });
                      }}
                      sx={{ width: 110 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      type="number"
                      size="small"
                      value={item.valorDesconto}
                      inputProps={{ min: 0, step: 0.01 }}
                      onChange={(event) => {
                        const next = [...state.itens];
                        next[index] = { ...item, valorDesconto: Number(event.target.value) };
                        patch({ itens: next });
                      }}
                      sx={{ width: 100 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(itemSubtotal(item))}
                  </TableCell>
                  <TableCell>
                    <Button
                      color="error"
                      size="small"
                      disabled={state.itens.length <= 1}
                      onClick={() => patch({ itens: state.itens.filter((_, i) => i !== index) })}
                      startIcon={<DeleteOutlineIcon />}
                    >
                      Remover
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button startIcon={<AddOutlinedIcon />} onClick={() => patch({ itens: [...state.itens, emptyItem()] })}>
            Adicionar item
          </Button>
          <Typography fontWeight={700}>Subtotal dos produtos: {formatCurrency(totals.produtos)}</Typography>
        </Stack>
      )}

      {step === 3 && (
        <Stack spacing={2} maxWidth={480}>
          <TextField
            label="Frete"
            type="number"
            size="small"
            value={state.valorFrete}
            inputProps={{ min: 0, step: 0.01 }}
            onChange={(event) => patch({ valorFrete: Number(event.target.value) })}
          />
          <TextField
            label="Seguro"
            type="number"
            size="small"
            value={state.valorSeguro}
            inputProps={{ min: 0, step: 0.01 }}
            onChange={(event) => patch({ valorSeguro: Number(event.target.value) })}
          />
          <TextField
            label="Outras despesas"
            type="number"
            size="small"
            value={state.outrasDespesas}
            inputProps={{ min: 0, step: 0.01 }}
            onChange={(event) => patch({ outrasDespesas: Number(event.target.value) })}
          />
          <TextField
            label="Desconto"
            type="number"
            size="small"
            value={state.valorDesconto}
            inputProps={{ min: 0, step: 0.01 }}
            onChange={(event) => patch({ valorDesconto: Number(event.target.value) })}
          />
          <Alert severity="info">Total geral: {formatCurrency(totals.total)}</Alert>
        </Stack>
      )}

      {step === 4 && (
        <Box maxWidth={480}>
          <ReferenceSelect
            label="Local de estoque"
            required
            disabled={lockedFromReceipt}
            value={state.localEstoqueId}
            onChange={(value) => patch({ localEstoqueId: value })}
            reference={{ basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true } }}
          />
        </Box>
      )}

      {step === 5 && (
        <Box maxWidth={480}>
          <ReferenceSelect
            label="Condição de pagamento"
            value={state.condicaoPagamentoId}
            onChange={(value) => patch({ condicaoPagamentoId: value })}
            reference={{ basePath: '/api/condicoes-pagamento', labelField: 'nome' }}
          />
        </Box>
      )}

      {step === 6 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Confira os dados abaixo. Você pode salvar para terminar depois ou concluir a entrada agora.
          </Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">Resumo da nota</Typography>
              <Typography><strong>Número:</strong> {state.numero || '—'}</Typography>
              <Typography><strong>Produtos:</strong> {state.itens.length} item(ns)</Typography>
              <Typography><strong>Subtotal:</strong> {formatCurrency(totals.produtos)}</Typography>
              <Typography><strong>Total da entrada:</strong> {formatCurrency(totals.total)}</Typography>
            </Stack>
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary">Ao concluir agora</Typography>
              <Typography>✓ A nota será registrada como confirmada.</Typography>
              <Typography>✓ As quantidades entrarão no estoque escolhido.</Typography>
              <Typography>✓ As contas a pagar serão criadas conforme a condição informada.</Typography>
              <Typography>✓ A operação não poderá ser editada diretamente depois.</Typography>
            </Stack>
          </Box>
          {state.recebimentoCompraId && (
            <Typography>
              <strong>Origem:</strong> recebimento da nota {selectedOrder?.numeroNota ?? 'selecionada'}
            </Typography>
          )}
        </Stack>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }} justifyContent="space-between">
        <Button color="inherit" onClick={() => navigate('/app/notas-entrada')}>
          Cancelar
        </Button>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button disabled={step === 0} onClick={() => { setFormError(null); setStep((current) => current - 1); }}>
            Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <PrimaryButton onClick={goNext}>Continuar</PrimaryButton>
          ) : (
            <>
              <Button
                variant="outlined"
                disabled={saveDraft.isPending || saveAndConfirm.isPending}
                onClick={() => {
                  const error = validateStep(1) || validateStep(2) || validateStep(3) || validateStep(4);
                  if (error) {
                    setFormError(error);
                    return;
                  }
                  saveDraft.mutate();
                }}
              >
                Salvar rascunho
              </Button>
              <PrimaryButton
                disabled={saveDraft.isPending || saveAndConfirm.isPending}
                onClick={() => {
                  const error = validateStep(1) || validateStep(2) || validateStep(3) || validateStep(4);
                  if (error) {
                    setFormError(error);
                    return;
                  }
                  setConfirmOpen(true);
                }}
              >
                Concluir entrada
              </PrimaryButton>
            </>
          )}
        </Stack>
      </Stack>

      <ConfirmDialog
        open={confirmOpen}
        title="Concluir esta entrada?"
        message="Os produtos entrarão no estoque e as contas a pagar serão geradas. Depois disso, use cancelamento ou ajustes para corrigir a operação."
        confirmLabel="Concluir entrada"
        loading={saveAndConfirm.isPending}
        onConfirm={() => saveAndConfirm.mutate()}
        onClose={() => setConfirmOpen(false)}
      />
    </Box>
  );
}
