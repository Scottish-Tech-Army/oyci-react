import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export type Role = "Admin" | "Manager" | "Staff";

export type SessionUser = {
  username: string;

  email?: string;
  staffId?: string;
  role: Role;
};

const KEY = "oyci.session";

export function getSession(): SessionUser | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const session = getSession();
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function hasRole(roles: Role[]) {
  const session = getSession();
  return !!session && roles.includes(session.role);
}