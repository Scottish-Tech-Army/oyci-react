import { fetchJson } from "../client";

export type LoginRequest = {
  username: string;
  password: string;
  role: string;
};

export type LoginResponse = {
  userId: number;
  email: string;
  name: string;
  role: string;
  message?: string;
};

export async function login(data: LoginRequest) {
  return await fetchJson<LoginResponse>("/auth/login", {
    method: "POST",
    body: data,
  });
}
