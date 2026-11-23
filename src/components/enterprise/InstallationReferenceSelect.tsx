import { installationCatalogKey, searchInstallationCatalog, type InstallationCatalogKind } from '../../api/installationCatalog';
import { useAuth } from '../../auth/AuthContext';
import { ReferenceSelect } from '../form/ReferenceSelect';
import type { ReferenceSource } from '../form/ReferencePickerDialog';

interface Props {
  kind: InstallationCatalogKind;
  label: string;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
  emptyText?: string;
  existingOption?: { id: number; label: string };
  allSectors?: boolean;
  onCreate?: ReferenceSource['onCreate'];
  allowCatalogChanges?: boolean;
}

/** Busca e resolve nomes no catálogo contextual, usando o seletor padrão. */
export function InstallationReferenceSelect({ kind, label, value, onChange, required, disabled, emptyText, existingOption,
  allSectors = false, onCreate, allowCatalogChanges }: Props) {
  const { activeOrganization } = useAuth();
  const org = activeOrganization?.organizationId;
  const base = installationCatalogKey(org, kind);
  const scope = [...base, allSectors ? 'all-sectors' : 'active'];
  return <ReferenceSelect label={label} value={value ? Number(value) : null}
    selectedOption={existingOption ? { ...existingOption } : undefined}
    reference={{ basePath: `installation:${kind}:${allSectors}`, labelField: 'label',
      createSeparatelyAt: kind === 'cities' ? '/api/cidades' : undefined, maxSearchLength: 100 }}
    source={{ cacheKey: scope, onCreate,
      list: async (term, signal) => {
        const result = await searchInstallationCatalog(kind, term ? { name: term } : {}, signal, allSectors);
        return { content: result.options.map((option) => ({ ...option })), totalElements: result.total };
      },
      lookup: (id, signal) => searchInstallationCatalog(kind, { id }, signal, allSectors).then((data) =>
        data.options[0] ? { ...data.options[0] } : undefined),
    }}
    onChange={(id) => onChange(id ? String(id) : '')} required={required} disabled={disabled}
    emptyText={emptyText} allowCatalogChanges={allowCatalogChanges} stackedLabel />;
}
