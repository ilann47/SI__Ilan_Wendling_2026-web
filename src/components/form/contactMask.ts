export type ContactMask = 'telefone-br' | 'cep-br';

/** Retorna null para recusar a edição, sem aproveitar parte de uma colagem inválida. */
function formatContact(mask: ContactMask, text: string): string | null {
  const value = text.trim();
  const digits = value.replace(/\D/g, '');

  if (mask === 'cep-br') {
    if (!/^[\d-]*$/.test(value) || digits.length > 8) return null;
    return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  if (!/^\+?[\d() -]*$/.test(value)) return null;
  const international = value.startsWith('+');
  if (international && digits.length < 2) {
    return '55'.startsWith(digits) ? `+${digits}` : null;
  }
  if (international && !digits.startsWith('55')) return null;

  const national = international ? digits.slice(2) : digits;
  if (national.length > 11) return null;
  const prefix = international ? '+55' : '';
  if (!national) return prefix;
  const start = prefix ? `${prefix} ` : '';
  if (national.length <= 2) return `${start}(${national}`;

  const ddd = national.slice(0, 2);
  const local = national.slice(2);
  const split = local.length === 9 ? 5 : 4;
  const number = local.length > split ? `${local.slice(0, split)}-${local.slice(split)}` : local;
  return `${start}(${ddd}) ${number}`;
}

/** Atualiza o cursor no mesmo dígito quando a máscara acrescenta ou remove separadores. */
export function applyContactMask(
  input: HTMLInputElement | HTMLTextAreaElement,
  mask: ContactMask,
  previous: string,
): string {
  const current = input.value;
  const formatted = formatContact(mask, current);
  const position = input.selectionStart ?? current.length;
  if (formatted === current) return current;

  if (formatted === null) {
    const cursor = Math.max(0, position - Math.max(0, current.length - previous.length));
    input.value = previous;
    input.setSelectionRange(cursor, cursor);
    return previous;
  }

  let remaining = current.slice(0, position).replace(/[^\d+]/g, '').length;
  let cursor = 0;
  while (cursor < formatted.length && remaining > 0) {
    if (/[\d+]/.test(formatted[cursor])) remaining -= 1;
    cursor += 1;
  }
  input.value = formatted;
  input.setSelectionRange(cursor, cursor);
  return formatted;
}
