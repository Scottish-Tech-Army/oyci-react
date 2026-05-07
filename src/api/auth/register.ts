import { fetchJson } from "../client";

export type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  role: string;
};

export type RegisterResponse = {
  userId: number;
  message?: string;
};

export async function register(data: RegisterRequest) {
  return await fetchJson<RegisterResponse>("/auth/signup", {
    method: "POST",
    body: data,
  });
}
