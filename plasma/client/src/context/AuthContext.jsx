import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { getApiErrorMessage } from '../lib/errors';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user');
    const accessToken = localStorage.getItem('accessToken');

    if (storedUser && accessToken) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { user, accessToken, refreshToken } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      setUser(user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'Login failed'),
      };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const verifyPin = async (pin) => {
    try {
      const response = await api.post('/auth/verify-pin', { pin });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: getApiErrorMessage(error, 'PIN verification failed'),
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    verifyPin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
