import { Chip, Stack, Typography } from '@mui/material';
import type { WorkspaceResource } from '../../workspace/workspaceStore';
import { NumberField } from '../form/NumberField';

interface ResourceIdFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  recent?: WorkspaceResource[];
  required?: boolean;
}

export function ResourceIdField({ label, value, onChange, recent = [], required = true }: ResourceIdFieldProps) {
  return (
    <Stack spacing={0.75}>
      <NumberField
        label={label}
        value={value}
        onValueChange={onChange}
        min={1}
        required={required}
        fullWidth
      />
      {recent.length > 0 && (
        <Stack direction="row" gap={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary">Recentes:</Typography>
          {recent.slice(0, 5).map((resource) => (
            <Chip
              key={resource.id}
              size="small"
              label={`${resource.label} #${resource.id}`}
              variant={value === String(resource.id) ? 'filled' : 'outlined'}
              color={value === String(resource.id) ? 'primary' : 'default'}
              onClick={() => onChange(String(resource.id))}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
