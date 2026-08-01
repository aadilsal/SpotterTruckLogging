import { createContext, useContext } from 'react';
import type { AxiosInstance } from 'axios';

export type AuthUser = {
  id: number;
  username: string;
  email: string;
};

export type AuthContextValue = {
  /** JWT access token — held in React state only, never persisted. */
  token: string | null;
  user: AuthUser | null;
  /** Axios client with the Bearer header and 401 handling already wired in. */
  api: AxiosInstance;
  sessionExpired: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
