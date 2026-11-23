import { api } from './client';
import { tenantQueryKey } from './queryKeys';

export interface EventResponse {
  id: number; venueId: number; name: string; startsAt: string; endsAt: string; timeZone: string;
  status: string; reentryPolicy: string | null; externalId?: string | null; version: number;
  serviceId?: number | null; serviceName?: string | null;
  configurationChecklist?: Record<string, boolean>;
}
export interface AllocationResponse {
  id: number; eventId: number; parkingFacilityId: number; parkingFacilityName?: string; startsAt: string; endsAt: string;
  operationalCapacity: number; sellableCapacity: number; reservedCapacity: number; version: number;
}
export interface ProductResponse {
  id: number; eventId: number; parkingAllocationId: number; name: string; category: string;
  right: string; accessStartsAt: string; accessEndsAt: string; quota: number; status: string;
  benefits: string[]; restrictions: string[]; version: number;
}
export interface PriceTierResponse {
  id: number; parkingProductId: number; name: string; price: number; currency: string;
  salesStartsAt: string; salesEndsAt: string; quantity: number; priority: number; version: number;
}
export interface EventPage { content: EventResponse[]; totalElements: number; totalPages: number }
export interface EventServiceOption { id: number; name: string }

export const firstEventKey = (org: number) => tenantQueryKey(org, 'first-event');
export const eventsCatalogKey = (org: number) => tenantQueryKey(org, 'events');
export const eventDetailKey = (org: number, eventId: number) => tenantQueryKey(org, 'event-detail', eventId);
export const eventDetailPath = (eventId: number) => `/app/eventos/${eventId}`;

export function parseEventId(value?: string | null): number | undefined {
  if (!value || !/^[1-9]\d*$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : undefined;
}

const eventPage = (page?: number, signal?: AbortSignal) => api.get<EventPage>('/api/v1/events', {
  params: { size: 100, sort: 'inicio,desc', ...(page ? { page } : {}) }, ...(signal ? { signal } : {}),
}).then(({ data }) => data);

export const eventCatalogApi = {
  getEvent: (id: number, signal: AbortSignal) => api.get<EventResponse>(
    `/api/v1/events/${id}`, { signal },
  ).then(({ data }) => data),
  firstEvent: (signal: AbortSignal) => api.get<EventPage>('/api/v1/events', {
    params: { size: 1, sort: 'inicio,desc' }, signal,
  }).then(({ data }) => data),
  listEvents: () => eventPage(),
  async listEventCatalog(signal: AbortSignal) {
    const first = await eventPage(0, signal);
    const entries = new Map(first.content.map((event) => [event.id, event]));
    for (let page = 1; page < first.totalPages; page += 1) {
      const next = await eventPage(page, signal);
      if (next.content.length === 0) break;
      next.content.forEach((event) => entries.set(event.id, event));
    }
    return { ...first, content: [...entries.values()] };
  },
  listAllocations: (eventId: number) => api.get<AllocationResponse[]>(
    `/api/v1/events/${eventId}/parking-allocations`).then(({ data }) => data),
  listProducts: (eventId: number) => api.get<ProductResponse[]>(
    `/api/v1/events/${eventId}/parking-products`).then(({ data }) => data),
  listPriceTiers: (productId: number) => api.get<PriceTierResponse[]>(
    `/api/v1/parking-products/${productId}/price-tiers`).then(({ data }) => data),
};
