import { Checkbox, FormControlLabel, Stack, TextField, Typography } from '@mui/material';
import { EMPTY_FISCAL_PAYER, validFiscalDocument, validFiscalName, type FiscalPayer } from './payer';

type Fields = { value: FiscalPayer; onChange: (value: FiscalPayer) => void; disabled?: boolean };

export function FiscalPayerFields({ value, onChange, disabled }: Fields) {
  const invalidDocument = !!value.documento && !validFiscalDocument(value.documento);
  const invalidName = !!value.nome && !validFiscalName(value.nome);
  return <Stack spacing={1.5}>
    <TextField label="CPF ou CNPJ" value={value.documento} onChange={(event) =>
      onChange({ ...value, documento: event.target.value })} disabled={disabled} required fullWidth
      inputProps={{ maxLength: 18, autoCapitalize: 'characters', spellCheck: false }}
      autoComplete="off" error={invalidDocument}
      helperText={invalidDocument ? 'Informe um CPF ou CNPJ válido.' : undefined} />
    <TextField label="Nome ou razão social" value={value.nome} onChange={(event) =>
      onChange({ ...value, nome: event.target.value })} disabled={disabled} required fullWidth
      inputProps={{ maxLength: 160 }} autoComplete="off" error={invalidName}
      helperText={invalidName ? 'Informe o nome ou a razão social (até 160 caracteres).' : undefined} />
  </Stack>;
}

export function OptionalFiscalPayer({ value, onChange, disabled }: {
  value: FiscalPayer | null; onChange: (value: FiscalPayer | null) => void; disabled?: boolean;
}) {
  return <Stack spacing={1}>
    <FormControlLabel label="Identificar na nota" control={<Checkbox checked={value !== null}
      onChange={(_, checked) => onChange(checked ? EMPTY_FISCAL_PAYER : null)} disabled={disabled} />} />
    {value && <>
      <Typography variant="body2" color="text.secondary">O nome e o CPF/CNPJ vão para o rascunho fiscal e criam um cadastro básico de cliente se o documento ainda não existir nesta organização.</Typography>
      <FiscalPayerFields value={value} onChange={onChange} disabled={disabled} />
    </>}
  </Stack>;
}
