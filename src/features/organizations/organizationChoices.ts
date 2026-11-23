export type OrganizationChoice = { value: string; label: string };

// Intl is optional on older clients; keep the existing defaults usable there.
const runtimeIntl = Intl as typeof Intl & {
  supportedValuesOf?: (key: 'currency' | 'timeZone') => string[];
  DisplayNames?: new (locales: string[], options: { type: 'currency' }) => { of: (code: string) => string | undefined };
};
function available(key: 'currency' | 'timeZone', fallback: string[]): string[] {
  try { return [...new Set([...fallback, ...(runtimeIntl.supportedValuesOf?.(key) ?? [])])]; }
  catch { return fallback; }
}

const currencyNames: Record<string, string> = { BRL: 'Real brasileiro', USD: 'Dólar americano', EUR: 'Euro' };
const currencyOrder: Record<string, number> = { BRL: 0, USD: 1, EUR: 2 };
function currencyName(code: string): string {
  if (currencyNames[code]) return currencyNames[code];
  try {
    const name = runtimeIntl.DisplayNames && new runtimeIntl.DisplayNames(['pt-BR'], { type: 'currency' }).of(code);
    if (name) return name.charAt(0).toLocaleUpperCase('pt-BR') + name.slice(1);
  } catch { /* The code remains readable when localized names are unavailable. */ }
  return code;
}
export const currencyChoices: OrganizationChoice[] = available('currency', ['BRL', 'USD', 'EUR'])
  .filter((value) => /^[A-Z]{3}$/.test(value) && value !== 'XXX' && value !== 'XTS')
  .map((value) => ({ value, label: `${value} — ${currencyName(value)}` }))
  .sort((a, b) => {
    const order = (value: string) => currencyOrder[value] ?? 3;
    return order(a.value) - order(b.value) || a.label.localeCompare(b.label, 'pt-BR');
  });

// CNPJ onboarding is Brazilian; keep ISO 3166-2 values in the existing payload.
export const regionChoices: OrganizationChoice[] = [
  ['AC', 'Acre'], ['AL', 'Alagoas'], ['AP', 'Amapá'], ['AM', 'Amazonas'], ['BA', 'Bahia'],
  ['CE', 'Ceará'], ['DF', 'Distrito Federal'], ['ES', 'Espírito Santo'], ['GO', 'Goiás'],
  ['MA', 'Maranhão'], ['MT', 'Mato Grosso'], ['MS', 'Mato Grosso do Sul'], ['MG', 'Minas Gerais'],
  ['PA', 'Pará'], ['PB', 'Paraíba'], ['PR', 'Paraná'], ['PE', 'Pernambuco'], ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'], ['RN', 'Rio Grande do Norte'], ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'], ['RR', 'Roraima'], ['SC', 'Santa Catarina'], ['SP', 'São Paulo'],
  ['SE', 'Sergipe'], ['TO', 'Tocantins'],
].map(([code, name]) => ({ value: `BR-${code}`, label: `${code} — ${name}` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));

// These are the codes already used by this project's defaults and operated seed.
// Selecting a label neither changes membership permissions nor contracts a plan.
export const planChoices: OrganizationChoice[] = [
  { value: 'STANDARD', label: 'Standard' }, { value: 'ENTERPRISE', label: 'Enterprise' },
];

const brazilTimeZoneNames: Record<string, string> = {
  'America/Araguaina': 'Araguaína', 'America/Bahia': 'Salvador', 'America/Belem': 'Belém',
  'America/Boa_Vista': 'Boa Vista', 'America/Campo_Grande': 'Campo Grande', 'America/Cuiaba': 'Cuiabá',
  'America/Eirunepe': 'Eirunepé', 'America/Fortaleza': 'Fortaleza', 'America/Maceio': 'Maceió',
  'America/Manaus': 'Manaus', 'America/Noronha': 'Fernando de Noronha', 'America/Porto_Velho': 'Porto Velho',
  'America/Recife': 'Recife', 'America/Rio_Branco': 'Rio Branco', 'America/Santarem': 'Santarém',
  'America/Sao_Paulo': 'São Paulo / Brasília',
};
export const timeZoneChoices = available('timeZone', [...Object.keys(brazilTimeZoneNames), 'UTC'])
  .filter((value) => value.length <= 60)
  .map((value) => ({ value, brazil: Object.prototype.hasOwnProperty.call(brazilTimeZoneNames, value),
    label: `${brazilTimeZoneNames[value] ?? (value === 'UTC' ? 'Tempo Universal Coordenado' : value.split('/').pop()!.replace(/_/g, ' '))} (${value})` }))
  .sort((a, b) => Number(b.brazil) - Number(a.brazil) || a.label.localeCompare(b.label, 'pt-BR'));
