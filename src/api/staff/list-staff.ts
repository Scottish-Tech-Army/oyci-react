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

export type ListStaffResponse = {
  staffInfo: ApiStaff[];
  activeStaff: number;
};

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
    roleLabel: apiStaff.staffTypeName,
    roleId: apiStaff.roleId,
    isAdmin: apiStaff.roleId === 1,
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

export async function listStaff() {
  const response = await fetchJson<ListStaffResponse>("/staff/list-staff");
  return {
    staff: response.staffInfo.map(mapApiStaffToModel),
    activeStaff: response.activeStaff,
  };
}
