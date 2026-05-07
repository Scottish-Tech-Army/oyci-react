import client from './client';
import type { EventEligibility } from '../types';

export const getEventEligibility = (eventId: string) =>
  client.get<EventEligibility>(`/events/${eventId}/eligibility`).then(r => r.data);
