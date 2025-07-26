// chrome-extension/src/popup/popup.js - Updated to Match HTML Structure

console.log('🚀 Auto-Job Extension Popup Loading...');

// DOM Elements - Updated to match your HTML
let loadingScreen, loginScreen, dashboardScreen, settingsScreen;
let loginForm, emailInput, passwordInput, loginBtn, loginError;
let userName, userPlan, usageCount, usageLimit, progressFill;
let resumeSelect, atsStatusText, atsDescription, atsIcon;
let logoutBtn, settingsBtn, backBtn, signupLink;
let autoFillBtn, enhanceBtn, refreshResumes;
let helpBtn, feedbackBtn, dashboardBtn;

// State
let isAuthenticated = false;
let currentUser = null;
let userResumes = [];
let selectedResumeId = null;

// Function definitions - moved up to avoid hoisting issues
async function handleAutoFill() {
  if (!selectedResumeId) {
    showError('Please select a resume first');
    return;
  }

  try {
    console.log('🤖 Starting auto-fill...');
    
    // Update button state
    if (autoFillBtn) {
      autoFillBtn.disabled = true;
      autoFillBtn.innerHTML = `
        <div class="btn-spinner"></div>
        Auto-filling...
      `;
    }

    const response = await sendMessageToBackground({
      type: 'AUTO_FILL',
      resumeId: selectedResumeId,
      enhanceWithAI: false
    });

    if (response && response.success) {
      console.log('✅ Auto-fill completed successfully');
      // Show success feedback
      if (autoFillBtn) {
        autoFillBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
          Completed!
        `;
        setTimeout(() => {
          autoFillBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
            Start Auto-Fill
          `;
          autoFillBtn.disabled = false;
        }, 2000);
      }
    } else {
      throw new Error(response?.error || 'Auto-fill failed');
    }
  } catch (error) {
    console.error('❌ Auto-fill error:', error);
    showError('Auto-fill failed: ' + error.message);
    
    // Reset button state
    if (autoFillBtn) {
      autoFillBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>
        Start Auto-Fill
      `;
      autoFillBtn.disabled = false;
    }
  }
}

async function handleAIEnhance() {
  if (!selectedResumeId) {
    showError('Please select a resume first');
    return;
  }

  try {
    console.log('✨ Starting AI-enhanced auto-fill...');
    
    // Update button state
    if (enhanceBtn) {
      enhanceBtn.disabled = true;
      enhanceBtn.innerHTML = `
        <div class="btn-spinner"></div>
        AI Enhancing...
      `;
    }

    const response = await sendMessageToBackground({
      type: 'AUTO_FILL',
      resumeId: selectedResumeId,
      enhanceWithAI: true
    });

    if (response && response.success) {
      console.log('✅ AI-enhanced auto-fill completed successfully');
      // Show success feedback
      if (enhanceBtn) {
        enhanceBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
          Enhanced!
        `;
        setTimeout(() => {
          enhanceBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
            AI Enhance
          `;
          enhanceBtn.disabled = false;
        }, 2000);
      }
      
      // Refresh usage stats after AI enhancement
      await loadUsageStats();
    } else {
      throw new Error(response?.error || 'AI enhancement failed');
    }
  } catch (error) {
    console.error('❌ AI enhance error:', error);
    showError('AI enhancement failed: ' + error.message);
    
    // Reset button state
    if (enhanceBtn) {
      enhanceBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
        </svg>
        AI Enhance
      `;
      enhanceBtn.disabled = false;
    }
  }
}

// Utility functions
function sendMessageToBackground(message, timeout = 10000) {
  return new Promise((resolve, reject) => {
    try {
      console.log('📤 Sending message to background:', message.type);
      
      // Set up timeout
      const timeoutId = setTimeout(() => {
        console.error('⏰ Message timeout after', timeout, 'ms');
        reject(new Error(`Message timeout: ${message.type}`));
      }, timeout);
      
      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeoutId);
        
        // Check for Chrome runtime errors
        if (chrome.runtime.lastError) {
          console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        console.log('📥 Received response:', response);
        resolve(response);
      });
    } catch (error) {
      console.error('❌ Error sending message:', error);
      reject(error);
    }
  });
}

