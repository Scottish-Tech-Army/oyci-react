import client from './client';
import type { Event, CreateEventRequest } from '../types';

export const getEvents = () => client.get<Event[]>('/events').then(r => r.data);
export const getEvent = (eventId: string) => client.get<Event>(`/events/${eventId}`).then(r => r.data);
export const createEvent = (data: CreateEventRequest) => client.post<Event>('/events', data).then(r => r.data);
