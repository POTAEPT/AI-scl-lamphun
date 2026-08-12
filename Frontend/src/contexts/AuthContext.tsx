import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (user: AuthUser, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const BYPASS_LOGIN = import.meta.env.DEV && import.meta.env.VITE_BYPASS_LOGIN === 'true';

  useEffect(() => {
    // โหลด session จาก localStorage ตอนเริ่มต้น
    const storedUser = localStorage.getItem('mockUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else if (BYPASS_LOGIN) {
      setUser({ id: 1, name: 'Admin (Dev)', role: 'admin' });
    }
    setIsLoading(false);
  }, [BYPASS_LOGIN]);

  const login = (userData: AuthUser, token?: string) => {
    setUser(userData);
    localStorage.setItem('mockUser', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('accessToken', token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mockUser');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
