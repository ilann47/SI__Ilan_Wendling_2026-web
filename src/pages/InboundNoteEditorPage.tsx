import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Card, Checkbox, FormControlLabel, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import { describeError } from '../api/client';
import { buildNotaEntradaPayload, canCorrectRejectedCreate, inboundNotesApi, inboundNoteVersion, type InboundNotePreview } from '../api/inboundNotes';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { hasResourceActionPermission } from '../components/crud/resourceConfig';
import { FieldRenderer } from '../components/form/FieldRenderer';
import type { FieldConfig } from '../components/form/fieldConfig';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { InboundNoteReview } from '../components/inboundNotes/InboundNoteReview';
import { useSnackbar } from '../components/SnackbarProvider';
import { notaEntradaConfig } from '../resources/fiscal';
import { tipoFreteOptions } from '../resources/options';
import type { NotaEntradaRequest, NotaEntradaResponse } from '../types';

type Values = Record<string, unknown>;
interface CreateAttempt { key: string; body: NotaEntradaRequest }
const initialValues = (): Values => ({ numero: '', serie: '', modelo: '', fornecedorId: '', dataEmissao: '', dataChegada: '',
  tipoFrete: '', localEstoqueId: '', condicaoPagamentoId: '', transportadoraId: '', valorFrete: 0, valorSeguro: 0,
  outrasDespesas: 0, valorDesconto: 0, observacao: '', observacaoInterna: '', itens: [] });

