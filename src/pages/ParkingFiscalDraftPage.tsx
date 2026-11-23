import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Link, Stack, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { describeError, getHttpStatus } from '../api/client';
import { parkingFiscalDraftScope, parkingFiscalDraftsApi } from '../api/parkingFiscalDrafts';
import { customersListQueryKey, tenantQueryKey } from '../api/queryKeys';
import { useAuth } from '../auth/AuthContext';
import { OperationalFormPage } from '../components/form/OperationalFormPage';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';
import { RecordDetailPage } from '../components/listing/RecordDetailPage';
import { FiscalPayerFields } from '../features/fiscal/FiscalPayerFields';
import { EMPTY_FISCAL_PAYER, fiscalPayerPayload, type FiscalPayer } from '../features/fiscal/payer';
import { serviceNoteListHref } from '../features/fiscal/serviceNoteNavigation';
import { currency } from '../features/patio/operation';
import { formatDateTime, formatStatusLabel } from '../utils/format';

const pending = 'PENDENTE_EMISSAO';
type Editor = { version: number; original: FiscalPayer | null; identified: boolean; fields: FiscalPayer };
const setupEditor = (version: number, tomador: FiscalPayer | null): Editor => ({
  version, original: tomador, identified: !!tomador, fields: tomador ?? EMPTY_FISCAL_PAYER,
});

export function ParkingFiscalDraftPage() {
  const { activeOrganization, permissions } = useAuth();
  const { movimentacaoId } = useParams();
  const org = activeOrganization?.organizationId;
  const id = Number(movimentacaoId);
  if (!org || !permissions.includes('fiscal:read')) {
    return <Alert severity="warning">Seu acesso não permite consultar este rascunho fiscal.</Alert>;
  }
  if (!movimentacaoId || !/^[1-9]\d*$/.test(movimentacaoId) || !Number.isSafeInteger(id)) {
    return <Alert severity="error">Estadia inválida.</Alert>;
  }
  return <ParkingFiscalDraft key={`${org}:${id}`} org={org} id={id} permissions={permissions} />;
}

