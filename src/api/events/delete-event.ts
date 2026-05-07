import { fetchJson } from "../client";

export type DeleteEventResponse = {
  message?: string;
};

export async function deleteEvent(eventId: string) {
  return await fetchJson<DeleteEventResponse>(`/events/delete-event/${eventId}`, {
    method: "PUT",
  });
}
