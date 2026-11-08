import { type ResourceConfig } from '../components/crud/resourceConfig';
import { cols } from './columns';
import { tipoPessoaOptions } from './options';

function optionalPattern(pattern: RegExp, message: string) {
  return (value: unknown) => value == null || value === '' || pattern.test(String(value)) || message;
}

const telefoneComDdd = /^(?:\+55 ?)?(?:\([1-9]\d\) ?|[1-9]\d[ -]?)\d{4,5}[ -]?\d{4}$/;
const emailDeContato = /^[^\s@.,;<>"]+(?:\.[^\s@.,;<>"]+)*@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d](?:[a-z\d-]*[a-z\d])?$/i;
const cepBrasileiro = /^\d{5}-?\d{3}$/;

export const transportadorasConfig: ResourceConfig = {
  key: 'transportadoras',
  basePath: '/api/transportadoras',
  singular: 'Transportadora',
  plural: 'Transportadoras',
  grammaticalGender: 'feminine',
  tenantAware: true,
  permissions: {
    read: ['logistics:read'],
    create: ['logistics:manage'],
    update: ['logistics:manage'],
    delete: ['logistics:manage'],
  },
  subtitle: 'Empresas que fazem o frete das compras.',
  defaultSort: 'nome,asc',
  columns: [
    cols.id(),
    cols.text('nome', 'Nome'),
    cols.documento('documento', 'Documento'),
    cols.text('cidadeNome', 'Cidade'),
    cols.bool('ativo', 'Ativo'),
  ],
  filters: [
    { name: 'nome', label: 'Nome', type: 'text' },
    { name: 'documento', label: 'Documento', type: 'text' },
    { name: 'ativo', label: 'Situação', type: 'boolean' },
  ],
  fields: [
    {
      name: 'nome', label: 'Nome (razão social)', type: 'text', required: true, maxLength: 150, cols: 6,
      validate: (value) => !!String(value ?? '').trim() || 'Informe a razão social.',
    },
    { name: 'nomeFantasia', label: 'Nome fantasia', type: 'text', maxLength: 120, cols: 6 },
    { name: 'tipo', label: 'Tipo', type: 'select', cols: 4, options: tipoPessoaOptions, defaultValue: 'JURIDICA' },
    { name: 'documento', label: 'CNPJ / CPF', type: 'document', documentTypeFrom: 'tipo', required: true, cols: 4 },
    { name: 'rgInscricaoEstadual', label: 'RG / Inscr. Estadual', type: 'text', maxLength: 20, cols: 4 },
    {
      name: 'telefone', label: 'Telefone', type: 'text', inputMode: 'tel', contactMask: 'telefone-br', cols: 4,
      validate: optionalPattern(telefoneComDdd, 'Informe um telefone com DDD e 10 ou 11 dígitos.'),
    },
    {
      name: 'email', label: 'E-mail', type: 'text', inputMode: 'email', maxLength: 120, cols: 8,
      validate: optionalPattern(emailDeContato, 'Informe um e-mail válido.'),
    },
    { name: 'endereco', label: 'Endereço', type: 'text', maxLength: 120, cols: 6 },
    { name: 'numero', label: 'Número', type: 'text', maxLength: 10, cols: 2 },
    { name: 'complemento', label: 'Complemento', type: 'text', maxLength: 100, cols: 4 },
    { name: 'bairro', label: 'Bairro', type: 'text', maxLength: 60, cols: 4 },
    {
      name: 'cep', label: 'CEP', type: 'text', inputMode: 'numeric', contactMask: 'cep-br', cols: 4,
      validate: optionalPattern(cepBrasileiro, 'Informe um CEP de 8 dígitos.'),
    },
    {
      name: 'cidadeId',
      label: 'Cidade',
      type: 'reference',
      cols: 4,
      reference: { basePath: '/api/cidades', labelField: 'nome', secondaryField: 'estadoNome' },
    },
    {
      name: 'condicaoPagamentoId',
      label: 'Condição de pagamento',
      type: 'reference',
      cols: 6,
      reference: { basePath: '/api/condicoes-pagamento', labelField: 'nome' },
    },
    { name: 'ativo', label: 'Ativo', type: 'switch', cols: 6 },
    { name: 'observacao', label: 'Observação', type: 'textarea', maxLength: 255 },
  ],
};

export const veiculosFrotaConfig: ResourceConfig = {
  key: 'veiculos-frota',
  basePath: '/api/veiculos-frota',
  singular: 'Veículo de Frota',
  plural: 'Veículos de Frota',
  tenantAware: true,
  permissions: {
    read: ['logistics:read'],
    create: ['logistics:manage'],
    update: ['logistics:manage'],
    delete: ['logistics:manage'],
  },
  subtitle: 'Veículos de carga das transportadoras.',
  defaultSort: 'placa,asc',
  columns: [
    cols.id(),
    cols.text('placa', 'Placa', { flex: 0, width: 120 }),
    cols.text('modelo', 'Modelo'),
    cols.text('marca', 'Marca'),
    cols.number('ano', 'Ano'),
    cols.decimal('capacidade', 'Capacidade'),
    cols.bool('ativo', 'Ativo'),
  ],
  filters: [
    { name: 'placa', label: 'Placa', type: 'text' },
    { name: 'marca', label: 'Marca', type: 'text' },
    { name: 'ativo', label: 'Situação', type: 'boolean' },
  ],
  fields: [
    { name: 'placa', label: 'Placa', type: 'text', required: true, cols: 3 },
    { name: 'modelo', label: 'Modelo', type: 'text', cols: 5 },
    { name: 'marca', label: 'Marca', type: 'text', cols: 4 },
    { name: 'ano', label: 'Ano', type: 'integer', cols: 3 },
    { name: 'capacidade', label: 'Capacidade (kg)', type: 'number', cols: 3 },
    { name: 'ativo', label: 'Ativo', type: 'switch', cols: 3 },
    { name: 'observacao', label: 'Observação', type: 'textarea' },
  ],
};

export const transportadoraVeiculosConfig: ResourceConfig = {
  key: 'transportadora-veiculos',
  basePath: '/api/transportadora-veiculos',
  singular: 'Veículo da Transportadora',
  plural: 'Frota das Transportadoras',
  tenantAware: true,
  permissions: {
    read: ['logistics:read'],
    create: ['logistics:manage'],
    update: ['logistics:manage'],
    delete: ['logistics:manage'],
  },
  subtitle: 'Vínculo entre transportadora e seus veículos de frota.',
  columns: [
    cols.id(),
    cols.text('transportadoraNome', 'Transportadora'),
    cols.text('veiculoFrotaPlaca', 'Placa'),
    cols.bool('ativo', 'Ativo'),
  ],
  fields: [
    {
      name: 'transportadoraId',
      label: 'Transportadora',
      type: 'reference',
      required: true,
      cols: 6,
      reference: { basePath: '/api/transportadoras', labelField: 'nome' },
    },
    {
      name: 'veiculoFrotaId',
      label: 'Veículo de frota',
      type: 'reference',
      required: true,
      cols: 6,
      reference: { basePath: '/api/veiculos-frota', labelField: 'placa', secondaryField: 'modelo' },
    },
  ],
};

export const logisticaConfigs = [
  transportadorasConfig,
  veiculosFrotaConfig,
  transportadoraVeiculosConfig,
];
