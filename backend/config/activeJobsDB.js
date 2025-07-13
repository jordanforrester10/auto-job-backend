// config/activeJobsDB.js - Configuration for Active Jobs DB API
require('dotenv').config();

const activeJobsDBConfig = {
  // API Configuration
  apiKey: process.env.RAPIDAPI_KEY,
  baseUrl: 'https://active-jobs-db.p.rapidapi.com',
  
  // API Headers
  defaultHeaders: {
    'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
    'X-RapidAPI-Host': 'active-jobs-db.p.rapidapi.com',
    'Accept': 'application/json',
    'User-Agent': 'AutoJobAI/2.0 PremiumJobDiscovery'
  },

  // API Endpoints
  endpoints: {
    search: '/jobs',
    health: '/jobs'
  },

  // Request Configuration
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,

  // Search Configuration
  search: {
    maxJobsPerCall: 100,     // Active Jobs DB advantage: 100 jobs per call
    defaultLimit: 50,
    maxLimit: 100,
    defaultOffset: 0,
    
    // Experience level mapping
    experienceLevels: {
      'entry': 'entry_level',
      'junior': 'entry_level', 
      'mid': 'mid_level',
      'senior': 'senior_level',
      'lead': 'senior_level',
      'principal': 'executive_level',
      'executive': 'executive_level'
    }
  },

  // Quality Thresholds
  quality: {
    minRelevanceScore: 60,
    preferDirectEmployer: true,
    maxDaysOld: 30,
    minDescriptionLength: 100
  },

  // Rate Limiting & Performance
  performance: {
    requestsPerMinute: 60,  // Adjust based on subscription
    concurrent: 3,
    cacheTTL: 300000,       // 5 minutes cache
    enableCaching: true
  },

  // Premium Features
  features: {
    directEmployerLinks: true,
    hourlyUpdates: true,
    premiumJobQuality: true,
    atsSystemIntegration: true,
    bulkJobRetrieval: true
  },

  // Supported ATS Systems (for direct employer identification)
  supportedATS: [
    'greenhouse.io',
    'lever.co', 
    'workday.com',
    'smartrecruiters.com',
    'jobvite.com',
    'bamboohr.com',
    'icims.com',
    'taleo.net',
    'successfactors.com'
  ],

  // Major Job Boards Covered
  jobBoardsCovered: [
    'indeed.com',
    'linkedin.com',
    'glassdoor.com',
    'monster.com',
    'careerbuilder.com',
    'ziprecruiter.com',
    'dice.com',
    'stackoverflow.jobs'
  ],

  // Location Expansion for Broader Search Coverage
  locationExpansion: {
    techHubs: [
      'San Francisco', 'New York', 'Seattle', 'Austin', 
      'Boston', 'Los Angeles', 'Chicago', 'Denver',
      'Portland', 'Atlanta', 'Remote'
    ],
    
    // Country codes for international expansion
    supportedCountries: ['US', 'CA', 'GB', 'AU'],
    
    // Remote work keywords
    remoteKeywords: ['remote', 'work from home', 'distributed', 'telecommute', 'wfh']
  },

  // Search Strategy Configuration
  searchStrategies: {
    primary: {
      name: 'Intelligent Job Title Search',
      maxCalls: 6,
      jobsPerCall: 100,
      relevanceThreshold: 70
    },
    
    secondary: {
      name: 'Skill-Based Keyword Search', 
      maxCalls: 3,
      jobsPerCall: 50,
      relevanceThreshold: 65
    },
    
    tertiary: {
      name: 'Location Expansion Search',
      maxCalls: 3,
      jobsPerCall: 30,
      relevanceThreshold: 60
    }
  },

  // Error Handling
  errorHandling: {
    retryableErrors: [429, 500, 502, 503, 504],
    nonRetryableErrors: [401, 403, 404],
    
    errorMessages: {
      401: 'Active Jobs DB API authentication failed - check your RapidAPI key',
      403: 'Access forbidden - check your subscription status',
      429: 'Rate limit exceeded - please upgrade your plan or wait',
      500: 'Active Jobs DB service temporarily unavailable',
      503: 'Active Jobs DB service maintenance - try again later'
    }
  },

  // Logging Configuration
  logging: {
    enabled: true,
    level: 'info', // 'debug', 'info', 'warn', 'error'
    includeRequestDetails: true,
    includeResponseMetrics: true,
    logSuccessfulRequests: true,
    logFailedRequests: true
  },

  // Data Validation Rules
  validation: {
    requiredFields: ['title', 'company', 'apply_url'],
    minTitleLength: 3,
    maxTitleLength: 200,
    minCompanyLength: 2,
    maxCompanyLength: 100,
    minDescriptionLength: 50,
    validateUrls: true,
    validateDates: true
  },

  // Job Classification
  classification: {
    // Job types mapping
    jobTypes: {
      'full_time': 'FULL_TIME',
      'part_time': 'PART_TIME', 
      'contract': 'CONTRACT',
      'temporary': 'TEMPORARY',
      'internship': 'INTERNSHIP',
      'freelance': 'FREELANCE'
    },

    // Work arrangement detection
    workArrangementKeywords: {
      remote: ['remote', 'work from home', 'telecommute', 'distributed', 'wfh'],
      hybrid: ['hybrid', 'flexible', 'part remote', 'office/remote', 'mix of remote'],
      onsite: ['on-site', 'onsite', 'in office', 'office location', 'headquarters']
    },

    // Experience level keywords
    experienceKeywords: {
      entry: ['entry', 'graduate', 'junior', 'associate', 'new grad'],
      mid: ['mid', 'intermediate', 'experienced', '2-5 years'],
      senior: ['senior', 'sr', 'lead', 'principal', 'expert', '5+ years'],
      executive: ['director', 'vp', 'vice president', 'chief', 'head of', 'executive']
    }
  },

  // Analytics & Metrics
  analytics: {
    trackSearchPerformance: true,
    trackJobQuality: true,
    trackUserEngagement: true,
    
    qualityMetrics: {
      directEmployerPercentage: true,
      recentJobsPercentage: true,
      averageRelevanceScore: true,
      salaryInformationRate: true
    },
    
    performanceMetrics: {
      averageResponseTime: true,
      successRate: true,
      jobsPerApiCall: true,
      uniqueJobsRate: true
    }
  }
};