export function inboundNoteFormValues(note: NotaEntradaResponse): Values {
  return { ...initialValues(), ...note,
    itens: note.itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade,
      // O percentual da resposta é informativo/arredondado. O valor monetário
      // registrado é canônico; não reenviar dois descontos que podem divergir.
      valorUnitario: item.valorUnitario, valorDesconto: item.valorDesconto, percentualDesconto: '', unidadeMedida: item.unidadeMedida ?? '' })) };
}
const itemFields: FieldConfig[] = [
  { name: 'produtoId', label: 'Produto', type: 'reference', required: true, cols: 6,
    reference: { basePath: '/api/produtos', labelField: 'nome', params: { ativo: true }, readPermissions: ['catalog:read'], inheritFields: { unidadeMedidaSigla: 'unidadeMedida' } } },
  { name: 'unidadeMedida', label: 'Unidade do cadastro', type: 'text', cols: 3, disabled: true },
  { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, cols: 3, min: 0.000001, step: 0.000001 },
  { name: 'valorUnitario', label: 'Valor unitário', type: 'money', step: 0.000001, required: true, cols: 4 },
  { name: 'valorDesconto', label: 'Desconto do item', type: 'money', step: 0.000001, cols: 4 },
  { name: 'percentualDesconto', label: 'Desconto do item (%)', type: 'percent', step: 0.000001, cols: 4, helperText: 'Informe o valor ou o percentual. Se informar ambos, devem corresponder.' },
];
const fields: FieldConfig[] = [
  { name: '_documento', label: 'Documento e fornecedor', type: 'section', helperText: 'Identifique o documento recebido. A conferência mostrará os dados efetivamente utilizados.' },
  { name: 'fornecedorId', label: 'Fornecedor', type: 'reference', required: true, cols: 6,
    reference: { basePath: '/api/fornecedores', labelField: 'nome', params: { ativo: true }, readPermissions: ['suppliers:read'], inheritFields: { condicaoPagamentoId: 'condicaoPagamentoId', transportadoraId: 'transportadoraId' } } },
  { name: 'numero', label: 'Número da nota', type: 'text', required: true, cols: 2 },
  { name: 'serie', label: 'Série', type: 'text', required: true, cols: 2 },
  { name: 'modelo', label: 'Modelo', type: 'text', required: true, cols: 2 },
  { name: 'dataEmissao', label: 'Emissão', type: 'date', required: true, cols: 6, disableFuture: true,
    validate: (value) => typeof value === 'string' && value > dayjs().format('YYYY-MM-DD')
      ? 'A data de emissão não pode ser futura.' : true },
  { name: 'dataChegada', label: 'Chegada', type: 'date', cols: 6 },
  { name: '_entrega', label: 'Entrega e pagamento', type: 'section' },
  { name: 'localEstoqueId', label: 'Local de estoque', type: 'reference', required: true, cols: 6,
    reference: { basePath: '/api/v1/stock-locations', labelField: 'nome', params: { ativo: true }, readPermissions: ['stock:read'] } },
  { name: 'tipoFrete', label: 'Responsável pelo frete', type: 'select', required: true, cols: 6, options: tipoFreteOptions },
  { name: 'condicaoPagamentoId', label: 'Condição de pagamento', type: 'reference', cols: 6, helperText: 'Padrão do fornecedor; pode ser substituído. Confira as parcelas antes de confirmar.',
    reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome', params: { ativo: true }, readPermissions: ['payments:read'] } },
  { name: 'transportadoraId', label: 'Transportadora', type: 'reference', cols: 6,
    reference: { basePath: '/api/transportadoras', labelField: 'nome', params: { ativo: true }, readPermissions: ['logistics:read'] } },
  { name: 'itens', label: 'Produtos da nota', type: 'subitems', subFields: itemFields },
  { name: '_custos', label: 'Custos e descontos', type: 'section', helperText: 'Informe valores e quantidades com até seis casas decimais.' },
  { name: 'valorFrete', label: 'Frete', type: 'money', step: 0.000001, cols: 3 },
  { name: 'valorSeguro', label: 'Seguro', type: 'money', step: 0.000001, cols: 3 },
  { name: 'outrasDespesas', label: 'Outras despesas', type: 'money', step: 0.000001, cols: 3 },
  { name: 'valorDesconto', label: 'Desconto geral', type: 'money', step: 0.000001, cols: 3 },
  { name: 'observacao', label: 'Observação', type: 'textarea' },
  { name: 'observacaoInterna', label: 'Observação interna', type: 'textarea' },
];
const observationFieldNames = new Set(['observacao', 'observacaoInterna']);
const primaryFields = fields.filter((field) => !observationFieldNames.has(field.name));
const observationFields = fields.filter((field) => observationFieldNames.has(field.name));

export function InboundNoteEditorPage() {
  const { activeOrganization, permissions } = useAuth();
  const { id } = useParams();
  if (!activeOrganization || !hasResourceActionPermission(notaEntradaConfig, 'create', permissions)) return <Alert severity="warning">Criar ou editar notas exige gestão fiscal e leitura de fornecedores, catálogo e estoque.</Alert>;
  return <InboundNoteEditor key={`${activeOrganization.organizationId}:${id ?? 'nova'}`} org={activeOrganization.organizationId} />;
}
function InboundNoteEditor({ org }: { org: number }) {
  const { id } = useParams();
  const requestedId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useSnackbar();
  const client = useQueryClient();
  const form = useForm<Values>({ defaultValues: initialValues(), mode: 'onChange' });
  const values = useWatch({ control: form.control });
  const savedValues = useRef(JSON.stringify(initialValues()));
  const resetValues = useCallback((next: Values) => { savedValues.current = JSON.stringify(next); form.reset(next); }, [form]);
  const [saved, setSaved] = useState<NotaEntradaResponse | null>(null);
  const [review, setReview] = useState<{ value: InboundNotePreview; fingerprint: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmationUncertain, setConfirmationUncertain] = useState(false);
  const [checked, setChecked] = useState(false);
  const storageKey = `kaneko.inbound.intent.${org}.${user?.login ?? 'sessao'}`;
  const [attempt, setAttempt] = useState<CreateAttempt | null>(() => {
    if (id) return null;
    try { const raw = sessionStorage.getItem(storageKey); return raw ? JSON.parse(raw) as CreateAttempt : null; } catch { return null; }
  });
  const initialized = useRef(false);
  const retryingUnknown = useRef(false);
  const detail = useQuery({ queryKey: tenantQueryKey(org, 'notas-entrada', 'editar', requestedId), queryFn: () => inboundNotesApi.get(requestedId), enabled: !!id && Number.isSafeInteger(requestedId) && requestedId > 0 });
  useEffect(() => {
    if (detail.data && !initialized.current) { initialized.current = true; setSaved(detail.data); resetValues(inboundNoteFormValues(detail.data)); }
  }, [detail.data, resetValues]);
  useEffect(() => {
    if (attempt && !initialized.current) { initialized.current = true; resetValues({ ...initialValues(), ...attempt.body }); }
  }, [attempt, resetValues]);
  const dirty = form.formState.isDirty || JSON.stringify(values) !== savedValues.current;
  const navigationAfterSave = useRef(false);
  const blocker = useBlocker(() => !navigationAfterSave.current && (JSON.stringify(form.getValues()) !== savedValues.current || !!attempt));
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || attempt) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, attempt]);
  const refresh = () => client.invalidateQueries({ queryKey: ['tenant', org] });
  const fail = (cause: unknown) => { setConfirming(false); setError(describeError(cause)); };
  const validate = async (): Promise<NotaEntradaRequest> => {
    if (!await form.trigger()) throw new Error('Confira os campos destacados antes de continuar.');
    const data = form.getValues();
    if (data.dataEmissao && data.dataChegada && String(data.dataChegada) < String(data.dataEmissao)) throw new Error('A chegada não pode ser anterior à emissão.');
    return buildNotaEntradaPayload(data);
  };
  const preview = useMutation({ mutationFn: async () => {
    const body = await validate();
    return { value: await inboundNotesApi.preview(body, saved?.id, saved ? inboundNoteVersion(saved) : undefined), fingerprint: JSON.stringify(form.getValues()) };
  }, onSuccess: (result) => { setReview(result); setChecked(false); setError(null); }, onError: fail });
  const save = useMutation({ mutationFn: async () => {
    if (saved) return inboundNotesApi.updateDraft(saved.id, await validate(), inboundNoteVersion(saved));
    retryingUnknown.current = !!attempt;
    const next = attempt ?? { key: crypto.randomUUID(), body: await validate() };
    sessionStorage.setItem(storageKey, JSON.stringify(next)); setAttempt(next);
    return inboundNotesApi.createIdempotent(next.body, next.key);
  }, onSuccess: (note) => {
    sessionStorage.removeItem(storageKey); setAttempt(null); setSaved(note); resetValues(inboundNoteFormValues(note)); setReview(null); setError(null); void refresh();
    notify('Rascunho salvo. Confira valores e parcelas antes de confirmar.', 'success');
    if (!id) { navigationAfterSave.current = true; navigate(`/app/notas-entrada/${note.id}/editar`, { replace: true }); }
  }, onError: (cause) => {
    // Validação rejeitada não iniciou o documento; transporte incerto mantém o intento.
    if (!saved && canCorrectRejectedCreate(cause, retryingUnknown.current)) {
      sessionStorage.removeItem(storageKey); setAttempt(null);
    }
    fail(cause);
  } });
  const confirm = useMutation({ mutationFn: async () => {
    if (!saved || confirmationUncertain || dirty || !checked || !review || review.fingerprint !== JSON.stringify(form.getValues())) throw new Error('Salve e confira a versão atual antes de confirmar.');
    return inboundNotesApi.confirmRecoverable(saved.id, inboundNoteVersion(saved));
  }, onSuccess: (note) => { setConfirming(false); void refresh(); notify('Entrada confirmada. Consulte o estoque e os títulos da nota.', 'success'); navigationAfterSave.current = true; navigate(`/app/notas-entrada/${note.id}`); }, onError: (cause) => {
    setConfirmationUncertain(true); setChecked(false); setReview(null); fail(cause);
  } });
  const busy = save.isPending || preview.isPending || confirm.isPending;
  const currentReview = review?.fingerprint === JSON.stringify(values) ? review.value : null;
  if (id && (!Number.isSafeInteger(requestedId) || requestedId <= 0)) return <Alert severity="error">Identificador da nota inválido.</Alert>;
  if (id && detail.isLoading) return <ListingSkeleton />;
  if (id && detail.isError) return <ErrorState message={describeError(detail.error)} onRetry={() => void detail.refetch()} />;
  if (saved && saved.situacao !== 'PENDENTE') return <Alert severity="info" action={<Button onClick={() => navigate(`/app/notas-entrada/${saved.id}`)}>Ver nota</Button>}>Esta nota não é mais um rascunho. Notas confirmadas não podem ser editadas ou canceladas.</Alert>;
  return <Box>
    {dirty && <Typography role="status" sx={{ mb: 2 }}>Alterações não salvas</Typography>}
    <PageHeader title={saved ? `Editar rascunho ${saved.numero}` : 'Nova Nota de Entrada'} subtitle="Documento do fornecedor, conferência e uma única confirmação de estoque e contas." />
    {error && <Alert severity="error" sx={{ mb: 2 }} action={saved ? <Button disabled={busy} onClick={async () => {
      try { const note = await inboundNotesApi.get(saved.id); setSaved(note); resetValues(inboundNoteFormValues(note)); setReview(null); setConfirmationUncertain(false); setError(null); } catch (cause) { fail(cause); }
    }}>Recarregar rascunho</Button> : undefined}>{error}</Alert>}
    {attempt && <Alert severity="warning" sx={{ mb: 2 }}>Há uma tentativa de gravação preservada. Reconciliar reutiliza exatamente os mesmos dados e a mesma chave para recuperar o rascunho sem duplicá-lo.</Alert>}
    {confirmationUncertain && <Alert severity="warning" sx={{ mb: 2 }}>Consulte o rascunho pelo botão Recarregar antes de tentar confirmar novamente. O resultado da tentativa anterior precisa ser reconciliado.</Alert>}
    <FormProvider {...form}><Card variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
      <Box component="fieldset" disabled={busy || !!attempt || confirmationUncertain} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' }, gap: 2 }}>
          {primaryFields.map((field) => <Box key={field.name} sx={{ gridColumn: { sm: `span ${field.type === 'section' || field.type === 'textarea' || field.type === 'subitems' ? 12 : field.cols ?? 6}` } }}><FieldRenderer field={{ ...field, disabled: field.disabled || busy || !!attempt || confirmationUncertain }} /></Box>)}
        </Box>
        <Accordion disableGutters elevation={0} slotProps={{ transition: { unmountOnExit: true } }} sx={{ border: 1, borderColor: 'divider', borderRadius: '12px !important', mt: 2, '&:before': { display: 'none' } }}>
          <AccordionSummary aria-label="Observações e informações complementares" expandIcon={<ExpandMoreIcon />}>
            <Box>
              <Typography fontWeight={700}>Observações e informações complementares</Typography>
              <Typography color="text.secondary" variant="body2">Campos opcionais para comunicação com o fornecedor e uso interno.</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' }, gap: 2 }}>
              {observationFields.map((field) => <Box key={field.name} sx={{ gridColumn: { sm: 'span 12' } }}><FieldRenderer field={{ ...field, disabled: field.disabled || busy || !!attempt || confirmationUncertain }} /></Box>)}
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Card></FormProvider>
    <Box role="toolbar" aria-label="Ações da Nota de Entrada" sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 2, bottom: 12, boxShadow: 3, mb: 3, p: 1.5, position: 'sticky', zIndex: 10 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} justifyContent="flex-end">
        <Button disabled={busy} onClick={() => navigate('/app/notas-entrada')}>Voltar à lista</Button>
        <Button variant="outlined" disabled={busy || confirmationUncertain} onClick={() => save.mutate()}>{attempt ? 'Reconciliar tentativa de gravação' : 'Salvar rascunho'}</Button>
        <Button variant="contained" disabled={busy || !!attempt || confirmationUncertain || (!!saved && dirty)} onClick={() => preview.mutate()}>Conferir valores e parcelas</Button>
      </Stack>
    </Box>
    {saved && dirty && <Alert severity="info" sx={{ mb: 2 }}>Salve as alterações antes de conferir os custos e vencimentos da nova revisão.</Alert>}
    {currentReview && <Card variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <InboundNoteReview value={currentReview} />
      {(!saved || dirty) ? <Alert severity="info" sx={{ mt: 2 }}>Salve o rascunho e confira a versão salva antes de confirmar a entrada.</Alert> : <>
        <FormControlLabel control={<Checkbox checked={checked} disabled={busy} onChange={(_, selected) => setChecked(selected)} />} label="Conferi o documento, as quantidades físicas, o local, os custos e os vencimentos desta versão." />
        <Button variant="contained" disabled={busy || !checked} onClick={() => setConfirming(true)}>Confirmar entrada</Button>
      </>}
    </Card>}
    {review && !currentReview && <Alert severity="info">Os dados foram alterados. Atualize a conferência antes de confirmar.</Alert>}
    <ConfirmDialog open={confirming} title="Confirmar esta entrada?" message="As quantidades entrarão no local informado e os títulos previstos serão gerados uma única vez. A nota confirmada não poderá ser editada nem cancelada." confirmLabel="Confirmar entrada" loading={confirm.isPending} onClose={() => setConfirming(false)} onConfirm={() => confirm.mutate()} />
    <ConfirmDialog open={blocker.state === 'blocked'} title="Sair do formulário?" message={attempt ? 'A tentativa de gravação continuará preservada para reconciliação. Nenhuma nova nota será criada ao sair.' : 'As alterações não salvas serão perdidas.'} confirmLabel="Sair" onClose={() => { if (blocker.state === 'blocked') blocker.reset(); }} onConfirm={() => { if (blocker.state === 'blocked') blocker.proceed(); }} />
  </Box>;
}
