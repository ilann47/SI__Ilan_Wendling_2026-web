import type { FilterConfig } from '../crud/resourceConfig';
import { formatBool, formatCurrency, formatDate, formatDateTime, formatNumber, formatStatusLabel } from '../../utils/format';

export const UNAVAILABLE_API = 'Informação não disponibilizada pela API atual';

export function isFilled(value: unknown): boolean {
  return value !== undefined && value !== null && value !== '';
}

export function countAppliedFilters(values: Record<string, unknown>): number {
  return Object.values(values).filter(isFilled).length;
}

export function filterChipLabel(filter: FilterConfig, value: unknown): string {
  if (filter.type === 'boolean') return `${filter.label}: ${value === 'true' || value === true ? 'Sim' : 'Não'}`;
  if (filter.type === 'select') {
    const option = filter.options?.find((item) => item.value === String(value));
    return `${filter.label}: ${option?.label ?? String(value)}`;
  }
  return `${filter.label}: ${String(value)}`;
}

export function primarySearchFilter(filters: FilterConfig[]): FilterConfig | undefined {
  return filters.find((filter) => filter.type === 'text' && filter.name !== 'id');
}

export function formatDetailValue(value: unknown, field?: string): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return formatBool(value);
  if (typeof value === 'number') {
    if (field && /totalAvailable|totalElements|totalPages|totalQuantity/i.test(field)) {
      return formatNumber(value, Number.isInteger(value) ? 0 : 3);
    }
    if (field && /valor|preco|total|subtotal|frete|seguro|despesa|desconto|salario|custo|limiteCredito/i.test(field)) {
      return formatCurrency(value);
    }
    return formatNumber(value, Number.isInteger(value) ? 0 : 3);
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
    if (/status|situacao/i.test(field ?? '')) return formatStatusLabel(value);
    if (/^(tipo|sexo|estadoCivil|category|categoria|origin|preferredMedium|reentryPolicy|right|decision|operation)$/i.test(field ?? '')) {
      return formatStatusLabel(value);
    }
    return value;
  }
  if (Array.isArray(value)) return `${value.length} item(ns)`;
  return String(value);
}

