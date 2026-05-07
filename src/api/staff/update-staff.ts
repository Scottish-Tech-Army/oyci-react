import { fetchJson } from "../client";

export type UpdateStaffRequest = {
  staffId?: number;
  userId?: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  dob?: string;
  primaryEmail: string;
  secondaryEmail?: string;
  primaryPhone: string;
  secondaryPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  postcode?: string;
  roleId?: number;
  staffTypeId: number;
  staffTypeName?: string;
  qualificationId?: number;
  qualificationName?: string;
  weeklyHoursCap?: number;
  preferredShiftTimes?: string[];
  isActive: boolean;
};

export type UpdateStaffResponse = {
  staffId: number;
  userId: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dob?: string | null;
  roleId?: number;
  primaryEmail: string;
  secondaryEmail?: string | null;
  primaryPhone: string;
  secondaryPhone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  country?: string | null;
  postcode?: string | null;
  staffTypeId?: number;
  staffTypeName: string;
  qualificationId?: number;
  qualificationName?: string;
  weeklyHoursCap?: number;
  preferredShiftTimes?: string[];
  isActive: boolean;
};

export async function updateStaff(staffId: string, request: UpdateStaffRequest) {
  const response = await fetchJson<UpdateStaffResponse>(`/staff/${staffId}`, {
    method: "PUT",
    body: request,
  });
  return response;
}
