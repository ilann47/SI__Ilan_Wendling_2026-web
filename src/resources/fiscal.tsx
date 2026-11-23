import { type ResourceConfig } from '../components/crud/resourceConfig';
import { type FieldConfig } from '../components/form/fieldConfig';
import { DECIMAL_STEP } from '../utils/fixedDecimal';
import { cols } from './columns';
import { tipoFreteOptions } from './options';

/**
 * Itens de nota fiscal (entrada/saida) reutilizaveis.
 * Soma de cols (4+2+2+2+1 = 11) + 1 (botao remover) = 12.
 */
const itensNotaSubFields: FieldConfig[] = [
  {
    name: 'produtoId',
    label: 'Produto',
    type: 'reference',
    required: true,
    cols: 4,
    reference: { basePath: '/api/produtos', labelField: 'nome' },
  },
  { name: 'quantidade', label: 'Qtd.', type: 'number', required: true, cols: 2, min: 0.000001, step: 0.000001 },
  { name: 'valorUnitario', label: 'Vlr. unit.', type: 'money', step: 0.000001, required: true, cols: 2 },
  { name: 'valorDesconto', label: 'Desc.', type: 'money', step: 0.000001, cols: 2 },
  { name: 'percentualDesconto', label: '% Desc.', type: 'percent', step: 0.000001, cols: 1 },
];

export const notaEntradaConfig: ResourceConfig = {
  key: 'notas-entrada',
  basePath: '/api/notas-entrada',
  singular: 'Nota de Entrada',
  plural: 'Notas de Entrada',
  grammaticalGender: 'feminine',
  tenantAware: true,
  permissions: {
    read: ['fiscal:read'],
    create: ['fiscal:manage'],
    delete: ['fiscal:manage'],
  },
  requiredAllPermissions: {
    create: ['suppliers:read', 'catalog:read', 'stock:read'],
  },
  subtitle: 'Entradas de mercadoria com estoque e contas a pagar.',
  searchFilter: 'numero',
  unavailableRelations: [],
  canEdit: false,
  canDelete: true,
  columns: [
    cols.id(),
    cols.text('numero', 'Número', { flex: 0, width: 120 }),
    cols.text('fornecedorNome', 'Fornecedor'),
    cols.date('dataEmissao', 'Emissão'),
    cols.money('valorTotal', 'Total'),
    cols.status('situacao', 'Situação'),
  ],
  fields: [
    { name: 'numero', label: 'Número', type: 'text', required: true, cols: 4 },
    { name: 'serie', label: 'Série', type: 'text', cols: 2 },
    { name: 'modelo', label: 'Modelo', type: 'text', cols: 2 },
    { name: 'tipoFrete', label: 'Tipo de frete', type: 'select', cols: 4, options: tipoFreteOptions, defaultValue: 'CIF' },
    {
      name: 'fornecedorId',
      label: 'Fornecedor',
      type: 'reference',
      required: true,
      cols: 6,
      reference: { basePath: '/api/fornecedores', labelField: 'nome' },
    },
    {
      name: 'condicaoPagamentoId',
      label: 'Condição de pagamento',
      type: 'reference',
      cols: 6,
      reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome' },
    },
    {
      name: 'localEstoqueId',
      label: 'Local de estoque',
      type: 'reference',
      required: true,
      cols: 6,
      reference: { basePath: '/api/v1/stock-locations', labelField: 'nome' },
    },
    { name: 'dataEmissao', label: 'Emissão', type: 'date', cols: 4 },
    { name: 'dataChegada', label: 'Chegada', type: 'date', cols: 4 },
    { name: 'valorFrete', label: 'Frete', type: 'money', cols: 3 },
    { name: 'valorSeguro', label: 'Seguro', type: 'money', cols: 3 },
    { name: 'outrasDespesas', label: 'Outras despesas', type: 'money', cols: 3 },
    { name: 'valorDesconto', label: 'Desconto', type: 'money', cols: 3 },
    { name: 'observacao', label: 'Observação', type: 'textarea' },
    { name: 'itens', label: 'Itens', type: 'subitems', subFields: itensNotaSubFields },
  ],
  rowActions: [],
};

export const notaSaidaConfig: ResourceConfig = {
  key: 'notas-saida',
  basePath: '/api/notas-saida',
  singular: 'Nota de Saída',
  plural: 'Notas de Saída',
  grammaticalGender: 'feminine',
  tenantAware: true,
  permissions: { read: ['fiscal:read'], create: ['fiscal:manage'], delete: ['fiscal:manage'] },
  requiredAllPermissions: { create: ['customers:read', 'catalog:read', 'stock:read'] },
  subtitle: 'Saídas de mercadoria com estoque e contas a receber.',
  searchFilter: 'numero',
  rowActionPermissions: ['fiscal:manage'],
  canEdit: false,
  canDelete: true,
  columns: [
    cols.id(),
    cols.text('numero', 'Número', { flex: 0, width: 120 }),
    cols.text('clienteNome', 'Cliente'),
    cols.date('dataEmissao', 'Emissão'),
    cols.money('valorTotal', 'Total'),
    cols.status('situacao', 'Situação'),
  ],
  fields: [
    { name: 'numero', label: 'Número', type: 'text', required: true, cols: 4 },
    { name: 'serie', label: 'Série', type: 'text', cols: 2 },
    { name: 'modelo', label: 'Modelo', type: 'text', cols: 2 },
    { name: 'tipoFrete', label: 'Tipo de frete', type: 'select', cols: 4, options: tipoFreteOptions, defaultValue: 'CIF' },
    {
      name: 'clienteId',
      label: 'Cliente',
      type: 'reference',
      required: true,
      cols: 6,
      reference: { basePath: '/api/clientes', labelField: 'nome' },
    },
    {
      name: 'condicaoPagamentoId',
      label: 'Condição de pagamento',
      type: 'reference',
      cols: 6,
      reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome' },
    },
    {
      name: 'localEstoqueId', label: 'Local de estoque', type: 'reference', required: true, cols: 6,
      reference: { basePath: '/api/v1/stock-locations', labelField: 'nome' },
    },
    { name: 'dataEmissao', label: 'Emissão', type: 'date', cols: 4 },
    { name: 'dataSaida', label: 'Saída', type: 'date', cols: 4 },
    { name: 'valorFrete', label: 'Frete', type: 'money', step: 0.000001, cols: 3 },
    { name: 'valorSeguro', label: 'Seguro', type: 'money', step: 0.000001, cols: 3 },
    { name: 'outrasDespesas', label: 'Outras despesas', type: 'money', step: 0.000001, cols: 3 },
    { name: 'valorDesconto', label: 'Desconto', type: 'money', step: 0.000001, cols: 3 },
    { name: 'observacao', label: 'Observação', type: 'textarea' },
    { name: 'itens', label: 'Itens', type: 'subitems', subFields: itensNotaSubFields },
  ],
};

