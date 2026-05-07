import { fetchJson } from "../client";

export type StaffType = {
  staffTypeId: number;
  name: string;
  description: string;
};

export type GetStaffTypesResponse = StaffType[];

export async function getStaffTypes() {
  const response = await fetchJson<GetStaffTypesResponse>("/staff-types");
  return response;
}
