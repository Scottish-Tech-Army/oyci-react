import { z } from 'zod';
import type { AppStateSnapshot } from '../../src/shared/appState.js';

export const holidayPeriodSchema = z.object({
  id: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().optional(),
});

export const locationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  capacity: z.number().optional(),
  createdAt: z.string().min(1),
});

export const eventTypeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  durationMinutes: z.number(),
  requiredQualifications: z.array(z.string()),
  minimumStaffRequired: z.number(),
  staffRequirements: z.array(
    z.object({
      id: z.string().min(1),
      requiredQualifications: z.array(z.string()),
      matchMode: z.enum(['all', 'any']),
    }),
  ).optional(),
  createdAt: z.string().min(1),
});

export const staffSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().min(1),
  phone: z.string().optional(),
  qualifications: z.array(z.string()),
  payType: z.enum(['salaried', 'hourly']),
  availableHoursPerWeek: z.number(),
  holidays: z.array(holidayPeriodSchema),
  createdAt: z.string().min(1),
});

export const eventSchema = z.object({
  id: z.string().min(1),
  eventTypeId: z.string().min(1),
  locationId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  staffStartTime: z.string().min(1),
  staffEndTime: z.string().min(1),
  maxAttendees: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string().min(1),
});

export const assignmentSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  staffId: z.string().min(1),
  hoursAllocated: z.number(),
  confirmedAt: z.string().min(1),
  notes: z.string().optional(),
});

export const appStateSnapshotSchema = z.object({
  locations: z.array(locationSchema),
  eventTypes: z.array(eventTypeSchema),
  staff: z.array(staffSchema),
  events: z.array(eventSchema),
  assignments: z.array(assignmentSchema),
  qualifications: z.array(z.string()),
  version: z.number().int().optional(),
});

export function parseAppStateSnapshot(input: unknown): AppStateSnapshot {
  return appStateSnapshotSchema.parse(input) as AppStateSnapshot;
}

export function validateReferentialIntegrity(snapshot: AppStateSnapshot): string[] {
  const errors: string[] = [];
  const locationIds = new Set(snapshot.locations.map((location) => location.id));
  const eventTypeIds = new Set(snapshot.eventTypes.map((eventType) => eventType.id));
  const eventIds = new Set(snapshot.events.map((event) => event.id));
  const staffIds = new Set(snapshot.staff.map((staff) => staff.id));

  for (const event of snapshot.events) {
    if (!eventTypeIds.has(event.eventTypeId)) {
      errors.push(`Event "${event.id}" references unknown eventType "${event.eventTypeId}"`);
    }
    if (!locationIds.has(event.locationId)) {
      errors.push(`Event "${event.id}" references unknown location "${event.locationId}"`);
    }
  }

  for (const assignment of snapshot.assignments) {
    if (!eventIds.has(assignment.eventId)) {
      errors.push(`Assignment "${assignment.id}" references unknown event "${assignment.eventId}"`);
    }
    if (!staffIds.has(assignment.staffId)) {
      errors.push(`Assignment "${assignment.id}" references unknown staff "${assignment.staffId}"`);
    }
  }

  return errors;
}
