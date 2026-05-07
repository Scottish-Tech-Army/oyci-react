import { fetchJson } from "../client";

export type Role = {
  roleId: number;
  name: string;
  roleType: string;
};

export type GetRolesResponse = Role[];

export async function getRoles() {
  const response = await fetchJson<GetRolesResponse>("/auth/roles");
  return response;
}
