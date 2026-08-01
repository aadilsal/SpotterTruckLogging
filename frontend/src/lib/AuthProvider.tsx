import { useCallback, useMemo, useState, type ReactNode } from 'react';
import axios from 'axios';
import { apiUrl, createApiClient } from './api';
import { AuthContext, type AuthUser } from './authContext';

/**
 * Holds the JWT in React state only. Nothing touches localStorage or cookies,
 * so a full page reload intentionally drops the session back to the login screen.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const clearSession = useCallback((expired: boolean) => {
    setToken(null);
    setUser(null);
    setSessionExpired(expired);
  }, []);

  const logout = useCallback(() => clearSession(false), [clearSession]);

  // Any 401 from an authenticated call drops us back to the login screen.
  const handleUnauthorized = useCallback(() => clearSession(true), [clearSession]);

  const api = useMemo(
    () => createApiClient(token, handleUnauthorized),
    [token, handleUnauthorized]
  );

  const startSession = useCallback((accessToken: string, nextUser: AuthUser | null) => {
    setToken(accessToken);
    setUser(nextUser);
    setSessionExpired(false);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await axios.post(apiUrl('/api/auth/login/'), { username, password });
      const accessToken: string = res.data.access;

      // The token endpoint returns tokens only; fetch the profile for the header.
      let nextUser: AuthUser | null;
      try {
        const me = await axios.get(apiUrl('/api/auth/me/'), {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        nextUser = me.data;
      } catch {
        nextUser = { id: 0, username, email: '' };
      }

      startSession(accessToken, nextUser);
    },
    [startSession]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      const res = await axios.post(apiUrl('/api/auth/register/'), {
        username,
        email: email || '',
        password,
      });
      startSession(res.data.access, res.data.user ?? null);
    },
    [startSession]
  );

  const value = useMemo(
    () => ({ token, user, api, sessionExpired, login, register, logout }),
    [token, user, api, sessionExpired, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
