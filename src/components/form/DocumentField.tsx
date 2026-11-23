import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { FormField } from './FormField';
import type { FieldConfig } from './fieldConfig';
import {
  mascaraDocumento,
  mascaraDocumentoFiscal,
  normalizaDocumentoFiscal,
  soDigitos,
  validaCnpj,
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
 * formulário é armazenado sem pontuação; a máscara é apenas de exibição.
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
  const alfanumerico = field.allowAlphanumericCnpj && modo !== 'cpf';
  const placeholder =
    modo === 'cnpj' ? '00.000.000/0000-00' : modo === 'cpf' ? '000.000.000-00' : 'CPF ou CNPJ';

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: field.required ? 'Campo obrigatório' : false,
        validate: (val) => {
          const d = field.allowAlphanumericCnpj ? normalizaDocumentoFiscal(val ?? '') : soDigitos(val ?? '');
          if (!d) return true; // vazio fica a cargo do 'required'
          if (alfanumerico && (modo === 'cnpj' || !/^\d{1,11}$/.test(d))) {
            return validaCnpj(d, true) || 'CNPJ inválido.';
          }
          if (field.allowAlphanumericCnpj && !/^\d+$/.test(d)) return 'CPF inválido.';
          return validaDocumento(d, modo);
        },
      }}
      render={({ field: f, fieldState }) => (
        <FormField
          fullWidth
          size={dense ? 'small' : 'small'}
          label={field.label}
          required={field.required}
          disabled={field.disabled}
          placeholder={placeholder}
          value={alfanumerico ? mascaraDocumentoFiscal(String(f.value ?? ''), modo) : mascaraDocumento(String(f.value ?? ''), modo)}
          onChange={(e) => {
            const input = e.target.value;
            if (!alfanumerico) {
              f.onChange(soDigitos(input));
              return;
            }
            const documento = normalizaDocumentoFiscal(input);
            if (/^[A-Z0-9]{0,14}$/.test(documento)) f.onChange(documento);
          }}
          inputProps={{ maxLength, inputMode: alfanumerico ? 'text' : 'numeric' }}
          error={!!fieldState.error}
          helperText={fieldState.error?.message || field.helperText}
        />
      )}
    />
  );
}
