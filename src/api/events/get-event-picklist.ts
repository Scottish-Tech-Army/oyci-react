import { fetchJson } from "../client";

export type EventPicklistItem = {
  id: number;
  name: string;
};

export type EventPicklistResponse = {
  eventTypes: EventPicklistItem[];
  locations: EventPicklistItem[];
};

export async function getEventPicklist() {
  return await fetchJson<EventPicklistResponse>("/events/get-event-picklist");
}
