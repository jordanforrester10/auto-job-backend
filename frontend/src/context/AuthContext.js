// frontend/src/context/AuthContext.js - UPDATED WITH NEW USER MODAL LOGIC
import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import api, { isRateLimitError, getErrorMessage } from '../utils/axios';

// Create and export the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // NEW: Modal state for new user onboarding
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  
  // Use refs to track loading state and prevent infinite loops
  const isLoadingUser = useRef(false);
  const lastUserLoadAttempt = useRef(0);

  // Load user function - memoized properly to prevent infinite loops
  const loadUser = useCallback(async (force = false) => {
    const now = Date.now();
    const timeSinceLastAttempt = now - lastUserLoadAttempt.current;
    
    // Prevent rapid successive calls unless forced
    if (!force && (timeSinceLastAttempt < 3000 || isLoadingUser.current)) {
      console.log('🔄 Skipping user load - too recent or already loading');
      setLoading(false);
      return;
    }

    if (!token) {
      console.log('🔍 No token found, skipping user load');
      setLoading(false);
      return;
    }

    try {
      isLoadingUser.current = true;
      lastUserLoadAttempt.current = now;
      console.log('🔍 Loading user with token...');
      
      // Set the token in the Authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await api.get('/auth/me');
      console.log('✅ User loaded successfully:', response.data);
      
      if (response.data.success && response.data.data?.user) {
        const user = response.data.data.user;
        setCurrentUser(user);
        setIsAuthenticated(true);
        setError(null);
        
        // NEW: Check if we should show the new user modal
        if (isNewRegistration && !hasUserSeenOnboarding(user)) {
          console.log('🎯 Triggering new user modal for fresh registration');
          setShowNewUserModal(true);
          setIsNewRegistration(false); // Reset the flag
        }
        
        console.log('✅ User authenticated successfully');
      } else {
        throw new Error('Invalid response format from /auth/me');
      }
    } catch (err) {
      console.error('❌ Error loading user:', err);
      
      // Handle different error types
      if (isRateLimitError(err)) {
        console.log('⏱️ Rate limited during user load - keeping current auth state');
        setError('Too many requests. Please wait a moment.');
        // Don't clear auth state for rate limiting
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('🔒 Token expired or invalid - clearing auth state');
        // Clear invalid token
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setError(null);
      } else {
        console.log('🔥 Other error during user load');
        setError('Failed to load user session');
      }
    } finally {
      isLoadingUser.current = false;
      setLoading(false);
    }
  }, [token, isNewRegistration]); // Add isNewRegistration to dependencies

  // Load user if token exists - but only run when token actually changes
  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    if (currentToken && currentToken === token) {
      loadUser(true);
    } else if (!currentToken) {
      setLoading(false);
    }
  }, [token]); // Remove loadUser from dependencies to prevent infinite loop

  // NEW: Helper function to check if user has seen onboarding modal
  const hasUserSeenOnboarding = (user) => {
    if (!user) return false;
    
    // Check localStorage for user-specific onboarding completion
    const onboardingKey = `onboarding_seen_${user._id || user.id}`;
    return localStorage.getItem(onboardingKey) === 'true';
  };

  // NEW: Function to dismiss the new user modal - marks as seen permanently
  const dismissNewUserModal = () => {
    if (currentUser) {
      const onboardingKey = `onboarding_seen_${currentUser._id || currentUser.id}`;
      localStorage.setItem(onboardingKey, 'true');
    }
    setShowNewUserModal(false);
  };

  // Register new user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Attempting registration...');
      const response = await api.post('/auth/register', userData);
      console.log('✅ Registration response:', response.data);
      
      if (response.data.success && response.data.token) {
        const { token: newToken, data } = response.data;
        
        // Store token and set auth header
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        setToken(newToken);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        
        // NEW: Set flag to show modal after user loads
        setIsNewRegistration(true);
        
        console.log('✅ Registration successful - will show onboarding modal');
        return { success: true, user: data.user };
      } else {
        throw new Error(response.data.error || 'Invalid registration response');
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Attempting login for:', email);
      
      const response = await api.post('/auth/login', { 
        email: email.trim(), 
        password 
      });
      
      console.log('✅ Login response:', response.data);
      
      if (response.data.success && response.data.token) {
        const { token: newToken, data } = response.data;
        
        // Store token and set auth header
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        setToken(newToken);
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        setError(null);
        
        // NEW: Check if this is a first-time login (could show modal for very new users)
        // For now, we only show it for fresh registrations
        
        console.log('✅ Login successful for user:', data.user.email);
        return { success: true, user: data.user };
      } else {
        throw new Error(response.data.error || 'Invalid login response');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      console.log('🔍 Attempting logout...');
      
      // Try to call logout endpoint with timeout
      const logoutPromise = api.post('/auth/logout');
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout')), 5000)
      );
      
      await Promise.race([logoutPromise, timeoutPromise]);
      console.log('✅ Logout successful');
    } catch (err) {
      console.error('❌ Logout error:', err);
      console.log('⚠️ Logout API call failed, but continuing with local cleanup');
      // Continue with local cleanup even if server request fails
    } finally {
      // Always clean up local state
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      setToken(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      setError(null);
      // NEW: Reset modal states
      setShowNewUserModal(false);
      setIsNewRegistration(false);
      console.log('✅ Local session cleared');
    }
  };

  // Forgot password
  const forgotPassword = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Requesting password reset for:', email);
      const response = await api.post('/auth/forgot-password', { email });
      console.log('✅ Password reset response:', response.data);
      
      return { 
        success: true, 
        message: response.data.data?.message || 'Reset email sent' 
      };
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (resetToken, password) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Attempting password reset...');
      const response = await api.put(`/auth/reset-password/${resetToken}`, { password });
      console.log('✅ Password reset response:', response.data);
      
      if (response.data.success && response.data.token) {
        const { token: newToken } = response.data;
        
        // Store new token
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setToken(newToken);
        
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Invalid reset response');
      }
    } catch (err) {
      console.error('❌ Password reset error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Force refresh user data
  const refreshUser = useCallback(() => {
    if (token) {
      return loadUser(true);
    }
  }, [token, loadUser]);

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    error,
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    clearError,
    refreshUser,
    // NEW: Modal-related values and functions
    showNewUserModal,
    dismissNewUserModal
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for easier context usage
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Default export (some files might expect this)
export default AuthContext;