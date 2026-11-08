import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import DomainAddOutlinedIcon from '@mui/icons-material/DomainAddOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { useEffect, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { api, describeError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { ResourceIdField } from '../components/enterprise/ResourceIdField';
import { OperationalFormDialog } from '../components/form/OperationalFormDialog';
import { ReferenceSelect } from '../components/form/ReferenceSelect';
import { NumberField } from '../components/form/NumberField';
import { useSnackbar } from '../components/SnackbarProvider';
import { facilityCategories, facilityCategoryLabel, parseSpacesText, type FacilityCategory } from '../features/facilities/spaceImport';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';

interface VenueResponse {
  id: number; name: string; type: string; cityId: number; timeZone: string; active: boolean; version: number;
}
interface FacilityResponse {
  id: number; name: string; cityId: number; physicalCapacity: number; operationalCapacity: number; active: boolean; version: number;
}
interface SectorResponse {
  id: number; parkingFacilityId: number; code: string; name: string; capacity: number; categories: string[]; active: boolean; version: number;
}
interface SpaceBatchResponse {
  sectorId: number;
  requested: number;
  created: number;
  existing: number;
  conflicts: number;
  items: Array<{ id?: number; code: string; status: string; version?: number; detail?: string }>;
}

const blankAddress = {
  name: '', address: '', number: '', complement: '', district: '', postalCode: '', cityId: '',
};
const venueInitial = { ...blankAddress, timeZone: 'America/Sao_Paulo' };
const facilityInitial = { ...blankAddress, physicalCapacity: '100', operationalCapacity: '100', notes: '', active: true };
const sectorInitial = { code: '', name: '', capacity: '50', categories: ['COMUM'] as FacilityCategory[] };
const spacesInitial = 'A-01;COMUM;não;\nA-02;PCD;sim;Próxima ao acesso';

