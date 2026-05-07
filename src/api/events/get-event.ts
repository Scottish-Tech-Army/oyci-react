import type { EventInstance } from "../../types/model";
import { fetchJson } from "../client";

type ApiStaffAssignment = {
  staffId: number;
  staffName: string;
  role: string;
  shiftStart: string;
  shiftEnd: string;
};

type ApiEvent = {
  eventId: number;
  eventName: string;
  eventTypeId?: number;
  eventTypeName: string;
  description?: string;
  eventDescription?: string;
  eventDate?: string;       // DD/MM/YYYY (new contract)
  startDatetime?: string;   // ISO datetime (old contract)
  startTime?: string;       // HH:MM (new contract)
  endDatetime?: string;     // ISO datetime (old contract)
  endTime?: string;         // HH:MM (new contract)
  eventLocation?: string;   // old contract
  location?: string;        // new contract
  ownerName: string;
  numOfAttendees?: number;
  maxAttendees?: number;
  status: "scheduled" | "draft" | "completed";
  staffAssignments?: ApiStaffAssignment[];
};

export type GetEventResponse = ApiEvent;

function mapApiEventToInstance(apiEvent: ApiEvent): EventInstance {
  // Support both old contract (startDatetime ISO) and new contract (eventDate + startTime)
  let date: string;
  let time: string;
  let endTime: string;

  if (apiEvent.startDatetime) {
    // Old contract: parse UTC datetime strings to avoid local timezone shifts
    const [startDatePart, startTimePart] = apiEvent.startDatetime.split("T");
    const [, endTimePart] = (apiEvent.endDatetime ?? "").split("T");
    date    = startDatePart;
    time    = startTimePart.slice(0, 5);
    endTime = endTimePart ? endTimePart.slice(0, 5) : "";
  } else {
    // New contract: eventDate is DD/MM/YYYY, convert to YYYY-MM-DD
    const raw = apiEvent.eventDate ?? "";
    const parts = raw.split("/");
    date    = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : raw;
    time    = apiEvent.startTime ?? "";
    endTime = apiEvent.endTime ?? "";
  }

  // Map status
  let status: EventInstance["status"];
  switch (apiEvent.status) {
    case "scheduled":
      status = "SCHEDULED";
      break;
    case "draft":
      status = "DRAFT";
      break;
    case "completed":
      status = "COMPLETED";
      break;
    default:
      status = "DRAFT";
  }

  // Map staffAssignments if present
  const staffAssignments = apiEvent.staffAssignments?.map((sa, idx) => ({
    id: String(idx),
    eventInstanceId: String(apiEvent.eventId),
    staffId: String(sa.staffId),
    role: sa.role,
    shiftStart: sa.shiftStart,
    shiftEnd: sa.shiftEnd,
  }));

  return {
    id: String(apiEvent.eventId),
    eventTypeName: apiEvent.eventTypeName,
    name: apiEvent.eventName,
    description: apiEvent.description ?? apiEvent.eventDescription,
    date,
    time,
    endTime,
    locationId: apiEvent.location ?? apiEvent.eventLocation ?? "",
    status,
    maxAttendees: apiEvent.maxAttendees ?? apiEvent.numOfAttendees ?? 0,
    ownerName: apiEvent.ownerName,
    staffAssignments,
  };
}

export async function getEvent(eventId: string) {
  const response = await fetchJson<GetEventResponse>(`/events/${eventId}`);
  return mapApiEventToInstance(response);
}
