import { Box, MenuItem, TextField } from '@mui/material';
import { ReferenceSelect } from '../form/ReferenceSelect';
import { type FilterConfig } from './resourceConfig';

interface Props {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}

export function FilterBar({ filters, values, onChange }: Props) {
  const set = (name: string, value: unknown) =>
    onChange({ ...values, [name]: value === '' ? undefined : value });

  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', pt: 1 }}>
      {filters.map((f) => {
        if (f.type === 'boolean') {
          return (
            <TextField
              key={f.name}
              select
              size="small"
              label={f.label}
              sx={{ minWidth: 150 }}
              value={(values[f.name] as string) ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="true">Sim</MenuItem>
              <MenuItem value="false">Não</MenuItem>
            </TextField>
          );
        }
        if (f.type === 'select') {
          return (
            <TextField
              key={f.name}
              select
              size="small"
              label={f.label}
              sx={{ minWidth: 170 }}
              value={(values[f.name] as string) ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {(f.options ?? []).map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          );
        }
        if (f.type === 'number') {
          return (
            <TextField
              key={f.name}
              size="small"
              type="number"
              label={f.label}
              sx={{ width: 120 }}
              value={(values[f.name] as string) ?? ''}
              onChange={(e) => set(f.name, e.target.value)}
              inputProps={{ min: 1, inputMode: 'numeric' }}
            />
          );
        }
        if (f.type === 'reference' && f.reference) {
          return (
            <Box key={f.name} sx={{ minWidth: 230 }}>
              <ReferenceSelect
                label={f.label}
                value={(values[f.name] as number) ?? null}
                onChange={(v) => set(f.name, v ?? '')}
                reference={f.reference}
              />
            </Box>
          );
        }
        return (
          <TextField
            key={f.name}
            size="small"
            label={f.label}
            value={(values[f.name] as string) ?? ''}
            onChange={(e) => set(f.name, e.target.value)}
          />
        );
      })}
    </Box>
  );
}
