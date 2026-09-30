import { type ResourceConfig } from '../components/crud/resourceConfig';
import { geografiaConfigs } from './geografia';
import { pessoasPagamentoConfigs } from './pessoasPagamento';
import { rhUsuarioConfigs } from './rhUsuario';
import { fornecedorConvenienciaConfigs } from './fornecedorConveniencia';
import { logisticaConfigs } from './logistica';
import { patioConfigs } from './patio';
import { fiscalConfigs } from './fiscal';
import { financeiroConfigs } from './financeiro';
import { stockQuickCreateConfigs } from './estoque';

export const allConfigs: ResourceConfig[] = [
  ...geografiaConfigs,
  ...pessoasPagamentoConfigs,
  ...rhUsuarioConfigs,
  ...fornecedorConvenienciaConfigs,
  ...logisticaConfigs,
  ...patioConfigs,
  ...fiscalConfigs,
  ...financeiroConfigs,
];

export const configByKey: Record<string, ResourceConfig> = Object.fromEntries(
  allConfigs.map((c) => [c.key, c]),
);

/** Cadastros contextuais de módulos com tela própria, sem gerar rotas CRUD. */
export const quickCreateOnlyConfigs: ResourceConfig[] = [
  ...stockQuickCreateConfigs,
];
