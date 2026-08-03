import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined';
import { Alert, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { api, describeError } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { useSnackbar } from '../../components/SnackbarProvider';

interface MeResponse { id: number }
interface OrganizationResponse { id: number; legalName: string; version: number }

const initialForm = {
  document: '',
  legalName: '',
  tradeName: '',
  currency: 'BRL',
  timeZone: 'America/Sao_Paulo',
  region: 'BR-SP',
  plan: 'ENTERPRISE',
};

export function OrganizationProvisioningCard() {
  const { refreshOrganizations } = useAuth();
  const { notify } = useSnackbar();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const me = await api.get<MeResponse>('/api/v1/me');
      const created = await api.post<OrganizationResponse>('/api/v1/organizations', {
        ...form,
        tradeName: form.tradeName.trim() || null,
      });
      await api.post(`/api/v1/organizations/${created.data.id}/memberships`, {
        userId: me.data.id,
      });
      notify('Organizacao criada e acesso administrativo provisionado.', 'success');
      await refreshOrganizations();
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setLoading(false);
    }
  };

  const field = (name: keyof typeof form, value: string) => setForm((current) => ({
    ...current,
    [name]: value,
  }));

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack component="form" spacing={2} onSubmit={(event) => void submit(event)}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AddBusinessOutlinedIcon color="primary" />
            <div>
              <Typography variant="h6">Provisionar primeira organizacao</Typography>
              <Typography variant="body2" color="text.secondary">
                O primeiro vinculo recebe o papel de administrador da organizacao.
              </Typography>
            </div>
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Documento empresarial"
            value={form.document}
            onChange={(event) => field('document', event.target.value)}
            inputProps={{ maxLength: 20 }}
            required
          />
          <TextField
            label="Razao social"
            value={form.legalName}
            onChange={(event) => field('legalName', event.target.value)}
            inputProps={{ maxLength: 160 }}
            required
          />
          <TextField
            label="Nome fantasia"
            value={form.tradeName}
            onChange={(event) => field('tradeName', event.target.value)}
            inputProps={{ maxLength: 160 }}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Moeda" value={form.currency} onChange={(event) => field('currency', event.target.value.toUpperCase())} inputProps={{ maxLength: 3 }} required fullWidth />
            <TextField label="Regiao" value={form.region} onChange={(event) => field('region', event.target.value.toUpperCase())} inputProps={{ maxLength: 8 }} required fullWidth />
            <TextField label="Plano" value={form.plan} onChange={(event) => field('plan', event.target.value.toUpperCase())} inputProps={{ maxLength: 30 }} required fullWidth />
          </Stack>
          <TextField label="Fuso horario IANA" value={form.timeZone} onChange={(event) => field('timeZone', event.target.value)} inputProps={{ maxLength: 60 }} required />
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AddBusinessOutlinedIcon />}>
            Criar organizacao
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
