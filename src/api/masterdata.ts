import client from './client';
import type { Location, Qualification, EventTypeCatalogItem, SchedulePeriod } from '../types';

export const getLocations = () => client.get<Location[]>('/locations').then(r => r.data);
export const getQualifications = () => client.get<Qualification[]>('/qualifications').then(r => r.data);
export const getEventTypes = () => client.get<EventTypeCatalogItem[]>('/event-types').then(r => r.data);
export const getSchedulePeriods = () => client.get<SchedulePeriod[]>('/schedule-periods').then(r => r.data);
