import { fetchJson } from "../client";

export type Qualification = {
  qualificationId: number;
  name: string;
  description: string;
};

export type GetQualificationsResponse = Qualification[];

export async function getQualifications() {
  const response = await fetchJson<GetQualificationsResponse>("/qualifications");
  return response;
}
