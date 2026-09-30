import { api } from './client';

export interface OperationalPendency {
  id: number;
  titulo: string;
  contraparte: string;
  caminho: string;
  data?: string;
  valor?: number;
}
export interface OperationalPendencyGroup {
  tipo: string;
  total: number;
  itens: OperationalPendency[];
}
export interface OperationalPendencies {
  referencia: string;
  total: number;
  limitePorGrupo: number;
  grupos: OperationalPendencyGroup[];
}
export const pendencyPermissions: Record<string, string> = {
  COMPRA_RECEBER: 'purchases:read', VENDA_SEM_NOTA: 'sales:read',
  SERVICO_SEM_NOTA: 'service_orders:read', CONTA_PAGAR_VENCIDA: 'finance:read',
  CONTA_RECEBER_VENCIDA: 'finance:read',
  DESPESA_AVULSA_VENCIDA: 'finance:read',
};
export function operationalPendencies() {
  return api.get<OperationalPendencies>('/api/v1/operational-pendencies', { params: { limit: 5 } })
    .then((response) => response.data);
}
