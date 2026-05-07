import client from './client';

export interface LoginResponse {
  username: string;
  role: 'admin' | 'staff';
  displayName: string;
}

export async function loginUser(username: string, role: 'admin' | 'staff'): Promise<LoginResponse> {
  const { data } = await client.post<LoginResponse>('/auth/login', { username, role });
  return data;
}
