// chrome-extension/src/content/content-main.js - Auto-Job Branded Implementation

console.log('🤖 Auto-Job Extension Content Script Loading...');

// State management
let isAuthenticated = false;
let selectedResumeId = null;
let currentATS = null;
let floatingButton = null;
let autoFillMenu = null;
let formFields = {};
let userResumes = [];

// Auto-Job Theme Configuration
const AUTOJOB_THEME = {
  colors: {
    primary: '#1a73e8',
    primaryLight: '#4285f4',
    primaryDark: '#0d47a1',
    secondary: '#00c4b4',
    success: '#34a853',
    warning: '#fbbc04',
    warningDark: '#f57c00',
    error: '#ea4335',
    info: '#4285f4',
    background: '#ffffff',
    backgroundLight: '#f5f7fa',
    textPrimary: '#202124',
    textSecondary: '#5f6368',
    textDisabled: '#9aa0a6',
    border: 'rgba(0, 0, 0, 0.12)',
    shadow: '0px 4px 8px rgba(0, 0, 0, 0.05)',
    shadowHover: '0px 6px 10px -1px rgba(0,0,0,0.1)',
    shadowButton: '0px 3px 5px -1px rgba(0,0,0,0.08)'
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      button: '14px',
      body: '14px',
      caption: '12px',
      small: '11px'
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px'
  },
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px'
  }
};