function ParkingFiscalDraft({ org, id, permissions }: { org: number; id: number; permissions: string[] }) {
  const { search } = useLocation();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [editor, setEditor] = useState<Editor | null>(null);
  const back = () => void navigate(serviceNoteListHref(search));
  const key = tenantQueryKey(org, parkingFiscalDraftScope, 'detail', id);
  const detail = useQuery({ queryKey: key, queryFn: () => parkingFiscalDraftsApi.detail(id), gcTime: 0 });
  const update = useMutation({
    mutationFn: ({ version, payer }: { version: number; payer: FiscalPayer | null }) => parkingFiscalDraftsApi.updatePayer(id, version, payer),
    onSuccess: (updated, { payer }) => {
      client.setQueryData(key, updated);
      setEditor(null);
      void client.invalidateQueries({ queryKey: tenantQueryKey(org, parkingFiscalDraftScope, 'list') });
      if (payer) void client.invalidateQueries({ queryKey: customersListQueryKey(org) });
    },
  });
  const draft = detail.data;
  const isPendingDraft = draft?.status === pending;
  const canEdit = isPendingDraft && permissions.includes('fiscal:manage');

  if (editor && canEdit && draft) {
    const payer = editor.identified ? fiscalPayerPayload(editor.fields) : null;
    const valid = !editor.identified || payer !== null;
    const dirty = editor.identified !== !!editor.original || (editor.identified
      && (editor.fields.documento !== (editor.original?.documento ?? '') || editor.fields.nome !== (editor.original?.nome ?? '')));
    const status = getHttpStatus(update.error);
    const stale = draft.version !== editor.version || status === 412 || status === 428 || status === 409;
    const message = stale ? 'O rascunho mudou. Consulte os dados atuais antes de salvar.' : update.error ? describeError(update.error) : null;
    return <OperationalFormPage title="Editar tomador do rascunho"
      description="O rascunho permanece vinculado à mesma estadia. Salvar não transmite nota nem gera cobrança."
      busy={update.isPending} dirty={dirty} error={message} submitLabel="Salvar rascunho"
      submitDisabled={!valid || !dirty || stale || detail.isFetching}
      recoveryAction={stale && <Button disabled={detail.isFetching} onClick={() => void detail.refetch().then((current) => {
        if (current.isSuccess && current.data) {
          update.reset();
          setEditor(current.data.status === pending ? setupEditor(current.data.version, current.data.tomador) : null);
        }
      })}>Recarregar dados</Button>}
      onClose={() => { update.reset(); setEditor(null); }}
      onSubmit={(event) => {
        event.preventDefault();
        if (!stale && !detail.isFetching && !update.isPending && valid && dirty) update.mutate({ version: editor.version, payer });
      }}>
      <FormControlLabel label="Identificar tomador" control={<Checkbox checked={editor.identified}
        onChange={(_, identified) => setEditor({ ...editor, identified })} />} />
      {editor.identified
        ? <>
          <Typography color="text.secondary" variant="body2">Se o CPF/CNPJ ainda não existir nesta organização, será criado um cadastro básico de cliente.</Typography>
          <FiscalPayerFields value={editor.fields} disabled={update.isPending} onChange={(fields) => setEditor({ ...editor, fields })} />
        </>
        : <Typography color="text.secondary" variant="body2">Tomador não informado. A emissão futura dependerá da regra fiscal aplicável.</Typography>}
    </OperationalFormPage>;
  }

  return <RecordDetailPage title={draft ? `Rascunho de NFS-e — ${draft.ordemServicoNumero ?? `Estadia ${id}`}` : 'Rascunho de NFS-e do estacionamento'}
    subtitle="Consulte o registro fiscal gerado ao concluir a estadia." onBack={back}
    actions={canEdit && draft && !detail.isError
      ? <Button variant="outlined" onClick={() => { update.reset(); setEditor(setupEditor(draft.version, draft.tomador)); }}>Editar tomador</Button>
      : undefined}>
    {detail.isPending && <ListingSkeleton />}
    {detail.isError && <ErrorState message={describeError(detail.error)} onRetry={() => void detail.refetch()} />}
    {draft && !detail.isError && <>
      {isPendingDraft && <Alert severity="info">Rascunho não transmitido ao fisco. A cobrança permanece vinculada ao caixa da estadia.</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography component="h2" variant="subtitle1" fontWeight={700}>Estadia {draft.movimentacaoId}</Typography>
          {draft.ordemServicoId && permissions.includes('service_orders:read') && <Link component={RouterLink}
            to={`/app/ordens-servico?detail=${draft.ordemServicoId}`}>Ver ordem de serviço</Link>}
        </Box>
        <Chip size="small" color={isPendingDraft ? 'warning' : 'default'}
          label={isPendingDraft ? 'Rascunho' : formatStatusLabel(draft.status)} sx={{ alignSelf: 'start' }} />
      </Stack>
      <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {[
          ['Placa', draft.placa],
          ['Evento', draft.eventoNome],
          ['Pátio', draft.patioNome],
          ...(draft.servicoNome ? [['Serviço', draft.servicoNome]] : []),
          ['Criado em', formatDateTime(draft.criadoEm)],
          ['Valor da estadia', currency(draft.valor)],
        ].map(([label, content]) => <Box key={label}>
          <Typography component="dt" variant="caption" color="text.secondary">{label}</Typography>
          <Typography component="dd" sx={{ m: 0, fontWeight: 600, overflowWrap: 'anywhere' }}>{content}</Typography>
        </Box>)}
      </Box>
      <Box>
        <Typography component="h2" variant="subtitle1" fontWeight={700}>Tomador do serviço</Typography>
        {draft.tomador
          ? <>
            <Chip label="Tomador identificado" size="small" sx={{ my: 1 }} />
            <Typography sx={{ overflowWrap: 'anywhere' }}>{draft.tomador.nome}</Typography>
            <Typography variant="body2" color="text.secondary">{draft.tomador.documento}</Typography>
          </>
          : <Typography color="text.secondary">Tomador não informado</Typography>}
      </Box>
    </>}
  </RecordDetailPage>;
}
