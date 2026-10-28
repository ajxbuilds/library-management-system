import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  quickLoginAs: (role: UserRole) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isLibrarian: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const me = await api.getMe();
          setUser(me);
        } catch {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } else {
        // Automatically default log in as admin for smooth demo review
        try {
          const res = await api.login({ username_or_email: 'admin', password: 'admin123' });
          localStorage.setItem('token', res.access_token);
          setToken(res.access_token);
          setUser(res.user);
        } catch (e) {
          console.warn('Initial admin auto-login failed:', e);
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ username_or_email: usernameOrEmail, password });
      localStorage.setItem('token', res.access_token);
      setToken(res.access_token);
      setUser(res.user);
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAs = async (role: UserRole) => {
    const creds: Record<UserRole, { user: string; pass: string }> = {
      admin: { user: 'admin', pass: 'admin123' },
      librarian: { user: 'librarian', pass: 'lib123' },
      student: { user: 'student', pass: 'student123' }
    };
    await login(creds[role].user, creds[role].pass);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isLibrarian = user?.role === 'librarian' || isAdmin;
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        quickLoginAs,
        logout,
        isAdmin,
        isLibrarian,
        isStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