function setLoginLoading(loading) {
  if (loginBtn) {
    loginBtn.disabled = loading;
    const btnText = loginBtn.querySelector('.btn-text');
    const btnSpinner = loginBtn.querySelector('.btn-spinner');
    
    if (btnText) btnText.textContent = loading ? 'Signing In...' : 'Sign In';
    if (btnSpinner) btnSpinner.style.display = loading ? 'inline-block' : 'none';
  }
}

function showError(message) {
  if (loginError) {
    loginError.textContent = message;
    loginError.style.display = 'block';
  }
  console.error('🚨 Error:', message);
}

function hideError() {
  if (loginError) {
    loginError.style.display = 'none';
    loginError.textContent = '';
  }
}

function getPlanLimits(tier) {
  const limits = {
    free: {
      extensionAutoFills: 5,
      jobImports: 3,
      resumeTailoring: 1,
      recruiterUnlocks: 0,
      aiJobDiscovery: false,
      aiAssistant: false
    },
    casual: {
      extensionAutoFills: 25,
      jobImports: 25,
      resumeTailoring: 25,
      recruiterUnlocks: 25,
      aiJobDiscovery: 1,
      aiAssistant: false
    },
    hunter: {
      extensionAutoFills: 50,
      jobImports: -1, // unlimited
      resumeTailoring: 50,
      recruiterUnlocks: -1, // unlimited
      aiJobDiscovery: -1, // unlimited
      aiAssistant: true
    }
  };
  
  return limits[tier] || limits.free;
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  console.log('📱 Popup DOM loaded, initializing...');
  
  try {
    initializeElements();
    
    // Add fallback timeout for initialization
    const initTimeout = setTimeout(() => {
      console.warn('⚠️ Initialization timeout, showing login as fallback');
      showScreen('login');
    }, 8000); // 8 second timeout
    
    await checkAuthenticationStatus();
    
    clearTimeout(initTimeout);
  } catch (error) {
    console.error('❌ Popup initialization error:', error);
    showScreen('login');
    showError('Extension initialization failed');
  }
});

function initializeElements() {
  // Screens
  loadingScreen = document.getElementById('loading');
  loginScreen = document.getElementById('login');
  dashboardScreen = document.getElementById('dashboard');
  settingsScreen = document.getElementById('settings');

  // Login elements
  loginForm = document.getElementById('loginForm');
  emailInput = document.getElementById('email');
  passwordInput = document.getElementById('password');
  loginBtn = document.getElementById('loginBtn');
  loginError = document.getElementById('loginError');
  signupLink = document.getElementById('signupLink');

  // Dashboard elements
  userName = document.getElementById('userName');
  userPlan = document.getElementById('userPlan');
  usageCount = document.getElementById('usageCount');
  usageLimit = document.getElementById('usageLimit');
  progressFill = document.getElementById('progressFill');
  resumeSelect = document.getElementById('resumeSelect');
  atsStatusText = document.getElementById('atsStatusText');
  atsDescription = document.getElementById('atsDescription');
  atsIcon = document.getElementById('atsIcon');

  // Buttons
  logoutBtn = document.getElementById('logoutBtn');
  settingsBtn = document.getElementById('settingsBtn');
  backBtn = document.getElementById('backBtn');
  autoFillBtn = document.getElementById('autoFillBtn');
  enhanceBtn = document.getElementById('enhanceBtn');
  refreshResumes = document.getElementById('refreshResumes');

  // Event listeners
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => showScreen('settings'));
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => showScreen('dashboard'));
  }

  if (signupLink) {
    signupLink.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.tabs.create({
        url: 'https://app.auto-job.ai/register'
      });
    });
  }

  if (refreshResumes) {
    refreshResumes.addEventListener('click', loadResumes);
  }

  if (resumeSelect) {
    resumeSelect.addEventListener('change', async (e) => {
      selectedResumeId = e.target.value;
      if (selectedResumeId) {
        chrome.storage.local.set({ selectedResumeId });
        updateAutoFillButtons();
        
        // Notify content script about resume selection
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'RESUME_SELECTED',
              resumeId: selectedResumeId
            });
          }
        } catch (error) {
          console.log('Could not notify content script:', error);
        }
      }
    });
  }

  // Settings page buttons
  helpBtn = document.getElementById('helpBtn');
  feedbackBtn = document.getElementById('feedbackBtn');
  dashboardBtn = document.getElementById('dashboardBtn');

  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://docs.auto-job.ai'
      });
    });
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'mailto:support@auto-job.ai?subject=Chrome Extension Feedback'
      });
    });
  }

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      chrome.tabs.create({
        url: 'https://app.auto-job.ai'
      });
    });
  }

  // Auto-fill and AI enhance buttons
  if (autoFillBtn) {
    autoFillBtn.addEventListener('click', handleAutoFill);
  }

  if (enhanceBtn) {
    enhanceBtn.addEventListener('click', handleAIEnhance);
  }

  console.log('✅ Popup elements initialized');
}

