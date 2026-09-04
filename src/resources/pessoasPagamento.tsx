import { type ResourceConfig } from '../components/crud/resourceConfig';
import { type FieldConfig } from '../components/form/fieldConfig';
import { cols } from './columns';
import { estadoCivilOptions, sexoOptions, tipoPessoaOptions } from './options';

export const clientesConfig: ResourceConfig = {
  key: 'clientes',
  basePath: '/api/clientes',
  singular: 'Cliente',
  plural: 'Clientes',
  tenantAware: true,
  permissions: {
    read: ['customers:read'],
    create: ['customers:manage'],
    update: ['customers:manage'],
    delete: ['customers:manage'],
  },
  subtitle: 'Pessoas físicas ou jurídicas atendidas.',
  searchFilter: 'nome',
  unavailableRelations: [
    'Mensalidades',
    'Movimentações',
    'Vendas administrativas',
    'Ordens de serviço',
    'Notas',
    'Contas a receber',
  ],
  defaultSort: 'nome,asc',
  columns: [
    cols.id(),
    cols.text('nome', 'Nome'),
    cols.documento('documento', 'Documento'),
    cols.text('telefone', 'Telefone', { flex: 0, width: 140 }),
    cols.text('cidadeNome', 'Cidade'),
    cols.bool('ativo', 'Ativo'),
  ],
  filters: [
    { name: 'nome', label: 'Nome', type: 'text' },
    { name: 'documento', label: 'Documento', type: 'text' },
    { name: 'ativo', label: 'Situação', type: 'boolean' },
  ],
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true, cols: 8 },
    { name: 'tipo', label: 'Tipo', type: 'select', cols: 4, options: tipoPessoaOptions, defaultValue: 'FISICA' },
    { name: 'documento', label: 'CPF / CNPJ', type: 'document', documentTypeFrom: 'tipo', required: true, cols: 4 },
    { name: 'rgInscricaoEstadual', label: 'RG / Inscrição Estadual', type: 'text', cols: 4 },
    { name: 'apelido', label: 'Apelido / Nome fantasia', type: 'text', cols: 4 },
    { name: 'dataNascimento', label: 'Nascimento', type: 'date', cols: 4 },
    { name: 'sexo', label: 'Sexo', type: 'select', cols: 4, options: sexoOptions },
    { name: 'estadoCivil', label: 'Estado civil', type: 'select', cols: 4, options: estadoCivilOptions },
    { name: 'telefone', label: 'Telefone', type: 'text', cols: 4 },
    { name: 'email', label: 'E-mail', type: 'text', cols: 8 },
    { name: 'endereco', label: 'Endereço', type: 'text', cols: 6 },
    { name: 'numero', label: 'Número', type: 'text', cols: 2 },
    { name: 'complemento', label: 'Complemento', type: 'text', cols: 4 },
    { name: 'bairro', label: 'Bairro', type: 'text', cols: 4 },
    { name: 'cep', label: 'CEP', type: 'text', cols: 4 },
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
    { name: 'limiteCredito', label: 'Limite de crédito', type: 'money', cols: 4 },
    { name: 'ativo', label: 'Ativo', type: 'switch', cols: 4 },
    { name: 'observacao', label: 'Observação', type: 'textarea' },
  ],
};

export const formasPagamentoConfig: ResourceConfig = {
  key: 'formas-pagamento',
  basePath: '/api/formas-pagamento',
  singular: 'Forma de Pagamento',
  plural: 'Formas de Pagamento',
  tenantAware: true,
  permissions: {
    read: ['payments:read'],
    create: ['payments:manage'],
    update: ['payments:manage'],
    delete: ['payments:manage'],
  },
  subtitle: 'Meios de pagamento aceitos.',
  defaultSort: 'nome,asc',
  columns: [
    cols.id(),
    cols.text('nome', 'Nome'),
    cols.text('descricao', 'Descrição'),
    cols.bool('ativo', 'Ativo'),
  ],
  filters: [
    { name: 'nome', label: 'Nome', type: 'text' },
    { name: 'ativo', label: 'Situação', type: 'boolean' },
  ],
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true, cols: 6 },
    { name: 'descricao', label: 'Descrição', type: 'text', required: true, cols: 6 },
    { name: 'ativo', label: 'Ativo', type: 'switch', cols: 4 },
  ],
};

const parcelaSubFields: FieldConfig[] = [
  { name: 'numero', label: 'Nº', type: 'integer', cols: 2, required: true },
  { name: 'dias', label: 'Dias', type: 'integer', cols: 3, required: true },
  { name: 'percentual', label: 'Percentual', type: 'percent', cols: 3, required: true },
  {
    name: 'formaPagamentoId',
    label: 'Forma',
    type: 'reference',
    cols: 3,
    reference: { basePath: '/api/formas-pagamento', labelField: 'nome' },
  },
];

export const condicoesPagamentoConfig: ResourceConfig = {
  key: 'condicoes-pagamento',
  basePath: '/api/condicoes-pagamento',
  singular: 'Condição de Pagamento',
  plural: 'Condições de Pagamento',
  tenantAware: true,
  permissions: {
    read: ['payments:read'],
    create: ['payments:manage'],
    update: ['payments:manage'],
    delete: ['payments:manage'],
  },
  subtitle: 'Prazos e parcelas (à vista, 30/60, etc.).',
  defaultSort: 'nome,asc',
  columns: [
    cols.id(),
    cols.text('nome', 'Nome'),
    cols.number('numeroParcelas', 'Parcelas'),
    cols.percent('percentualJuros', 'Juros'),
    cols.percent('percentualDesconto', 'Desconto'),
    cols.bool('ativo', 'Ativo'),
  ],
  filters: [
    { name: 'nome', label: 'Nome', type: 'text' },
    { name: 'ativo', label: 'Situação', type: 'boolean' },
  ],
  toFormValues: (row) => ({
    ...row,
    parcelas: (Array.isArray(row.parcelas) ? row.parcelas : []).map((p: any) => ({
      numero: p.numero,
      dias: p.dias,
      percentual: p.percentual,
      formaPagamentoId: p.formaPagamentoId,
    })),
  }),
  fields: [
    { name: 'nome', label: 'Nome', type: 'text', required: true, cols: 6 },
    { name: 'numeroParcelas', label: 'Nº de parcelas', type: 'integer', required: true, cols: 3, defaultValue: 1 },
    { name: 'ativo', label: 'Ativo', type: 'switch', cols: 3 },
    { name: 'percentualJuros', label: 'Juros', type: 'percent', cols: 4 },
    { name: 'percentualMulta', label: 'Multa', type: 'percent', cols: 4 },
    { name: 'percentualDesconto', label: 'Desconto', type: 'percent', cols: 4 },
    { name: 'parcelas', label: 'Parcelas', type: 'subitems', subFields: parcelaSubFields },
  ],
};

export const pessoasPagamentoConfigs = [clientesConfig, formasPagamentoConfig, condicoesPagamentoConfig];
