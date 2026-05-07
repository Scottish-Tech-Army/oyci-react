export interface Event {
  eventId: string;
  eventType: string;
  eventDate: string;
  eventLocation: string;
}

export interface StaffMember {
  id: string;
  externalRef: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  weeklyHoursTarget: number;
  maxWeeklyHours: number;
  timezone: string;
}

export interface EventStaffAssignment {
  id: string;
  sessionEventId: string;
  staffId: string;
  role: string;
  status: 'DRAFT' | 'PENDING_ACCEPTANCE' | 'CONFIRMED' | 'CANCELLED';
  assignedAt: string;
  assignedBy: string;
  hoursCommittedSnapshot: number;
}

export interface EligibleStaffCandidate {
  staffId: string;
  displayName: string;
  eligible: boolean;
  reason: string;
}

export interface EventEligibility {
  eventId: string;
  requiredStaffCount: number;
  currentAssignments: number;
  candidates: EligibleStaffCandidate[];
}

export interface Location {
  id: string;
  code: string;
  name: string;
  address: string;
  timezone: string;
}

export interface Qualification {
  id: string;
  code: string;
  name: string;
  active: boolean;
}

export interface EventTypeCatalogItem {
  id: string;
  code: string;
  name: string;
  defaultDurationMinutes: number;
  active: boolean;
}

export interface SchedulePeriod {
  id: string;
  name: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'DRAFT';
}

export interface CreateEventRequest {
  eventType: string;
  eventDate: string;
  eventLocation: string;
}

export interface CreateAssignmentRequest {
  staffId: string;
  role?: string;
  assignedBy: string;
}

export interface AutoScheduleResult {
  scheduledCount: number;
  skippedCount: number;
  message: string;
  assignments: EventStaffAssignment[];
}

export interface UnavailabilityPeriod {
  id: string;
  staffId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface CreateUnavailabilityRequest {
  startDate: string;
  endDate: string;
  reason?: string;
}
