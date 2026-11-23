import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DomainAddOutlinedIcon from '@mui/icons-material/DomainAddOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import LocalParkingOutlinedIcon from '@mui/icons-material/LocalParkingOutlined';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  Card,
  Chip,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from 'react';
import { api, describeError } from '../api/client';
import { isResourcePreconditionConflict } from '../api/resource';
import { useAuth } from '../auth/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { InstallationReferenceSelect } from '../components/enterprise/InstallationReferenceSelect';
import { createSpace, getInstallation, installationCatalogKey, spaceStatusLabels, updateInstallation, type InstallationManagementKind, type SpaceDetail } from '../api/installationCatalog';
import type { Page } from '../api/resource';
import { OperationalFormPage } from '../components/form/OperationalFormPage';
import { useFormPageLocation } from '../components/form/useFormPageLocation';
import { NumberField } from '../components/form/NumberField';
import { applyContactMask } from '../components/form/contactMask';
import { MAX_INT32, requiredTextError, wholeNumber } from '../utils/formValidation';
import { useSnackbar } from '../components/SnackbarProvider';
import { facilityCategories, facilityCategoryLabel, parseSpacesText, type FacilityCategory } from '../features/facilities/spaceImport';
import { useOperationalWorkspace } from '../workspace/OperationalWorkspaceContext';
import { FacilitiesList } from '../features/facilities/FacilitiesList';
import { ErrorState } from '../components/listing/ErrorState';
import { ListingSkeleton } from '../components/listing/ListingSkeleton';

interface AddressResponse {
  id: number; version: number; name: string; address: string; number?: string | null; complement?: string | null;
  district: string; postalCode: string; cityId: number; cityName?: string; active: boolean;
}
interface VenueResponse extends AddressResponse {
  type: string; timeZone: string;
}
interface FacilityResponse extends AddressResponse {
  physicalCapacity: number; operationalCapacity: number; notes?: string | null;
}
interface SectorResponse {
  id: number; parkingFacilityId: number; parkingFacilityName?: string; code: string; name: string;
  capacity: number; categories: FacilityCategory[]; active: boolean; version: number;
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
const facilityInitial = { ...blankAddress, physicalCapacity: '100', operationalCapacity: '100', notes: '', active: true };
const sectorInitial = { code: '', name: '', capacity: '50', categories: ['COMUM'] as FacilityCategory[] };
const spacesInitial = 'A-01;COMUM;não;\nA-02;PCD;sim;Próxima ao acesso';

const addressValues = (item: AddressResponse) => ({
  name: item.name, address: item.address, number: item.number ?? '', complement: item.complement ?? '',
  district: item.district, postalCode: item.postalCode, cityId: String(item.cityId),
});
const completePostalCode = (value: string) => /^\d{5}-?\d{3}$/.test(value);
const addressErrors = (form: typeof blankAddress, nameMax: number, original?: AddressResponse) => ({
  name: requiredTextError(form.name, 'o nome', nameMax),
  address: requiredTextError(form.address, 'o endereço', 120),
  district: requiredTextError(form.district, 'o bairro', 60),
  postalCode: completePostalCode(form.postalCode) ? undefined : 'Informe os 8 dígitos do CEP.',
  cityId: wholeNumber(form.cityId, 1, Number.MAX_SAFE_INTEGER) !== null ? undefined : 'Selecione a cidade.',
  number: form.number === (original?.number ?? '') || /^\d{0,10}$/.test(form.number) ? undefined : 'Use até 10 algarismos.',
  complement: form.complement.length <= 100 ? undefined : 'Use até 100 caracteres.',
});
const normalizeAddress = (form: typeof blankAddress) => ({
  name: form.name.trim(), address: form.address.trim(), district: form.district.trim(),
  number: form.number || null, complement: form.complement.trim() || null,
  postalCode: form.postalCode, cityId: Number(form.cityId),
});
const saveError = (cause: unknown) => isResourcePreconditionConflict(cause)
  ? 'Outra alteração foi salva neste cadastro. Cancele e reabra a edição para carregar os dados atuais.'
  : describeError(cause);

function AddressFields({ form, setForm, nameMaxLength = 120, original }: {
  form: typeof blankAddress;
  setForm: Dispatch<SetStateAction<any>>;
  nameMaxLength?: number;
  original?: AddressResponse;
}) {
  const update = (name: string, value: string) => setForm((current: Record<string, string>) => ({ ...current, [name]: value }));
  const issues = addressErrors(form, nameMaxLength, original);
  const hint = (key: keyof typeof blankAddress) => ({
    error: form[key] !== '' && !!issues[key], helperText: form[key] !== '' ? issues[key] : undefined,
  });
  return (
    <Stack spacing={2}>
      <TextField label="Nome" value={form.name} onChange={(event) => update('name', event.target.value)} {...hint('name')} required inputProps={{ maxLength: nameMaxLength }} />
      <TextField label="Endereço" value={form.address} onChange={(event) => update('address', event.target.value)} {...hint('address')} required inputProps={{ maxLength: 120 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Número" value={form.number} onChange={(event) => {
          if (/^\d{0,10}$/.test(event.target.value)) update('number', event.target.value);
        }} inputProps={{ inputMode: 'numeric', maxLength: 10 }} helperText="Só números. Se não houver, deixe em branco." fullWidth />
        <TextField label="Complemento" value={form.complement} onChange={(event) => update('complement', event.target.value)} {...hint('complement')} inputProps={{ maxLength: 100 }} fullWidth />
      </Stack>
      <Box sx={{
        display: 'grid', gap: 2, alignItems: 'start',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          sm: 'minmax(0, 2fr) minmax(8rem, 1fr)',
          md: 'minmax(0, 1fr) minmax(8rem, .75fr) minmax(0, 1.5fr)',
        },
      }}>
        <TextField label="Bairro" value={form.district} onChange={(event) => update('district', event.target.value)} {...hint('district')} required inputProps={{ maxLength: 60 }} fullWidth />
        <TextField label="CEP" value={form.postalCode}
          onChange={(event) => update('postalCode', applyContactMask(event.target, 'cep-br', form.postalCode))}
          error={form.postalCode !== '' && !completePostalCode(form.postalCode)}
          helperText="Informe os 8 dígitos do CEP." required inputProps={{ inputMode: 'numeric' }} fullWidth />
        <Box sx={{ minWidth: 0, gridColumn: { xs: '1 / -1', md: 'auto' } }}>
          <InstallationReferenceSelect kind="cities" label="Cidade" value={form.cityId}
            existingOption={original?.cityName ? { id: original.cityId, label: original.cityName } : undefined}
            onChange={(value) => update('cityId', value)} required />
        </Box>
      </Box>
    </Stack>
  );
}

