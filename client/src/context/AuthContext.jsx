import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('mentorToken');
    if (!token) {
      setMentor(null);
      setLoading(false);
      return;
    }

    try {
      const data = await apiFetch('/auth/me');
      setMentor(data.mentor);
    } catch (err) {
      console.warn('Auth check failed:', err.message);
      localStorage.removeItem('mentorToken');
      setMentor(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('mentorToken', data.token);
    setMentor(data.mentor);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('mentorToken');
    setMentor(null);
  };

  return (
    <AuthContext.Provider value={{ mentor, loading, login, logout, checkAuth }}>
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