// Validation function to check configuration
function validateConfig() {
  const errors = [];
  
  if (!activeJobsDBConfig.apiKey) {
    errors.push('RAPIDAPI_KEY environment variable is required');
  }
  
  if (!activeJobsDBConfig.baseUrl) {
    errors.push('Base URL is required');
  }
  
  if (activeJobsDBConfig.search.maxLimit > 100) {
    errors.push('Max limit cannot exceed 100 (API limitation)');
  }
  
  if (errors.length > 0) {
    console.error('Active Jobs DB Configuration Errors:', errors);
    return false;
  }
  
  return true;
}

// Initialize configuration with validation
function initializeConfig() {
  if (!validateConfig()) {
    throw new Error('Active Jobs DB configuration is invalid');
  }
  
  console.log('✅ Active Jobs DB configuration loaded successfully');
  console.log('🎯 Premium Features Enabled:', Object.keys(activeJobsDBConfig.features).filter(f => activeJobsDBConfig.features[f]));
  console.log('📊 Max Jobs Per Call:', activeJobsDBConfig.search.maxJobsPerCall);
  console.log('🏢 ATS Systems Supported:', activeJobsDBConfig.supportedATS.length);
  console.log('🌐 Job Boards Covered:', activeJobsDBConfig.jobBoardsCovered.length);
  
  return activeJobsDBConfig;
}

// Export configuration
module.exports = {
  config: activeJobsDBConfig,
  initialize: initializeConfig,
  validate: validateConfig
};