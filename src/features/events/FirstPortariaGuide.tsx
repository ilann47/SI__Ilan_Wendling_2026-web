import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { Alert, Box, Button, Card, Chip, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { eventCatalogApi, eventDetailPath, firstEventKey } from '../../api/eventCatalog';
import { eventPatioSummaryQuery, isPreparingPortaria, portariaPreparationSteps } from '../../api/eventPatioSummary';
import { allowsAccess, PATIO_CASH_ACCESS } from '../../auth/accessPolicy';

export function FirstPortariaGuide({ orgId, permissions, showExistingLink = false }: {
  orgId: number; permissions: readonly string[]; showExistingLink?: boolean;
}) {
  const catalog = useQuery({
    queryKey: firstEventKey(orgId),
    queryFn: ({ signal }) => eventCatalogApi.firstEvent(signal),
    refetchOnMount: 'always',
  });
  const event = catalog.data?.totalElements === 1 ? catalog.data.content[0] : undefined;
  const preparing = !!event && isPreparingPortaria(event.status);
  const summary = useQuery(eventPatioSummaryQuery(orgId, preparing ? event : undefined));
  const canOpen = permissions.includes('access:operate') && permissions.includes('events:publish');
  const canRunCash = allowsAccess(permissions, { anyOf: PATIO_CASH_ACCESS });
  const empty = catalog.isSuccess && catalog.data.totalElements === 0;
  const prep = summary.isSuccess ? summary.data.preparacao : undefined;

  if (catalog.isError || (preparing && summary.isError)) {
    return <Alert severity="warning" sx={{ mb: 3 }}
      action={<Button onClick={() => void (catalog.isError ? catalog.refetch() : summary.refetch())}>Tentar novamente</Button>}>
      Não foi possível consultar a preparação da portaria.
    </Alert>;
  }
  if (event?.status === 'EM_OPERACAO' && canRunCash) {
    return <Alert severity="success" sx={{ mb: 3, '& .MuiAlert-message': { minWidth: 0 } }}
      action={<Button component={RouterLink} to="/app/patio" color="inherit">Ir ao Pátio</Button>}>
      <strong>Portaria aberta.</strong> No Pátio, selecione o evento e abra seu turno para registrar entradas e saídas.
    </Alert>;
  }
  if (showExistingLink && catalog.isPending) return <Typography role="status" sx={{ mb: 3 }}>Consultando eventos…</Typography>;
  if (showExistingLink && catalog.isSuccess && !empty && !preparing) {
    return <Alert severity="info" sx={{ mb: 3 }}
      action={<Button component={RouterLink} to="/app/eventos" color="inherit">Abrir Eventos e ofertas</Button>}>
      Acompanhe a preparação e a operação dos seus eventos na listagem.
    </Alert>;
  }
  if (!empty && !preparing) return null;

  const next = prep && portariaPreparationSteps.find((step) => !prep[step.key]);
  const steps = [
    { label: 'Criar o evento', help: 'Informe nome, data e horários.', state: event ? 'Concluída' : 'Primeiro passo' },
    ...portariaPreparationSteps.map(({ key, label, help }) => ({
      label, help, state: prep ? (prep[key] ? 'Concluída' : 'Pendente') : (empty ? 'A seguir' : undefined),
    })),
    { label: 'Abrir a portaria', help: 'Inicie a portaria sem venda antecipada. Depois, abra o turno no Pátio.',
      state: prep ? (prep.pronto && canOpen ? 'Pronta para abrir' : 'Pendente') : (empty ? 'A seguir' : undefined) },
  ];
  return <Card component="section" variant="outlined" aria-labelledby="first-portaria-title"
    sx={{ p: { xs: 2, sm: 3 }, mb: 3, minWidth: 0, borderTop: 3, borderTopColor: 'primary.main' }}>
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'flex-start' }} justifyContent="space-between" gap={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="overline" color="primary" fontWeight={750}>Primeiros passos</Typography>
          <Typography id="first-portaria-title" component="h2" variant="h5" fontWeight={800}>Prepare sua primeira portaria</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
            {event ? `Evento: ${event.name}` : 'Configure o estacionamento para receber e liberar veículos pela placa.'}
          </Typography>
        </Box>
        <Button component={RouterLink} to={event ? eventDetailPath(event.id) : '/app/eventos?formulario=evento'}
          endIcon={<ArrowForwardRoundedIcon />} variant="contained" sx={{ flexShrink: 0, minHeight: 44 }}>
          {event ? 'Continuar preparação' : 'Criar primeiro evento'}
        </Button>
      </Stack>
      {preparing && !prep && <Typography role="status" variant="body2">Consultando o que falta…</Typography>}
      {next && <Typography variant="body2" fontWeight={700}>Próxima etapa: {next.label}</Typography>}
      {prep?.pronto && <Alert severity={canOpen ? 'success' : 'info'}>
        {canOpen ? 'Tudo pronto. Continue para iniciar a portaria.'
          : 'Configuração pronta. Peça a alguém com acesso para iniciar a portaria.'}
      </Alert>}
      {prep && !prep.pronto && !next && prep.pendencias.length > 0 && <Alert severity="info">{prep.pendencias.join(' ')}</Alert>}
      <Box component="ol" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(3, minmax(0, 1fr))' },
        listStyle: 'none', m: 0, p: 0, gap: 1.25 }}>
        {steps.map(({ label, help, state }, index) => <Box component="li" key={label} aria-label={label}
          sx={{ minWidth: 0, border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
          <Stack direction="row" gap={1} alignItems="center" justifyContent="space-between" flexWrap="wrap">
            <Typography fontWeight={700} variant="body2">{index + 1}. {label}</Typography>
            {state && <Chip size="small" variant="outlined" label={state}
              color={state === 'Concluída' ? 'success' : state === 'Primeiro passo' || state === 'Pronta para abrir' ? 'primary' : 'default'} />}
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{help}</Typography>
        </Box>)}
      </Box>
    </Stack>
  </Card>;
}
