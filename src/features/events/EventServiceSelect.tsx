import type { EventServiceOption } from '../../api/eventCatalog';
import type { ReferenceConfig } from '../../components/form/fieldConfig';
import { ReferenceSelect } from '../../components/form/ReferenceSelect';

const eventServiceReference: ReferenceConfig = {
  basePath: '/api/v1/events/service-options',
  labelField: 'name',
  readPermissions: ['events:create'],
  searchField: 'q',
  maxSearchLength: 100,
  createSeparatelyAt: '/api/servicos',
};

export function EventServiceSelect({ value, onChange, disabled }: {
  value: EventServiceOption | null; onChange: (service: EventServiceOption | null) => void; disabled?: boolean;
}) {
  return <ReferenceSelect label="Tipo de serviço" required stackedLabel reference={eventServiceReference}
    value={value?.id ?? null} selectedOption={value ? { ...value } : undefined}
    onChange={(id, option) => onChange(id && typeof option?.name === 'string' ? { id, name: option.name } : null)}
    disabled={disabled}
    helperText="Escolha o serviço prestado neste evento. O preço é configurado na portaria." />;
}