type PageFormProps = { onClose: () => void; navigationAllowed: () => boolean };

export function VenueForm({ onClose, navigationAllowed, item, onSaved }: PageFormProps & {
  item?: VenueResponse; onSaved?: (record: VenueResponse) => void;
}) {
  const { remember } = useOperationalWorkspace();
  const { activeOrganization } = useAuth();
  const queries = useQueryClient();
  const { notify } = useSnackbar();
  const initial = item ? addressValues(item) : blankAddress;
  const timeZone = item?.timeZone ?? activeOrganization?.timeZone;
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const canSave = !!timeZone && !Object.values(addressErrors(form, 160, item)).some(Boolean);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || loading) return;
    setLoading(true); setError(null);
    try {
      const body = {
        ...normalizeAddress(form), timeZone,
      };
      const response = item ? await updateInstallation<VenueResponse>('venues', item, body)
        : await api.post<VenueResponse>('/api/v1/venues', body);
      remember('venue', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      void queries.invalidateQueries({ queryKey: installationCatalogKey(activeOrganization?.organizationId, 'venues') });
      if (!onSaved) notify(item ? 'Local atualizado com sucesso.' : 'Local cadastrado com sucesso.', 'success');
      onSaved?.(response.data);
      onClose();
    } catch (cause) { setError(saveError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormPage onClose={onClose} navigationAllowed={navigationAllowed} title={item ? 'Editar local de evento' : 'Novo local de evento'}
      description="Cadastre o endereço principal onde o evento acontece." id="venue-create-form"
      submitLabel={item ? 'Salvar alterações' : 'Criar local'} busy={loading} submitDisabled={!canSave} error={error}
      dirty={JSON.stringify(form) !== JSON.stringify(initial)} onSubmit={(event) => void submit(event)}>
      {!timeZone && <Alert severity="warning">O fuso da organização não está disponível. Recarregue a página ou confira os dados da organização.</Alert>}
      <AddressFields form={form} setForm={setForm} nameMaxLength={160} original={item} />
    </OperationalFormPage>
  );
}

export function FacilityForm({ onClose, navigationAllowed, item, onSaved }: PageFormProps & {
  item?: FacilityResponse; onSaved?: (record: FacilityResponse) => void;
}) {
  const { remember } = useOperationalWorkspace();
  const { activeOrganization } = useAuth();
  const queries = useQueryClient();
  const { notify } = useSnackbar();
  const initial = item ? { ...addressValues(item), physicalCapacity: String(item.physicalCapacity),
    operationalCapacity: String(item.operationalCapacity), notes: item.notes ?? '', active: item.active } : facilityInitial;
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const physical = wholeNumber(form.physicalCapacity, 1);
  const operational = wholeNumber(form.operationalCapacity, 0, physical ?? MAX_INT32);
  const notesError = form.notes.length > 255 ? 'Use até 255 caracteres.' : undefined;
  const canSave = !Object.values(addressErrors(form, 120, item)).some(Boolean)
    && physical !== null && operational !== null && !notesError;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave || loading) return;
    setLoading(true); setError(null);
    try {
      const body = {
        ...normalizeAddress(form),
        active: form.active,
        physicalCapacity: physical,
        operationalCapacity: operational,
        notes: form.notes.trim() || null,
      };
      const response = item ? await updateInstallation<FacilityResponse>('facilities', item, body)
        : await api.post<FacilityResponse>('/api/v1/parking-facilities', body);
      remember('facility', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      void queries.invalidateQueries({ queryKey: installationCatalogKey(activeOrganization?.organizationId, 'facilities') });
      notify(item ? 'Pátio atualizado com sucesso.' : 'Pátio cadastrado com sucesso.', 'success');
      onSaved?.(response.data);
      onClose();
    } catch (cause) { setError(saveError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormPage onClose={onClose} navigationAllowed={navigationAllowed} title={item ? 'Editar pátio' : 'Novo pátio'}
      description="Informe quantas vagas existem no pátio e quantas ficam disponíveis para uso." id="facility-create-form"
      submitLabel={item ? 'Salvar alterações' : 'Criar pátio'} busy={loading} submitDisabled={!canSave} error={error}
      dirty={JSON.stringify(form) !== JSON.stringify(initial)} onSubmit={(event) => void submit(event)}>
      <AddressFields form={form} setForm={setForm} original={item} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <NumberField label="Capacidade física" value={form.physicalCapacity} min={1} max={MAX_INT32} required fullWidth
          error={form.physicalCapacity !== '' && physical === null}
          helperText={form.physicalCapacity !== '' && physical === null ? 'Informe um número inteiro de vagas.' : 'Total de vagas existentes.'}
          onValueChange={(physicalCapacity) => setForm((current) => ({ ...current, physicalCapacity }))} />
        <NumberField label="Capacidade operacional" value={form.operationalCapacity} min={0} max={physical ?? undefined}
          error={form.operationalCapacity !== '' && operational === null}
          helperText={physical !== null ? `Informe entre 0 e ${physical} vagas operacionais.` : 'Vagas disponíveis para uso.'}
          required fullWidth
          onValueChange={(operationalCapacity) => setForm((current) => ({ ...current, operationalCapacity }))} />
      </Stack>
      <TextField label="Observações" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
        error={!!notesError} helperText={notesError} multiline minRows={2} inputProps={{ maxLength: 255 }} />
    </OperationalFormPage>
  );
}

function SectorForm({ onClose, navigationAllowed, item, facility }: PageFormProps & {
  item?: SectorResponse; facility?: { id: number; name: string };
}) {
  const { remember } = useOperationalWorkspace();
  const { activeOrganization } = useAuth();
  const queries = useQueryClient();
  const { notify } = useSnackbar();
  const initial = item ? { code: item.code, name: item.name, capacity: String(item.capacity), categories: item.categories } : sectorInitial;
  const initialFacility = item?.parkingFacilityId ?? facility?.id;
  const [facilityId, setFacilityId] = useState(initialFacility ? String(initialFacility) : '');
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!facilityId) return;
    setLoading(true); setError(null);
    try {
      const body = {
        ...form, code: form.code.toUpperCase(), capacity: Number(form.capacity),
      };
      const response = item ? await updateInstallation<SectorResponse>('sectors', item, body)
        : await api.post<SectorResponse>(`/api/v1/parking-facilities/${Number(facilityId)}/sectors`, body);
      remember('sector', { id: response.data.id, label: response.data.name, version: response.data.version, snapshot: { ...response.data } });
      void queries.invalidateQueries({ queryKey: installationCatalogKey(activeOrganization?.organizationId, 'sectors') });
      notify(item ? 'Setor atualizado com sucesso.' : 'Setor cadastrado com sucesso.', 'success');
      onClose();
    } catch (cause) { setError(saveError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormPage onClose={onClose} navigationAllowed={navigationAllowed} title={item ? 'Editar setor' : 'Novo setor'}
      description="Defina a capacidade e as categorias de vaga aceitas neste setor." id="sector-create-form"
      submitLabel={item ? 'Salvar alterações' : 'Criar setor'} busy={loading} submitDisabled={!facilityId || !form.categories.length} error={error}
      dirty={(!initialFacility && facilityId !== '') || JSON.stringify(form) !== JSON.stringify(initial)} onSubmit={(event) => void submit(event)}>
      {item || facility ? <TextField label="Pátio" value={item?.parkingFacilityName ?? facility?.name ?? 'Não disponível'} InputProps={{ readOnly: true }} />
        : <InstallationReferenceSelect kind="facilities" label="Pátio" value={facilityId} onChange={setFacilityId} required
          emptyText="Nenhum pátio ativo. Cadastre um na aba Pátios." />}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField label="Código" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} inputProps={{ maxLength: 40 }} required fullWidth />
        <TextField label="Nome" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} inputProps={{ maxLength: 120 }} required fullWidth />
        <NumberField label="Capacidade" value={form.capacity} min={1} required fullWidth
          onValueChange={(capacity) => setForm((current) => ({ ...current, capacity }))} />
      </Stack>
      <FormControl>
        <InputLabel id="sector-categories-label">Categorias</InputLabel>
        <Select multiple labelId="sector-categories-label" label="Categorias" value={form.categories} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value as FacilityCategory[] }))} renderValue={(selected) => selected.map(facilityCategoryLabel).join(', ')}>
          {facilityCategories.map((category) => <MenuItem key={category} value={category}><Checkbox checked={form.categories.includes(category)} /><ListItemText primary={facilityCategoryLabel(category)} /></MenuItem>)}
        </Select>
      </FormControl>
    </OperationalFormPage>
  );
}

