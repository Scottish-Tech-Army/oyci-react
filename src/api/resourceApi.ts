import type { Assignment, Event, EventType, Location, Staff } from '../types';

interface StaffListResponse {
  staff: Staff[];
}

interface EventsListResponse {
  events: Event[];
}

interface LocationsListResponse {
  locations: Location[];
}

interface EventTypesListResponse {
  eventTypes: EventType[];
}

interface AssignmentsListResponse {
  assignments: Assignment[];
}

interface QualificationsListResponse {
  qualifications: string[];
}

export interface ResourceSnapshot {
  locations: Location[];
  eventTypes: EventType[];
  staff: Staff[];
  events: Event[];
  assignments: Assignment[];
  qualifications: string[];
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchStaffList(): Promise<Staff[]> {
  const response = await fetch('/api/staff');
  const payload = await parseJson<StaffListResponse>(response);
  return payload.staff;
}

export async function fetchEventsList(filters?: { from?: string; to?: string }): Promise<Event[]> {
  const params = new URLSearchParams();
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  const queryString = params.toString();
  const url = queryString ? `/api/events?${queryString}` : '/api/events';

  const response = await fetch(url);
  const payload = await parseJson<EventsListResponse>(response);
  return payload.events;
}

export async function fetchLocationsList(): Promise<Location[]> {
  const response = await fetch('/api/locations');
  const payload = await parseJson<LocationsListResponse>(response);
  return payload.locations;
}

export async function fetchEventTypesList(): Promise<EventType[]> {
  const response = await fetch('/api/event-types');
  const payload = await parseJson<EventTypesListResponse>(response);
  return payload.eventTypes;
}

export async function fetchAssignmentsList(): Promise<Assignment[]> {
  const response = await fetch('/api/assignments');
  const payload = await parseJson<AssignmentsListResponse>(response);
  return payload.assignments;
}

export async function fetchQualificationsList(): Promise<string[]> {
  const response = await fetch('/api/qualifications');
  const payload = await parseJson<QualificationsListResponse>(response);
  return payload.qualifications;
}

export async function fetchResourceSnapshot(): Promise<ResourceSnapshot> {
  const [locations, eventTypes, staff, events, assignments, qualifications] = await Promise.all([
    fetchLocationsList(),
    fetchEventTypesList(),
    fetchStaffList(),
    fetchEventsList(),
    fetchAssignmentsList(),
    fetchQualificationsList(),
  ]);

  return {
    locations,
    eventTypes,
    staff,
    events,
    assignments,
    qualifications,
  };
}

// --- Mutation helpers ---

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  if (response.status === 204) return undefined as unknown as T;
  return response.json() as Promise<T>;
}

export async function apiCreateLocation(location: Location): Promise<Location> {
  return mutate<Location>('/api/locations', 'POST', location);
}

export async function apiUpdateLocation(id: string, location: Location): Promise<Location> {
  return mutate<Location>(`/api/locations/${id}`, 'PUT', location);
}

export async function apiDeleteLocation(id: string): Promise<void> {
  return mutate<void>(`/api/locations/${id}`, 'DELETE');
}

export async function apiCreateEventType(eventType: EventType): Promise<EventType> {
  return mutate<EventType>('/api/event-types', 'POST', eventType);
}

export async function apiUpdateEventType(id: string, eventType: EventType): Promise<EventType> {
  return mutate<EventType>(`/api/event-types/${id}`, 'PUT', eventType);
}

export async function apiDeleteEventType(id: string): Promise<void> {
  return mutate<void>(`/api/event-types/${id}`, 'DELETE');
}

export async function apiCreateStaff(member: Staff): Promise<Staff> {
  return mutate<Staff>('/api/staff', 'POST', member);
}

export async function apiUpdateStaff(id: string, member: Staff): Promise<Staff> {
  return mutate<Staff>(`/api/staff/${id}`, 'PUT', member);
}

export async function apiDeleteStaff(id: string): Promise<void> {
  return mutate<void>(`/api/staff/${id}`, 'DELETE');
}

export async function apiCreateEvent(event: Event): Promise<Event> {
  return mutate<Event>('/api/events', 'POST', event);
}

export async function apiUpdateEvent(id: string, event: Event): Promise<Event> {
  return mutate<Event>(`/api/events/${id}`, 'PUT', event);
}

export async function apiDeleteEvent(id: string): Promise<void> {
  return mutate<void>(`/api/events/${id}`, 'DELETE');
}

export async function apiCreateAssignment(assignment: Assignment): Promise<Assignment> {
  return mutate<Assignment>('/api/assignments', 'POST', assignment);
}

export async function apiUpdateAssignment(id: string, assignment: Assignment): Promise<Assignment> {
  return mutate<Assignment>(`/api/assignments/${id}`, 'PUT', assignment);
}

export async function apiDeleteAssignment(id: string): Promise<void> {
  return mutate<void>(`/api/assignments/${id}`, 'DELETE');
}

export async function apiAddQualification(name: string): Promise<void> {
  return mutate<void>('/api/qualifications', 'POST', { name });
}

export async function apiRenameQualification(oldName: string, newName: string): Promise<void> {
  return mutate<void>(`/api/qualifications/${encodeURIComponent(oldName)}`, 'PUT', { name: newName });
}

export async function apiRemoveQualification(name: string): Promise<void> {
  return mutate<void>(`/api/qualifications/${encodeURIComponent(name)}`, 'DELETE');
}
