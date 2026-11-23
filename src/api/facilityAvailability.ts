import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import { tenantQueryKey } from './queryKeys';
import { validateLocalInterval } from '../utils/dateTime';

export type AvailabilityRange = { startsAt: string; endsAt: string };
export type AvailabilitySegment = AvailabilityRange & { availableCapacity: number };

export interface FacilityAvailability {
  operationalCapacity: number;
  availableCapacity: number;
  segments: AvailabilitySegment[];
}

export const facilityAvailabilityKey = (organizationId: number, facilityId?: number) =>
  facilityId === undefined
    ? tenantQueryKey(organizationId, 'facility-availability')
    : tenantQueryKey(organizationId, 'facility-availability', facilityId);

export function useFacilityAvailability(organizationId?: number | null, facilityId?: number | null,
  startsAt?: string, endsAt?: string, includeTimeline = false) {
  const ready = Boolean(organizationId && facilityId && startsAt && endsAt && Date.parse(startsAt) < Date.parse(endsAt));
  return useQuery({
    queryKey: [...(organizationId && facilityId ? facilityAvailabilityKey(organizationId, facilityId)
      : ['facility-availability', 'inactive']), startsAt, endsAt, includeTimeline],
    enabled: ready,
    staleTime: 0,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!ready) throw new Error('Selecione um pátio e um período válido.');
      const { data } = await api.get<FacilityAvailability>(`/api/v1/parking-facilities/${facilityId}/availability`, {
        params: { startsAt, endsAt, includeTimeline }, signal,
      });
      return data;
    },
  });
}

export function useFacilityPeriodAvailability(organizationId: number | null | undefined,
  facilityId: number | null | undefined, startsAt: string, endsAt: string, timeZone?: string) {
  const interval = validateLocalInterval(startsAt, endsAt, timeZone);
  const valid = !interval.startError && !interval.endError;
  return useFacilityAvailability(organizationId, facilityId,
    valid ? interval.startsAt : undefined, valid ? interval.endsAt : undefined);
}