function SpaceImportForm({ onClose, navigationAllowed, fixedSector }: PageFormProps & { fixedSector?: { id: number; name: string } }) {
  const { remember } = useOperationalWorkspace();
  const { activeOrganization } = useAuth();
  const queries = useQueryClient();
  const { notify } = useSnackbar();
  const [sectorId, setSectorId] = useState(fixedSector ? String(fixedSector.id) : '');
  const [text, setText] = useState(spacesInitial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sectorId) return;
    setLoading(true); setError(null);
    try {
      const spaces = parseSpacesText(text);
      const response = await api.post<SpaceBatchResponse>(`/api/v1/sectors/${Number(sectorId)}/spaces:batch`, { spaces });
      response.data.items.filter((item) => item.id).forEach((item) => remember('space', {
        id: item.id!, label: `Vaga ${item.code}`, version: item.version, snapshot: { ...item },
      }));
      void queries.invalidateQueries({ queryKey: installationCatalogKey(activeOrganization?.organizationId, 'spaces') });
      notify(`${response.data.created} vaga(s) importada(s) com sucesso.`, 'success');
      setSectorId('');
      setText(spacesInitial);
      onClose();
    } catch (cause) { setError(describeError(cause)); } finally { setLoading(false); }
  };
  return (
    <OperationalFormPage onClose={onClose} navigationAllowed={navigationAllowed} title="Importar vagas"
      description="Informe uma vaga por linha: código; categoria; acessível; posição." id="spaces-import-form"
      submitLabel="Importar lote" busy={loading} submitDisabled={!sectorId} error={error}
      dirty={(!fixedSector && sectorId !== '') || text !== spacesInitial} onSubmit={(event) => void submit(event)}>
      {fixedSector ? <TextField label="Setor" value={fixedSector.name} InputProps={{ readOnly: true }} />
        : <InstallationReferenceSelect kind="sectors" label="Setor" value={sectorId} onChange={setSectorId} required
          emptyText="Nenhum setor ativo. Cadastre um setor no pátio." />}
      <TextField label="Vagas" value={text} onChange={(event) => setText(event.target.value)} multiline minRows={8} required helperText="Categorias: Comum, VIP, PCD, Equipe, Ônibus, Van ou Cortesia" />
    </OperationalFormPage>
  );
}

