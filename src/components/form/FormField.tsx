import { TextField, type TextFieldProps } from '@mui/material';

/** Rótulo fixo acima do controle, com o label, ID e mensagens nativos do MUI. */
export const formFieldLayout = {
  '& > .MuiInputLabel-root': {
    position: 'static',
    transform: 'none',
    transition: 'none',
    maxWidth: '100%',
    overflow: 'visible',
    whiteSpace: 'normal',
    fontSize: '0.82rem',
    lineHeight: 1.4,
    fontWeight: 650,
    marginBottom: '5px',
    pointerEvents: 'auto',
  },
  '& > .MuiInputLabel-root:not(.Mui-error):not(.Mui-disabled):not(.Mui-focused)': { color: 'text.primary' },
  '& > .MuiOutlinedInput-root, & > .MuiPickersOutlinedInput-root': { minHeight: 44 },
  '& .MuiOutlinedInput-notchedOutline, & .MuiPickersOutlinedInput-notchedOutline': {
    top: 0,
    '& legend': { display: 'none' },
  },
  '& > .MuiFormHelperText-root': { marginInline: 0 },
} as const;

export const formFieldSlot = {
  'data-slot': 'kaneko-form-field',
  InputLabelProps: { shrink: true },
  sx: formFieldLayout,
} as const;

export function FormField({ sx, InputLabelProps, ...props }: TextFieldProps) {
  return <TextField {...props} data-slot={formFieldSlot['data-slot']}
    InputLabelProps={{ ...InputLabelProps, ...formFieldSlot.InputLabelProps }}
    sx={[formFieldLayout, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} />;
}
