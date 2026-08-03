import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CircularProgress,
  Chip,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { describeError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { readLastOrganizationId } from '../auth/organizationPreference';

export function OrganizationSelectionPage() {
  const { organizations, selectOrganization, logout } = useAuth();
  const [selecting, setSelecting] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const lastOrganizationId = readLastOrganizationId();
  const term = search.trim().toLocaleLowerCase('pt-BR');
  const visibleOrganizations = [...organizations]
    .filter((organization) => !term || [organization.legalName, organization.tradeName]
      .filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(term))
    .sort((left, right) => Number(right.organizationId === lastOrganizationId)
      - Number(left.organizationId === lastOrganizationId));

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
        <TextField
          label="Pesquisar organizacao"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlinedIcon /></InputAdornment> }}
        />
        {visibleOrganizations.map((organization) => (
          <Card key={organization.organizationId} variant="outlined">
            <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <BusinessOutlinedIcon color="primary" />
              <Box>
                <Typography variant="subtitle1">
                  {organization.tradeName || organization.legalName}
                </Typography>
                {organization.organizationId === lastOrganizationId && <Chip label="Usada recentemente" size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />}
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
        {visibleOrganizations.length === 0 && <Alert severity="info">Nenhuma organizacao corresponde a pesquisa.</Alert>}
        <Button color="inherit" onClick={logout}>Sair</Button>
      </Stack>
    </Box>
  );
}