function SpaceForm({ item, initialSector = '', fixedSector, onClose, navigationAllowed }: PageFormProps & {
  item?: SpaceDetail; initialSector?: string; fixedSector?: { id: number; name: string };
}) {
  const { activeOrganization } = useAuth();
  const queries = useQueryClient();
  const { notify } = useSnackbar();
  const { remember } = useOperationalWorkspace();
  const initial: { code: string; type: FacilityCategory | ''; accessible: boolean; position: string } = {
    code: item?.code ?? '', type: item?.type ?? '', accessible: item?.accessible ?? false, position: item?.position ?? '',
  };
  const [form, setForm] = useState(initial);
  const [sector, setSector] = useState(fixedSector ? String(fixedSector.id) : initialSector);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const org = activeOrganization?.organizationId;
  const sectorDetail = useQuery({
    queryKey: [...installationCatalogKey(org, 'sectors'), 'space-form', sector],
    enabled: !!org && !item && !!sector,
    queryFn: ({ signal }) => getInstallation<SectorResponse>('sectors', Number(sector), signal),
  });
  const allowed = item?.allowedCategories ?? (sectorDetail.data?.active ? sectorDetail.data.categories : []);
  const type = form.type || (allowed.length === 1 ? allowed[0] : '');
  const dirty = sector !== (fixedSector ? String(fixedSector.id) : initialSector) || JSON.stringify(form) !== JSON.stringify(initial);
  const code = form.code.trim().toUpperCase();
  const validCode = /^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(code);
  const canSave = dirty && validCode && !!type && allowed.includes(type) && (!!item || !!sector);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !canSave || !type) return;
    setBusy(true); setError(null);
    try {
      const body = { code, type, accessible: form.accessible, position: form.position.trim() || null };
      const { data } = item ? await updateInstallation<SpaceDetail>('spaces', item, body)
        : await createSpace(Number(sector), body);
      remember('space', { id: data.id, label: `Vaga ${data.code}`, version: data.version, snapshot: { ...data } });
      void queries.invalidateQueries({ queryKey: installationCatalogKey(activeOrganization?.organizationId, 'spaces') });
      notify(item ? 'Vaga atualizada com sucesso.' : 'Vaga cadastrada com sucesso.', 'success');
      onClose();
    } catch (cause) { setError(saveError(cause)); } finally { setBusy(false); }
  };

  return <OperationalFormPage onClose={onClose} navigationAllowed={navigationAllowed} title={item ? 'Editar vaga' : 'Nova vaga'}
    description={item ? 'Edite o cadastro da vaga. O setor e a situação não mudam nesta tela.'
      : fixedSector ? 'Informe os dados da vaga.' : 'Escolha o setor e informe os dados da vaga.'} id={item ? 'space-edit-form' : 'space-create-form'}
    submitLabel={item ? 'Salvar alterações' : 'Cadastrar vaga'} dirty={dirty} busy={busy} submitDisabled={!canSave} error={error}
    onSubmit={(event) => void submit(event)}>
    {item ? <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Setor" value={`${item.sectorName} · ${item.parkingFacilityName}`} InputProps={{ readOnly: true }} fullWidth />
      <TextField label="Situação" value={spaceStatusLabels[item.status]} InputProps={{ readOnly: true }} fullWidth />
    </Stack> : fixedSector ? <TextField label="Setor" value={fixedSector.name} InputProps={{ readOnly: true }} />
      : <InstallationReferenceSelect kind="sectors" label="Setor" value={sector} onChange={(id) => {
      setSector(id);
      setForm((current) => ({ ...current, type: '' }));
      setError(null);
    }} required emptyText="Nenhum setor ativo. Cadastre um na aba Setores." />}
    {!item && sector && sectorDetail.isError && <ErrorState message={describeError(sectorDetail.error)}
      onRetry={() => void sectorDetail.refetch()} />}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField label="Código" value={form.code} inputProps={{ maxLength: 40 }}
        onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} fullWidth required
        error={!!form.code && !validCode} helperText={form.code && !validCode ? 'Use letras, números, hífen ou sublinhado.' : undefined} />
      <TextField select label="Categoria" value={type} required fullWidth disabled={!allowed.length}
        helperText={!item && !allowed.length ? (sector && sectorDetail.isFetching ? 'Carregando categorias…' : 'Escolha um setor ativo.') : undefined}
        onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as FacilityCategory }))}>
        {allowed.map((category) => <MenuItem key={category} value={category}>{facilityCategoryLabel(category)}</MenuItem>)}
      </TextField>
    </Stack>
    <TextField label="Posição" value={form.position} inputProps={{ maxLength: 120 }}
      onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))} fullWidth />
    <FormControlLabel label="Vaga acessível" control={<Switch checked={form.accessible}
      onChange={(_, accessible) => setForm((current) => ({ ...current, accessible }))} />} />
  </OperationalFormPage>;
}

