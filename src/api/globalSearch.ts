import { api } from './client';

export interface GlobalSearchResult {
  tipo: string; id: number; titulo: string; subtitulo?: string; status?: string; caminho: string;
}
export interface GlobalSearchGroup { grupo: string; resultados: GlobalSearchResult[]; }
export interface GlobalSearchResponse { termo: string; total: number; grupos: GlobalSearchGroup[]; }

export const globalSearchApi = {
  search: (query: string) => api.get<GlobalSearchResponse>('/api/v1/search', {
    params: { q: query, limit: 5 },
  }).then((response) => response.data),
};
