import client from './client';
import type { StaffMember, Qualification } from '../types';

export const getStaff = () => client.get<StaffMember[]>('/staff').then(r => r.data);

export const getStaffQualifications = (staffId: string) =>
  client.get<Qualification[]>(`/staff/${staffId}/qualifications`).then(r => r.data);
