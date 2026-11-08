import { Alert, Box, Button, Card, Stack } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useBeforeUnload, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom';
import { describeError, getHttpStatus } from '../api/client';
import { canCorrectRejectedCreate } from '../api/inboundNotes';
import { buildNotaSaidaPayload, outboundNotesApi, outboundNoteVersion } from '../api/outboundNotes';
import { tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PageHeader } from '../components/common/PageHeader';
import { hasResourceActionPermission } from '../components/crud/resourceConfig';
import { FieldRenderer } from '../components/form/FieldRenderer';
import { defaultValueFor, type FieldConfig } from '../components/form/fieldConfig';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { notaSaidaConfig } from '../resources/fiscal';
import type { NotaSaidaRequest, NotaSaidaResponse } from '../types';

type Values = Record<string, unknown>;
type Intent = { key: string; body: NotaSaidaRequest };
const listPath = '/app/notas-saida';
const docFields = ['numero', 'serie', 'modelo', 'dataEmissao', 'dataSaida'];
const sections = [
  { title: 'Identificação da nota', names: docFields },
  { title: 'Cliente, estoque e pagamento', names: ['clienteId', 'localEstoqueId', 'condicaoPagamentoId', 'tipoFrete'] },
  { title: 'Mercadorias', names: ['itens'] },
  { title: 'Custos e descontos', names: ['valorFrete', 'valorSeguro', 'outrasDespesas', 'valorDesconto'] },
  { title: 'Informações complementares', names: ['observacao'] },
];

const fields = new Map(notaSaidaConfig.fields.map((field): [string, FieldConfig] => {
  switch (field.name) {
    case 'numero': return [field.name, { ...field, label: 'Número da nota' }];
    case 'dataEmissao': return [field.name, { ...field, label: 'Data de emissão', cols: 6 }];
    case 'dataSaida': return [field.name, { ...field, label: 'Data de saída', cols: 6 }];
    case 'condicaoPagamentoId': return [field.name, { ...field, helperText: 'Sem condição, a cobrança é à vista. Confira as parcelas depois de salvar.',
      reference: { ...field.reference!, readPermissions: ['payments:read'], params: { ativo: true } } }];
    case 'valorDesconto': return [field.name, { ...field, label: 'Desconto geral' }];
    case 'itens': return [field.name, {
      ...field, label: 'Produtos da nota', subFields: field.subFields?.map((subfield) => {
        switch (subfield.name) {
          case 'quantidade': return { ...subfield, label: 'Quantidade', cols: 6 };
          case 'valorUnitario': return { ...subfield, label: 'Valor unitário', cols: 4 };
          case 'valorDesconto': return { ...subfield, label: 'Desconto do item', cols: 4 };
          case 'percentualDesconto': return { ...subfield, label: 'Desconto do item (%)', cols: 3, helperText: 'Informe o valor ou o percentual.' };
          default: return { ...subfield, cols: 6 };
        }
      }),
    }];
    default: return [field.name, field];
  }
}));

function valuesFor(note?: NotaSaidaResponse | NotaSaidaRequest): Values {
  const defaults = Object.fromEntries([...fields].map(([name, field]) => [name, defaultValueFor(field)]));
  if (!note) return defaults;
  return {
    ...Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => [name, note[name as keyof NotaSaidaRequest] ?? fallback])),
    itens: note.itens.map(({ produtoId, quantidade, valorUnitario, valorDesconto, percentualDesconto }) => ({
      produtoId, quantidade, valorUnitario, valorDesconto: valorDesconto ?? '',
      // O percentual derivado/arredondado não deve ser regravado com o valor canônico.
      percentualDesconto: 'id' in note ? '' : percentualDesconto ?? '',
    })),
  };
}

function storedIntent(storageKey: string): Intent | null {
  try {
    const stored = sessionStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) as Intent : null;
  } catch { return null; }
}

