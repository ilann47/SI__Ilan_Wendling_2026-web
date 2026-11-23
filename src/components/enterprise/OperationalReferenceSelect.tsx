import { api } from '../../api/client';
import type { Page } from '../../api/resource';
import type { RefOption } from '../form/ReferencePickerDialog';
import { ReferenceSelect } from '../form/ReferenceSelect';

type LookupKind = 'access-events' | 'audit-events' | 'access-facilities' | 'blocking-credentials' | 'sales-products'
  | 'sales-holds' | 'ordering-holds' | 'sales-orders' | 'issuing-orders' | 'sales-credentials' | 'memberships';

interface Props {
  kind: LookupKind;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  eventId?: string;
  disabled?: boolean;
  onCreate?: { label: string; run: () => void };
}

export function OperationalReferenceSelect({ kind, label, value, onChange, required = true, eventId, disabled, onCreate }: Props) {
  const basePath = `/api/v1/operational-options/${kind}`;
  const scope = eventId ? { eventId: Number(eventId) } : {};
  return <ReferenceSelect
    label={label}
    value={value ? Number(value) : null}
    onChange={(id) => onChange(id == null ? '' : String(id))}
    required={required}
    disabled={disabled}
    reference={{ basePath, labelField: 'label', searchField: 'q', searchOnServer: true, maxSearchLength: 100, params: { size: 20, ...scope } }}
    source={{
      lookup: async (id, signal) => {
        const { data } = await api.get<Page<RefOption>>(basePath, { params: { id, size: 1, ...scope }, signal });
        return data.content[0];
      },
      onCreate,
    }}
    allowCatalogChanges={!!onCreate}
  />;
}
