import { fetchJson } from "../client";

export type CreateStaffRequest = {
  firstName: string;
  middleName?: string;
  lastName: string;
  primaryEmail: string;
  primaryPhone: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  postcode?: string;
  roleId: number; // Default to 3 for Staff role
  password: string;
  staffTypeId: number;
  qualificationId?: number;
  weeklyHoursCap?: number;
  preferredShiftTimes?: string[];
  isActive: boolean;
};

export type CreateStaffResponse = {
  staffId: number;
  userId: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  staffTypeName: string;
  qualificationName?: string;
  weeklyHoursCap?: number;
  preferredShiftTimes?: string[];
  isActive: boolean;
};

export async function createStaff(request: CreateStaffRequest) {
  const response = await fetchJson<CreateStaffResponse>("/staff/create-staff", {
    method: "POST",
    body: request,
  });
  return response;
}