export function OutboundNoteEditorPage() {
  const { id } = useParams();
  const { activeOrganization, permissions, user } = useAuth();
  const org = activeOrganization?.organizationId;
  if (!org || !permissions.includes('fiscal:read') || !hasResourceActionPermission(notaSaidaConfig, 'create', permissions)) {
    return <Alert severity="warning">Criar ou editar notas de saída exige acesso fiscal e leitura de clientes, catálogo e estoque.</Alert>;
  }
  if (!id) return <OutboundEditor key={`${org}:nova`} org={org} login={user?.login} />;
  const noteId = Number(id);
  if (!Number.isSafeInteger(noteId) || noteId <= 0) return <Alert severity="error">Identificador da nota inválido.</Alert>;
  return <LoadOutboundEditor key={`${org}:${noteId}`} org={org} id={noteId} />;
}

function LoadOutboundEditor({ org, id }: { org: number; id: number }) {
  const detail = useQuery({
    queryKey: tenantQueryKey(org, 'notas-saida', 'edit', id),
    queryFn: () => outboundNotesApi.get(id),
    staleTime: 0,
  });
  if (detail.isPending) return <ListingSkeleton />;
  if (detail.isError) return <ErrorState message={describeError(detail.error)} onRetry={() => void detail.refetch()} />;
  if (detail.data.situacao !== 'PENDENTE') {
    return <><PageHeader title="Editar nota de saída" backFallback={`${listPath}/${id}`} />
      <Alert severity="info">Somente rascunhos podem ser editados.</Alert></>;
  }
  return <OutboundEditor org={org} note={detail.data} />;
}

