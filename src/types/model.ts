export type EventType = {
  id: string;
  name: string;
  description: string;
  durationHours: number;
  requiredQualifications?: string[];
};

export type Location = {
  id: string;
  name: string;
  address?: string;
};

  export type EventInstance = {
    id: string;
    eventTypeName?: string; // Event type name from API
    name?: string; // Event instance name (e.g., "Spring Community Fair")
    description?: string; // Event description
    date: string; // ISO YYYY-MM-DD
    locationId: string;
    status: "DRAFT" | "SCHEDULED" | "COMPLETED";
    maxAttendees: number
    time: string; // Session start time HH:MM
    endTime?: string; // Session end time HH:MM
    shiftStart?: string; // Staff shift start time HH:MM (before session)
    shiftEnd?: string;   // Staff shift end time HH:MM (after session)
    ownerName?: string; // Event owner/creator name
    staffAssignments?: Assignment[]; // Staff assigned to this event
  };
  
  export type Staff = {
  id: string;
  name: string; // Full name (kept for compatibility)
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phone: string;
  password?: string; // Only used when creating new staff
  addressLine1?: string;
  city?: string;
  country?: string;
  postcode?: string;
  roleLabel?: string; // Facilitator, Instructor etc. (kept for compatibility)
  staffTypeId?: number; // Staff type ID from backend
  staffTypeName?: string; // COORDINATOR, VOLUNTEER, etc.
  qualificationId?: number; // Qualification ID from backend
  qualificationName?: string; // Primary qualification
  weeklyHoursCap?: number;
  qualifications?: string[];
  photoUrl?: string;
  isActive?: boolean;
  isAdmin?: boolean; // true → roleId 1 (admin), false → roleId 3 (staff)
  roleId?: number;   // 1 = Admin, 2 = Coordinator, 3 = Staff
  shiftTimes?: string[]; // Preferred shift time slots
};

export type StaffAvailability = {
  id: string;
  staffId: string;
  type: "WORKING" | "HOLIDAY";
  // WORKING fields:
  dayOfWeek?: number; // 0=Sun..6=Sat
  startTime?: string; // "09:00"
  endTime?: string;   // "17:00"
  // HOLIDAY fields:
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
};

export type Assignment = {
  id: string;
  eventInstanceId: string;
  staffId: string;
  shiftStart?: string; // Override shift start for this staff member HH:MM
  shiftEnd?: string;   // Override shift end for this staff member HH:MM
  role?: string;       // e.g. "Lead", "Support", "Volunteer"
};