import client from './client';
import type { UnavailabilityPeriod, CreateUnavailabilityRequest } from '../types';

export const getUnavailability = (staffId: string) =>
  client.get<UnavailabilityPeriod[]>(`/staff/${staffId}/unavailability`).then(r => r.data);

export const addUnavailability = (staffId: string, data: CreateUnavailabilityRequest) =>
  client.post<UnavailabilityPeriod>(`/staff/${staffId}/unavailability`, data).then(r => r.data);

export const deleteUnavailability = (staffId: string, periodId: string) =>
  client.delete(`/staff/${staffId}/unavailability/${periodId}`);
