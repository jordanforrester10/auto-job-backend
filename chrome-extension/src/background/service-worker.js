// chrome-extension/src/background/service-worker.js - Fixed Communication + Real API

// API Configuration
const API_CONFIG = {
  BASE_URL: 'https://auto-job-backend-production.up.railway.app/api',
  BASE_URL: 'http://localhost:5000/api', // Uncomment for local development
  FRONTEND_URL: 'https://app.auto-job.ai',
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const STORAGE_KEYS = {
  AUTH_TOKEN: 'jobright_auth_token',
  USER_DATA: 'jobright_user_data',
  RESUMES: 'jobright_resumes',
  SETTINGS: 'jobright_settings',
  CACHE: 'jobright_cache'
};

const MESSAGE_TYPES = {
  CHECK_AUTH: 'CHECK_AUTH',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FETCH_RESUMES: 'FETCH_RESUMES',
  FETCH_USER_DATA: 'FETCH_USER_DATA',
  START_AUTO_FILL: 'START_AUTO_FILL',
  ENHANCE_RESPONSE: 'ENHANCE_RESPONSE',
  UPDATE_USAGE: 'UPDATE_USAGE',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  SYNC_SETTINGS: 'SYNC_SETTINGS',
  ATS_DETECTED: 'ATS_DETECTED',
  AUTO_FILL_COMPLETE: 'AUTO_FILL_COMPLETE'
};

const ERROR_TYPES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  USAGE_LIMIT_EXCEEDED: 'USAGE_LIMIT_EXCEEDED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS'
};

class BackgroundService {
  constructor() {
    this.authToken = null;
    this.userData = null;
    this.init();
  }

