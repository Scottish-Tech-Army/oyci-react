import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { UserRole } from '../types';

interface AuthUser {
  token: string;
  name: string;
  email: string;
  role: UserRole;
  id?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
  isAdmin: boolean;
  isStaff: boolean;
  isParticipant: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadUser);

  const login = useCallback((u: AuthUser) => {
    localStorage.setItem('token', u.token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAdmin: user?.role === 'ADMIN',
    isStaff: user?.role === 'STAFF',
    isParticipant: user?.role === 'PARTICIPANT',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