// AutoJob Robot Logo SVG Component
function createAutoJobRobotSVG(size = 20, colors = {}) {
  const defaultColors = {
    robotFill: '#e3f2fd',
    robotStroke: AUTOJOB_THEME.colors.primary,
    antennaColor: AUTOJOB_THEME.colors.success,
    eyeColor: AUTOJOB_THEME.colors.primary,
    mouthColor: AUTOJOB_THEME.colors.success,
    sidePanelColor: AUTOJOB_THEME.colors.warning
  };
  
  const finalColors = { ...defaultColors, ...colors };
  
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" style="display: block; vertical-align: middle;">
      <!-- Robot Head Background -->
      <rect x="8" y="12" width="48" height="40" rx="8" ry="8" 
            fill="${finalColors.robotFill}" 
            stroke="${finalColors.robotStroke}" 
            stroke-width="2"/>
      
      <!-- Antenna -->
      <circle cx="32" cy="8" r="2" fill="${finalColors.antennaColor}"/>
      <line x1="32" y1="10" x2="32" y2="12" 
            stroke="${finalColors.antennaColor}" 
            stroke-width="2"/>
      
      <!-- Eyes -->
      <circle cx="22" cy="26" r="4" fill="#ffffff"/>
      <circle cx="42" cy="26" r="4" fill="#ffffff"/>
      <circle cx="22" cy="26" r="2" fill="${finalColors.eyeColor}"/>
      <circle cx="42" cy="26" r="2" fill="${finalColors.eyeColor}"/>
      
      <!-- Mouth -->
      <rect x="26" y="36" width="12" height="6" rx="3" ry="3" 
            fill="${finalColors.mouthColor}"/>
      <rect x="28" y="38" width="2" height="2" fill="#ffffff"/>
      <rect x="32" y="38" width="2" height="2" fill="#ffffff"/>
      <rect x="36" y="38" width="2" height="2" fill="#ffffff"/>
      
      <!-- Side panels -->
      <rect x="4" y="20" width="6" height="16" rx="3" ry="3" 
            fill="${finalColors.sidePanelColor}"/>
      <rect x="54" y="20" width="6" height="16" rx="3" ry="3" 
            fill="${finalColors.sidePanelColor}"/>
    </svg>
  `;
}

// Create styled button with AutoJob theme
function createStyledButton(text, type = 'primary', size = 'medium') {
  const buttonStyles = {
    primary: {
      background: `linear-gradient(135deg, ${AUTOJOB_THEME.colors.primary} 0%, ${AUTOJOB_THEME.colors.primaryLight} 100%)`,
      color: '#ffffff',
      boxShadow: `0px 3px 5px -1px rgba(26, 115, 232, 0.2)`,
      hoverShadow: `0px 6px 10px -1px rgba(26, 115, 232, 0.3)`
    },
    success: {
      background: AUTOJOB_THEME.colors.success,
      color: '#ffffff',
      boxShadow: `0px 3px 5px -1px rgba(52, 168, 83, 0.2)`,
      hoverShadow: `0px 6px 10px -1px rgba(52, 168, 83, 0.3)`
    },
    warning: {
      background: `linear-gradient(135deg, ${AUTOJOB_THEME.colors.warningDark} 0%, ${AUTOJOB_THEME.colors.warning} 100%)`,
      color: '#ffffff',
      boxShadow: `0px 3px 5px -1px rgba(245, 124, 0, 0.2)`,
      hoverShadow: `0px 6px 10px -1px rgba(245, 124, 0, 0.3)`
    },
    secondary: {
      background: AUTOJOB_THEME.colors.backgroundLight,
      color: AUTOJOB_THEME.colors.textSecondary,
      border: `1px solid ${AUTOJOB_THEME.colors.border}`,
      boxShadow: 'none',
      hoverShadow: AUTOJOB_THEME.colors.shadow
    }
  };
  
  const style = buttonStyles[type] || buttonStyles.primary;
  const padding = size === 'large' ? `${AUTOJOB_THEME.spacing.md} ${AUTOJOB_THEME.spacing.lg}` : 
                  size === 'small' ? `${AUTOJOB_THEME.spacing.sm} ${AUTOJOB_THEME.spacing.md}` :
                  `${AUTOJOB_THEME.spacing.sm} ${AUTOJOB_THEME.spacing.lg}`;
  
  return `
    background: ${style.background};
    color: ${style.color};
    border: ${style.border || 'none'};
    padding: ${padding};
    border-radius: ${AUTOJOB_THEME.borderRadius.md};
    font-family: ${AUTOJOB_THEME.typography.fontFamily};
    font-size: ${AUTOJOB_THEME.typography.fontSize.button};
    font-weight: ${AUTOJOB_THEME.typography.fontWeight.semibold};
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: ${style.boxShadow};
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${AUTOJOB_THEME.spacing.sm};
    text-decoration: none;
    outline: none;
  `;
}

// ATS Detection patterns
const ATS_PATTERNS = {
  GREENHOUSE: {
    name: 'Greenhouse',
    patterns: ['greenhouse.io', 'greenhouse'],
    selectors: {
      form: 'form[id*="application"], form.application-form, form[action*="application"], form',
      firstName: 'input[name*="first_name"], input[id*="first_name"], input[placeholder*="First"], input[name="first_name"]',
      lastName: 'input[name*="last_name"], input[id*="last_name"], input[placeholder*="Last"], input[name="last_name"]',
      email: 'input[type="email"], input[name*="email"], input[id*="email"]',
      phone: 'input[type="tel"], input[name*="phone"], input[id*="phone"], input[placeholder*="Phone"]',
      resume: 'input[type="file"]',
      coverLetter: 'textarea[name*="cover"], textarea[id*="cover"], textarea[placeholder*="cover"]',
      questions: 'textarea:not([name*="cover"]):not([id*="cover"])',
      dropdowns: 'select',
      checkboxes: 'input[type="checkbox"]',
      radioButtons: 'input[type="radio"]'
    }
  },
  WORKDAY: {
    name: 'Workday',
    patterns: ['workday.com', 'myworkday.com', 'workday'],
    selectors: {
      form: 'form, [data-automation-id*="form"], .css-1dbjc4n',
      firstName: 'input[data-automation-id*="firstName"], input[data-automation-id*="first"], input[aria-label*="First"], input[placeholder*="First"]',
      lastName: 'input[data-automation-id*="lastName"], input[data-automation-id*="last"], input[aria-label*="Last"], input[placeholder*="Last"]',
      email: 'input[type="email"], input[data-automation-id*="email"], input[aria-label*="Email"]',
      phone: 'input[type="tel"], input[data-automation-id*="phone"], input[aria-label*="Phone"]',
      resume: 'input[type="file"], input[data-automation-id*="resume"], input[data-automation-id*="upload"]',
      coverLetter: 'textarea[data-automation-id*="cover"], textarea[aria-label*="cover"], textarea[placeholder*="cover"]',
      questions: 'textarea[data-automation-id*="question"], textarea[aria-label*="question"]',
      dropdowns: 'select, [data-automation-id*="dropdown"], [role="combobox"]',
      checkboxes: 'input[type="checkbox"], [data-automation-id*="checkbox"]',
      radioButtons: 'input[type="radio"], [data-automation-id*="radio"]'
    }
  },
  LEVER: {
    name: 'Lever',
    patterns: ['lever.co', 'jobs.lever.co'],
    selectors: {
      form: 'form.application-form, form[class*="application"], .application-form',
      firstName: 'input[name="name"], input[placeholder*="First"], input[name*="first"]',
      lastName: 'input[name="name"], input[placeholder*="Last"], input[name*="last"]',
      email: 'input[type="email"], input[name="email"]',
      phone: 'input[type="tel"], input[name="phone"]',
      resume: 'input[type="file"][name*="resume"], input[type="file"]',
      coverLetter: 'textarea[name*="cover"], textarea[placeholder*="cover"]',
      questions: 'textarea[name*="additional"], textarea[name*="question"]',
      dropdowns: 'select',
      checkboxes: 'input[type="checkbox"]',
      radioButtons: 'input[type="radio"]'
    }
  }
};

// Initialize content script
(function initialize() {
  try {
    console.log('🚀 Initializing Auto-Job content script...');
    
    // Check if we're on an ATS platform
    currentATS = detectATS();
    
    if (currentATS) {
      console.log(`✅ ATS Detected: ${currentATS.name}`);
      
      // Send message to background script
      chrome.runtime.sendMessage({
        type: 'ATS_DETECTED',
        data: currentATS
      });
      
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeATS);
      } else {
        initializeATS();
      }
      
      // Also listen for dynamic content changes
      observeFormChanges();
    } else {
      console.log('ℹ️ No supported ATS detected on this page');
    }
  } catch (error) {
    console.error('❌ Error initializing content script:', error);
  }
})();

// Listen for messages from background script and storage changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type);
  
  switch (message.type) {
    case 'ATS_PLATFORM_DETECTED':
      console.log('ATS platform detected message received');
      sendResponse({ success: true });
      break;
    case 'RESUME_SELECTED':
      console.log('Resume selected:', message.resumeId);
      selectedResumeId = message.resumeId;
      updateFloatingButtonState();
      sendResponse({ success: true });
      break;
    case 'USER_AUTHENTICATED':
      console.log('User authenticated, reinitializing...');
      console.log('🔍 DEBUG: USER_AUTHENTICATED message received');
      isAuthenticated = true;
      if (currentATS) {
        initializeATS();
      } else {
        console.log('🔍 DEBUG: No ATS detected, cannot initialize');
      }
      sendResponse({ success: true });
      break;
    default:
      console.log('Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
});

// Listen for storage changes (resume selection)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.selectedResumeId) {
    console.log('Resume selection changed:', changes.selectedResumeId.newValue);
    selectedResumeId = changes.selectedResumeId.newValue;
    updateFloatingButtonState();
  }
});

// Detect ATS platform
function detectATS() {
  const currentURL = window.location.href.toLowerCase();
  const currentDomain = window.location.hostname.toLowerCase();
  
  for (const [key, ats] of Object.entries(ATS_PATTERNS)) {
    for (const pattern of ats.patterns) {
      if (currentURL.includes(pattern) || currentDomain.includes(pattern)) {
        return {
          platform: key,
          name: ats.name,
          selectors: ats.selectors,
          url: currentURL
        };
      }
    }
  }
  
  return null;
}

// Initialize ATS-specific functionality
async function initializeATS() {
  try {
    console.log(`🎯 Initializing ${currentATS.name} integration...`);
    
    // Check authentication status
    const authStatus = await checkAuthenticationStatus();
    if (!authStatus || !authStatus.authenticated) {
      console.log('❌ User not authenticated, skipping ATS initialization');
      return;
    }
    
    isAuthenticated = true;
    
    // Load selected resume and user resumes
    await loadUserData();
    
    // Analyze forms on the page
    analyzeFormsOnPage();
    
    // Create floating action button
    createFloatingButton();
    
    console.log('✅ ATS integration initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing ATS:', error);
  }
}

// Check authentication with background script
function checkAuthenticationStatus() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CHECK_AUTH' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Auth check error:', chrome.runtime.lastError);
        resolve({ authenticated: false });
        return;
      }
      resolve(response || { authenticated: false });
    });
  });
}

// Load user data (resumes and selected resume)
async function loadUserData() {
  try {
    // Get selected resume ID from storage
    const result = await chrome.storage.local.get(['selectedResumeId']);
    selectedResumeId = result.selectedResumeId;
    
    // Get user resumes
    const resumesResponse = await sendMessageToBackground({ type: 'FETCH_RESUMES' });
    if (resumesResponse && resumesResponse.success) {
      userResumes = resumesResponse.resumes || [];
      console.log('📄 Loaded resumes:', userResumes.length);
    }
  } catch (error) {
    console.error('❌ Error loading user data:', error);
  }
}

// Send message to background script
function sendMessageToBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Message error:', chrome.runtime.lastError);
        resolve({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response);
    });
  });
}

// Analyze forms on the current page
function analyzeFormsOnPage() {
  try {
    console.log('🔍 Analyzing forms on page...');
    
    const forms = document.querySelectorAll('form');
    console.log(`Found ${forms.length} forms`);
    
    if (forms.length === 0) {
      console.log('⚠️ No forms found on page');
      return;
    }
    
    // Use the first form (most job applications have one main form)
    const applicationForm = forms[0];
    console.log('✅ Using application form:', applicationForm);
    
    analyzeFormFields(applicationForm);
    
  } catch (error) {
    console.error('❌ Error analyzing forms:', error);
  }
}

// Analyze individual form fields
function analyzeFormFields(form) {
  formFields = {};
  
  const selectors = currentATS.selectors;
  
  // Map common fields
  const fieldMappings = {
    firstName: { selector: selectors.firstName, type: 'text', fieldType: 'firstName' },
    lastName: { selector: selectors.lastName, type: 'text', fieldType: 'lastName' },
    email: { selector: selectors.email, type: 'email', fieldType: 'email' },
    phone: { selector: selectors.phone, type: 'tel', fieldType: 'phone' }
  };
  
  // Find basic fields
  for (const [fieldName, config] of Object.entries(fieldMappings)) {
    const elements = form.querySelectorAll(config.selector);
    if (elements.length > 0) {
      const element = elements[0]; // Take first match
      formFields[fieldName] = {
        element: element,
        type: config.type,
        fieldType: config.fieldType,
        selector: config.selector
      };
      
      console.log(`📝 Found ${fieldName} field:`, element);
    }
  }
  
  // Find cover letter fields
  const coverLetterElements = form.querySelectorAll(selectors.coverLetter);
  if (coverLetterElements.length > 0) {
    formFields.coverLetter = {
      element: coverLetterElements[0],
      type: 'textarea',
      fieldType: 'coverLetter',
      selector: selectors.coverLetter,
      enhanceWithAI: true,
      isQuestion: true
    };
    console.log('📝 Found cover letter field:', coverLetterElements[0]);
  }
  
  // Find question/essay fields
  const questionElements = form.querySelectorAll(selectors.questions);
  questionElements.forEach((element, index) => {
    if (!formFields.coverLetter || element !== formFields.coverLetter.element) {
      const fieldName = `question_${index + 1}`;
      formFields[fieldName] = {
        element: element,
        type: 'textarea',
        fieldType: 'question',
        selector: selectors.questions,
        enhanceWithAI: true,
        isQuestion: true,
        question: getQuestionText(element)
      };
      console.log(`📝 Found question field ${index + 1}:`, element);
    }
  });
  
  // Find dropdown fields
  const dropdownElements = form.querySelectorAll(selectors.dropdowns);
  dropdownElements.forEach((element, index) => {
    const fieldName = `dropdown_${index + 1}`;
    formFields[fieldName] = {
      element: element,
      type: 'select',
      fieldType: 'dropdown',
      selector: selectors.dropdowns,
      options: getDropdownOptions(element)
    };
    console.log(`📝 Found dropdown field ${index + 1}:`, element);
  });
  
  // Find checkbox fields
  const checkboxElements = form.querySelectorAll(selectors.checkboxes);
  checkboxElements.forEach((element, index) => {
    const fieldName = `checkbox_${index + 1}`;
    formFields[fieldName] = {
      element: element,
      type: 'checkbox',
      fieldType: 'checkbox',
      selector: selectors.checkboxes,
      label: getFieldLabel(element)
    };
    console.log(`📝 Found checkbox field ${index + 1}:`, element);
  });
  
  // Find file upload fields
  const fileElements = form.querySelectorAll(selectors.resume);
  if (fileElements.length > 0) {
    formFields.resume = {
      element: fileElements[0],
      type: 'file',
      fieldType: 'resume',
      selector: selectors.resume
    };
    console.log('📝 Found resume upload field:', fileElements[0]);
  }
  
  console.log(`✅ Analyzed ${Object.keys(formFields).length} form fields`);
}

// Create floating action button with AutoJob branding
function createFloatingButton() {
  try {
    // Remove existing button if present
    if (floatingButton) {
      floatingButton.remove();
    }
    
    // Only show button if user is authenticated
    if (!isAuthenticated) {
      console.log('⚠️ User not authenticated, not showing floating button');
      return;
    }
    
    floatingButton = document.createElement('div');
    
    // Determine button state and styling
    const hasResume = !!selectedResumeId;
    const buttonType = hasResume ? 'primary' : 'warning';
    const buttonText = hasResume ? 'Auto-Fill' : 'Select Resume';
    
    // Create robot logo with AutoJob brand colors (same as main application)
    const robotColors = {
      robotFill: '#e3f2fd',
      robotStroke: AUTOJOB_THEME.colors.primary,
      antennaColor: AUTOJOB_THEME.colors.success,
      eyeColor: AUTOJOB_THEME.colors.primary,
      mouthColor: AUTOJOB_THEME.colors.success,
      sidePanelColor: AUTOJOB_THEME.colors.warning
    };
    
    // Apply AutoJob theme styling
    floatingButton.style.cssText = `
      position: fixed;
      bottom: ${AUTOJOB_THEME.spacing.xl};
      right: ${AUTOJOB_THEME.spacing.xl};
      z-index: 10000;
      ${createStyledButton(buttonText, buttonType, 'medium')}
      min-width: 140px;
    `;
    
    // Set button content with AutoJob robot logo
    floatingButton.innerHTML = `
      ${createAutoJobRobotSVG(20, robotColors)}
      <span>${buttonText}</span>
    `;
    
    // Add event listeners with AutoJob theme hover effects
    floatingButton.addEventListener('click', hasResume ? showAutoFillMenu : promptResumeSelection);
    
    floatingButton.addEventListener('mouseover', () => {
      floatingButton.style.transform = 'translateY(-2px)';
      floatingButton.style.boxShadow = hasResume ? 
        '0px 8px 16px rgba(26, 115, 232, 0.3)' : 
        '0px 8px 16px rgba(245, 124, 0, 0.3)';
    });
    
    floatingButton.addEventListener('mouseout', () => {
      floatingButton.style.transform = 'translateY(0)';
      floatingButton.style.boxShadow = hasResume ? 
        '0px 3px 5px -1px rgba(26, 115, 232, 0.2)' : 
        '0px 3px 5px -1px rgba(245, 124, 0, 0.2)';
    });
    
    // Add focus styles for accessibility
    floatingButton.addEventListener('focus', () => {
      floatingButton.style.outline = `2px solid ${AUTOJOB_THEME.colors.primary}`;
      floatingButton.style.outlineOffset = '2px';
    });
    
    floatingButton.addEventListener('blur', () => {
      floatingButton.style.outline = 'none';
    });
    
    // Make button focusable
    floatingButton.setAttribute('tabindex', '0');
    floatingButton.setAttribute('role', 'button');
    floatingButton.setAttribute('aria-label', hasResume ? 'Open auto-fill menu' : 'Select a resume first');
    
    document.body.appendChild(floatingButton);
    console.log(`✅ AutoJob floating button created (Resume selected: ${hasResume})`);
  } catch (error) {
    console.error('❌ Error creating floating button:', error);
  }
}

// Update floating button state when resume selection changes
function updateFloatingButtonState() {
  if (floatingButton && isAuthenticated && currentATS) {
    console.log('🔄 Updating floating button state...');
    createFloatingButton(); // Recreate with updated state
  }
}

// Prompt user to select a resume
function promptResumeSelection() {
  showNotification('Please select a resume in the extension popup first', 'info');
  
  // Try to open the extension popup (this may not work due to browser restrictions)
  try {
    chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
  } catch (error) {
    console.log('Could not open popup programmatically');
  }
}

// Show auto-fill menu with AutoJob branding
function showAutoFillMenu() {
  try {
    // Remove existing menu
    if (autoFillMenu) {
      autoFillMenu.remove();
    }
    
    const fieldCount = Object.keys(formFields).length;
    
    autoFillMenu = document.createElement('div');
    autoFillMenu.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: ${AUTOJOB_THEME.spacing.xl};
      z-index: 10001;
      background: ${AUTOJOB_THEME.colors.background};
      border-radius: ${AUTOJOB_THEME.borderRadius.lg};
      box-shadow: ${AUTOJOB_THEME.colors.shadow};
      padding: ${AUTOJOB_THEME.spacing.xl};
      min-width: 320px;
      font-family: ${AUTOJOB_THEME.typography.fontFamily};
      border: 1px solid ${AUTOJOB_THEME.colors.border};
      animation: slideUp 0.3s ease-out;
    `;
    
    // Add CSS animation
    if (!document.getElementById('autojob-animations')) {
      const style = document.createElement('style');
      style.id = 'autojob-animations';
      style.textContent = `
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Create menu content with AutoJob branding
    autoFillMenu.innerHTML = `
      <div style="margin-bottom: ${AUTOJOB_THEME.spacing.lg};">
        <div style="display: flex; align-items: center; gap: ${AUTOJOB_THEME.spacing.sm}; margin-bottom: ${AUTOJOB_THEME.spacing.sm};">
          ${createAutoJobRobotSVG(24, {
            robotStroke: AUTOJOB_THEME.colors.primary,
            antennaColor: AUTOJOB_THEME.colors.success,
            eyeColor: AUTOJOB_THEME.colors.primary,
            mouthColor: AUTOJOB_THEME.colors.success,
            sidePanelColor: AUTOJOB_THEME.colors.warning
          })}
          <h3 style="
            margin: 0; 
            font-size: 16px; 
            font-weight: ${AUTOJOB_THEME.typography.fontWeight.semibold}; 
            color: ${AUTOJOB_THEME.colors.textPrimary};
            font-family: ${AUTOJOB_THEME.typography.fontFamily};
          ">
            Auto-Fill Options
          </h3>
        </div>
        <p style="
          margin: 0; 
          font-size: ${AUTOJOB_THEME.typography.fontSize.caption}; 
          color: ${AUTOJOB_THEME.colors.textSecondary};
          font-family: ${AUTOJOB_THEME.typography.fontFamily};
        ">
          ${fieldCount} fields detected • ${currentATS.name}
        </p>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: ${AUTOJOB_THEME.spacing.sm};">
        <button class="auto-fill-basic-btn" style="${createStyledButton('Auto-Fill', 'success')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
          <span>Auto-Fill</span>
        </button>
        
        <button class="auto-fill-ai-btn" style="${createStyledButton('AI Enhance', 'primary')}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
          <span>AI Enhance</span>
        </button>
        
        <button class="close-menu-btn" style="${createStyledButton('Cancel', 'secondary')}">
          <span>Cancel</span>
        </button>
      </div>
      
      ${!selectedResumeId ? `
        <div style="
          margin-top: ${AUTOJOB_THEME.spacing.md}; 
          padding: ${AUTOJOB_THEME.spacing.sm}; 
          background: #fff3cd; 
          border-radius: ${AUTOJOB_THEME.borderRadius.sm}; 
          font-size: ${AUTOJOB_THEME.typography.fontSize.caption}; 
          color: #856404;
          font-family: ${AUTOJOB_THEME.typography.fontFamily};
          border: 1px solid #ffeaa7;
        ">
          <div style="display: flex; align-items: center; gap: ${AUTOJOB_THEME.spacing.xs};">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>No resume selected. Please select a resume in the popup first.</span>
          </div>
        </div>
      ` : ''}
      
      <div style="
        margin-top: ${AUTOJOB_THEME.spacing.md}; 
        padding-top: ${AUTOJOB_THEME.spacing.md}; 
        border-top: 1px solid ${AUTOJOB_THEME.colors.border};
        text-align: center;
      ">
        <span style="
          font-size: ${AUTOJOB_THEME.typography.fontSize.small}; 
          color: ${AUTOJOB_THEME.colors.textSecondary};
          font-family: ${AUTOJOB_THEME.typography.fontFamily};
          font-weight: ${AUTOJOB_THEME.typography.fontWeight.medium};
        ">
          Powered by auto-job.ai
        </span>
      </div>
    `;
    
    // Add event listeners with hover effects
    const basicBtn = autoFillMenu.querySelector('.auto-fill-basic-btn');
    const aiBtn = autoFillMenu.querySelector('.auto-fill-ai-btn');
    const closeBtn = autoFillMenu.querySelector('.close-menu-btn');
    
    // Auto-fill button
    basicBtn.addEventListener('click', () => startAutoFill(false));
    basicBtn.addEventListener('mouseover', () => {
      basicBtn.style.transform = 'translateY(-1px)';
      basicBtn.style.boxShadow = '0px 6px 10px -1px rgba(52, 168, 83, 0.3)';
    });
    basicBtn.addEventListener('mouseout', () => {
      basicBtn.style.transform = 'translateY(0)';
      basicBtn.style.boxShadow = '0px 3px 5px -1px rgba(52, 168, 83, 0.2)';
    });
    
    // AI enhance button
    aiBtn.addEventListener('click', () => startAutoFill(true));
    aiBtn.addEventListener('mouseover', () => {
      aiBtn.style.transform = 'translateY(-1px)';
      aiBtn.style.boxShadow = '0px 6px 10px -1px rgba(26, 115, 232, 0.3)';
    });
    aiBtn.addEventListener('mouseout', () => {
      aiBtn.style.transform = 'translateY(0)';
      aiBtn.style.boxShadow = '0px 3px 5px -1px rgba(26, 115, 232, 0.2)';
    });
    
    // Close button
    closeBtn.addEventListener('click', () => {
      autoFillMenu.remove();
      autoFillMenu = null;
    });
    closeBtn.addEventListener('mouseover', () => {
      closeBtn.style.transform = 'translateY(-1px)';
      closeBtn.style.boxShadow = AUTOJOB_THEME.colors.shadow;
    });
    closeBtn.addEventListener('mouseout', () => {
      closeBtn.style.transform = 'translateY(0)';
      closeBtn.style.boxShadow = 'none';
    });
    
    document.body.appendChild(autoFillMenu);
    
    // Auto-close after 15 seconds
    setTimeout(() => {
      if (autoFillMenu) {
        autoFillMenu.remove();
        autoFillMenu = null;
      }
    }, 15000);
    
  } catch (error) {
    console.error('❌ Error showing auto-fill menu:', error);
  }
}

// Start auto-fill process
async function startAutoFill(useAI = false) {
  try {
    console.log(`🚀 Starting auto-fill (AI: ${useAI})...`);
    
    // Close menu
    if (autoFillMenu) {
      autoFillMenu.remove();
      autoFillMenu = null;
    }
    
    if (!selectedResumeId) {
      showNotification('Please select a resume in the extension popup first', 'error');
      return;
    }
    
    // Show loading notification
    showNotification('🤖 Processing auto-fill...', 'info');
    
    if (useAI) {
      // Use AI-enhanced auto-fill via backend API
      await performAIEnhancedAutoFill();
    } else {
      // Use basic auto-fill with resume data
      await performBasicAutoFill();
    }
    
    // Show success notification
    showNotification('✅ Auto-fill completed!', 'success');
    
  } catch (error) {
    console.error('❌ Error starting auto-fill:', error);
    showNotification('❌ Auto-fill failed', 'error');
  }
}

// Perform basic auto-fill with resume data
async function performBasicAutoFill() {
  try {
    // Find the selected resume
    const selectedResume = userResumes.find(resume => resume.id === selectedResumeId);
    if (!selectedResume) {
      throw new Error('Selected resume not found');
    }
    
    console.log('📄 Using resume:', selectedResume.name);
    
    const resumeData = selectedResume.data || {};
    let filledCount = 0;
    
    // Fill form fields with resume data
    for (const [fieldName, fieldInfo] of Object.entries(formFields)) {
      if (fieldInfo.element) {
        let value = '';
        
        // Extract data based on field type
        switch (fieldInfo.fieldType) {
          case 'firstName':
            value = resumeData.personalInfo?.firstName || 
                   resumeData.contact?.firstName || 
                   'Jordan'; // Fallback
            break;
          case 'lastName':
            value = resumeData.personalInfo?.lastName || 
                   resumeData.contact?.lastName || 
                   'Test'; // Fallback
            break;
          case 'email':
            value = resumeData.personalInfo?.email || 
                   resumeData.contact?.email || 
                   'jordforrester@gmail.com'; // Fallback
            break;
          case 'phone':
            value = resumeData.personalInfo?.phone || 
                   resumeData.contact?.phone || 
                   '5402088426'; // Fallback
            break;
        }
        
        if (value) {
          // Fill the field
          fieldInfo.element.value = value;
          
          // Trigger events to ensure the form recognizes the change
          fieldInfo.element.dispatchEvent(new Event('input', { bubbles: true }));
          fieldInfo.element.dispatchEvent(new Event('change', { bubbles: true }));
          fieldInfo.element.dispatchEvent(new Event('blur', { bubbles: true }));
          
          // Visual feedback with AutoJob theme colors
          fieldInfo.element.style.backgroundColor = '#e8f5e8';
          fieldInfo.element.style.border = `2px solid ${AUTOJOB_THEME.colors.success}`;
          
          filledCount++;
          console.log(`✅ Filled ${fieldName}: ${value}`);
        }
      }
    }
    
    console.log(`✅ Auto-fill completed: ${filledCount} fields filled`);
    return filledCount;
    
  } catch (error) {
    console.error('❌ Error performing auto-fill:', error);
    throw error;
  }
}

// Show notification with AutoJob theme
function showNotification(message, type = 'info') {
  try {
    const notification = document.createElement('div');
    
    // Determine colors based on type
    let backgroundColor, textColor, iconSvg;
    switch (type) {
      case 'success':
        backgroundColor = AUTOJOB_THEME.colors.success;
        textColor = '#ffffff';
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"></path>
        </svg>`;
        break;
      case 'error':
        backgroundColor = AUTOJOB_THEME.colors.error;
        textColor = '#ffffff';
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`;
        break;
      case 'warning':
        backgroundColor = AUTOJOB_THEME.colors.warning;
        textColor = '#ffffff';
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>`;
        break;
      default:
        backgroundColor = AUTOJOB_THEME.colors.info;
        textColor = '#ffffff';
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>`;
    }
    
    notification.style.cssText = `
      position: fixed;
      top: ${AUTOJOB_THEME.spacing.xl};
      right: ${AUTOJOB_THEME.spacing.xl};
      z-index: 10002;
      background: ${backgroundColor};
      color: ${textColor};
      padding: ${AUTOJOB_THEME.spacing.md} ${AUTOJOB_THEME.spacing.lg};
      border-radius: ${AUTOJOB_THEME.borderRadius.md};
      font-family: ${AUTOJOB_THEME.typography.fontFamily};
      font-size: ${AUTOJOB_THEME.typography.fontSize.body};
      font-weight: ${AUTOJOB_THEME.typography.fontWeight.medium};
      max-width: 320px;
      box-shadow: ${AUTOJOB_THEME.colors.shadow};
      display: flex;
      align-items: center;
      gap: ${AUTOJOB_THEME.spacing.sm};
      animation: slideInRight 0.3s ease-out;
    `;
    
    // Add animation styles if not already present
    if (!document.getElementById('autojob-notification-animations')) {
      const style = document.createElement('style');
      style.id = 'autojob-notification-animations';
      style.textContent = `
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    notification.innerHTML = `
      ${iconSvg}
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 4 seconds with animation
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 4000);
    
  } catch (error) {
    console.error('❌ Error showing notification:', error);
  }
}

// Observe form changes for dynamic content
function observeFormChanges() {
  const observer = new MutationObserver((mutations) => {
    let shouldReanalyze = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (node.tagName === 'FORM' || node.querySelector('form'))) {
            shouldReanalyze = true;
          }
        });
      }
    });
    
    if (shouldReanalyze) {
      console.log('🔄 Form changes detected, re-analyzing...');
      setTimeout(() => {
        analyzeFormsOnPage();
      }, 1000);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Helper function to extract question text from form elements
function getQuestionText(element) {
  try {
    // Look for associated label
    const label = element.labels?.[0] || 
                 document.querySelector(`label[for="${element.id}"]`) ||
                 element.closest('div, fieldset')?.querySelector('label, legend, h3, h4, p');
    
    if (label) {
      return label.textContent.trim();
    }
    
    // Look for placeholder text
    if (element.placeholder) {
      return element.placeholder;
    }
    
    // Look for nearby text content
    const parent = element.parentElement;
    if (parent) {
      const textNodes = Array.from(parent.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
        .map(node => node.textContent.trim());
      
      if (textNodes.length > 0) {
        return textNodes[0];
      }
    }
    
    return 'Please provide additional information';
  } catch (error) {
    console.error('Error extracting question text:', error);
    return 'Please provide additional information';
  }
}

// Helper function to get dropdown options
function getDropdownOptions(element) {
  try {
    const options = [];
    
    if (element.tagName === 'SELECT') {
      Array.from(element.options).forEach(option => {
        if (option.value && option.value !== '') {
          options.push({
            value: option.value,
            text: option.textContent.trim()
          });
        }
      });
    }
    
    return options;
  } catch (error) {
    console.error('Error extracting dropdown options:', error);
    return [];
  }
}

// Helper function to get field label
function getFieldLabel(element) {
  try {
    // Look for associated label
    const label = element.labels?.[0] || 
                 document.querySelector(`label[for="${element.id}"]`) ||
                 element.closest('div, fieldset')?.querySelector('label');
    
    if (label) {
      return label.textContent.trim();
    }
    
    // Look for nearby text
    const parent = element.parentElement;
    if (parent) {
      const textContent = parent.textContent.trim();
      if (textContent) {
        return textContent;
      }
    }
    
    return element.name || element.id || 'Unknown field';
  } catch (error) {
    console.error('Error extracting field label:', error);
    return 'Unknown field';
  }
}

// Extract job description from the page
function extractJobDescription() {
  try {
    // Common selectors for job descriptions
    const jobDescSelectors = [
      '.job-description',
      '.job-details',
      '.description',
      '[class*="description"]',
      '[class*="job-detail"]',
      '.content',
      'main',
      '.posting-requirements',
      '.job-posting'
    ];
    
    for (const selector of jobDescSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim().length > 100) {
        return element.textContent.trim();
      }
    }
    
    // Fallback: get all text content from main content area
    const mainContent = document.querySelector('main') || document.body;
    const textContent = mainContent.textContent.trim();
    
    // Return first 2000 characters to avoid too much data
    return textContent.substring(0, 2000);
  } catch (error) {
    console.error('Error extracting job description:', error);
    return '';
  }
}

// Perform AI-enhanced auto-fill via backend API
async function performAIEnhancedAutoFill() {
  try {
    console.log('🤖 Starting AI-enhanced auto-fill...');
    
    // Extract job description from the page
    const jobDescription = extractJobDescription();
    
    // Prepare form fields data for API
    const formFieldsData = {};
    for (const [fieldName, fieldInfo] of Object.entries(formFields)) {
      formFieldsData[fieldName] = {
        type: fieldInfo.type,
        fieldType: fieldInfo.fieldType,
        enhanceWithAI: fieldInfo.enhanceWithAI || false,
        isQuestion: fieldInfo.isQuestion || false,
        question: fieldInfo.question || '',
        options: fieldInfo.options || [],
        label: fieldInfo.label || ''
      };
    }
    
    // Call backend API for AI-enhanced auto-fill
    const response = await sendMessageToBackground({
      type: 'START_AUTO_FILL',
      data: {
        formFields: formFieldsData,
        jobDescription: jobDescription,
        resumeId: selectedResumeId,
        atsPlatform: currentATS.platform,
        enhanceWithAI: true
      }
    });
    
    if (response && response.success) {
      console.log('✅ AI enhancement successful, filling fields...');
      
      // Fill the form with AI-enhanced data
      let filledCount = 0;
      const filledData = response.filledData || {};
      const enhancedFields = response.enhancedFields || [];
      
      for (const [fieldName, fieldInfo] of Object.entries(formFields)) {
        if (fieldInfo.element && filledData[fieldName]) {
          const value = filledData[fieldName];
          
          // Fill the field based on its type
          if (fieldInfo.type === 'checkbox') {
            fieldInfo.element.checked = value === true || value === 'true';
          } else if (fieldInfo.type === 'select') {
            fieldInfo.element.value = value;
          } else {
            fieldInfo.element.value = value;
          }
          
          // Trigger events to ensure the form recognizes the change
          fieldInfo.element.dispatchEvent(new Event('input', { bubbles: true }));
          fieldInfo.element.dispatchEvent(new Event('change', { bubbles: true }));
          fieldInfo.element.dispatchEvent(new Event('blur', { bubbles: true }));
          
          // Visual feedback - different color for AI-enhanced fields
          if (enhancedFields.includes(fieldName)) {
            fieldInfo.element.style.backgroundColor = '#e3f2fd';
            fieldInfo.element.style.border = `2px solid ${AUTOJOB_THEME.colors.primary}`;
          } else {
            fieldInfo.element.style.backgroundColor = '#e8f5e8';
            fieldInfo.element.style.border = `2px solid ${AUTOJOB_THEME.colors.success}`;
          }
          
          filledCount++;
          console.log(`✅ Filled ${fieldName} (${enhancedFields.includes(fieldName) ? 'AI-enhanced' : 'basic'}): ${value.substring(0, 50)}...`);
        }
      }
      
      console.log(`✅ AI-enhanced auto-fill completed: ${filledCount} fields filled (${enhancedFields.length} AI-enhanced)`);
      
      // Show enhanced notification
      if (enhancedFields.length > 0) {
        showNotification(`✨ Auto-fill completed with AI enhancements! ${enhancedFields.length} fields enhanced.`, 'success');
      }
      
      return filledCount;
    } else {
      console.error('❌ AI enhancement failed:', response?.error);
      
      // Fallback to basic auto-fill
      console.log('🔄 Falling back to basic auto-fill...');
      return await performBasicAutoFill();
    }
    
  } catch (error) {
    console.error('❌ Error performing AI-enhanced auto-fill:', error);
    
    // Fallback to basic auto-fill
    console.log('🔄 Falling back to basic auto-fill...');
    return await performBasicAutoFill();
  }
}


console.log('✅ Auto-Job Content Script Loaded');
