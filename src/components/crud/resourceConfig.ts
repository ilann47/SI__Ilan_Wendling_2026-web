import { type ReactElement } from 'react';
import { type GridColDef } from '@mui/x-data-grid';
import { type FieldConfig, type ReferenceConfig } from '../form/fieldConfig';
import { tenantQueryKey } from '../../api/queryKeys';

export type ResourceAction = 'read' | 'create' | 'update' | 'delete';

export type ResourcePermissions = Partial<Record<ResourceAction, string[]>>;

export interface FilterConfig {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'reference';
  options?: { value: string; label: string }[];
  reference?: ReferenceConfig;
}

export interface RowAction {
  key: string;
  label: string;
  icon?: ReactElement;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'inherit';
  method: 'post' | 'put' | 'delete';
  /** Constroi o sufixo do path a partir da linha, ex.: (row) => `/${row.id}/baixa`. */
  pathSuffix: (row: Record<string, any>) => string;
  /** Mensagem de confirmacao (quando nao ha formulario). */
  confirm?: string;
  /** Campos para coletar um corpo/params antes de executar (ex.: baixa). */
  formFields?: FieldConfig[];
  /** Onde enviar os dados coletados pelo formulario. Default 'body'. */
  payloadAs?: 'body' | 'params';
  /** Predicado para exibir a acao apenas em certos estados. */
  visible?: (row: Record<string, any>) => boolean;
}

export interface ResourceConfig {
  key: string;
  basePath: string;
  singular: string;
  plural: string;
  subtitle?: string;
  columns: GridColDef[];
  fields: FieldConfig[];
  filters?: FilterConfig[];
  rowActions?: RowAction[];
  /** O backend resolve o proprietario exclusivamente pelo JWT contextual. */
  tenantAware?: boolean;
  /** Permissoes efetivas exigidas por acao; ausencia preserva o contrato legado. */
  permissions?: ResourcePermissions;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  defaultSort?: string;
  /** Converte a linha (Response) em valores iniciais do formulario de edicao. */
  toFormValues?: (row: Record<string, any>) => Record<string, unknown>;
}

export function hasResourceActionPermission(
  config: ResourceConfig,
  action: ResourceAction,
  grantedPermissions: readonly string[],
): boolean {
  const required = config.permissions?.[action];
  return !required?.length || required.some((permission) => grantedPermissions.includes(permission));
}

export function resourceQueryKey(
  config: ResourceConfig,
  organizationId: number | null | undefined,
  ...parts: readonly unknown[]
): readonly unknown[] {
  return config.tenantAware ? tenantQueryKey(organizationId, ...parts) : parts;
}
