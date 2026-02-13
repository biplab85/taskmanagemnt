import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import api from '@/api/axios';
import type { User, AuthResponse, UserStatus } from '@/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginAs: (userId: number) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserStatus: (status: UserStatus) => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await api.get<User>('/user');
          setUser(response.data);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
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
    const response = await api.post<AuthResponse>(`/users/${userId}/impersonate`);
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const register = async (name: string, email: string, password: string, passwordConfirmation: string) => {
    const response = await api.post<AuthResponse>('/register', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    toast.success('Account created successfully!');
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // ignore errors on logout
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUserStatus = async (status: UserStatus) => {
    try {
      await api.put('/profile', { name: user?.name, email: user?.email, status });
      setUser((prev) => prev ? { ...prev, status } : prev);
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<User>('/user');
      setUser(response.data);
    } catch { /* ignore */ }
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, token, login, loginAs, register, logout, updateUserStatus, refreshUser, loading, isAdmin }}>
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
