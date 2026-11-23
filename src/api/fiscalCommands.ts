import { api, getHttpStatus, ifMatchHeaders } from './client';

/** Uma consulta, nunca um novo comando, resolve uma resposta perdida. */
export async function fiscalCommand<T>(
  basePath: string,
  id: number,
  action: 'confirmacao' | 'reversao',
  version: number,
  body: { motivo: string } | null,
  applied: (note: T) => boolean,
): Promise<T> {
  const headers = ifMatchHeaders(version);
  try {
    return (await api.post<T>(`${basePath}/${id}/${action}`, body, { headers })).data;
  } catch (error) {
    const status = getHttpStatus(error);
    if (!status || status >= 500 || status === 409 || status === 412) {
      try {
        const current = (await api.get<T>(`${basePath}/${id}`)).data;
        if (applied(current)) return current;
      } catch { /* A falha original continua disponível ao operador. */ }
    }
    throw error;
  }
}

export function canReverseFiscalNote(permissions: readonly string[]): boolean {
  return ['fiscal:manage', 'finance:manage', 'stock:manage'].every((permission) => permissions.includes(permission));
}
