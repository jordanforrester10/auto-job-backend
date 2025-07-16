// frontend/src/utils/axios.js - UPDATED WITH TAILORING TIMEOUT FIX
import axios from 'axios';

// Determine the API base URL based on environment
const getApiBaseUrl = () => {
  // Use environment variable if available, otherwise fallback to localhost
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000, // 60 second timeout for regular requests
});

// 🔧 NEW: Create special axios instance for long-running AI operations
const aiApi = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 180000, // 3 minutes timeout for AI operations (tailoring, analysis, etc.)
});

// Debug log to see which API URL is being used
console.log('🔗 API Base URL:', getApiBaseUrl());

// Rate limiting state
let isRateLimited = false;
let rateLimitTimeout = null;
let retryQueue = [];

// Helper function to handle rate limit delays
const handleRateLimit = (retryAfter = 60) => {
  console.log(`⏱️ Rate limited - waiting ${retryAfter} seconds before retrying`);
  isRateLimited = true;
  
  if (rateLimitTimeout) {
    clearTimeout(rateLimitTimeout);
  }
  
  rateLimitTimeout = setTimeout(() => {
    console.log('✅ Rate limit window expired, resuming requests');
    isRateLimited = false;
    
    // Process any queued requests
    const queue = [...retryQueue];
    retryQueue = [];
    queue.forEach(({ resolve, config }) => {
      api.request(config).then(resolve).catch(err => {
        // If still rate limited, re-queue
        if (err.response?.status === 429) {
          retryQueue.push({ resolve, config });
        } else {
          resolve(Promise.reject(err));
        }
      });
    });
  }, retryAfter * 1000);
};

// 🔧 NEW: Setup interceptors for both api instances
const setupInterceptors = (apiInstance, instanceName = 'api') => {
  // Request interceptor to add auth token and handle requests
  apiInstance.interceptors.request.use(
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
        console.log(`🚀 ${instanceName.toUpperCase()} Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url} (timeout: ${config.timeout}ms)`);
      }
      
      return config;
    },
    (error) => {
      console.error(`❌ ${instanceName} Request interceptor error:`, error);
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle responses and errors
  apiInstance.interceptors.response.use(
    (response) => {
      // Log response time in development
      if (process.env.NODE_ENV === 'development' && response.config.metadata) {
        const duration = new Date() - response.config.metadata.startTime;
        console.log(`✅ ${instanceName.toUpperCase()} Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms - Status: ${response.status}`);
      }
      
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      
      // Log error details
      console.error(`❌ ${instanceName.toUpperCase()} API Error Details:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        responseData: error.response?.data,
        timeout: error.config?.timeout,
        duration: error.config?.metadata ? new Date() - error.config.metadata.startTime : 'unknown'
      });
      
      // Handle rate limiting (429) - NEW FEATURE
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after']) || 60;
        
        console.warn(`⏱️ Rate limited - too many requests. Waiting ${retryAfter} seconds.`);
        
        // If not already handling rate limit, start the delay
        if (!isRateLimited) {
          handleRateLimit(retryAfter);
        }
        
        // Queue the request for retry
        return new Promise((resolve) => {
          retryQueue.push({ resolve, config: originalRequest });
        });
      }
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const { status, data } = error.response;
        
        switch (status) {
          case 401:
            // Unauthorized - token expired or invalid
            console.warn('🔒 Authentication error - clearing token and redirecting');
            localStorage.removeItem('token');
            delete apiInstance.defaults.headers.common['Authorization'];
            
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
            // Not found - API endpoint doesn't exist
            console.warn('🔍 API endpoint not found:', error.config?.url);
            console.warn('💡 Check if the backend server is running and routes are properly configured');
            break;
            
          case 429:
            // Rate limited - already handled above
            console.warn('⏱️ Rate limited - request queued for retry');
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
        if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
          console.error(`⏱️ ${instanceName.toUpperCase()} Request timed out after`, error.config?.timeout, 'ms');
          error.isTimeoutError = true;
          
          // Special message for AI operations
          if (instanceName === 'aiApi') {
            error.apiMessage = 'AI processing is taking longer than expected (3+ minutes). This may indicate a backend issue. Please try again or contact support if the problem persists.';
          } else {
            error.apiMessage = 'The request is taking longer than expected. AI processing can take up to 60 seconds for complex requests. Please try again.';
          }
        } else {
          console.error('🌐 Network error - server may be down:', error.message);
          error.isNetworkError = true;
          error.apiMessage = 'Network error - please check your connection and try again';
          
          // Check if backend server is running
          if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            error.apiMessage = 'Cannot connect to server. Please ensure the backend is running on ' + getApiBaseUrl();
            console.error('💡 Backend server might not be running. Check: npm start in backend directory');
          }
        }
        
      } else {
        // Request setup error
        console.error('⚙️ Request setup error:', error.message);
        error.apiMessage = 'Request configuration error';
      }
      
      return Promise.reject(error);
    }
  );
};

// Setup interceptors for both instances
setupInterceptors(api, 'api');
setupInterceptors(aiApi, 'aiApi');

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

// Helper function to check if error is timeout related
export const isTimeoutError = (error) => {
  return error?.isTimeoutError ||
         error?.code === 'ECONNABORTED' ||
         error?.message?.includes('timeout');
};

// Helper function to check if error is rate limit related - NEW
export const isRateLimitError = (error) => {
  return error?.response?.status === 429 ||
         error?.apiStatus === 429 ||
         error?.message?.includes('rate limit');
};

// Helper function to get user-friendly error message
export const getErrorMessage = (error) => {
  // Handle rate limiting with specific message
  if (isRateLimitError(error)) {
    return 'Too many requests. Please wait a moment before trying again.';
  }
  
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

// Helper function to check if we're currently rate limited - NEW
export const isCurrentlyRateLimited = () => isRateLimited;

// Helper function to clear rate limit state (for testing) - NEW
export const clearRateLimit = () => {
  isRateLimited = false;
  if (rateLimitTimeout) {
    clearTimeout(rateLimitTimeout);
    rateLimitTimeout = null;
  }
  retryQueue = [];
};

// 🔧 NEW: Export the AI API instance for long-running operations
export { aiApi };

export default api;