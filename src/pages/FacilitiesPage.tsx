import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import DomainAddOutlinedIcon from '@mui/icons-material/DomainAddOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
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
import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { api, describeError } from '../api/client';
import { PageHeader } from '../components/common/PageHeader';
import { OperationCard } from '../components/enterprise/OperationCard';
import { ResourceIdField } from '../components/enterprise/ResourceIdField';
import { ResourceSnapshot } from '../components/enterprise/ResourceSnapshot';
import { facilityCategories, parseSpacesText, type FacilityCategory } from '../features/facilities/spaceImport';
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

function AddressFields({ form, setForm, withTimeZone = false }: {
  form: typeof blankAddress & { timeZone?: string };
  setForm: Dispatch<SetStateAction<any>>;
  withTimeZone?: boolean;
}) {
  const update = (name: string, value: string) => setForm((current: Record<string, string>) => ({ ...current, [name]: value }));
  return (
    <Stack spacing={2}>
      <TextField label="Nome" value={form.name} onChange={(event) => update('name', event.target.value)} required inputProps={{ maxLength: 160 }} />
      <TextField label="Endereco" value={form.address} onChange={(event) => update('address', event.target.value)} required inputProps={{ maxLength: 120 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Numero" value={form.number} onChange={(event) => update('number', event.target.value)} inputProps={{ maxLength: 10 }} fullWidth />
        <TextField label="Complemento" value={form.complement} onChange={(event) => update('complement', event.target.value)} inputProps={{ maxLength: 100 }} fullWidth />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Bairro" value={form.district} onChange={(event) => update('district', event.target.value)} required inputProps={{ maxLength: 60 }} fullWidth />
        <TextField label="CEP" value={form.postalCode} onChange={(event) => update('postalCode', event.target.value)} required inputProps={{ maxLength: 9 }} fullWidth />
        <TextField label="ID da cidade" type="number" value={form.cityId} onChange={(event) => update('cityId', event.target.value)} required inputProps={{ min: 1 }} fullWidth />
      </Stack>
      {withTimeZone && <TextField label="Fuso horario IANA" value={form.timeZone ?? ''} onChange={(event) => update('timeZone', event.target.value)} required />}
    </Stack>
  );
}

function VenueForm() {
  const { remember } = useOperationalWorkspace();
  const [form, setForm] = useState({ ...blankAddress, timeZone: 'America/Sao_Paulo' });
  const [result, setResult] = useState<VenueResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<VenueResponse>('/api/v1/venues', {
        ...form, cityId: Number(form.cityId), number: form.number || null, complement: form.complement || null,
      });
      setResult(response.data);
      remember('venue', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationCard title="Novo local de evento" description="O local representa o endereco principal onde o evento acontece." error={error} result={result ? <ResourceSnapshot data={{ id: result.id, name: result.name, type: result.type, cityId: result.cityId, timeZone: result.timeZone, version: result.version }} /> : undefined}>
      <Stack component="form" spacing={2} onSubmit={(event) => void submit(event)}>
        <AddressFields form={form} setForm={setForm} withTimeZone />
        <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <DomainAddOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar local</Button>
      </Stack>
    </OperationCard>
  );
}

function FacilityForm() {
  const { remember } = useOperationalWorkspace();
  const [form, setForm] = useState({ ...blankAddress, physicalCapacity: '100', operationalCapacity: '100', notes: '', active: true });
  const [result, setResult] = useState<FacilityResponse | null>(null);
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
      setResult(response.data);
      remember('facility', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationCard title="Novo patio" description="Capacidade operacional nao pode superar a capacidade fisica." error={error} result={result ? <ResourceSnapshot data={{ id: result.id, name: result.name, physicalCapacity: result.physicalCapacity, operationalCapacity: result.operationalCapacity, active: result.active, version: result.version }} /> : undefined}>
      <Stack component="form" spacing={2} onSubmit={(event) => void submit(event)}>
        <AddressFields form={form} setForm={setForm} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Capacidade fisica" type="number" value={form.physicalCapacity} onChange={(event) => setForm((current) => ({ ...current, physicalCapacity: event.target.value }))} inputProps={{ min: 1 }} required fullWidth />
          <TextField label="Capacidade operacional" type="number" value={form.operationalCapacity} onChange={(event) => setForm((current) => ({ ...current, operationalCapacity: event.target.value }))} inputProps={{ min: 0 }} required fullWidth />
        </Stack>
        <TextField label="Observacoes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={2} inputProps={{ maxLength: 255 }} />
        <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LocalParkingOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar patio</Button>
      </Stack>
    </OperationCard>
  );
}

function SectorForm() {
  const { recent, remember } = useOperationalWorkspace();
  const [facilityId, setFacilityId] = useState('');
  const [form, setForm] = useState({ code: '', name: '', capacity: '50', categories: ['COMUM'] as FacilityCategory[] });
  const [result, setResult] = useState<SectorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await api.post<SectorResponse>(`/api/v1/parking-facilities/${Number(facilityId)}/sectors`, {
        ...form, code: form.code.toUpperCase(), capacity: Number(form.capacity),
      });
      setResult(response.data);
      remember('sector', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationCard title="Novo setor" description="Categorias definem os tipos fisicos aceitos no setor." error={error} result={result ? <ResourceSnapshot data={{ id: result.id, parkingFacilityId: result.parkingFacilityId, code: result.code, name: result.name, capacity: result.capacity, categories: result.categories, version: result.version }} /> : undefined}>
      <Stack component="form" spacing={2} onSubmit={(event) => void submit(event)}>
        <ResourceIdField label="ID do patio" value={facilityId} onChange={setFacilityId} recent={recent('facility')} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Codigo" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required fullWidth />
          <TextField label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
          <TextField label="Capacidade" type="number" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))} inputProps={{ min: 1 }} required fullWidth />
        </Stack>
        <FormControl>
          <InputLabel id="sector-categories-label">Categorias</InputLabel>
          <Select multiple labelId="sector-categories-label" label="Categorias" value={form.categories} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value as FacilityCategory[] }))} renderValue={(selected) => selected.join(', ')}>
            {facilityCategories.map((category) => <MenuItem key={category} value={category}><Checkbox checked={form.categories.includes(category)} /><ListItemText primary={category} /></MenuItem>)}
          </Select>
        </FormControl>
        <Button type="submit" variant="contained" disabled={loading || form.categories.length === 0} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AddLocationAltOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Criar setor</Button>
      </Stack>
    </OperationCard>
  );
}

