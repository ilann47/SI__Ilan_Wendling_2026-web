import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';

export function DashboardPage() {
  const { activeOrganization, permissions } = useAuth();
  const canOperateAccess = ['access:validate', 'access:checkin', 'access:checkout']
    .some((permission) => permissions.includes(permission));
  const canReadAudit = permissions.includes('audit:read');
  const organizationName = activeOrganization?.tradeName
    || activeOrganization?.legalName
    || 'organizacao ativa';

  return (
    <Box>
      <PageHeader
        title="Operacao de eventos"
        subtitle={'Contexto isolado: ' + organizationName + '.'}
      />

      <Card variant="outlined" sx={{ maxWidth: 840 }}>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <EventAvailableOutlinedIcon color="primary" />
              <Box>
                <Typography variant="h6">Console enterprise</Typography>
                <Typography variant="body2" color="text.secondary">
                  Somente recursos reais do fluxo de estacionamento para eventos sao exibidos.
                </Typography>
              </Box>
            </Stack>

            <Box>
              <Typography variant="overline" color="text.secondary">Permissoes efetivas</Typography>
              <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {permissions.length > 0
                  ? permissions.map((permission) => <Chip key={permission} label={permission} size="small" />)
                  : <Typography variant="body2" color="text.secondary">Nenhuma permissao operacional.</Typography>}
              </Stack>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {canOperateAccess && (
                <Button component={RouterLink} to="/app/acesso-eventos" variant="contained" startIcon={<QrCodeScannerOutlinedIcon />}>
                  Abrir console de acesso
                </Button>
              )}
              {canReadAudit && (
                <Button component={RouterLink} to="/app/tentativas-acesso" variant="outlined" startIcon={<FactCheckOutlinedIcon />}>
                  Consultar tentativas
                </Button>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
