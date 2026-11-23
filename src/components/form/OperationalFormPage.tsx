import { Stack } from '@mui/material';
import type { ComponentProps } from 'react';
import { FormPage } from './FormPage';
import { formFieldLayout } from './FormField';

export function OperationalFormPage({ children, ...props }: ComponentProps<typeof FormPage>) {
  return <FormPage {...props}>
    <Stack spacing={2} sx={{ '& .MuiTextField-root, & .MuiPickersTextField-root': formFieldLayout }}>
      {children}
    </Stack>
  </FormPage>;
}
