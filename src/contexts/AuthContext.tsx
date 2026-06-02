import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, getAccessToken, setAccessToken } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: { full_name?: string };
  email_confirmed_at?: string | null;
  created_at?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, token: string, type?: 'signup' | 'email') => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  getSession: () => { access_token: string } | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await apiFetch<{ user: AuthUser }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });
    return { needsVerification: true };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{
      user: AuthUser;
      access_token: string;
    }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

  const verifyOtp = useCallback(async (email: string, token: string, type: 'signup' | 'email' = 'signup') => {
    const data = await apiFetch<{
      user: AuthUser;
      access_token: string;
    }>('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, token, type }),
    });
    setAccessToken(data.access_token);
    setUser(data.user);
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    await apiFetch('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const signOut = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('admin_session');
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    await apiFetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    await apiFetch('/api/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  }, []);

  const getSession = useCallback(() => {
    const token = getAccessToken();
    return token ? { access_token: token } : null;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refreshUser,
      signUp,
      signIn,
      verifyOtp,
      resendOtp,
      signOut,
      forgotPassword,
      resetPassword,
      updatePassword,
      getSession,
    }),
    [
      user,
      loading,
      refreshUser,
      signUp,
      signIn,
      verifyOtp,
      resendOtp,
      signOut,
      forgotPassword,
      resetPassword,
      updatePassword,
      getSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
