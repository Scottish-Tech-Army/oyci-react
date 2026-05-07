import { fetchJson } from "../client";
import type { StaffAssignmentRequest } from "./create-event";

export type UpdateEventRequest = {
  eventName: string;
  eventType?: string;       // Event type name (same as create)
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

export type UpdateEventResponse = {
  eventId: number;
  message?: string;
};

export async function updateEvent(eventId: string, data: UpdateEventRequest) {
  return await fetchJson<UpdateEventResponse>(`/events/update-event/${eventId}`, {
    method: "PUT",
    body: {
      ...data,
      status: data.status?.toLowerCase(),
    },
  });
}