function AddressFields({ form, setForm, withTimeZone = false }: {
  form: typeof blankAddress & { timeZone?: string };
  setForm: Dispatch<SetStateAction<any>>;
  withTimeZone?: boolean;
}) {
  const update = (name: string, value: string) => setForm((current: Record<string, string>) => ({ ...current, [name]: value }));
  return (
    <Stack spacing={2}>
      <TextField label="Nome" value={form.name} onChange={(event) => update('name', event.target.value)} required inputProps={{ maxLength: 160 }} />
      <TextField label="Endereço" value={form.address} onChange={(event) => update('address', event.target.value)} required inputProps={{ maxLength: 120 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Número" value={form.number} onChange={(event) => update('number', event.target.value)} inputProps={{ maxLength: 10 }} fullWidth />
        <TextField label="Complemento" value={form.complement} onChange={(event) => update('complement', event.target.value)} inputProps={{ maxLength: 100 }} fullWidth />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Bairro" value={form.district} onChange={(event) => update('district', event.target.value)} required inputProps={{ maxLength: 60 }} fullWidth />
        <TextField label="CEP" value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} required inputProps={{ maxLength: 9 }} fullWidth />
        <Box sx={{ flex: 1 }}>
          <ReferenceSelect
            label="Cidade"
            value={form.cityId ? Number(form.cityId) : null}
            onChange={(value) => update('cityId', value ? String(value) : '')}
            reference={{ basePath: '/api/cidades', labelField: 'nome' }}
            required
          />
        </Box>
      </Stack>
      {withTimeZone && <TextField label="Fuso horário" value={form.timeZone ?? ''} onChange={(event) => update('timeZone', event.target.value)} required helperText="Ex.: America/Sao_Paulo" />}
    </Stack>
  );
}

function VenueForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const [form, setForm] = useState({ ...venueInitial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<VenueResponse>('/api/v1/venues', {
        ...form, cityId: Number(form.cityId), number: form.number || null, complement: form.complement || null,
      });
      remember('venue', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      notify('Local cadastrado com sucesso.', 'success');
      setForm({ ...venueInitial });
      onClose();
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormDialog open={open} onClose={onClose} title="Novo local de evento"
      description="Cadastre o endereço principal onde o evento acontece." formId="venue-create-form"
      submitLabel="Criar local" submitting={loading} error={error}
      dirty={JSON.stringify(form) !== JSON.stringify(venueInitial)} onSubmit={(event) => void submit(event)}>
      <AddressFields form={form} setForm={setForm} withTimeZone />
    </OperationalFormDialog>
  );
}

function FacilityForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const [form, setForm] = useState({ ...facilityInitial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<FacilityResponse>('/api/v1/parking-facilities', {
        ...form,
        cityId: Number(form.cityId),
        physicalCapacity: Number(form.physicalCapacity),
        operationalCapacity: Number(form.operationalCapacity),
        number: form.number || null,
        complement: form.complement || null,
        notes: form.notes || null,
      });
      remember('facility', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      notify('Pátio cadastrado com sucesso.', 'success');
      setForm({ ...facilityInitial });
      onClose();
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormDialog open={open} onClose={onClose} title="Novo pátio"
      description="A capacidade operacional não pode superar a capacidade física." formId="facility-create-form"
      submitLabel="Criar pátio" submitting={loading} error={error}
      dirty={JSON.stringify(form) !== JSON.stringify(facilityInitial)} onSubmit={(event) => void submit(event)}>
      <AddressFields form={form} setForm={setForm} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <NumberField label="Capacidade física" value={form.physicalCapacity} min={1} required fullWidth
          onValueChange={(physicalCapacity) => setForm((current) => ({ ...current, physicalCapacity }))} />
        <NumberField label="Capacidade operacional" value={form.operationalCapacity} min={0} required fullWidth
          onValueChange={(operationalCapacity) => setForm((current) => ({ ...current, operationalCapacity }))} />
      </Stack>
      <TextField label="Observações" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} inputProps={{ maxLength: 255 }} />
    </OperationalFormDialog>
  );
}

function SectorForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { recent, remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const [facilityId, setFacilityId] = useState('');
  const [form, setForm] = useState({ ...sectorInitial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<SectorResponse>(`/api/v1/parking-facilities/${Number(facilityId)}/sectors`, {
        ...form, code: form.code.toUpperCase(), capacity: Number(form.capacity),
      });
      remember('sector', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      notify('Setor cadastrado com sucesso.', 'success');
      setFacilityId('');
      setForm({ ...sectorInitial });
      onClose();
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormDialog open={open} onClose={onClose} title="Novo setor"
      description="Defina a capacidade e as categorias de vaga aceitas neste setor." formId="sector-create-form"
      submitLabel="Criar setor" submitting={loading} error={error}
      dirty={facilityId !== '' || JSON.stringify(form) !== JSON.stringify(sectorInitial)} onSubmit={(event) => void submit(event)}>
      <ResourceIdField label="Pátio" value={facilityId} onChange={setFacilityId} recent={recent('facility')} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Código" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required fullWidth />
        <TextField label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
        <NumberField label="Capacidade" value={form.capacity} min={1} required fullWidth
          onValueChange={(capacity) => setForm((current) => ({ ...current, capacity }))} />
      </Stack>
      <FormControl>
        <InputLabel id="sector-categories-label">Categorias</InputLabel>
        <Select multiple labelId="sector-categories-label" label="Categorias" value={form.categories} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value as FacilityCategory[] }))} renderValue={(selected) => selected.map(facilityCategoryLabel).join(', ')}>
          {facilityCategories.map((category) => <MenuItem key={category} value={category}><Checkbox checked={form.categories.includes(category)} /><ListItemText primary={facilityCategoryLabel(category)} /></MenuItem>)}
        </Select>
      </FormControl>
    </OperationalFormDialog>
  );
}

function SpaceImportForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { recent, remember } = useOperationalWorkspace();
  const { notify } = useSnackbar();
  const [sectorId, setSectorId] = useState('');
  const [text, setText] = useState(spacesInitial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const spaces = parseSpacesText(text);
      const response = await api.post<SpaceBatchResponse>(`/api/v1/sectors/${Number(sectorId)}/spaces:batch`, { spaces });
      response.data.items.filter((item) => item.id).forEach((item) => remember('space', {
        id: item.id!, label: `Vaga ${item.code}`, version: item.version, snapshot: { ...item },
      }));
      notify(`${response.data.created} vaga(s) importada(s) com sucesso.`, 'success');
      setSectorId('');
      setText(spacesInitial);
      onClose();
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormDialog open={open} onClose={onClose} title="Importar vagas"
      description="Informe uma vaga por linha: código; categoria; acessível; posição." formId="spaces-import-form"
      submitLabel="Importar lote" submitting={loading} error={error}
      dirty={sectorId !== '' || text !== spacesInitial} onSubmit={(event) => void submit(event)}>
      <ResourceIdField label="Setor" value={sectorId} onChange={setSectorId} recent={recent('sector')} />
      <TextField label="Vagas" value={text} onChange={(event) => setText(event.target.value)} multiline minRows={8} required helperText="Categorias: Comum, VIP, PCD, Equipe, Ônibus, Van ou Cortesia" />
    </OperationalFormDialog>
  );
}

export function FacilitiesPage() {
  const { permissions } = useAuth();
  const [tab, setTab] = useState(0);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const closeForm = () => setOpenForm(null);
  const content = [
    permissions.includes('organizations:admin') && {
      key: 'venue', label: 'Locais', actionLabel: 'Novo local', icon: <DomainAddOutlinedIcon />,
      description: 'Locais representam o endereço principal onde os eventos acontecem.',
      content: <VenueForm open={openForm === 'venue'} onClose={closeForm} />,
    },
    {
      key: 'facility', label: 'Pátios', actionLabel: 'Novo pátio', icon: <LocalParkingOutlinedIcon />,
      description: 'Pátios controlam a capacidade física e operacional disponível.',
      content: <FacilityForm open={openForm === 'facility'} onClose={closeForm} />,
    },
    {
      key: 'sector', label: 'Setores', actionLabel: 'Novo setor', icon: <AddLocationAltOutlinedIcon />,
      description: 'Setores organizam as vagas de um pátio por capacidade e categoria.',
      content: <SectorForm open={openForm === 'sector'} onClose={closeForm} />,
    },
    {
      key: 'spaces', label: 'Vagas', actionLabel: 'Importar vagas', icon: <GridViewOutlinedIcon />,
      description: 'A importação em lote cria as vagas de um setor com uma linha por vaga.',
      content: <SpaceImportForm open={openForm === 'spaces'} onClose={closeForm} />,
    },
  ].filter(Boolean) as Array<{ key: string; label: string; actionLabel: string; icon: ReactNode; description: string; content: ReactNode }>;
  useEffect(() => {
    if (tab >= content.length) setTab(0);
  }, [content.length, tab]);
  const active = content[tab];
  return (
    <Box>
      <PageHeader title="Instalações" subtitle="Cadastre a estrutura física usada pelos eventos, do local até as vagas."
        action={active ? <Button variant="contained" startIcon={active.icon} onClick={() => setOpenForm(active.key)}>{active.actionLabel}</Button> : undefined} />
      <Alert severity="info" sx={{ mb: 2 }}>A consulta completa das instalações ainda não está disponível. Os cadastros confirmados nesta sessão ficam acessíveis como referências recentes da organização.</Alert>
      <Tabs value={tab} onChange={(_, value) => { setTab(value); closeForm(); }} variant="scrollable" sx={{ mb: 2 }}>
        {content.map((item) => <Tab key={item.label} label={item.label} />)}
      </Tabs>
      {active && <Alert severity="info" variant="outlined">{active.description} Use <strong>{active.actionLabel}</strong> para abrir o cadastro.</Alert>}
      {active?.content}
    </Box>
  );
}
