import type { Staff } from "../../types/model";
import { fetchJson } from "../client";

type ApiStaff = {
  staffId: number;
  userId?: number;
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

export type GetStaffResponse = ApiStaff;

function mapApiStaffToModel(apiStaff: ApiStaff): Staff {
  const fullName = [
    apiStaff.firstName,
    apiStaff.middleName,
    apiStaff.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: apiStaff.staffId.toString(),
    name: fullName,
    firstName: apiStaff.firstName,
    middleName: apiStaff.middleName ?? "",
    lastName: apiStaff.lastName,
    email: apiStaff.primaryEmail,
    phone: apiStaff.primaryPhone,
    addressLine1: apiStaff.addressLine1 ?? "",
    city: apiStaff.city ?? "",
    country: apiStaff.country ?? "",
    postcode: apiStaff.postcode ?? "",
    roleId: apiStaff.roleId,
    isAdmin: apiStaff.roleId === 1,
    roleLabel: apiStaff.staffTypeName,
    staffTypeId: apiStaff.staffTypeId,
    staffTypeName: apiStaff.staffTypeName,
    qualificationId: apiStaff.qualificationId,
    qualificationName: apiStaff.qualificationName ?? "",
    qualifications: apiStaff.qualificationName ? [apiStaff.qualificationName] : [],
    weeklyHoursCap: apiStaff.weeklyHoursCap ?? 40,
    shiftTimes: apiStaff.preferredShiftTimes ?? [],
    isActive: apiStaff.isActive,
    photoUrl: "",
  };
}

export async function getStaff(staffId: string) {
  const response = await fetchJson<GetStaffResponse>(`/staff/${staffId}`);
  return mapApiStaffToModel(response);
}
