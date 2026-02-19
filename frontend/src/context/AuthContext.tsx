import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import api from '@/api/axios';
import type { User, AuthResponse, UserStatus } from '@/types';
import { toast } from 'sonner';

type StatusChangeListener = (userId: number, status: UserStatus) => void;

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginAs: (userId: number) => Promise<void>;
  logout: () => Promise<void>;
  updateUserStatus: (status: UserStatus) => Promise<void>;
  refreshUser: () => Promise<void>;
  onStatusChange: (listener: StatusChangeListener) => () => void;
  loading: boolean;
  isAdmin: boolean;
  isImpersonating: boolean;
  returnToAdmin: () => Promise<void>;
  needsProfileCompletion: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const statusListenersRef = useRef<Set<StatusChangeListener>>(new Set());

  // Read token from localStorage after hydration, then fetch user
  useEffect(() => {
    const stored = localStorage.getItem('token');
    const adminToken = localStorage.getItem('admin_token');
    setIsImpersonating(!!adminToken);
    if (stored) {
      setToken(stored);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token === null) return;
    const initAuth = async () => {
      try {
        const response = await api.get<User>('/user');
        setUser(response.data);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/login', { email, password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    toast.success(`Welcome back, ${userData.name}!`);
  };

  const loginAs = async (userId: number) => {
    // Save the current admin token before impersonating
    const currentToken = localStorage.getItem('token');
    if (currentToken) {
      localStorage.setItem('admin_token', currentToken);
    }

    const response = await api.post<AuthResponse>(`/users/${userId}/impersonate`);
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    setIsImpersonating(true);
    toast.success(`Now impersonating ${userData.name}`);
  };

  const returnToAdmin = async () => {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) return;

    localStorage.setItem('token', adminToken);
    localStorage.removeItem('admin_token');
    setToken(adminToken);
    setIsImpersonating(false);

    try {
      const response = await api.get<User>('/user');
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      toast.success('Returned to admin account');
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
      toast.error('Failed to return to admin account');
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('admin_token');
    setToken(null);
    setUser(null);
    setIsImpersonating(false);
    toast.success('Logged out successfully');
  };

  const updateUserStatus = async (status: UserStatus) => {
    try {
      await api.put('/profile', { name: user?.name, email: user?.email, status });
      setUser((prev) => prev ? { ...prev, status } : prev);
      if (user) {
        statusListenersRef.current.forEach((listener) => listener(user.id, status));
      }
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const onStatusChange = useCallback((listener: StatusChangeListener) => {
    statusListenersRef.current.add(listener);
    return () => { statusListenersRef.current.delete(listener); };
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<User>('/user');
      setUser(response.data);
    } catch { /* ignore */ }
  }, []);

  const isAdmin = user?.role === 'admin';
  const needsProfileCompletion = !!user && (user.profile_completion ?? 0) < 100 && !user.profile_completed;

  return (
    <AuthContext.Provider value={{ user, token, login, loginAs, logout, updateUserStatus, refreshUser, onStatusChange, loading, isAdmin, isImpersonating, returnToAdmin, needsProfileCompletion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