// Screen management
function showScreen(screenName) {
  console.log('📱 Showing screen:', screenName);
  
  // Hide all screens
  const screens = ['loading', 'login', 'dashboard', 'settings'];
  screens.forEach(screen => {
    const element = document.getElementById(screen);
    if (element) {
      element.style.display = 'none';
    }
  });
  
  // Show target screen
  const targetScreen = document.getElementById(screenName);
  if (targetScreen) {
    targetScreen.style.display = 'block';
  }
  
  hideError();
}

async function checkAuthenticationStatus() {
  try {
    console.log('🔍 Checking authentication status...');
    
    const response = await sendMessageToBackground({
      type: 'CHECK_AUTH'
    });

    console.log('Auth check response:', response);

    if (response && response.success && response.authenticated) {
      console.log('✅ User is authenticated:', response.user.email);
      currentUser = response.user;
      isAuthenticated = true;
      await showDashboard();
    } else {
      console.log('ℹ️ User not authenticated, showing login');
      showScreen('login');
    }
  } catch (error) {
    console.error('❌ Error checking auth:', error);
    showScreen('login');
    showError('Unable to connect to extension service');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  try {
    console.log('🔐 Attempting login for:', email);
    setLoginLoading(true);
    hideError();

    const response = await sendMessageToBackground({
      type: 'LOGIN',
      credentials: { email, password }
    });

    console.log('Login response:', response);

    if (response && response.success) {
      console.log('✅ Login successful');
      
      // If user object is provided, use it
      if (response.user) {
        currentUser = response.user;
      } else {
        // Create a basic user object with the email from the form
        currentUser = {
          email: email,
          firstName: email.split('@')[0].split('.')[0] || 'User',
          lastName: email.split('@')[0].split('.')[1] || '',
          subscriptionTier: 'free' // Will be updated by loadUsageStats
        };
      }
      
      isAuthenticated = true;
      await showDashboard();
    } else {
      console.log('❌ Login failed:', response?.error);
      showError(response?.error || 'Login failed');
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    showError('Network error. Please try again.');
  } finally {
    setLoginLoading(false);
  }
}

async function handleLogout() {
  try {
    console.log('🚪 Logging out...');

    const response = await sendMessageToBackground({
      type: 'LOGOUT'
    });

    if (response && response.success) {
      console.log('✅ Logout successful');
      currentUser = null;
      isAuthenticated = false;
      userResumes = [];
      selectedResumeId = null;
      showScreen('login');
    } else {
      console.error('❌ Logout failed:', response?.error);
      showError('Logout failed');
    }
  } catch (error) {
    console.error('❌ Logout error:', error);
    showError('Error during logout');
  }
}

async function showDashboard() {
  try {
    console.log('📊 Loading dashboard...');
    
    showScreen('dashboard');
    
    // Update user info
    if (userName && currentUser) {
      userName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
    }

    // Load additional data first to get the most up-to-date user info
    await Promise.all([
      loadResumes(),
      loadUsageStats(),
      checkATSStatus()
    ]);

    console.log('✅ Dashboard loaded successfully');
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    showError('Error loading dashboard');
  }
}

async function loadResumes() {
  try {
    console.log('📄 Loading resumes...');
    
    const response = await sendMessageToBackground({
      type: 'FETCH_RESUMES'
    });

    if (response && response.success) {
      userResumes = response.resumes || [];
      updateResumeSelector();
      console.log('✅ Resumes loaded:', userResumes.length);
    } else {
      console.log('⚠️ Failed to load resumes:', response?.error);
      userResumes = [];
      updateResumeSelector();
    }
  } catch (error) {
    console.error('❌ Error loading resumes:', error);
    userResumes = [];
    updateResumeSelector();
  }
}

async function loadUsageStats() {
  try {
    console.log('📊 Loading usage stats...');
    
    const response = await sendMessageToBackground({
      type: 'UPDATE_USAGE'
    });

    if (response && response.success) {
      const usage = response.usage;
      const plan = response.plan;
      
      // Update plan information from the response
      if (plan && plan.tier) {
        console.log('📊 Plan info from usage response:', plan);
        
        // Update the plan display
        if (userPlan) {
          const planName = plan.tier;
          userPlan.textContent = planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan';
          userPlan.className = `plan-badge plan-${planName}`;
        }
        
        // Update currentUser with the correct plan info
        if (currentUser) {
          currentUser.subscriptionTier = plan.tier;
          currentUser.subscriptionStatus = plan.status;
        }
      }
      
      if (usage && usage.extensionAutoFills) {
        const used = usage.extensionAutoFills.used || 0;
        const limit = usage.extensionAutoFills.limit || 0;
        const unlimited = usage.extensionAutoFills.unlimited;
        
        if (usageCount) usageCount.textContent = used;
        if (usageLimit) usageLimit.textContent = unlimited ? '∞' : limit;
        
        if (progressFill && !unlimited && limit > 0) {
          const percentage = Math.min((used / limit) * 100, 100);
          progressFill.style.width = percentage + '%';
          
          // Add color coding based on usage level
          progressFill.classList.remove('warning', 'danger');
          if (percentage >= 90) {
            progressFill.classList.add('danger');
          } else if (percentage >= 70) {
            progressFill.classList.add('warning');
          }
        }
      }
    } else {
      // Fallback to basic info from currentUser
      if (currentUser) {
        console.log('📊 Using fallback plan info from currentUser:', currentUser.subscriptionTier);
        
        const planName = currentUser.subscriptionTier || 'free';
        if (userPlan) {
          userPlan.textContent = planName.charAt(0).toUpperCase() + planName.slice(1) + ' Plan';
          userPlan.className = `plan-badge plan-${planName}`;
        }
        
        const planLimits = getPlanLimits(planName);
        const used = currentUser.usage?.extensionAutoFills?.used || 0;
        
        if (usageCount) usageCount.textContent = used;
        if (usageLimit) usageLimit.textContent = planLimits.extensionAutoFills === -1 ? '∞' : planLimits.extensionAutoFills;
        
        if (progressFill && planLimits.extensionAutoFills > 0) {
          const percentage = Math.min((used / planLimits.extensionAutoFills) * 100, 100);
          progressFill.style.width = percentage + '%';
        }
      }
    }
  } catch (error) {
    console.error('❌ Error loading usage stats:', error);
    
    // Final fallback - show free plan
    if (userPlan) {
      userPlan.textContent = 'Free Plan';
      userPlan.className = 'plan-badge plan-free';
    }
  }
}

function updateResumeSelector() {
  if (!resumeSelect) return;

  // Clear existing options
  resumeSelect.innerHTML = '<option value="">📄 Select a resume...</option>';

  if (userResumes.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '📁 No resumes found - Upload one first';
    option.disabled = true;
    resumeSelect.appendChild(option);
    return;
  }

  // Add resume options with icons and truncated text
  userResumes.forEach(resume => {
    const option = document.createElement('option');
    option.value = resume.id || resume._id;
    
    // Add icon based on resume type
    const icon = resume.isTailored ? '✨' : '📄';
    const name = resume.name || 'Untitled Resume';
    
    // Truncate long names to fit in dropdown
    const maxLength = 45;
    const displayName = name.length > maxLength ? 
      name.substring(0, maxLength) + '...' : name;
    
    option.textContent = `${icon} ${displayName}`;
    option.title = name; // Full name on hover
    
    resumeSelect.appendChild(option);
  });

  // Restore selected resume
  chrome.storage.local.get(['selectedResumeId'], (result) => {
    if (result.selectedResumeId) {
      resumeSelect.value = result.selectedResumeId;
      selectedResumeId = result.selectedResumeId;
      updateAutoFillButtons();
    }
  });
}

async function checkATSStatus() {
  try {
    // Get current tab to check if it's an ATS site
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      const url = tab.url.toLowerCase();
      let atsDetected = null;
      
      // Check for ATS platforms
      if (url.includes('greenhouse.io') || url.includes('greenhouse')) {
        atsDetected = { name: 'Greenhouse', platform: 'GREENHOUSE' };
      } else if (url.includes('workday.com') || url.includes('myworkday.com')) {
        atsDetected = { name: 'Workday', platform: 'WORKDAY' };
      } else if (url.includes('lever.co')) {
        atsDetected = { name: 'Lever', platform: 'LEVER' };
      }
      
      if (atsDetected) {
        if (atsStatusText) atsStatusText.textContent = `${atsDetected.name} Detected`;
        if (atsDescription) atsDescription.textContent = '🚀 Ready for auto-fill';
        if (atsIcon) {
          atsIcon.style.color = '#34a853';
          // Add checkmark to the green circle
          atsIcon.innerHTML = `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9" fill="#34a853"></circle>
              <path d="M9 12l2 2 4-4" stroke="white" stroke-width="2.5"></path>
            </svg>
          `;
        }
        
        // Add detected class to status card
        const statusCard = document.getElementById('atsStatus');
        if (statusCard) {
          statusCard.classList.add('detected');
          statusCard.classList.remove('error');
        }
        
        updateAutoFillButtons(true);
      } else {
        if (atsStatusText) atsStatusText.textContent = '❌ No ATS Detected';
        if (atsDescription) atsDescription.textContent = '🔍 Visit a supported job site to enable auto-fill';
        if (atsIcon) atsIcon.style.color = '#5f6368';
        
        // Remove detected class from status card
        const statusCard = document.getElementById('atsStatus');
        if (statusCard) {
          statusCard.classList.remove('detected');
          statusCard.classList.remove('error');
        }
        
        updateAutoFillButtons(false);
      }
    }
  } catch (error) {
    console.error('❌ Error checking ATS status:', error);
  }
}

function updateAutoFillButtons(atsDetected = false) {
  const hasResume = !!selectedResumeId;
  const canAutoFill = hasResume && atsDetected;
  
  if (autoFillBtn) {
    autoFillBtn.disabled = !canAutoFill;
    autoFillBtn.textContent = canAutoFill ? 'Start Auto-Fill' : 
      !hasResume ? 'Select Resume First' : 'Visit ATS Site';
  }
  
  if (enhanceBtn) {
    enhanceBtn.disabled = !canAutoFill;
  }
}

console.log('✅ Auto-Job Extension Popup Script Loaded');
