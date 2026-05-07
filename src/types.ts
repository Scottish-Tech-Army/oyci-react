// ── Common ──
export interface ErrorResponse {
  message: string;
  details?: string[];
}

export type UserRole = 'ADMIN' | 'STAFF' | 'PARTICIPANT';

// ── Auth ──
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  dateOfBirth: string;
}

// ── Tags ──
export interface Tag {
  id: number;
  name: string;
}

export interface TagRequest {
  name: string;
}

// ── Locations ──
export interface Location {
  id: number;
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultCapacity?: number;
}

export interface LocationRequest {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  defaultCapacity?: number;
}

// ── Event Types ──
export interface EventType {
  id: number;
  name: string;
  description?: string;
  durationMinutes: number;
  requiredTags?: Tag[];
  minStaff?: number;
}

export interface EventTypeRequest {
  name: string;
  description?: string;
  durationMinutes: number;
  requiredTagIds?: number[];
  minStaff?: number;
}

// ── Staff ──
export interface Staff {
  id: number;
  name: string;
  email: string;
  maxHoursPerWeek?: number;
  tags?: Tag[];
  availability?: AvailabilityWindow[];
}

export interface StaffCreateRequest {
  name: string;
  email: string;
  password: string;
  maxHoursPerWeek?: number;
}

export interface StaffUpdateRequest {
  name?: string;
  email?: string;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface AvailabilityWindow {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export interface AvailabilityRequest {
  windows: AvailabilityWindow[];
}

export interface MaxHoursRequest {
  maxHoursPerWeek: number;
}

export interface StaffTagsRequest {
  tagIds: number[];
}

export interface Holiday {
  id: number;
  date: string;
}

export interface HolidayRequest {
  date: string;
}

// ── Event Instances ──
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'STAFFED' | 'COMPLETED' | 'CANCELLED';

export interface EventInstance {
  id: number;
  eventTypeId: number;
  eventTypeName?: string;
  locationId: number;
  locationName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: EventStatus;
  assignedStaff?: Staff[];
  maxParticipants?: number;
  registeredParticipants?: number;
}

export interface EventInstanceRequest {
  eventTypeId: number;
  locationId: number;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants?: number;
}

// ── Staffing ──
export interface AvailableStaff {
  staff: Staff;
  warnings: string[];
}

export interface AssignRequest {
  staffId: number;
}

// ── Communications ──
export interface NotifyStaffRequest {
  from: string;
  to: string;
}

