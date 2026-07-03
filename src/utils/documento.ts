/**
 * Utilitarios de CPF/CNPJ: normalizacao (so-digitos), mascara progressiva e
 * validacao de digito verificador. Usado pelo campo de formulario `document`
 * e pela formatacao das colunas de listagem.
 */

export type DocumentoModo = 'cpf' | 'cnpj' | 'auto';

/** Remove tudo que nao for digito. */
export function soDigitos(v: string | null | undefined): string {
  return (v ?? '').replace(/\D/g, '');
}

/** Aplica a mascara de CPF (000.000.000-00) de forma progressiva. */
export function mascaraCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11);
  let out = d.slice(0, 3);
  if (d.length > 3) out += '.' + d.slice(3, 6);
  if (d.length > 6) out += '.' + d.slice(6, 9);
  if (d.length > 9) out += '-' + d.slice(9, 11);
  return out;
}

/** Aplica a mascara de CNPJ (00.000.000/0000-00) de forma progressiva. */
export function mascaraCnpj(v: string): string {
  const d = soDigitos(v).slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '.' + d.slice(2, 5);
  if (d.length > 5) out += '.' + d.slice(5, 8);
  if (d.length > 8) out += '/' + d.slice(8, 12);
  if (d.length > 12) out += '-' + d.slice(12, 14);
  return out;
}

/**
 * Mascara um documento conforme o modo. Em `auto`, decide por comprimento:
 * ate 11 digitos -> CPF; acima -> CNPJ.
 */
export function mascaraDocumento(v: string, modo: DocumentoModo = 'auto'): string {
  const usarCnpj = modo === 'cnpj' || (modo === 'auto' && soDigitos(v).length > 11);
  return usarCnpj ? mascaraCnpj(v) : mascaraCpf(v);
}

/** Valida o CPF pelos dois digitos verificadores (rejeita sequencias iguais). */
export function validaCpf(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const dv = (len: number): number => {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * (len + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** Valida o CNPJ pelos dois digitos verificadores (rejeita sequencias iguais). */
export function validaCnpj(v: string): boolean {
  const d = soDigitos(v);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const dv = (len: number): number => {
    const pesos =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(d[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13]);
}

/**
 * Valida um documento e retorna `true` quando valido, ou uma mensagem de erro.
 * Em `auto`, escolhe CPF/CNPJ pelo comprimento.
 */
export function validaDocumento(v: string, modo: DocumentoModo = 'auto'): true | string {
  const d = soDigitos(v);
  if (!d) return 'Informe o documento.';
  if (modo === 'cpf') return validaCpf(d) || 'CPF inválido.';
  if (modo === 'cnpj') return validaCnpj(d) || 'CNPJ inválido.';
  if (d.length <= 11) return validaCpf(d) || 'CPF inválido.';
  return validaCnpj(d) || 'CNPJ inválido.';
}