function SpaceImportForm() {
  const { recent, remember } = useOperationalWorkspace();
  const [sectorId, setSectorId] = useState('');
  const [text, setText] = useState('A-01;COMUM;nao;\nA-02;PCD;sim;Proxima ao acesso');
  const [result, setResult] = useState<SpaceBatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const spaces = parseSpacesText(text);
      const response = await api.post<SpaceBatchResponse>(`/api/v1/sectors/${Number(sectorId)}/spaces:batch`, { spaces });
      setResult(response.data);
      response.data.items.filter((item) => item.id).forEach((item) => remember('space', {
        id: item.id!, label: `Vaga ${item.code}`, version: item.version, snapshot: { ...item },
      }));
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationCard title="Importar vagas" description="Uma linha por vaga: codigo;categoria;sim|nao;posicao. O backend pode retornar 207 para resultado parcial." error={error} result={result ? <ResourceSnapshot data={{ sectorId: result.sectorId, requested: result.requested, created: result.created, existing: result.existing, conflicts: result.conflicts }} /> : undefined}>
      <Stack component="form" spacing={2} onSubmit={(event) => void submit(event)}>
        <ResourceIdField label="ID do setor" value={sectorId} onChange={setSectorId} recent={recent('sector')} />
        <TextField label="Vagas" value={text} onChange={(event) => setText(event.target.value)} multiline minRows={8} required helperText="Categorias: COMUM, VIP, PCD, STAFF, ONIBUS, VAN, CORTESIA" />
        <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <GridViewOutlinedIcon />} sx={{ alignSelf: 'flex-start' }}>Importar lote</Button>
      </Stack>
    </OperationCard>
  );
}

export function FacilitiesPage() {
  const [tab, setTab] = useState(0);
  const content = [<VenueForm />, <FacilityForm />, <SectorForm />, <SpaceImportForm />];
  return (
    <Box>
      <PageHeader title="Instalacoes" subtitle="Cadastre a estrutura fisica usada pelos eventos, do local ate as vagas." />
      <Alert severity="info" sx={{ mb: 2 }}>As APIs atuais sao orientadas a criacao e ainda nao oferecem listagens. Recursos confirmados ficam disponiveis como referencias recentes deste tenant.</Alert>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" sx={{ mb: 2 }}>
        <Tab label="Locais" /><Tab label="Patios" /><Tab label="Setores" /><Tab label="Vagas" />
      </Tabs>
      {content[tab]}
    </Box>
  );
}
