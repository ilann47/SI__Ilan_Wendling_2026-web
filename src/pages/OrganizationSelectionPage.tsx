import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { describeError } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export function OrganizationSelectionPage() {
  const { organizations, selectOrganization, logout } = useAuth();
  const [selecting, setSelecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const select = async (organizationId: number) => {
    setSelecting(organizationId);
    setError(null);
    try {
      await selectOrganization(organizationId);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setSelecting(null);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Stack spacing={2} sx={{ width: '100%', maxWidth: 560 }}>
        <Box>
          <Typography variant="h5">Selecione a organização</Typography>
          <Typography color="text.secondary">
            O contexto escolhido define os dados e permissões desta sessão.
          </Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        {organizations.map((organization) => (
          <Card key={organization.organizationId} variant="outlined">
            <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <BusinessOutlinedIcon color="primary" />
              <Box>
                <Typography variant="subtitle1">
                  {organization.tradeName || organization.legalName}
                </Typography>
                {organization.tradeName && (
                  <Typography variant="body2" color="text.secondary">
                    {organization.legalName}
                  </Typography>
                )}
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <Button
                onClick={() => select(organization.organizationId)}
                disabled={selecting !== null}
                startIcon={selecting === organization.organizationId
                  ? <CircularProgress size={16} />
                  : undefined}
              >
                Acessar
              </Button>
            </CardActions>
          </Card>
        ))}
        <Button color="inherit" onClick={logout}>Sair</Button>
      </Stack>
    </Box>
  );
}
