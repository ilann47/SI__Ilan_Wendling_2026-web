import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { allowsAccess, PATIO_CASH_ACCESS } from '../../auth/accessPolicy';
import { canOpenAppPath } from '../../auth/routeAccess';
import { hasResourceActionPermission } from '../../components/crud/resourceConfig';
import { configByKey } from '../../resources';
import { FirstPortariaGuide } from '../events/FirstPortariaGuide';

const routes = {
  instalacoes: 'Abrir Instalações',
  clientes: 'Abrir Clientes',
  veiculos: 'Abrir Veículos',
  mensalistas: 'Abrir Mensalistas',
  tarifas: 'Abrir Tarifas',
  patio: 'Ir ao Pátio',
} as const;
type Destination = keyof typeof routes;

function setupAccess(permissions: readonly string[]) {
  const canCreate = (key: 'clientes' | 'veiculos' | 'mensalistas' | 'tarifas') =>
    canOpenAppPath(`/app/${key}`, permissions)
    && hasResourceActionPermission(configByKey[key], 'create', permissions);
  return {
    instalacoes: canOpenAppPath('/app/instalacoes', permissions),
    clientes: canCreate('clientes'),
    veiculos: canCreate('veiculos'),
    mensalistas: canCreate('mensalistas'),
    tarifas: canCreate('tarifas'),
    patio: allowsAccess(permissions, { anyOf: PATIO_CASH_ACCESS }),
  };
}

function DailyParkingGuide({ access }: { access: ReturnType<typeof setupAccess> }) {
  const steps: { title: string; text: string; links: Destination[] }[] = [
    { title: 'Pátio ativo', text: access.instalacoes
      ? 'Cadastre ou confira o pátio e a capacidade disponível em Instalações.'
      : 'Use um pátio ativo da organização. Se ainda não houver um, peça o cadastro a quem gerencia as instalações.',
    links: ['instalacoes'] },
  ];
  if (access.mensalistas) steps.push({
    title: 'Se atende mensalistas',
    text: 'Cadastre o cliente e a placa, depois vincule os dois a um contrato ativo. A mensalidade é gerada separadamente; a estadia do mensalista não é cobrada na saída.',
    links: ['clientes', 'veiculos', 'mensalistas'],
  });
  if (access.tarifas) steps.push({
    title: 'Se recebe avulsos',
    text: 'Cadastre uma tarifa ativa de hora ou diária. Ela será usada para calcular a estadia comum de quem não tem contrato ativo.',
    links: ['tarifas'],
  });
  if (access.patio) steps.push({
    title: 'Abra seu turno e opere pela placa',
    text: 'No Pátio, use Pátio comum, sem evento. Abra o turno, registre a placa na entrada e confira a saída antes de liberar o veículo.',
    links: ['patio'],
  });
  return <Card component="section" variant="outlined" aria-labelledby="daily-parking-title"
    sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderTop: 3, borderTopColor: 'primary.main' }}>
    <Stack spacing={2}>
      <Box>
        <Typography id="daily-parking-title" component="h2" variant="h5" fontWeight={800}>Prepare o pátio comum</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Nenhum evento é necessário. Você pode atender mensalistas, avulsos ou os dois.
        </Typography>
      </Box>
      <Box component="ol" sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
        listStyle: 'none', p: 0, m: 0, gap: 1.5 }}>
        {steps.map(({ title, text, links }, index) => <Box component="li" key={title}
          sx={{ minWidth: 0, border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
          <Typography component="h3" variant="subtitle2" fontWeight={750}>{index + 1}. {title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{text}</Typography>
          {links.some((key) => access[key]) && <Stack direction="row" gap={0.75} flexWrap="wrap" sx={{ mt: 1 }}>
            {links.filter((key) => access[key]).map((key) => <Button key={key} component={RouterLink} to={`/app/${key}`}
              variant={key === 'patio' || key === 'instalacoes' ? 'contained' : 'outlined'} sx={{ minHeight: 44 }}>
              {routes[key]}
            </Button>)}
          </Stack>}
        </Box>)}
      </Box>
    </Stack>
  </Card>;
}

export function OrganizationStartGuide({ orgId, permissions }: { orgId: number; permissions: readonly string[] }) {
  const [params, setParams] = useSearchParams();
  const access = setupAccess(permissions);
  const canDaily = access.instalacoes || access.mensalistas || access.tarifas;
  const canEvents = canOpenAppPath('/app/eventos', permissions) && permissions.includes('events:create');
  if (!canDaily && !canEvents) return null;
  const both = canDaily && canEvents;
  const choice = both ? params.get('guia') : canDaily ? 'dia-a-dia' : 'eventos';
  const choose = (mode: 'dia-a-dia' | 'eventos') => setParams((current) => {
    const next = new URLSearchParams(current);
    next.set('guia', mode);
    return next;
  });

  return <>
    {both && <Card component="section" variant="outlined" aria-labelledby="start-guide-title"
      sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
      <Typography id="start-guide-title" component="h2" variant="h6" fontWeight={800}>Como você vai operar?</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        Escolha o que quer configurar. A organização pode usar os dois caminhos.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        <Button variant={choice === 'dia-a-dia' ? 'contained' : 'outlined'} aria-pressed={choice === 'dia-a-dia'}
          onClick={() => choose('dia-a-dia')} sx={{ minHeight: 44 }}>Estacionamento do dia a dia</Button>
        <Button variant={choice === 'eventos' ? 'contained' : 'outlined'} aria-pressed={choice === 'eventos'}
          onClick={() => choose('eventos')} sx={{ minHeight: 44 }}>Estacionamento de eventos</Button>
      </Stack>
    </Card>}
    {choice === 'dia-a-dia' && canDaily && <DailyParkingGuide access={access} />}
    {choice === 'eventos' && canEvents && <FirstPortariaGuide orgId={orgId} permissions={permissions} showExistingLink={both} />}
  </>;
}
