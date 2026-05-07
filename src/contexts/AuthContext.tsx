import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { loginUser } from '../api/auth';

interface AuthUser {
  username: string;
  role: 'admin' | 'staff';
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, role: 'admin' | 'staff') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [user]);

  const login = async (username: string, role: 'admin' | 'staff') => {
    const response = await loginUser(username, role);
    setUser({ username: response.username, role: response.role, displayName: response.displayName });
  };

  const logout = () => {
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
