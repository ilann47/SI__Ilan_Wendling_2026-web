import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { TextField } from '@mui/material';
import type { FieldConfig } from './fieldConfig';
import {
  mascaraDocumento,
  soDigitos,
  validaDocumento,
  type DocumentoModo,
} from '../../utils/documento';

interface Props {
  field: FieldConfig;
  namePrefix?: string;
  dense?: boolean;
}

/** Mapeia o tipo de pessoa (campo irmao) para o modo de documento. */
const TIPO_MODO: Record<string, DocumentoModo> = { FISICA: 'cpf', JURIDICA: 'cnpj' };

/**
 * Campo de CPF/CNPJ com mascara automatica (progressiva) e validacao de digito
 * verificador. O modo pode vir fixo (`documentMode`) ou seguir um campo irmao
 * (`documentTypeFrom`, ex.: `tipo` = FISICA/JURIDICA). O valor guardado no
 * formulario e sempre so-digitos; a mascara e apenas de exibicao.
 */
export function DocumentField({ field, namePrefix = '', dense }: Props) {
  const { control } = useFormContext();
  const name = `${namePrefix}${field.name}`;
  const tipoName = field.documentTypeFrom
    ? `${namePrefix}${field.documentTypeFrom}`
    : '__doc_sem_tipo__';
  const tipoValue = useWatch({ control, name: tipoName }) as string | undefined;

  let modo: DocumentoModo = field.documentMode ?? 'auto';
  if (field.documentTypeFrom && tipoValue && TIPO_MODO[tipoValue]) {
    modo = TIPO_MODO[tipoValue];
  }

  const maxLength = modo === 'cpf' ? 14 : 18;
  const placeholder =
    modo === 'cnpj' ? '00.000.000/0000-00' : modo === 'cpf' ? '000.000.000-00' : 'CPF ou CNPJ';

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: field.required ? 'Campo obrigatório' : false,
        validate: (val) => {
          const d = soDigitos(val ?? '');
          if (!d) return true; // vazio fica a cargo do 'required'
          return validaDocumento(d, modo);
        },
      }}
      render={({ field: f, fieldState }) => (
        <TextField
          fullWidth
          size={dense ? 'small' : 'small'}
          label={field.label}
          required={field.required}
          disabled={field.disabled}
          placeholder={placeholder}
          value={mascaraDocumento(String(f.value ?? ''), modo)}
          onChange={(e) => f.onChange(soDigitos(e.target.value))}
          inputProps={{ maxLength, inputMode: 'numeric' }}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || field.helperText}
        />
      )}
    />
  );
}
