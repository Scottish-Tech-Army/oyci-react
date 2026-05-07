import client from './client';
import type { EventStaffAssignment, CreateAssignmentRequest } from '../types';

export const getAssignments = () =>
  client.get<EventStaffAssignment[]>('/assignments').then(r => r.data);

export const getEventAssignments = (eventId: string) =>
  client.get<EventStaffAssignment[]>(`/events/${eventId}/assignments`).then(r => r.data);

export const createAssignment = (eventId: string, data: CreateAssignmentRequest) =>
  client.post<EventStaffAssignment>(`/events/${eventId}/assignments`, data).then(r => r.data);

export const acceptAssignment = (eventId: string, assignmentId: string) =>
  client.post<EventStaffAssignment>(`/events/${eventId}/assignments/${assignmentId}/accept`).then(r => r.data);

export const declineAssignment = (eventId: string, assignmentId: string) =>
  client.post<EventStaffAssignment>(`/events/${eventId}/assignments/${assignmentId}/decline`).then(r => r.data);
