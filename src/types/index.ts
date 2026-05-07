// Qualifications/Skills that staff may have
export type Qualification = string;

export type QualificationMatchMode = 'all' | 'any';

export interface EventStaffRequirement {
  id: string;
  requiredQualifications: Qualification[];
  matchMode: QualificationMatchMode;
}

// Initial/default qualification options used by the seed data
export const qualificationOptions: Qualification[] = [
  'Basketball Coach',
  'Drama Facilitator',
  'Arts Leader',
  'Physical Activity',
  'Event Steward',
  'Trip Leader',
  'Outdoor Leader',
  'Coding Instructor',
  'First Aid',
  'Safeguarding',
  'Youth Support',
];

// A location where events can be held
export interface Location {
  id: string;
  name: string;
  address: string;
  capacity?: number;
  createdAt: string;
}

// A type of event (e.g., "Basketball", "Drama Workshop")
export interface EventType {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  requiredQualifications: Qualification[];
  minimumStaffRequired: number;
  staffRequirements?: EventStaffRequirement[];
  createdAt: string;
}

// A specific instance of an event (e.g., "Basketball on 2024-04-15 at Community Hall")
export interface Event {
  id: string;
  eventTypeId: string;
  locationId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  startTime: string; // HH:mm — event start
  endTime: string; // HH:mm — event end
  staffStartTime: string; // HH:mm — when staff are needed from
  staffEndTime: string; // HH:mm — when staff are needed until
  maxAttendees?: number;
  notes?: string;
  createdAt: string;
}

// Pay type for a staff member
export type PayType = 'salaried' | 'hourly';

// Staff member information
export interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  qualifications: Qualification[];
  payType: PayType;
  availableHoursPerWeek: number;
  holidays: HolidayPeriod[];
  createdAt: string;
}

// Holiday/unavailability period for a staff member
export interface HolidayPeriod {
  id: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  reason?: string;
}

// Assignment of staff to an event
export interface Assignment {
  id: string;
  eventId: string;
  staffId: string;
  hoursAllocated: number;
  confirmedAt: string; // ISO datetime
  notes?: string;
}

// Flattened view of assignment with related data for easy display
export interface AssignmentDetail extends Assignment {
  eventDetail?: Event;
  eventTypeDetail?: EventType;
  staffDetail?: Staff;
  locationDetail?: Location;
}

// Weekly workload for a staff member
export interface StaffWeeklyLoad {
  staffId: string;
  weekOf: string; // ISO date of Monday
  hoursCommitted: number;
  assignments: AssignmentDetail[];
}

// A ranked suggestion for a staff member to be assigned to an event
export interface StaffSuggestion {
  staff: Staff;
  requirementId: string;
  requirementLabel: string;
  score: number; // 0–1 overall fitness score
  qualificationScore: number; // 0–1 fraction of required qualifications matched
  availabilityScore: number; // 0–1 remaining capacity as fraction of weekly hours
  hoursCommitted: number; // hours already committed this week
  fullyQualified: boolean;
  matchedQualifications: string[];
  missingQualifications: string[];
}
