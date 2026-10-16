export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'integer'
  | 'money'
  | 'percent'
  | 'date'
  | 'switch'
  | 'select'
  | 'reference'
  | 'password'
  | 'document'
  | 'section'
  | 'subitems'
  | 'subitems-summary';

export interface SelectOption {
  value: string;
  label: string;
}

export interface ReferenceConfig {
  /** Endpoint do recurso referenciado, ex.: '/api/clientes'. */
  basePath: string;
  /** Campo do registro usado como rotulo da opcao. */
  labelField: string;
  /** Campo secundario opcional (mostrado apos um traco). */
  secondaryField?: string;
  /** Parametros extras de filtro na busca de opcoes. */
  params?: Record<string, unknown>;
  /** Consulta contextual quando o destino não possui configuração no registry genérico. */
  readPermissions?: string[];
  /**
   * Copia valores do registro selecionado para outros campos do formulário.
   * A chave é o campo da opção e o valor é o campo de destino.
   */
  inheritFields?: Record<string, string>;
}

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Largura em colunas (1..12) no grid do formulario. Default 6. */
  cols?: number;
  options?: SelectOption[];
  reference?: ReferenceConfig;
  subFields?: FieldConfig[];
  /** Resumo especializado exibido abaixo de uma coleção de itens. */
  subItemsSummary?: 'purchase-costs';
  helperText?: string;
  defaultValue?: unknown;
  disabled?: boolean;
  /** Bloqueio calculado a partir dos valores atuais do formulario. */
  disabledWhen?: (values: Record<string, unknown>) => boolean;
  /** Mantem o campo editavel na criacao e bloqueia sua troca em registros existentes. */
  disabledOnEdit?: boolean;
  step?: number;
  /** Limites numéricos. Campos numéricos são não negativos por padrão. */
  min?: number;
  max?: number;
  /** Validação contextual que pode comparar o campo com outros valores do formulário. */
  validate?: (
    value: unknown,
    values: Record<string, unknown>,
    namePrefix: string,
  ) => true | string;
  /** Campos irmãos que devem disparar novamente a validação contextual. */
  dependsOn?: string[];
  /** Para type 'document': modo fixo de mascara/validacao. Default 'auto'. */
  documentMode?: 'cpf' | 'cnpj' | 'auto';
  /** Para type 'document': nome do campo irmao (ex.: 'tipo') que define CPF/CNPJ. */
  documentTypeFrom?: string;
}

/** Valor inicial de um campo ao abrir o formulario em modo de criacao. */
export function defaultValueFor(field: FieldConfig): unknown {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === 'switch') return field.name === 'ativo' ? true : false;
  if (field.type === 'subitems') return [];
  return '';
}
