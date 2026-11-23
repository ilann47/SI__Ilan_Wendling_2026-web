import { normalizaDocumentoFiscal, validaCnpj, validaCpf } from '../../utils/documento';

export type FiscalPayer = { documento: string; nome: string };
export const EMPTY_FISCAL_PAYER: FiscalPayer = { documento: '', nome: '' };

export { normalizaDocumentoFiscal as normalizeFiscalDocument };

export function validFiscalDocument(value: string) {
  if (!/^[A-Z0-9./-]+$/i.test(value.trim())) return false;
  const documento = normalizaDocumentoFiscal(value);
  if (/^\d{11}$/.test(documento)) return validaCpf(documento);
  return validaCnpj(documento, true);
}

export function validFiscalName(value: string) {
  const name = value.trim();
  return name.length > 0 && name.length <= 160 && !/[\p{Cc}\p{Cf}]/u.test(value);
}

export function fiscalPayerPayload(value: FiscalPayer): FiscalPayer | null {
  return validFiscalDocument(value.documento) && validFiscalName(value.nome)
    ? { documento: normalizaDocumentoFiscal(value.documento), nome: value.nome.trim() }
    : null;
}
