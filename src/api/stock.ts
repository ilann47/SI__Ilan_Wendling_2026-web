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
  motivo?: string;
  ocorridoEm: string;
  createdAt: string;
}

export interface StockAdjustmentRequest {
  produtoId: number;
  localEstoqueId: number;
  delta: number;
  custoUnitario?: number;
  motivo: string;
}

export interface StockCompensationRequest {
  motivo: string;
}

type Filters = Record<string, unknown>;

function clean(filters: Filters): Filters {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => (
    value !== undefined && value !== null && value !== ''
  )));
}

function positiveId(value: unknown, field: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${field} invalido.`);
  return parsed;
}

function requiredText(value: unknown, field: string): string {
  const parsed = typeof value === 'string' ? value.trim() : '';
  if (!parsed) throw new Error(`${field} obrigatorio.`);
  return parsed;
}

export function buildStockAdjustmentPayload(values: Record<string, unknown>): StockAdjustmentRequest {
  const delta = Number(values.delta);
  const custoUnitario = values.custoUnitario === '' || values.custoUnitario == null
    ? undefined
    : Number(values.custoUnitario);
  if (!Number.isFinite(delta) || delta === 0) throw new Error('Delta deve ser diferente de zero.');
  if (custoUnitario !== undefined && (!Number.isFinite(custoUnitario) || custoUnitario < 0)) {
    throw new Error('Custo unitario invalido.');
  }
  return {
    produtoId: positiveId(values.produtoId, 'Produto'),
    localEstoqueId: positiveId(values.localEstoqueId, 'Local'),
    delta,
    ...(custoUnitario === undefined ? {} : { custoUnitario }),
    motivo: requiredText(values.motivo, 'Motivo'),
  };
}

export function buildStockCompensationPayload(
  values: Record<string, unknown>,
): StockCompensationRequest {
  return { motivo: requiredText(values.motivo, 'Motivo') };
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
  adjust: (body: StockAdjustmentRequest, idempotencyKey: string) => api
    .post<StockMovement>('/api/v1/stock-adjustments', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    .then((response) => response.data),
  compensate: (id: number, body: StockCompensationRequest, idempotencyKey: string) => api
    .post<StockMovement>(`/api/v1/stock-movements/${id}/compensation`, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    })
    .then((response) => response.data),
};
