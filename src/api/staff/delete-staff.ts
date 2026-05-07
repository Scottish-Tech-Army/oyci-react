import { fetchJson } from "../client";

export async function deleteStaff(staffId: string) {
  await fetchJson(`/staff/${staffId}`, {
    method: "DELETE",
  });
}