function InstallationEditor<T>({ kind, id, org, onClose, children }: {
  kind: InstallationManagementKind; id: number; org: number | undefined;
  onClose: () => void; children: (item: T) => ReactNode;
}) {
  const record = useQuery({
    queryKey: [...installationCatalogKey(org, kind), 'detail', id],
    queryFn: ({ signal }) => getInstallation<T>(kind, id, signal),
    enabled: !!org, gcTime: 0, refetchOnWindowFocus: false, refetchOnReconnect: false,
  });
  if (record.data) return <InstallationDraft data={record.data} render={children} />;
  return <>
    <PageHeader title="Editar cadastro" onBack={onClose} />
    {record.isError ? <ErrorState message={describeError(record.error)} onRetry={() => void record.refetch()} /> : <ListingSkeleton />}
  </>;
}

function InstallationDraft<T>({ data, render }: { data: T; render: (data: T) => ReactNode }) {
  const [original] = useState(() => data);
  return render(original);
}

function FacilityOverview({ facility, org, page, onPage, onSelect, onEdit, onCreate }: {
  facility: FacilityResponse; org?: number; page: number; onPage: (page: number) => void;
  onSelect: (id: number) => void; onEdit: (id: number) => void; onCreate: () => void;
}) {
  const sectors = useQuery({
    queryKey: [...installationCatalogKey(org, 'sectors'), 'facility', facility.id, page],
    enabled: !!org && facility.active,
    queryFn: ({ signal }) => api.get<Page<SectorResponse>>('/api/v1/sectors', {
      params: { parkingFacilityId: facility.id, page, size: 20 }, signal,
    }).then(({ data }) => data),
  });
  return <Stack spacing={2}>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <Chip label={facility.active ? 'Pátio ativo' : 'Pátio inativo'} variant="outlined" />
      <Chip label={`Capacidade física: ${facility.physicalCapacity}`} variant="outlined" />
      <Chip label={`Capacidade operacional: ${facility.operationalCapacity}`} variant="outlined" />
    </Stack>
    <Card variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
          <Typography component="h2" variant="h6">Setores</Typography>
          {facility.active && <Button onClick={onCreate} startIcon={<AddRoundedIcon />}>Novo setor</Button>}
        </Stack>
        {!facility.active ? <Typography color="text.secondary">Este pátio está inativo. Para consultar os setores cadastrados, use a consulta geral de setores.</Typography>
          : sectors.isPending ? <ListingSkeleton />
          : sectors.isError ? <ErrorState message={describeError(sectors.error)} onRetry={() => void sectors.refetch()} />
          : (sectors.data.content.length === 0 ? <Typography color="text.secondary">Nenhum setor cadastrado. Setores são opcionais para registrar entradas pela placa.</Typography>
            : sectors.data.content.map((item) => <Stack key={item.id} direction={{ xs: 'column', sm: 'row' }}
                alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ py: 1, borderTop: 1, borderColor: 'divider' }}>
                <Typography>{item.code} · {item.name}</Typography>
                <Stack direction="row" gap={1} flexWrap="wrap">
                  <Button aria-label={`Ver vagas de ${item.name}`} variant="outlined" onClick={() => onSelect(item.id)}>Ver vagas</Button>
                  <Button aria-label={`Editar ${item.name}`} onClick={() => onEdit(item.id)}>Editar</Button>
                </Stack>
              </Stack>))}
        {facility.active && (page > 0 || (sectors.data?.totalElements ?? 0) > 20) && <Stack direction="row" gap={1}>
          <Button disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button>
          <Button disabled={(page + 1) * 20 >= (sectors.data?.totalElements ?? 0)} onClick={() => onPage(page + 1)}>Próxima</Button>
        </Stack>}
      </Stack>
    </Card>
  </Stack>;
}

