import type { AxiosInstance } from 'axios';
import type { TripSummary } from '../types/trip';

/** GET /api/trips/ — tolerates both a plain list and a paginated envelope. */
export async function fetchTrips(api: AxiosInstance): Promise<TripSummary[]> {
  const res = await api.get('/api/trips/');
  return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
}

/** DELETE /api/trips/:id/ — the endpoint already exists on the backend
 * (TripViewSet is a full ModelViewSet); this was just never wired up in the UI. */
export async function deleteTrip(api: AxiosInstance, tripId: number): Promise<void> {
  await api.delete(`/api/trips/${tripId}/`);
}

export function isCompliant(trip: Pick<TripSummary, 'compliance'>): boolean {
  return trip.compliance?.is_compliant ?? true;
}
