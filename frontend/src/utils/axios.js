// frontend/src/utils/axios.js
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Request interceptor to add auth token and handle requests
api.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues
    config.metadata = { startTime: new Date() };
    
    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle responses and errors
api.interceptors.response.use(
  (response) => {
    // Log response time in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    }
    
    return response;
  },
  (error) => {
    // Log error details
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase()
    });
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.warn('🔒 Authentication error - clearing token and redirecting');
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          
          // Only redirect if not already on auth pages
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/login') && 
              !currentPath.includes('/register') && 
              !currentPath.includes('/forgot-password') &&
              !currentPath.includes('/reset-password')) {
            
            // Use a small delay to prevent multiple redirects
            setTimeout(() => {
              window.location.href = '/login?expired=true';
            }, 100);
          }
          break;
          
        case 403:
          // Forbidden - user doesn't have permission
          console.warn('🚫 Access forbidden:', data?.error || 'Permission denied');
          break;
          
        case 404:
          // Not found
          console.warn('🔍 Resource not found:', error.config?.url);
          break;
          
        case 429:
          // Rate limited
          console.warn('⏱️ Rate limited - too many requests');
          break;
          
        case 500:
          // Server error
          console.error('🔥 Server error occurred');
          break;
          
        default:
          console.error(`❌ HTTP ${status}:`, data?.error || error.message);
      }
      
      // Enhance error object with additional info
      error.isApiError = true;
      error.apiStatus = status;
      error.apiMessage = data?.error || data?.message || 'An error occurred';
      
    } else if (error.request) {
      // Network error - no response received
      console.error('🌐 Network error - server may be down:', error.message);
      error.isNetworkError = true;
      error.apiMessage = 'Network error - please check your connection and try again';
      
      // Check if backend server is running
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        error.apiMessage = 'Cannot connect to server. Please ensure the backend is running on http://localhost:5000';
      }
      
    } else {
      // Request setup error
      console.error('⚙️ Request setup error:', error.message);
      error.apiMessage = 'Request configuration error';
    }
    
    return Promise.reject(error);
  }
);

// Helper function to check if error is authentication related
export const isAuthError = (error) => {
  return error?.response?.status === 401 || 
         error?.apiStatus === 401 ||
         error?.message?.includes('token');
};

// Helper function to check if error is network related
export const isNetworkError = (error) => {
  return error?.isNetworkError || 
         error?.code === 'ECONNREFUSED' ||
         error?.message === 'Network Error';
};

// Helper function to get user-friendly error message
export const getErrorMessage = (error) => {
  if (error?.apiMessage) {
    return error.apiMessage;
  }
  
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
};

// Helper function to handle API responses consistently
export const handleApiResponse = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response.data.error || 'API returned unsuccessful response');
  }
  return response.data;
};

// Helper function for making authenticated requests
export const makeAuthenticatedRequest = async (requestFn) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  try {
    return await requestFn();
  } catch (error) {
    if (isAuthError(error)) {
      // Token might be expired, try to refresh or redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw error;
  }
};

export default api;