function numericParam(value: string | null) {
  return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : undefined;
}

export function FacilitiesPage() {
  const { permissions, activeOrganization } = useAuth();
  const [params, setParams] = useSearchParams();
  const org = activeOrganization?.organizationId;
  const formLocation = useFormPageLocation();
  const pageFormProps = { onClose: formLocation.close, navigationAllowed: formLocation.navigationAllowed };
  const content = [
    { key: 'venue', kind: 'venues', label: 'Locais', actionLabel: 'Novo local', icon: <DomainAddOutlinedIcon /> },
    { key: 'facility', kind: 'facilities', label: 'Pátios', actionLabel: 'Novo pátio', icon: <LocalParkingOutlinedIcon /> },
    { key: 'sector', kind: 'sectors', label: 'Setores', actionLabel: 'Novo setor', icon: <AddLocationAltOutlinedIcon /> },
    { key: 'spaces', kind: 'spaces', label: 'Vagas', actionLabel: 'Nova vaga', icon: <AddRoundedIcon /> },
  ] as const;
  const tabs = content.filter((tab) => tab.key !== 'venue' || permissions.includes('organizations:admin'));
  const active = tabs.find((tab) => tab.key === params.get('aba')) ?? content[1];
  const facilityId = numericParam(params.get('patio'));
  const contextualSectorId = facilityId ? numericParam(params.get('setor')) : undefined;
  const facilityQuery = useQuery({
    queryKey: [...installationCatalogKey(org, 'facilities'), 'overview', facilityId],
    enabled: !!org && !!facilityId,
    queryFn: ({ signal }) => getInstallation<FacilityResponse>('facilities', facilityId!, signal),
  });
  const sectorQuery = useQuery({
    queryKey: [...installationCatalogKey(org, 'sectors'), 'overview', contextualSectorId],
    enabled: !!org && !!contextualSectorId,
    queryFn: ({ signal }) => getInstallation<SectorResponse>('sectors', contextualSectorId!, signal),
  });
  const facility = facilityQuery.data;
  const contextualSector = facility && sectorQuery.data?.parkingFacilityId === facility.id ? sectorQuery.data : undefined;
  const setContext = (patio?: number, setor?: number) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (patio) next.set('aba', 'facility');
      if (patio !== facilityId) next.delete('pagina-setores');
      if (patio) next.set('patio', String(patio)); else next.delete('patio');
      if (setor) next.set('setor', String(setor)); else next.delete('setor');
      next.delete('vagas'); next.delete('pagina-vagas');
      return next;
    });
  };
  const rawSector = Number(params.get('setor'));
  const sectorId = active.key === 'spaces' && Number.isSafeInteger(rawSector) && rawSector > 0 ? rawSector : undefined;
  const [form, rawId] = (formLocation.name ?? '').split(':');
  const id = rawId && /^[1-9]\d*$/.test(rawId) ? Number(rawId) : undefined;
  const editor = tabs.find((tab) => tab.key === form && tab.kind);
  if (!id && facilityId && ((form === 'sector' && facilityQuery.isLoading)
    || (['spaces', 'importar-vagas'].includes(form) && (facilityQuery.isLoading || sectorQuery.isLoading)))) {
    return <>
      <PageHeader title={form === 'sector' ? 'Novo setor' : form === 'spaces' ? 'Nova vaga' : 'Importar vagas'} onBack={formLocation.close} />
      <ListingSkeleton />
    </>;
  }
  if (formLocation.name === 'importar-vagas' && (!facilityId ? active.key === 'spaces' : facility?.active && contextualSector?.active)) {
    return <SpaceImportForm key={`${org}:import:${contextualSector?.id ?? 'global'}`} {...pageFormProps} fixedSector={contextualSector} />;
  }
  if (editor && (!rawId || Number.isSafeInteger(id))) {
    const key = `${org}:${editor.key}:${id ?? 'new'}`;
    const editorProps = { id: id!, org, onClose: formLocation.close };
    if (editor.key === 'venue') return id
      ? <InstallationEditor<VenueResponse> key={key} {...editorProps} kind="venues">{(item) => <VenueForm {...pageFormProps} item={item} />}</InstallationEditor>
      : <VenueForm key={key} {...pageFormProps} />;
    if (editor.key === 'facility') return id
      ? <InstallationEditor<FacilityResponse> key={key} {...editorProps} kind="facilities">{(item) => <FacilityForm {...pageFormProps} item={item} />}</InstallationEditor>
      : <FacilityForm key={key} {...pageFormProps} />;
    if (editor.key === 'sector' && (id || !facilityId || facility?.active)) return id
      ? <InstallationEditor<SectorResponse> key={key} {...editorProps} kind="sectors">{(item) => <SectorForm {...pageFormProps} item={item} />}</InstallationEditor>
      : <SectorForm key={key} {...pageFormProps} facility={facility} />;
    if (editor.key === 'spaces' && (id || !facilityId || (facility?.active && contextualSector?.active))) return id
      ? <InstallationEditor<SpaceDetail> key={key} {...editorProps} kind="spaces">{(item) => <SpaceForm {...pageFormProps} item={item} />}</InstallationEditor>
      : <SpaceForm key={key} {...pageFormProps} initialSector={sectorId?.toString()} fixedSector={contextualSector} />;
  }
  const search = (params.get('busca') ?? '').slice(0, active.key === 'spaces' ? 40 : 160);
  const rawPage = Number(params.get('pagina'));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 1 && rawPage <= 100_000_000 ? rawPage - 1 : 0;
  const updateList = (tab: string, term: string, index: number, sector?: string) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('aba', tab);
      if (term) next.set('busca', term); else next.delete('busca');
      if (index) next.set('pagina', String(index + 1)); else next.delete('pagina');
      if (tab === 'spaces' && sector) next.set('setor', sector); else next.delete('setor');
      return next;
    }, { replace: true });
  };
  if (facilityId) {
    const pageOfSpaces = (numericParam(params.get('pagina-vagas')) ?? 1) - 1;
    const searchSpaces = (params.get('vagas') ?? '').slice(0, 40);
    const updateSpaces = (term: string, pageIndex: number) => setParams((current) => {
      const next = new URLSearchParams(current);
      if (term) next.set('vagas', term); else next.delete('vagas');
      if (pageIndex) next.set('pagina-vagas', String(pageIndex + 1)); else next.delete('pagina-vagas');
      return next;
    }, { replace: true });
    if (contextualSectorId) return <Stack spacing={2}>
      <PageHeader title={contextualSector ? `Vagas · ${contextualSector.name}` : 'Vagas do setor'} subtitle={facility?.name}
        onBack={() => setContext(facilityId)} action={facility?.active && contextualSector?.active && <Stack direction="row" gap={1} flexWrap="wrap">
          <Button variant="outlined" onClick={() => formLocation.open('importar-vagas')}>Importar vagas</Button>
          <Button variant="contained" onClick={() => formLocation.open('spaces')}>Nova vaga</Button>
        </Stack>} />
      {facilityQuery.isError ? <ErrorState message={describeError(facilityQuery.error)} onRetry={() => void facilityQuery.refetch()} />
        : sectorQuery.isError ? <ErrorState message={describeError(sectorQuery.error)} onRetry={() => void sectorQuery.refetch()} />
        : !facility || sectorQuery.isPending ? <ListingSkeleton />
        : !contextualSector ? <Typography color="text.secondary">Este setor não pertence ao pátio selecionado.</Typography>
        : (
          <FacilitiesList key={`${org}:spaces:${contextualSector.id}`} kind="spaces" org={org} search={searchSpaces} page={pageOfSpaces}
            sectorId={contextualSector.id} onSearch={(value) => updateSpaces(value, 0)} onPage={(value) => updateSpaces(searchSpaces, value)}
            onEdit={(id) => formLocation.open(`spaces:${id}`)} />)}
    </Stack>;
    return <Stack spacing={2}>
      <PageHeader title={facility?.name ?? 'Pátio'} subtitle="Setores deste estacionamento."
        onBack={() => setContext()} action={facility && <Button variant="outlined" onClick={() => formLocation.open(`facility:${facility.id}`)}>Editar pátio</Button>} />
      {facilityQuery.isError ? <ErrorState message={describeError(facilityQuery.error)} onRetry={() => void facilityQuery.refetch()} />
        : !facility ? <ListingSkeleton />
        : <FacilityOverview key={facility.id} facility={facility} org={org} page={(numericParam(params.get('pagina-setores')) ?? 1) - 1}
          onPage={(pageIndex) => setParams((current) => {
            const next = new URLSearchParams(current);
            if (pageIndex) next.set('pagina-setores', String(pageIndex + 1)); else next.delete('pagina-setores');
            return next;
          }, { replace: true })}
          onSelect={(id) => setContext(facility.id, id)} onEdit={(id) => formLocation.open(`sector:${id}`)}
          onCreate={() => formLocation.open('sector')} />}
    </Stack>;
  }
  const visibleTabs = tabs.filter((tab) => tab.key === 'facility' || tab.key === 'venue' || tab.key === active.key);
  return (
    <Box>
      <PageHeader title="Instalações" subtitle="Consulte e gerencie os locais, pátios, setores e vagas usados nos eventos."
        action={<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ whiteSpace: 'nowrap' }}>
          <Button variant="contained" startIcon={active.icon} onClick={() => formLocation.open(active.key)}>{active.actionLabel}</Button>
          {active.key === 'spaces' && <Button variant="outlined" startIcon={<GridViewOutlinedIcon />}
            onClick={() => formLocation.open('importar-vagas')}>Importar vagas</Button>}
        </Stack>} />
      <Tabs value={active.key} onChange={(_, value: string) => { updateList(value, '', 0); }}
        aria-label="Tipos de instalação" variant="scrollable" sx={{ mb: 2 }}>
        {visibleTabs.map((item) => <Tab key={item.key} value={item.key} label={item.label} />)}
      </Tabs>
      <FacilitiesList key={`${org}:${active.kind}`} kind={active.kind} org={org} search={search} page={page} sectorId={sectorId}
        onSearch={(value) => updateList(active.key, value, 0, sectorId?.toString())}
        onPage={(value) => updateList(active.key, search, value, sectorId?.toString())}
        onSector={(value) => updateList('spaces', search, 0, value)}
        onEdit={(recordId) => formLocation.open(`${active.key}:${recordId}`)} onOpenFacility={(id) => setContext(id)} />
      {active.key === 'facility' && <Button size="small" onClick={() => updateList('sector', '', 0)} sx={{ mt: 1 }}>Consulta geral de setores</Button>}
    </Box>
  );
}
