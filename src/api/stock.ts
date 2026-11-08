import { api } from './client';
import { createResourceApi, type Page } from './resource';

export interface StockLocation {
  id: number;
  nome: string;
  ativo: boolean;
  version: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StockLocationRequest {
  nome: string;
  ativo: boolean;
}

export interface StockBalance {
  id: number;
  produtoId: number;
  produto: string;
  localEstoqueId: number;
  localEstoque: string;
  quantidade: number;
  version: number;
}

export interface StockPosition {
  produtoId: number;
  produto: string;
  quantidade: number;
  quantidadeMinima: number;
  abaixoMinimo: boolean;
}

export interface StockMovement {
  id: number;
  produtoId: number;
  produto: string;
  localEstoqueId: number;
  localEstoque: string;
  saldoEstoqueId: number;
  tipo: string;
  delta: number;
  saldoAnterior: number;
  saldoPosterior: number;
  custoUnitario?: number;
  origemTipo: string;
  origemChave: string;
  compensadoId?: number;
  atorId: number;
  atorNome?: string;
  motivo?: string;
  ocorridoEm: string;
  createdAt: string;
}

type Filters = Record<string, unknown>;
export interface StockMovementOrigin { tipo: string; id: number | null; descricao: string; caminho: string | null }

function clean(filters: Filters): Filters {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => (
    value !== undefined && value !== null && value !== ''
  )));
}

function requiredText(value: unknown, field: string): string {
  const parsed = typeof value === 'string' ? value.trim() : '';
  if (!parsed) throw new Error(`${field} obrigatorio.`);
  return parsed;
}

export function buildStockLocationPayload(values: Record<string, unknown>): StockLocationRequest {
  return {
    nome: requiredText(values.nome, 'Nome'),
    ativo: values.ativo !== false,
  };
}

export const stockLocationApi = createResourceApi<StockLocation, StockLocationRequest>(
  '/api/v1/stock-locations',
);

export const stockApi = {
  positions: (filters: Filters = {}) => api
    .get<Page<StockPosition>>('/api/v1/stock-positions', { params: clean(filters) })
    .then((response) => response.data),
  balances: (filters: Filters = {}) => api
    .get<Page<StockBalance>>('/api/v1/stock-balances', { params: clean(filters) })
    .then((response) => response.data),
  movements: (filters: Filters = {}) => api
    .get<Page<StockMovement>>('/api/v1/stock-movements', { params: clean(filters) })
    .then((response) => response.data),
  movement: (id: number) => api
    .get<StockMovement>(`/api/v1/stock-movements/${id}`)
    .then((response) => response.data),
  origin: (id: number) => api.get<StockMovementOrigin>(`/api/v1/stock-movements/${id}/origin`).then((response) => response.data),
};