export function humanizeField(name: string): string {
  const knownLabels: Record<string, string> = {
    id: 'Código interno',
    version: 'Versão',
    status: 'Situação',
    number: 'Número',
    buyer: 'Comprador',
    vehiclePlate: 'Placa do veículo',
    createdAt: 'Criado em',
    updatedAt: 'Atualizado em',
    dataEmissao: 'Emissão',
    dataSaida: 'Saída',
    dataChegada: 'Chegada',
    dataInicio: 'Início',
    dataFim: 'Fim',
    dataNascimento: 'Data de nascimento',
    tipoFrete: 'Tipo de frete',
    valorProdutos: 'Produtos',
    valorFrete: 'Frete',
    valorSeguro: 'Seguro',
    valorDesconto: 'Desconto',
    valorTotal: 'Total',
    outrasDespesas: 'Outras despesas',
    clienteNome: 'Cliente',
    fornecedorNome: 'Fornecedor',
    condicaoPagamentoNome: 'Condição de pagamento',
    formaPagamentoNome: 'Forma de pagamento',
    localEstoqueNome: 'Local de estoque',
    veiculoPlaca: 'Veículo',
    valorMensal: 'Mensalidade',
    limiteCredito: 'Limite de crédito',
    estadoCivil: 'Estado civil',
    endereco: 'Endereço',
    cep: 'CEP',
    email: 'E-mail',
    observacao: 'Observação',
    numero: 'Número',
    serie: 'Série',
    eventId: 'Evento',
    parkingFacilityId: 'Pátio',
    parkingAllocationId: 'Alocação',
    parkingProductId: 'Produto de estacionamento',
    inventoryHoldId: 'Reserva temporária',
    orderId: 'Pedido',
    orderItemId: 'Item do pedido',
    publicCode: 'Código público',
    reentryPolicy: 'Política de reentrada',
    operationalCapacity: 'Capacidade operacional',
    sellableCapacity: 'Capacidade vendável',
    reservedCapacity: 'Capacidade reservada',
    configurationChecklist: 'Conferência da configuração',
    ready: 'Pronto',
    venue: 'Local do evento',
    parkingAllocation: 'Alocação de pátio',
    parkingProduct: 'Produto de estacionamento',
    responsibleParty: 'Responsável',
    policies: 'Políticas',
    userId: 'Usuário',
    origin: 'Origem',
    joinedAt: 'Vinculado em',
    membershipId: 'Vínculo',
    roleCode: 'Papel',
    revokedAt: 'Revogado em',
    asOf: 'Consultado em',
    totalAvailable: 'Total disponível',
    guaranteesHold: 'Disponibilidade garantida',
  };
  if (knownLabels[name]) return knownLabels[name];
  return name
    .replace(/Id$/, '')
    .replace(/Nome$/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

export interface DetailField {
  label: string;
  value: string;
}

export interface DetailSection {
  title: string;
  fields: DetailField[];
}

const IDENTIFICATION = ['id', 'numero', 'nome', 'placa', 'documento', 'descricao', 'titulo', 'login'];
const SITUATION = ['status', 'situacao', 'ativo', 'decision'];
const DATE_HINT = /data|At$|Em$|created|updated|inicio|fim|vencimento|emissao|abertura|previsao/i;
const VALUE_HINT = /valor|preco|total|subtotal|frete|seguro|despesa|desconto|quantidade|saldo|aliquota|limiteCredito/i;
const PARTICIPANT_HINT = /cliente|fornecedor|transportadora|funcionario|usuario|responsavel|ator|condicao|forma/i;

export function buildDetailSections(row: Record<string, unknown>): DetailSection[] {
  const used = new Set<string>(['id', 'version', 'organizationId', 'organizacaoId']);
  for (const name of Object.keys(row)) {
    if (!name.endsWith('Id')) continue;
    const prefix = name.slice(0, -2);
    const readableField = [`${prefix}Nome`, `${prefix}Descricao`, `${prefix}Numero`, `${prefix}Placa`]
      .find((candidate) => candidate in row && isFilled(row[candidate]));
    if (readableField) used.add(name);
  }
  const pick = (names: string[]) => names
    .filter((name) => name in row && !used.has(name))
    .map((name) => {
      used.add(name);
      return { label: humanizeField(name), value: formatDetailValue(row[name], name) };
    });

  const identification = pick(IDENTIFICATION);
  const situation = pick(SITUATION);
  const dates: DetailField[] = [];
  const values: DetailField[] = [];
  const participants: DetailField[] = [];
  const other: DetailField[] = [];

  for (const [name, value] of Object.entries(row)) {
    if (used.has(name) || name === 'itens' || name === 'items') continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) continue;
    const field = { label: humanizeField(name), value: formatDetailValue(value, name) };
    used.add(name);
    if (DATE_HINT.test(name)) dates.push(field);
    else if (VALUE_HINT.test(name)) values.push(field);
    else if (PARTICIPANT_HINT.test(name)) participants.push(field);
    else other.push(field);
  }

  return [
    { title: 'Identificação', fields: identification },
    { title: 'Situação', fields: situation },
    { title: 'Datas', fields: dates },
    { title: 'Valores', fields: values },
    { title: 'Participantes', fields: participants },
    { title: 'Demais dados', fields: other },
  ].filter((section) => section.fields.length > 0);
}

export function highlightTerm(text: string, term: string): Array<{ text: string; match: boolean }> {
  if (!term.trim()) return [{ text, match: false }];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'));
  return parts.filter(Boolean).map((part) => ({
    text: part,
    match: part.toLowerCase() === term.toLowerCase(),
  }));
}
