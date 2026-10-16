import { api } from './client';

export interface EventResponse {
  id: number; venueId: number; name: string; startsAt: string; endsAt: string; timeZone: string;
  status: string; reentryPolicy: string | null; externalId?: string | null; version: number;
  configurationChecklist?: Record<string, boolean>;
}
export interface AllocationResponse {
  id: number; eventId: number; parkingFacilityId: number; startsAt: string; endsAt: string;
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

export const eventCatalogApi = {
  listEvents: () => api.get<EventPage>('/api/v1/events', {
    params: { size: 100, sort: 'inicio,desc' },
  }).then(({ data }) => data),
  listAllocations: (eventId: number) => api.get<AllocationResponse[]>(
    `/api/v1/events/${eventId}/parking-allocations`).then(({ data }) => data),
  listProducts: (eventId: number) => api.get<ProductResponse[]>(
    `/api/v1/events/${eventId}/parking-products`).then(({ data }) => data),
  listPriceTiers: (productId: number) => api.get<PriceTierResponse[]>(
    `/api/v1/parking-products/${productId}/price-tiers`).then(({ data }) => data),
};
