import { fetchJson } from "../client";

export type StaffAssignmentRequest = {
  staffId: number;       // Numeric staff ID as stored in backend
  staffTypeId?: number;  // Staff type/role ID (e.g. 1=Coordinator, 2=Volunteer, 3=Staff)
  roleId?: number;       // Role ID (e.g. 1=Admin, 2=Coordinator, 3=Staff)
  role: string;          // Required: e.g. "Lead", "Support", "Staff"
  shiftStart?: string;   // Override shift start HH:MM
  shiftEnd?: string;     // Override shift end HH:MM
};

export type CreateEventRequest = {
  eventName: string;
  eventType: string;
  description?: string;
  eventDate: string;        // DD/MM/YYYY
  startTime: string;        // HH:MM — session start
  endTime: string;          // HH:MM — session end
  location: string;
  status?: "DRAFT" | "SCHEDULED" | "COMPLETED";
  maxAttendees?: number;
  shiftStart?: string;      // HH:MM — default staff shift start
  shiftEnd?: string;        // HH:MM — default staff shift end
  staffAssignments?: StaffAssignmentRequest[];
};

export type CreateEventResponse = {
  eventId: number;
  message?: string;
};

export async function createEvent(data: CreateEventRequest) {
  return await fetchJson<CreateEventResponse>("/events/create-event", {
    method: "POST",
    body: {
      ...data,
      status: data.status?.toLowerCase(),
    },
  });
}