function OutboundEditor({ org, login, note }: { org: number; login?: string; note?: NotaSaidaResponse }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const client = useQueryClient();
  const [saved, setSaved] = useState(note);
  const storageKey = `kaneko.outbound.intent.${org}.${login ?? 'sessao'}`;
  const [attempt, setAttempt] = useState(() => note ? null : storedIntent(storageKey));
  const [error, setError] = useState<string | null>(null);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [reloadPrompt, setReloadPrompt] = useState(false);
  const allowedNavigation = useRef(false);
  const updateSent = useRef(false);
  const form = useForm<Values>({ defaultValues: valuesFor(note ?? attempt?.body), mode: 'onChange' });
  const dirty = form.formState.isDirty;
  const blocker = useBlocker(() => !allowedNavigation.current && (dirty || !!attempt));
  useBeforeUnload((event) => {
    if (!allowedNavigation.current && (dirty || attempt)) event.preventDefault();
  });
  const back = saved ? `${listPath}/${saved.id}` : listPath;
  const fromDocument = !!saved && state?.outboundDocumentId === saved.id;
  const openDocument = (id: number) => {
    if (fromDocument) navigate(-1);
    else navigate(`${listPath}/${id}`, { replace: true });
  };
  const save = useMutation({
    mutationFn: async () => {
      updateSent.current = false;
      if (attempt) return outboundNotesApi.createDraft(attempt.body, attempt.key);
      if (!await form.trigger()) throw new Error('Confira os campos destacados antes de continuar.');
      const body = buildNotaSaidaPayload(form.getValues());
      if (saved) {
        const version = outboundNoteVersion(saved);
        updateSent.current = true;
        return outboundNotesApi.updateDraft(saved.id, body, version);
      }
      const intent = { key: crypto.randomUUID(), body };
      sessionStorage.setItem(storageKey, JSON.stringify(intent));
      setAttempt(intent);
      return outboundNotesApi.createDraft(body, intent.key);
    },
    onSuccess: (updated) => {
      if (!saved) sessionStorage.removeItem(storageKey);
      setAttempt(null); setError(null);
      client.setQueryData(tenantQueryKey(org, 'notas-saida', 'edit', updated.id), updated);
      void client.invalidateQueries({ queryKey: ['tenant', org] });
      allowedNavigation.current = true;
      openDocument(updated.id);
    },
    onError: (cause) => {
      if (!saved && canCorrectRejectedCreate(cause, !!attempt)) {
        sessionStorage.removeItem(storageKey); setAttempt(null);
      }
      const status = getHttpStatus(cause);
      if (updateSent.current && (!status || status >= 500 || status === 412 || status === 428)) setReloadRequired(true);
      setError(describeError(cause));
    },
  });
  const reload = useMutation({
    mutationFn: () => outboundNotesApi.get(saved!.id),
    onSuccess: (latest) => {
      setReloadPrompt(false); setReloadRequired(false); setError(null);
      client.setQueryData(tenantQueryKey(org, 'notas-saida', 'edit', latest.id), latest);
      if (latest.situacao !== 'PENDENTE') {
        allowedNavigation.current = true;
        openDocument(latest.id);
      } else {
        setSaved(latest); form.reset(valuesFor(latest));
      }
    },
    onError: (cause) => { setReloadPrompt(false); setError(describeError(cause)); },
  });
  const busy = save.isPending || reload.isPending;
  const locked = busy || !!attempt || reloadRequired;

  return (
    <Stack spacing={2}>
      <PageHeader title={saved ? `Editar nota ${saved.numero}` : 'Nova nota de saída'}
        subtitle="Salve o rascunho para conferir produtos, valores e parcelas antes de confirmar."
        backFallback={back} />
      {error && <Alert severity="error">{error}</Alert>}
      {attempt && <Alert severity="warning">Há uma tentativa de gravação em aberto. Reconcilie o mesmo rascunho antes de fazer alterações.</Alert>}
      {reloadRequired && <Alert severity="warning"
        action={<Button onClick={() => setReloadPrompt(true)} disabled={busy}>Recarregar</Button>}>
        Consulte a versão atual da nota antes de tentar salvar novamente.
      </Alert>}
      <FormProvider {...form}>
        <Card component="form" onSubmit={(event) => {
          event.preventDefault();
          if (!busy && !reloadRequired) { setError(null); save.mutate(); }
        }} noValidate>
          <Stack spacing={2.5} sx={{ p: { xs: 2, md: 3 } }}>
            {sections.map(({ title, names }, index) => (
              <Stack spacing={1.5} key={title}>
                <FieldRenderer field={{ name: `_section_${index}`, label: title, type: 'section' }} />
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, minmax(0, 1fr))' }, gap: 2, alignItems: 'start' }}>
                  {names.map((name) => {
                    const field = fields.get(name)!;
                    return <Box key={name} sx={{ gridColumn: { xs: 'span 1', sm: `span ${field.cols ?? 12}` }, minWidth: 0 }}>
                      <FieldRenderer field={{ ...field, disabled: locked }} />
                    </Box>;
                  })}
                </Box>
              </Stack>
            ))}
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end"
            sx={{ position: 'sticky', bottom: 0, p: 2, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
            <Button type="button" onClick={() => {
              if (fromDocument) navigate(-1);
              else navigate(back, { replace: true });
            }} disabled={busy}>Voltar sem salvar</Button>
            <Button type="submit" variant="contained" disabled={busy || reloadRequired}>
              {attempt ? 'Reconciliar tentativa de gravação' : 'Salvar e conferir'}
            </Button>
          </Stack>
        </Card>
      </FormProvider>
      <ConfirmDialog open={blocker.state === 'blocked'} title="Sair do formulário?"
        message={attempt ? 'A tentativa de gravação ficará disponível ao reabrir a nova nota.' : 'As alterações não salvas serão descartadas.'}
        confirmLabel="Sair do formulário" onClose={() => blocker.reset?.()} onConfirm={() => blocker.proceed?.()} />
      <ConfirmDialog open={reloadPrompt} title="Recarregar o rascunho?"
        message="Você verá o que foi gravado e as alterações não salvas serão descartadas."
        confirmLabel="Recarregar rascunho" loading={reload.isPending} onClose={() => setReloadPrompt(false)} onConfirm={() => reload.mutate()} />
    </Stack>
  );
}
