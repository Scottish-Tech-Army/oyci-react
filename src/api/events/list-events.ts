import type { Assignment, EventInstance } from "../../types/model";
import { fetchJson } from "../client";

type ApiStaffAssignment = {
  staffId: number;
  staffName: string;
  role?: string;
  shiftStart?: string;
  shiftEnd?: string;
};

type ApiEvent = {
  eventId: number;
  eventName: string;
  eventTypeName: string;
  description?: string;
  eventDate: string;   // DD/MM/YYYY
  startTime: string;   // HH:MM
  endTime: string;     // HH:MM
  location: string;
  maxAttendees: number;
  ownerName: string;
  numOfAttendees: number;
  status: "scheduled" | "draft" | "completed" | "deleted";
  staffAssignments?: ApiStaffAssignment[] | null;
};

export type ListEventsResponse = {
  eventsInfo: ApiEvent[];
  upcomingEvent: number;
  totalattendes: number;
};

/** Convert "15/05/2026" → "2026-05-15" */
function parseDDMMYYYY(dateStr: string): string {
  const [day, month, year] = dateStr.split("/");
  return `${year}-${month}-${day}`;
}

function mapApiEventToInstance(apiEvent: ApiEvent): EventInstance {
  let status: EventInstance["status"];
  switch (apiEvent.status) {
    case "scheduled": status = "SCHEDULED"; break;
    case "completed": status = "COMPLETED"; break;
    default:          status = "DRAFT";
  }

  const staffAssignments = (apiEvent.staffAssignments ?? []).map((a) => ({
    id: `${apiEvent.eventId}-${a.staffId}`,
    eventInstanceId: apiEvent.eventId.toString(),
    staffId: a.staffId.toString(),
    role: a.role,
    shiftStart: a.shiftStart,
    shiftEnd: a.shiftEnd,
  }));

  return {
    id: apiEvent.eventId.toString(),
    eventTypeName: apiEvent.eventTypeName,
    name: apiEvent.eventName,
    description: apiEvent.description,
    date: parseDDMMYYYY(apiEvent.eventDate),
    time: apiEvent.startTime,
    endTime: apiEvent.endTime,
    locationId: apiEvent.location,
    status,
    maxAttendees: apiEvent.maxAttendees,
    ownerName: apiEvent.ownerName,
    staffAssignments,
  };
}

export async function listEvents() {
  const response = await fetchJson<ListEventsResponse>("/events/list-events");

  const activeEvents = response.eventsInfo.filter(
    (event) => event.status !== "deleted"
  );

  return {
    events: activeEvents.map(mapApiEventToInstance),
    upcomingEvent: response.upcomingEvent,
    totalattendes: response.totalattendes,
  };
}