const noteServiceItems: FieldConfig = {
  name: 'itens', label: 'Serviços prestados', type: 'subitems', cols: 12,
  subFields: [
    { name: 'servicoId', label: 'Serviço', type: 'reference', required: true, cols: 5,
      reference: { basePath: '/api/servicos', labelField: 'nome', inheritFields: { valorPadrao: 'valorUnitario' } } },
    { name: 'quantidade', label: 'Quantidade', type: 'number', required: true, min: DECIMAL_STEP, cols: 2 },
    { name: 'valorUnitario', label: 'Valor unitário', type: 'money', required: true, cols: 2 },
    { name: 'valorDesconto', label: 'Desconto do item', type: 'money', cols: 2 },
  ],
};
const noteServiceCustomer: FieldConfig = {
  name: 'clienteId', label: 'Cliente', type: 'reference', required: true, cols: 12,
  reference: { basePath: '/api/clientes', labelField: 'nome' },
};
const noteServicePayment: FieldConfig[] = [
  { name: 'dataEmissao', label: 'Data de emissão', type: 'date', disableFuture: true, cols: 6 },
  { name: 'aliquotaIss', label: 'Alíquota ISS', type: 'percent', cols: 6 },
  { name: 'condicaoPagamentoId', label: 'Condição de pagamento', type: 'reference', cols: 6,
    reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome' } },
  { name: 'formaPagamentoId', label: 'Forma de pagamento', type: 'reference', cols: 6,
    reference: { basePath: '/api/formas-pagamento', labelField: 'nome' } },
];
const noteServiceObservation: FieldConfig = { name: 'observacao', label: 'Observação', type: 'textarea', maxLength: 255, cols: 12 };
const noteServiceDiscount: FieldConfig = { name: 'valorDesconto', label: 'Desconto da nota', type: 'money', cols: 6 };
export const serviceNoteEditFields = (linked: boolean) => [
  ...(linked ? [] : [noteServiceCustomer, noteServiceItems, noteServiceDiscount]),
  ...noteServicePayment,
  noteServiceObservation,
];

export const notaServicoConfig: ResourceConfig = {
  key: 'notas-servico',
  basePath: '/api/notas-servico',
  singular: 'Nota de Serviço',
  plural: 'Notas de Serviço',
  grammaticalGender: 'feminine',
  tenantAware: true,
  permissions: {
    read: ['fiscal:read'], create: ['fiscal:manage'],
    update: ['fiscal:manage'], delete: ['fiscal:manage'],
  },
  requiredAllPermissions: { create: ['customers:read', 'catalog:read'] },
  subtitle: 'Confira serviços prestados e acompanhe as cobranças.',
  searchFilter: 'numero',
  detailLinks: [{ field: 'ordemServicoId', label: 'Ver ordem de serviço',
    path: '/app/ordens-servico', permissions: ['service_orders:read'] }],
  rowActionPermissions: ['fiscal:manage'],
  canEdit: false,
  canDelete: false,
  defaultSort: 'dataEmissao,desc',
  filters: [
    { name: 'numero', label: 'Número', type: 'text' },
    { name: 'situacao', label: 'Situação', type: 'select', options: [
      { value: 'PENDENTE', label: 'Pendente' }, { value: 'EMITIDA', label: 'Emitida' },
      { value: 'CANCELADA', label: 'Cancelada' },
    ] },
    { name: 'clienteId', label: 'Cliente', type: 'reference', reference: { basePath: '/api/clientes', labelField: 'nome' } },
  ],
  columns: [
    cols.id(),
    cols.text('numero', 'Número', { flex: 0, width: 120 }),
    cols.text('clienteNome', 'Cliente'),
    cols.money('valorServico', 'Serviço'),
    cols.money('valorIss', 'ISS'),
    cols.money('valorTotal', 'Total'),
    cols.status('situacao', 'Situação'),
  ],
  fields: [
    { name: 'numero', label: 'Número', type: 'text', required: true, maxLength: 20, cols: 4 },
    { name: 'serie', label: 'Série', type: 'text', maxLength: 10, cols: 4 },
    { name: 'modelo', label: 'Modelo', type: 'text', maxLength: 10, cols: 4 },
    ...serviceNoteEditFields(false),
  ],
};

export const fiscalConfigs = [notaEntradaConfig, notaSaidaConfig, notaServicoConfig];
