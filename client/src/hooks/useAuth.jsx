import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '../lib/api';

const KEY = 'kv_admin_session';
const AuthContext = createContext(null);

// sessionStorage: the admin is signed out when the tab closes. Storage can throw (private mode), so guard it.
const read = () => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY));
  } catch {
    return null;
  }
};
const write = (value) => {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(read);

  const login = useCallback(async (email, password) => {
    const { token, admin } = await api.login(email, password);
    const next = { token, email: admin.email };
    write(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    write(null);
    setSession(null);
  }, []);

  const value = useMemo(() => ({ token: session?.token ?? null, email: session?.email ?? null, login, logout }), [session, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Admin API bound to the current token. A 401 anywhere signs the admin out and bounces them to /admin/login. */
export function useAdminApi() {
  const { token, logout } = useAuth();
  return useMemo(() => {
    const guard = (promise) =>
      promise.catch((err) => {
        if (err?.status === 401) logout();
        throw err;
      });
    return {
      stats: (signal) => guard(api.stats(token, signal)),
      participants: (params, signal) => guard(api.participants(token, params, signal)),
      exportCsv: (params) => guard(api.exportCsv(token, params)),
      resetParticipantStatus: (participantId) => guard(api.resetParticipantStatus(token, participantId)),
      resetAllParticipants: () => guard(api.resetAllParticipants(token)),
      deleteParticipant: (participantId) => guard(api.deleteParticipant(token, participantId)),
      deleteAllParticipants: () => guard(api.deleteAllParticipants(token)),
      drawState: (signal) => guard(api.drawState(token, signal)),
      drawHistory: (signal) => guard(api.drawHistory(token, signal)),
      draw: (prizeId) => guard(api.draw(token, prizeId)),
    };
  }, [token, logout]);
}
