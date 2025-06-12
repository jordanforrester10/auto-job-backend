// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Setup axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Load user if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/api/auth/me');
        setCurrentUser(res.data.data.user);
        setIsAuthenticated(true);
        setError(null);
      } catch (err) {
        console.error('Error loading user:', err);
        setToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setError(err.response?.data?.error || 'Authentication failed');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  // Register user
  const register = async (userData) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/register', userData);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
      return { success: false, error: err.response?.data?.error || 'Registration failed' };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/login', { email, password });
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
      return { success: false, error: err.response?.data?.error || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      setLoading(true);
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setToken(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      setLoading(false);
    }
  };

  // Update user
  const updateUser = async (userData) => {
    try {
      setLoading(true);
      const res = await axios.put('/api/auth/update-details', userData);
      setCurrentUser(res.data.data.user);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.error || 'Update failed');
      return { success: false, error: err.response?.data?.error || 'Update failed' };
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      const res = await axios.put('/api/auth/update-password', {
        currentPassword,
        newPassword
      });
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.error || 'Password change failed');
      return { success: false, error: err.response?.data?.error || 'Password change failed' };
    } finally {
      setLoading(false);
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      const res = await axios.post('/api/auth/forgot-password', { email });
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
      return { success: false, error: err.response?.data?.error || 'Failed to send reset email' };
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      setLoading(true);
      const res = await axios.put(`/api/auth/reset-password/${token}`, { password });
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed');
      return { success: false, error: err.response?.data?.error || 'Password reset failed' };
    } finally {
      setLoading(false);
    }
  };

  // Clear errors
  const clearErrors = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        loading,
        error,
        register,
        login,
        logout,
        updateUser,
        changePassword,
        forgotPassword,
        resetPassword,
        clearErrors
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};