  init() {
    console.log('🚀 JobRightAI Extension Background Service initializing...');
    
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
    
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Handle async operations properly
      this.handleMessage(message, sender, sendResponse);
      // Return true to indicate we'll send a response asynchronously
      return true;
    });
    
    // Listen for tab updates to detect ATS platforms
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Load stored authentication on startup
    this.loadStoredAuth();
    
    console.log('✅ JobRightAI Extension Background Service initialized');
  }

  async loadStoredAuth() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.USER_DATA
      ]);
      
      this.authToken = result[STORAGE_KEYS.AUTH_TOKEN] || null;
      this.userData = result[STORAGE_KEYS.USER_DATA] || null;
      
      // Validate token format before using it
      if (this.authToken) {
        // Check if it looks like a valid JWT (has 3 parts separated by dots)
        const tokenParts = this.authToken.split('.');
        if (tokenParts.length !== 3) {
          console.warn('⚠️ Invalid token format detected, clearing...');
          await this.clearAuth();
          return;
        }
      }
      
      if (this.authToken && this.userData) {
        console.log('✅ Stored authentication loaded for:', this.userData.email);
        this.updateBadge('✓');
      } else {
        console.log('ℹ️ No valid stored authentication found');
        this.updateBadge('');
      }
    } catch (error) {
      console.error('❌ Error loading stored auth:', error);
      // Clear potentially corrupted data
      await this.clearAuth();
    }
  }

  updateBadge(text) {
    chrome.action.setBadgeText({ text });
    if (text === '✓') {
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else if (text === 'ATS') {
      chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
    }
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      console.log('📦 JobRightAI Extension installed');
      await this.initializeSettings();
    } else if (details.reason === 'update') {
      console.log('🔄 JobRightAI Extension updated');
    }
  }

  async initializeSettings() {
    const defaultSettings = {
      autoFillEnabled: true,
      aiEnhancementEnabled: true,
      cacheResponses: true,
      showNotifications: true,
      debugMode: false,
      lastUpdated: Date.now()
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: defaultSettings
    });
    
    console.log('⚙️ Default settings initialized');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      console.log('📨 Background received message:', message.type, 'from:', sender.tab ? 'content' : 'popup');
      console.log('📦 Full message object:', message);

      switch (message.type) {
        case MESSAGE_TYPES.CHECK_AUTH:
          await this.checkAuthentication(sendResponse);
          break;

        case MESSAGE_TYPES.LOGIN:
          console.log('🔐 Login message received with data:', message.credentials);
          console.log('🔍 Message structure:', JSON.stringify(message, null, 2));
          await this.handleLogin(message.credentials, sendResponse);
          break;

        case MESSAGE_TYPES.LOGOUT:
          await this.handleLogout(sendResponse);
          break;

        case MESSAGE_TYPES.FETCH_RESUMES:
          await this.fetchResumes(sendResponse);
          break;

        case MESSAGE_TYPES.FETCH_USER_DATA:
          await this.fetchUserData(sendResponse);
          break;

        case MESSAGE_TYPES.START_AUTO_FILL:
          await this.handleAutoFill(message.data, sendResponse);
          break;

        case MESSAGE_TYPES.ENHANCE_RESPONSE:
          await this.handleAIEnhancement(message.data, sendResponse);
          break;

        case MESSAGE_TYPES.UPDATE_USAGE:
          await this.updateUsage(message.data, sendResponse);
          break;

        case MESSAGE_TYPES.ATS_DETECTED:
          await this.handleATSDetected(message.data, sendResponse);
          break;

        default:
          console.warn('⚠️ Unknown message type:', message.type);
          try {
            sendResponse({ success: false, error: 'Unknown message type' });
          } catch (responseError) {
            console.error('❌ Error sending error response:', responseError);
          }
      }
    } catch (error) {
      console.error('❌ Background service error:', error);
      try {
        sendResponse({ success: false, error: error.message });
      } catch (responseError) {
        console.error('❌ Error sending error response:', responseError);
      }
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      const atsDetected = this.detectATS(tab.url);
      
      if (atsDetected) {
        console.log(`🎯 ATS detected: ${atsDetected.name} on ${tab.url}`);
        
        // Update extension badge
        chrome.action.setBadgeText({
          text: 'ATS',
          tabId: tabId
        });
        
        chrome.action.setBadgeBackgroundColor({
          color: '#2196F3'
        });
        
        // Send message to content script
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'ATS_PLATFORM_DETECTED',
            platform: atsDetected
          });
        } catch (error) {
          // Content script might not be ready yet, that's okay
          console.log('Content script not ready for ATS notification');
        }
      } else {
        // Clear ATS badge but keep auth badge if present
        if (this.authToken) {
          chrome.action.setBadgeText({
            text: '✓',
            tabId: tabId
          });
        } else {
          chrome.action.setBadgeText({
            text: '',
            tabId: tabId
          });
        }
      }
    }
  }

  detectATS(url) {
    const domain = new URL(url).hostname.toLowerCase();
    
    // Check for Greenhouse
    if (domain.includes('greenhouse.io') || url.includes('greenhouse')) {
      return {
        platform: 'GREENHOUSE',
        name: 'Greenhouse',
        domain: domain
      };
    }
    
    // Check for Workday
    if (domain.includes('workday.com') || domain.includes('myworkday.com') || url.includes('workday')) {
      return {
        platform: 'WORKDAY',
        name: 'Workday',
        domain: domain
      };
    }
    
    // Check for Lever
    if (domain.includes('lever.co') || domain.includes('jobs.lever.co')) {
      return {
        platform: 'LEVER',
        name: 'Lever',
        domain: domain
      };
    }
    
    // Check for other common ATS platforms
    if (domain.includes('bamboohr.com') || domain.includes('icims.com') || 
        domain.includes('jobvite.com') || domain.includes('smartrecruiters.com')) {
      return {
        platform: 'OTHER',
        name: 'ATS Platform',
        domain: domain
      };
    }
    
    return null;
  }

  async checkAuthentication(sendResponse) {
    try {
      console.log('🔍 Starting authentication check...');
      
      // Load from storage first
      await this.loadStoredAuth();
      
      if (!this.authToken) {
        console.log('ℹ️ No auth token found, user not authenticated');
        try {
          sendResponse({ success: true, authenticated: false });
        } catch (error) {
          console.error('❌ Error sending auth response:', error);
        }
        return;
      }

      // Verify token with extension endpoint
      console.log('🔍 Verifying authentication with backend...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/extension/auth/check`, {
        method: 'GET',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          this.userData = data.user;
          await chrome.storage.local.set({
            [STORAGE_KEYS.USER_DATA]: this.userData
          });
          
          console.log('✅ Authentication verified for:', this.userData.email);
          this.updateBadge('✓');
          
          try {
            sendResponse({
              success: true,
              authenticated: true,
              user: this.userData
            });
          } catch (error) {
            console.error('❌ Error sending success response:', error);
          }
          return;
        }
      }

      // Token is invalid (including malformed JWT), clear it
      console.log('🔄 Token invalid or malformed, clearing auth data');
      await this.clearAuth();
      
      try {
        sendResponse({ success: true, authenticated: false });
      } catch (error) {
        console.error('❌ Error sending cleared auth response:', error);
      }

    } catch (error) {
      console.error('❌ Auth check error:', error);
      
      // If there's a network error or JWT malformed error, clear stored auth
      if (error.message.includes('jwt') || error.message.includes('malformed') || error.message.includes('token')) {
        console.log('🔄 Clearing malformed/invalid token');
        await this.clearAuth();
      }
      
      try {
        sendResponse({ 
          success: true, 
          authenticated: false, 
          error: 'Please log in again' 
        });
      } catch (responseError) {
        console.error('❌ Error sending error response:', responseError);
      }
    }
  }

  async handleLogin(credentials, sendResponse) {
    try {
      console.log('🔐 Starting handleLogin with credentials:', credentials);
      
      // Validate credentials parameter
      if (!credentials || typeof credentials !== 'object') {
        console.error('❌ Invalid credentials parameter:', credentials);
        try {
          sendResponse({
            success: false,
            error: 'Invalid login data'
          });
        } catch (responseError) {
          console.error('❌ Error sending invalid credentials response:', responseError);
        }
        return;
      }

      const { email, password } = credentials;
      
      if (!email || !password) {
        console.error('❌ Missing email or password:', { email: !!email, password: !!password });
        try {
          sendResponse({
            success: false,
            error: 'Email and password are required'
          });
        } catch (responseError) {
          console.error('❌ Error sending missing fields response:', responseError);
        }
        return;
      }

      console.log('🔐 Attempting login for:', email);
      
      const requestBody = {
        email: email,
        password: password
      };
      
      console.log('📤 Sending login request to:', `${API_CONFIG.BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: API_CONFIG.HEADERS,
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Login response status:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('📥 Login response data:', JSON.stringify(data, null, 2));
      console.log('📥 Data properties:', Object.keys(data));
      console.log('📥 Data.success:', data.success);
      console.log('📥 Data.token:', !!data.token);
      console.log('📥 Data.user:', data.user);

      if (response.ok && data.success && data.token) {
        console.log('✅ Login validation passed, storing data...');
        
        this.authToken = data.token;
        this.userData = data.user;
        
        console.log('✅ Stored authToken:', !!this.authToken);
        console.log('✅ Stored userData:', this.userData);
        console.log('✅ About to access userData.email...');
        
        // Store authentication data
        await chrome.storage.local.set({
          [STORAGE_KEYS.AUTH_TOKEN]: this.authToken,
          [STORAGE_KEYS.USER_DATA]: this.userData
        });
        
        console.log('✅ Storage completed, about to log success message...');
        console.log('✅ Login successful for:', this.userData?.email || 'unknown user');
        this.updateBadge('✓');
        
        // Notify content scripts that user is authenticated
        this.notifyContentScriptsAuthenticated();
        
        try {
          sendResponse({
            success: true,
            user: this.userData,
            token: this.authToken
          });
        } catch (responseError) {
          console.error('❌ Error sending login success response:', responseError);
        }
      } else {
        console.log('❌ Login failed:', data.error || 'Unknown error');
        try {
          sendResponse({
            success: false,
            error: data.error || 'Login failed - invalid credentials'
          });
        } catch (responseError) {
          console.error('❌ Error sending login failure response:', responseError);
        }
      }
    } catch (error) {
      console.error('❌ Login error caught:', error);
      console.error('❌ Error stack:', error.stack);
      try {
        sendResponse({
          success: false,
          error: 'Network error. Please check your connection.'
        });
      } catch (responseError) {
        console.error('❌ Error sending login error response:', responseError);
      }
    }
  }

  async handleLogout(sendResponse) {
    try {
      console.log('🚪 Logging out user');
      await this.clearAuth();
      sendResponse({ success: true });
    } catch (error) {
      console.error('❌ Logout error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async clearAuth() {
    // Clear stored data
    await chrome.storage.local.remove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.RESUMES,
      STORAGE_KEYS.CACHE
    ]);
    
    this.authToken = null;
    this.userData = null;
    this.updateBadge('');
    
    console.log('✅ Authentication cleared');
  }

  async fetchResumes(sendResponse) {
    try {
      if (!this.authToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      console.log('📄 Fetching resumes from backend...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/extension/resumes`, {
        method: 'GET',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Cache resumes locally
        await chrome.storage.local.set({
          [STORAGE_KEYS.RESUMES]: data.resumes || []
        });
        
        console.log('✅ Resumes fetched:', data.resumes?.length || 0);
        sendResponse({
          success: true,
          resumes: data.resumes || []
        });
      } else {
        console.log('❌ Failed to fetch resumes:', data.error);
        sendResponse({
          success: false,
          error: data.error || 'Failed to fetch resumes'
        });
      }
    } catch (error) {
      console.error('❌ Fetch resumes error:', error);
      sendResponse({
        success: false,
        error: 'Network error fetching resumes'
      });
    }
  }

  async fetchUserData(sendResponse) {
    try {
      if (!this.authToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      console.log('👤 Fetching fresh user data...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/extension/auth/check`, {
        method: 'GET',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        this.userData = data.user;
        await chrome.storage.local.set({
          [STORAGE_KEYS.USER_DATA]: this.userData
        });
        
        console.log('✅ User data updated');
        sendResponse({
          success: true,
          user: this.userData
        });
      } else {
        sendResponse({
          success: false,
          error: data.error || 'Failed to fetch user data'
        });
      }
    } catch (error) {
      console.error('❌ Fetch user data error:', error);
      sendResponse({
        success: false,
        error: 'Network error fetching user data'
      });
    }
  }

  async handleAutoFill(data, sendResponse) {
    try {
      if (!this.authToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      console.log('🤖 Starting auto-fill process...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/extension/autofill`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Auto-fill completed successfully');
        sendResponse({
          success: true,
          filledData: result.filledData,
          enhancedFields: result.enhancedFields,
          usage: result.usage
        });
      } else {
        console.log('❌ Auto-fill failed:', result.error);
        sendResponse({
          success: false,
          error: result.error || 'Auto-fill failed',
          errorType: result.errorType
        });
      }
    } catch (error) {
      console.error('❌ Auto-fill error:', error);
      sendResponse({
        success: false,
        error: 'Network error during auto-fill'  
      });
    }
  }

  async handleAIEnhancement(data, sendResponse) {
    try {
      if (!this.authToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      console.log('✨ Processing AI enhancement...');
      
      const response = await fetch(`${API_CONFIG.BASE_URL}/extension/enhance-field`, {
        method: 'POST',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ AI enhancement completed');
        sendResponse({
          success: true,
          enhancedValue: result.enhancedValue,
          originalValue: result.originalValue
        });
      } else {
        console.log('❌ AI enhancement failed:', result.error);
        sendResponse({
          success: false,
          error: result.error || 'AI enhancement failed',
          errorType: result.errorType
        });
      }
    } catch (error) {
      console.error('❌ AI enhancement error:', error);
      sendResponse({
        success: false,
        error: 'Network error during AI enhancement'
      });
    }
  }

  async updateUsage(data, sendResponse) {
    try {
      if (!this.authToken) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      console.log('📊 Updating usage stats...');
      
      // Track usage with backend
      const response = await fetch(`${API_CONFIG.BASE_URL}/extension/usage`, {
        method: 'GET',
        headers: {
          ...API_CONFIG.HEADERS,
          'Authorization': `Bearer ${this.authToken}`
        }
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log('✅ Usage stats updated');
        sendResponse({
          success: true,
          usage: result.usage,
          plan: result.plan
        });
      } else {
        sendResponse({
          success: false,
          error: result.error || 'Failed to get usage stats'
        });
      }
    } catch (error) {
      console.error('❌ Usage update error:', error);
      sendResponse({
        success: false,
        error: 'Failed to update usage'
      });
    }
  }

  async handleATSDetected(data, sendResponse) {
    console.log('🎯 ATS detection handled:', data);
    sendResponse({ success: true });
  }

  async notifyContentScriptsAuthenticated() {
    try {
      console.log('📢 Notifying content scripts of authentication...');
      
      const tabs = await chrome.tabs.query({});
      
      for (const tab of tabs) {
        try {
          if (tab.url && (
            tab.url.includes('greenhouse.io') || 
            tab.url.includes('workday.com') || 
            tab.url.includes('lever.co') ||
            tab.url.includes('myworkday.com') ||
            tab.url.includes('jobs.lever.co')
          )) {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'USER_AUTHENTICATED',
              user: this.userData
            });
            console.log('📢 Sent USER_AUTHENTICATED to tab:', tab.id);
          }
        } catch (error) {
          console.log('Content script not ready on tab:', tab.id);
        }
      }
    } catch (error) {
      console.error('❌ Error notifying content scripts:', error);
    }
  }
}

// Initialize the background service
console.log('🚀 Initializing JobRightAI Background Service...');
new BackgroundService();
