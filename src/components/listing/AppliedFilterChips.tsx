import { Button, Chip, Stack } from '@mui/material';
import type { FilterConfig } from '../crud/resourceConfig';
import { filterChipLabel, isFilled } from './listingUtils';

interface Props {
  filters: FilterConfig[];
  values: Record<string, unknown>;
  onRemove: (name: string) => void;
  onClear: () => void;
}

export function AppliedFilterChips({ filters, values, onRemove, onClear }: Props) {
  const applied = filters.filter((filter) => isFilled(values[filter.name]));
  if (applied.length === 0) return null;

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
      {applied.map((filter) => (
        <Chip
          key={filter.name}
          size="small"
          label={filterChipLabel(filter, values[filter.name])}
          onDelete={() => onRemove(filter.name)}
        />
      ))}
      <Button size="small" color="inherit" onClick={onClear}>
        Limpar filtros
      </Button>
    </Stack>
  );
}
