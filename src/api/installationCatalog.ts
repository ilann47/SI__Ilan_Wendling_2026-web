import { api, ifMatchHeaders } from './client';
import { tenantQueryKey } from './queryKeys';
import type { Page } from './resource';
import type { FacilityCategory, SpaceImportItem } from '../features/facilities/spaceImport';

const paths = {
  venues: '/api/v1/venues',
  facilities: '/api/v1/parking-facilities',
  sectors: '/api/v1/sectors',
  cities: '/api/v1/installation-cities',
  spaces: '/api/v1/spaces',
} as const;

export type InstallationCatalogKind = Exclude<keyof typeof paths, 'spaces'>;
export type InstallationManagementKind = Exclude<keyof typeof paths, 'cities'>;
export const installationCatalogKey = (org: number | undefined, kind: keyof typeof paths) =>
  org ? tenantQueryKey(org, 'installation-catalog', kind) : ['installation-catalog', 'no-context', kind] as const;

export interface InstallationRow {
  id: number;
  name: string;
  active: boolean;
  code?: string;
  parkingFacilityName?: string;
  capacity?: number;
  physicalCapacity?: number;
  operationalCapacity?: number;
}

export const spaceStatusLabels = { LIVRE: 'Livre', BLOQUEADA: 'Bloqueada', MANUTENCAO: 'Em manutenção' } as const;
export type SpaceStatus = keyof typeof spaceStatusLabels;

export interface SpaceRow {
  id: number;
  code: string;
  sectorId: number;
  sectorName: string;
  parkingFacilityName: string;
  type: FacilityCategory;
  accessible: boolean;
  position: string | null;
  status: SpaceStatus;
  version: number;
}

export interface SpaceDetail extends SpaceRow {
  allowedCategories: FacilityCategory[];
}

export async function listInstallations(kind: InstallationManagementKind, search: string, page: number,
  signal?: AbortSignal, sectorId?: number) {
  if (kind === 'spaces') {
    return (await api.get<Page<SpaceRow>>(paths.spaces, {
      params: { code: search || undefined, sectorId, page, size: 20 }, signal,
    })).data;
  }
  return (await api.get<Page<InstallationRow>>(`${paths[kind]}/management`, {
    params: { name: search || undefined, page, size: 20 }, signal,
  })).data;
}

export async function getInstallation<T>(kind: InstallationManagementKind, id: number, signal?: AbortSignal) {
  return (await api.get<T>(`${paths[kind]}/${id}`, { signal })).data;
}

export function updateInstallation<T>(kind: InstallationManagementKind, record: { id: number; version: number }, body: object) {
  return api.put<T>(`${paths[kind]}/${record.id}`, body, { headers: ifMatchHeaders(record.version) });
}

export function createSpace(sectorId: number, body: SpaceImportItem) {
  return api.post<SpaceDetail>(`${paths.sectors}/${sectorId}/spaces`, body);
}

export async function updateSpaceStatus(space: Pick<SpaceRow, 'id' | 'version'>, status: SpaceStatus) {
  return (await api.patch<SpaceDetail>(`${paths.spaces}/${space.id}/status`, { status }, {
    headers: ifMatchHeaders(space.version),
  })).data;
}

interface CatalogRecord {
  id: number;
  name?: string;
  nome?: string;
  estadoNome?: string;
  parkingFacilityName?: string;
  code?: string;
}

export async function searchInstallationCatalog(kind: InstallationCatalogKind,
  filters: { name?: string; id?: number }, signal?: AbortSignal, allSectors = false) {
  const path = kind === 'sectors' && allSectors ? `${paths.sectors}/management` : paths[kind];
  const { data } = await api.get<Page<CatalogRecord>>(path, {
    params: { size: 20, ...filters }, signal,
  });
  return {
    options: data.content.map((item) => ({
      id: item.id,
      label: [item.name ?? item.nome, item.estadoNome, item.parkingFacilityName, item.code]
        .filter(Boolean).join(' · '),
    })),
    total: data.totalElements,
  };
}
