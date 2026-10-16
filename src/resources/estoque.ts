import { type ResourceConfig } from '../components/crud/resourceConfig';
import { type FieldConfig } from '../components/form/fieldConfig';

/** Campos compartilhados pela gestão de estoque e pelo cadastro rápido contextual. */
export const stockLocationFields: FieldConfig[] = [
  { name: 'nome', label: 'Nome', type: 'text', required: true, cols: 8 },
  { name: 'ativo', label: 'Ativo', type: 'switch', cols: 4 },
];

/**
 * Recursos especializados que participam do cadastro rápido, mas não devem
 * ganhar uma rota CRUD genérica porque possuem uma tela operacional própria.
 */
export const stockQuickCreateConfigs: ResourceConfig[] = [
  {
    key: 'local-estoque-quick-create',
    basePath: '/api/v1/stock-locations',
    singular: 'Local de estoque',
    plural: 'Locais de estoque',
    tenantAware: true,
    optimisticLocking: true,
    permissions: {
      read: ['stock:read'],
      create: ['stock:manage'],
      update: ['stock:manage'],
    },
    searchFilter: 'nome',
    columns: [],
    fields: stockLocationFields,
  },
];
