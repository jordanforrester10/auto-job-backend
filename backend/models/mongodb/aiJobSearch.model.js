// models/mongodb/aiJobSearch.model.js - CLEANED AND UPDATED WITH ERROR FIXES
const mongoose = require('mongoose');

const aiJobSearchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  resumeName: {
    type: String,
    required: true
  },
  searchCriteria: {
    jobTitle: String,
    skills: [String],
    location: String,
    // Enhanced location support
    searchLocations: [{
      name: String,
      type: {
        type: String,
        enum: ['city', 'state', 'country', 'remote'],
        default: 'city'
      },
      coordinates: {
        lat: Number,
        lng: Number
      },
      radius: {
        type: Number,
        default: 25 // miles
      }
    }],
    remoteWork: {
      type: Boolean,
      default: true
    },
    experienceLevel: String,
    salaryRange: {
      min: Number,
      max: Number,
      currency: String
    },
    jobTypes: [String],
    industries: [String],
    companySizes: [String],
    workEnvironment: String
  },
  status: {
    type: String,
    enum: ['running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'running'
  },
  // FIXED: Updated enum values to only include current valid options
  searchType: {
    type: String,
    enum: ['basic', 'enhanced', 'premium', 'intelligent', 'weekly_active_jobs'],
    default: 'weekly_active_jobs'
  },
  // Weekly execution model
  weeklyLimit: {
    type: Number,
    default: 50 // Casual: 50, Hunter: 100
  },
  jobsFoundThisWeek: {
    type: Number,
    default: 0
  },
  totalJobsFound: {
    type: Number,
    default: 0
  },
  lastSearchDate: {
    type: Date,
    default: null
  },
  // Weekly tracking
  currentWeekStart: {
    type: Date,
    default: null
  },
  weeklyStats: [{
    weekStart: Date,
    weekEnd: Date,
    jobsFound: Number,
    searchAttempts: Number,
    avgQualityScore: Number,
    locationsSearched: [String],
    topCompanies: [String],
    avgSalary: Number
  }],
  
  // Enhanced tracking
  jobsFound: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    title: String,
    company: String,
    foundAt: Date,
    // Enhanced location and salary tracking
    location: {
      original: String,
      parsed: {
        city: String,
        state: String,
        country: String,
        isRemote: Boolean,
        coordinates: {
          lat: Number,
          lng: Number
        }
      }
    },
    salary: {
      min: Number,
      max: Number,
      currency: String,
      period: String,
      source: String,
      confidence: Number
    },
    contentQuality: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    extractionSuccess: Boolean,
    matchScore: Number,
    sourceUrl: String,
    sourcePlatform: String,
    extractionMethod: String,
    premiumAnalysis: {
      type: Boolean,
      default: false
    },
    // API source tracking
    apiSource: {
      type: String,
      enum: ['active_jobs_db', 'adzuna_aggregator', 'claude_web_search', 'manual'],
      default: 'active_jobs_db'
    },
    activeJobsDBId: String,
    jobBoardOrigin: String,
    directCompanyPosting: Boolean,
    salaryPredicted: Boolean,
    // Enhanced job data
    jobType: String,
    experienceLevel: String,
    workArrangement: String,
    benefits: [String],
    requiredSkills: [String],
    preferredSkills: [String]
  }],
  
  // Search performance metrics
  searchMetrics: {
    totalSearchesPerformed: {
      type: Number,
      default: 0
    },
    totalJobsDiscovered: {
      type: Number,
      default: 0
    },
    successfulExtractions: {
      type: Number,
      default: 0
    },
    failedExtractions: {
      type: Number,
      default: 0
    },
    premiumAnalysesCompleted: {
      type: Number,
      default: 0
    },
    avgContentQuality: String,
    avgProcessingTime: Number,
    lastPerformanceUpdate: Date,
    // Weekly performance tracking
    weeklyPerformance: {
      avgJobsPerWeek: Number,
      avgQualityScore: Number,
      bestPerformingLocations: [String],
      worstPerformingLocations: [String],
      salaryTrends: {
        avgMin: Number,
        avgMax: Number,
        currency: String
      }
    },
    // Phase specific metrics
    phase1Duration: Number,
    phase2Duration: Number,
    phase3Duration: Number,
    totalSearchDuration: Number,
    // Active Jobs DB specific metrics
    activeJobsDBCalls: {
      type: Number,
      default: 0
    },
    activeJobsDBSuccessRate: Number,
    activeJobsDBJobBoardsCovered: [String],
    costSavings: Number
  },
  
  // Search history with weekly model
  searchHistory: [{
    searchDate: Date,
    weekOfYear: Number,
    // FIXED: Updated enum values
    searchApproach: {
      type: String,
      enum: [
        '3-phase-intelligent', 
        '3-phase-intelligent-real-boards',
        '3-phase-intelligent-claude-web-search',
        '3-phase-intelligent-active-jobs-weekly'
      ],
      default: '3-phase-intelligent-active-jobs-weekly'
    },
    // Location-aware search results
    locationsSearched: [{
      location: String,
      jobsFound: Number,
      avgQualityScore: Number,
      avgSalary: Number
    }],
    phase1Results: {
      jobTitles: [String],
      keywords: [String],
      experienceLevel: String,
      duration: Number
    },
    phase2Results: {
      apiCallsMade: Number,
      jobsReturned: Number,
      successfulApiCalls: Number,
      jobBoardsCovered: [String],
      locationsSearched: [String],
      averageContentLength: Number,
      duration: Number,
      costSavings: String
    },
    phase3Results: {
      jobsAnalyzed: Number,
      successfulAnalyses: Number,
      averageSkillsFound: Number,
      salaryExtractionRate: Number,
      duration: Number
    },
    totalDuration: Number,
    costBreakdown: {
      phase1Cost: String,
      phase2Cost: String,
      phase3Cost: String,
      totalCost: String,
      savings: String
    },
    errors: [String],
    qualityMetrics: {
      averageMatchScore: Number,
      contentQualityDistribution: {
        high: Number,
        medium: Number,
        low: Number
      },
      jobBoardDistribution: {
        indeed: Number,
        linkedin: Number,
        monster: Number,
        careerbuilder: Number,
        others: Number
      },
      locationDistribution: [{
        location: String,
        count: Number,
        avgSalary: Number
      }],
      salaryMetrics: {
        extractionRate: Number,
        avgMinSalary: Number,
        avgMaxSalary: Number,
        currency: String
      }
    }
  }],
  
  // Error tracking
  errors: [{
    timestamp: Date,
    errorType: {
      type: String,
      enum: [
        'career_analysis_failed', 
        'active_jobs_api_failed',
        'active_jobs_auth_failed',
        'active_jobs_rate_limited',
        'job_discovery_failed', 
        'premium_analysis_failed',
        'location_parsing_failed',
        'salary_extraction_failed',
        'content_extraction_failed',
        'api_error', 
        'validation_error', 
        'rate_limit',
        'claude_error',
        'openai_error'
      ]
    },
    errorMessage: String,
    phase: {
      type: String,
      enum: ['career_analysis', 'active_jobs_discovery', 'web_search_discovery', 'content_extraction', 'premium_analysis', 'job_saving', 'general']
    },
    context: String,
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  
  // AI Model usage tracking
  aiUsage: {
    // Phase 1: Career Analysis
    openaiCareerAnalysis: {
      type: Number,
      default: 0
    },
    // Phase 2: Active Jobs DB (No AI cost!)
    activeJobsApiCalls: {
      type: Number,
      default: 0
    },
    activeJobsApiCost: {
      type: Number,
      default: 0 // FREE API
    },
    // Phase 3: Premium Analysis
    openaiPremiumAnalyses: {
      type: Number,
      default: 0
    },
    openaiBatchAnalyses: {
      type: Number,
      default: 0
    },
    totalTokensUsed: {
      type: Number,
      default: 0
    },
    estimatedCost: {
      type: Number,
      default: 0
    },
    // Cost breakdown by phase
    costBreakdown: {
      phase1Cost: Number,
      phase2Cost: Number,
      phase3Cost: Number,
      totalCost: Number,
      costSavings: Number
    }
  },
  
  // Search optimization
  optimization: {
    successRate: Number,
    avgRelevanceScore: Number,
    activeJobsApiEfficiency: Number,
    premiumAnalysisAccuracy: Number,
    bestSearchTimes: [String],
    recommendedAdjustments: [String],
    contentQualityTrend: String,
    matchScoreTrend: String,
    userSatisfactionIndicators: {
      viewedJobsRate: Number,
      appliedJobsRate: Number,
      favoriteJobsRate: Number
    },
    // Location and salary optimization
    locationOptimization: {
      bestPerformingLocations: [String],
      worstPerformingLocations: [String],
      remoteJobsPercentage: Number,
      avgSalaryByLocation: [{
        location: String,
        avgMin: Number,
        avgMax: Number,
        currency: String,
        jobCount: Number
      }]
    },
    salaryOptimization: {
      extractionAccuracy: Number,
      salaryTrends: {
        increasing: Boolean,
        avgGrowthRate: Number
      },
      bestSalarySources: [String]
    }
  },
  
  // User preferences learned over time
  learnedPreferences: {
    preferredCompanies: [String],
    avoidedCompanies: [String],
    preferredLocations: [String],
    successfulKeywords: [String],
    // Enhanced preferences
    locationPreferences: {
      preferredCities: [String],
      remotePreference: String,
      maxCommuteDistance: Number,
      preferredStates: [String],
      internationalWillingness: Boolean
    },
    salaryPreferences: {
      minAcceptable: Number,
      preferred: Number,
      currency: String,
      negotiationFactor: Number,
      benefitsImportance: String
    },
    effectiveJobTitles: [String],
    preferredWorkArrangements: [String],
    salaryExpectationLearned: {
      min: Number,
      max: Number,
      currency: String
    },
    interactionPatterns: {
      viewedJobs: Number,
      appliedJobs: Number,
      favoriteJobs: Number,
      avgTimeSpentPerJob: Number,
      preferredJobTypes: [String]
    },
    preferredJobBoards: [String],
    bestPerformingSearchTerms: [String],
    optimalSalaryRanges: [{
      min: Number,
      max: Number,
      resultCount: Number
    }]
  },
  
  // FIXED: Schedule and automation for weekly execution only
  schedule: {
    isScheduled: {
      type: Boolean,
      default: true
    },
    // FIXED: Only weekly frequency allowed
    frequency: {
      type: String,
      enum: ['weekly'],
      default: 'weekly'
    },
    dayOfWeek: {
      type: Number,
      default: 1, // Monday = 1
      min: 0,
      max: 6
    },
    preferredTime: String,
    timezone: String,
    nextScheduledRun: Date,
    pauseUntil: Date,
    intelligentScheduling: {
      type: Boolean,
      default: true
    },
    // Weekly scheduling optimization
    weeklyOptimization: {
      bestDayOfWeek: Number,
      bestTimeOfDay: String,
      avgJobsPerWeek: Number,
      successRate: Number
    },
    lastSuccessfulSearchTime: Date,
    // API usage optimization
    activeJobsRateLimitTracking: {
      callsThisMonth: Number,
      resetDate: Date,
      remainingCalls: Number
    }
  },
  
  // Notification settings
  notifications: {
    emailOnNewJobs: {
      type: Boolean,
      default: true
    },
    emailOnHighMatch: {
      type: Boolean,
      default: true
    },
    emailOnErrors: {
      type: Boolean,
      default: true
    },
    // Weekly notification settings
    weeklyDigest: {
      enabled: {
        type: Boolean,
        default: true
      },
      dayOfWeek: {
        type: Number,
        default: 0 // Sunday
      },
      time: {
        type: String,
        default: '18:00'
      }
    },
    matchScoreThreshold: {
      type: Number,
      default: 75
    },
    maxEmailsPerWeek: {
      type: Number,
      default: 10
    },
    salaryThresholdAlerts: {
      enabled: Boolean,
      minSalary: Number,
      currency: String
    },
    locationAlerts: {
      enabled: Boolean,
      preferredLocations: [String],
      remoteOnly: Boolean
    },
    smartNotifications: {
      type: Boolean,
      default: true
    },
    notifyOnQualityJobs: {
      type: Boolean,
      default: true
    },
    premiumAnalysisAlerts: {
      type: Boolean,
      default: true
    },
    activeJobsApiFailures: {
      type: Boolean,
      default: true
    },
    rateLimitWarnings: {
      type: Boolean,
      default: true
    }
  },
  
  // AI Reasoning Logs for search process tracking
  reasoningLogs: [{
    phase: {
      type: String,
      enum: [
        'initialization', 
        'career_analysis', 
        'active_jobs_discovery',
        'intelligent_discovery',
        'web_search_discovery',
        'content_extraction',
        'premium_analysis',      
        'job_saving', 
        'completion', 
        'error'
      ],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    message: {
      type: String,
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    success: {
      type: Boolean,
      default: true
    },
    duration: {
      type: Number,
      default: 0
    },
    metadata: {
      // Phase-specific metadata
      targetJobTitles: [String],
      targetKeywords: [String],
      experienceLevel: String,
      apiProvider: String,
      apiCallsMade: Number,
      jobsReturned: Number,
      jobBoardsCovered: [String],
      averageContentLength: Number,
      locationsSearched: [String],
      salaryExtractionRate: Number,
      jobsAnalyzed: Number,
      successfulAnalyses: Number,
      averageSkillsFound: Number,
      aiModel: String,
      errorDetails: String,
      companyName: String,
      jobTitle: String,
      contentLength: Number,
      extractionMethod: String,
      batchSize: Number,
      qualityLevel: String,
      estimatedCost: String,
      tokenUsage: Number,
      costSavings: String,
      matchScore: Number,
      contentQuality: String,
      analysisAccuracy: String,
      location: String,
      salaryRange: {
        min: Number,
        max: Number,
        currency: String
      },
      isRemote: Boolean,
      workArrangement: String,
      activeJobsDBId: String,
      originalJobBoard: String,
      salaryPredicted: Boolean,
      contractType: String,
      directCompanyPosting: Boolean,
      apiHealth: String,
      rateLimitStatus: String
    }
  }],
  
  lastUpdateMessage: String,
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // FIXED: Search approach metadata with weekly Active Jobs DB support
  searchApproach: {
    type: String,
    enum: [
      '3-phase-intelligent', 
      '3-phase-intelligent-real-boards',
      '3-phase-intelligent-claude-web-search',
      '3-phase-intelligent-active-jobs-weekly'
    ],
    default: '3-phase-intelligent-active-jobs-weekly'
  },
  approachVersion: {
    type: String,
    default: '5.0-weekly-active-jobs-location-salary'
  },
  // FIXED: Quality level enum values
  qualityLevel: {
    type: String,
    enum: ['standard', 'premium', 'intelligent', 'claude-web-search', 'active-jobs-weekly-enhanced'],
    default: 'active-jobs-weekly-enhanced'
  },
  
  // Active Jobs DB configuration and tracking
  activeJobsConfig: {
    apiCallsUsed: {
      type: Number,
      default: 0
    },
    monthlyLimit: {
      type: Number,
      default: 1000
    },
    lastApiCall: Date,
    apiHealth: {
      type: String,
      enum: ['healthy', 'degraded', 'down', 'not_configured'],
      default: 'not_configured'
    },
    preferredJobBoards: [String],
    searchOptimizations: {
      bestPerformingTitles: [String],
      optimalLocationTerms: [String],
      effectiveKeywords: [String],
      locationOptimizations: [{
        location: String,
        bestJobTitles: [String],
        avgJobsFound: Number,
        avgQualityScore: Number
      }],
      salaryOptimizations: {
        bestSourceTypes: [String],
        avgExtractionAccuracy: Number
      }
    },
    costComparison: {
      previousCostPerSearch: Number,
      currentCostPerSearch: Number,
      savingsPercent: Number
    }
  }
});

// Indexes for better performance
aiJobSearchSchema.index({ userId: 1, status: 1 });
aiJobSearchSchema.index({ userId: 1, createdAt: -1 });
aiJobSearchSchema.index({ status: 1, 'schedule.nextScheduledRun': 1 });
aiJobSearchSchema.index({ 'jobsFound.jobId': 1 });
aiJobSearchSchema.index({ lastSearchDate: 1 });
aiJobSearchSchema.index({ 'reasoningLogs.timestamp': -1 });
aiJobSearchSchema.index({ 'reasoningLogs.phase': 1 });
aiJobSearchSchema.index({ searchApproach: 1 });
aiJobSearchSchema.index({ qualityLevel: 1 });
aiJobSearchSchema.index({ 'activeJobsConfig.apiHealth': 1 });
aiJobSearchSchema.index({ 'jobsFound.apiSource': 1 });
aiJobSearchSchema.index({ 'jobsFound.jobBoardOrigin': 1 });
aiJobSearchSchema.index({ currentWeekStart: 1 });
aiJobSearchSchema.index({ 'searchCriteria.searchLocations.name': 1 });
aiJobSearchSchema.index({ 'jobsFound.location.parsed.city': 1 });
aiJobSearchSchema.index({ 'jobsFound.salary.min': 1, 'jobsFound.salary.max': 1 });

// FLEXIBLE VALIDATION: Allow migration of old enum values without breaking
aiJobSearchSchema.pre('validate', function(next) {
  // Auto-fix old enum values during validation
  const enumMigrationMap = {
    searchType: {
      'adzuna_api': 'weekly_active_jobs',
      'basic': 'basic',
      'enhanced': 'enhanced',
      'premium': 'premium',
      'intelligent': 'intelligent',
      'weekly_active_jobs': 'weekly_active_jobs'
    },
    'schedule.frequency': {
      'daily': 'weekly',
      'weekly': 'weekly'
    },
    searchApproach: {
      '5-phase-legacy': '3-phase-intelligent',
      '3-phase-intelligent-adzuna-api': '3-phase-intelligent-active-jobs-weekly',
      '3-phase-intelligent': '3-phase-intelligent',
      '3-phase-intelligent-real-boards': '3-phase-intelligent-real-boards',
      '3-phase-intelligent-claude-web-search': '3-phase-intelligent-claude-web-search',
      '3-phase-intelligent-active-jobs-weekly': '3-phase-intelligent-active-jobs-weekly'
    },
    qualityLevel: {
      'adzuna-api-enhanced': 'active-jobs-weekly-enhanced',
      'standard': 'standard',
      'premium': 'premium',
      'intelligent': 'intelligent',
      'claude-web-search': 'claude-web-search',
      'active-jobs-weekly-enhanced': 'active-jobs-weekly-enhanced'
    }
  };

  // Auto-migrate enum values
  if (this.searchType && enumMigrationMap.searchType[this.searchType]) {
    this.searchType = enumMigrationMap.searchType[this.searchType];
  }

  if (this.schedule?.frequency && enumMigrationMap['schedule.frequency'][this.schedule.frequency]) {
    this.schedule.frequency = enumMigrationMap['schedule.frequency'][this.schedule.frequency];
  }

  if (this.searchApproach && enumMigrationMap.searchApproach[this.searchApproach]) {
    this.searchApproach = enumMigrationMap.searchApproach[this.searchApproach];
  }

  if (this.qualityLevel && enumMigrationMap.qualityLevel[this.qualityLevel]) {
    this.qualityLevel = enumMigrationMap.qualityLevel[this.qualityLevel];
  }

  // Auto-update to weekly model defaults for migrated records
  if (this.isModified('searchType') && this.searchType === 'weekly_active_jobs') {
    this.schedule = this.schedule || {};
    this.schedule.frequency = 'weekly';
    this.searchApproach = '3-phase-intelligent-active-jobs-weekly';
    this.qualityLevel = 'active-jobs-weekly-enhanced';
    this.approachVersion = '5.0-weekly-active-jobs-location-salary';
    this.lastUpdateMessage = 'Auto-migrated to weekly Active Jobs model';
  }

  next();
});

// Middleware
aiJobSearchSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  
  // Update performance metrics
  if (this.isModified('jobsFound')) {
    this.updatePerformanceMetrics();
  }
  
  // Update Active Jobs DB usage tracking
  if (this.isModified('activeJobsConfig.apiCallsUsed')) {
    this.updateActiveJobsUsageMetrics();
  }
  
  // Update weekly tracking
  if (this.isModified('jobsFoundThisWeek')) {
    this.updateWeeklyTracking();
  }
  
  next();
});

// Instance methods
aiJobSearchSchema.methods.updatePerformanceMetrics = function() {
  const jobs = this.jobsFound;
  if (jobs.length === 0) return;
  
  // Calculate success rate
  const successfulExtractions = jobs.filter(job => job.extractionSuccess).length;
  this.searchMetrics.successfulExtractions = successfulExtractions;
  this.searchMetrics.failedExtractions = jobs.length - successfulExtractions;
  
  // Calculate premium analyses
  const premiumAnalyses = jobs.filter(job => job.premiumAnalysis).length;
  this.searchMetrics.premiumAnalysesCompleted = premiumAnalyses;
  
  // Calculate Active Jobs DB specific metrics
  const activeJobsJobs = jobs.filter(job => job.apiSource === 'active_jobs_db');
  if (activeJobsJobs.length > 0) {
    this.searchMetrics.activeJobsDBJobBoardsCovered = [...new Set(activeJobsJobs.map(job => job.jobBoardOrigin))];
    this.searchMetrics.activeJobsDBSuccessRate = (activeJobsJobs.length / this.searchMetrics.activeJobsDBCalls) * 100;
  }
  
  // Calculate salary extraction metrics
  const jobsWithSalary = jobs.filter(job => job.salary && (job.salary.min || job.salary.max));
  if (jobs.length > 0) {
    this.searchMetrics.weeklyPerformance = this.searchMetrics.weeklyPerformance || {};
    this.searchMetrics.weeklyPerformance.salaryTrends = {
      avgMin: jobsWithSalary.reduce((sum, job) => sum + (job.salary.min || 0), 0) / jobsWithSalary.length || 0,
      avgMax: jobsWithSalary.reduce((sum, job) => sum + (job.salary.max || 0), 0) / jobsWithSalary.length || 0,
      currency: jobsWithSalary[0]?.salary?.currency || 'USD'
    };
  }
  
  // Calculate average content quality
  const qualityScores = jobs.map(job => {
    switch(job.contentQuality) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 1;
    }
  });
  
  const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
  if (avgQuality >= 2.5) this.searchMetrics.avgContentQuality = 'high';
  else if (avgQuality >= 1.5) this.searchMetrics.avgContentQuality = 'medium';
  else this.searchMetrics.avgContentQuality = 'low';
  
  // Update optimization data
  this.optimization.successRate = (successfulExtractions / jobs.length) * 100;
  this.optimization.premiumAnalysisAccuracy = premiumAnalyses > 0 ? (premiumAnalyses / jobs.length) * 100 : 0;
  this.optimization.activeJobsApiEfficiency = jobs.length / Math.max(this.searchMetrics.activeJobsDBCalls, 1);
  
  this.searchMetrics.lastPerformanceUpdate = new Date();
};

// Update weekly tracking
aiJobSearchSchema.methods.updateWeeklyTracking = function() {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);
  
  // Update current week start if it's a new week
  if (!this.currentWeekStart || this.currentWeekStart < currentWeekStart) {
    this.currentWeekStart = currentWeekStart;
    this.jobsFoundThisWeek = 0; // Reset weekly counter
  }
  
  // Count jobs found this week
  const jobsThisWeek = this.jobsFound.filter(job => 
    new Date(job.foundAt) >= currentWeekStart
  );
  
  this.jobsFoundThisWeek = jobsThisWeek.length;
  
  // Update weekly stats
  const existingWeekIndex = this.weeklyStats.findIndex(week => 
    week.weekStart.getTime() === currentWeekStart.getTime()
  );
  
  const weekStats = {
    weekStart: currentWeekStart,
    weekEnd: new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000),
    jobsFound: jobsThisWeek.length,
    searchAttempts: 1,
    avgQualityScore: jobsThisWeek.reduce((sum, job) => sum + (job.matchScore || 0), 0) / jobsThisWeek.length || 0,
    locationsSearched: [...new Set(jobsThisWeek.map(job => job.location?.parsed?.city || job.location?.original).filter(Boolean))],
    topCompanies: [...new Set(jobsThisWeek.map(job => job.company).filter(Boolean))],
    avgSalary: jobsThisWeek.reduce((sum, job) => {
      const salary = job.salary;
      if (salary && (salary.min || salary.max)) {
        return sum + ((salary.min || 0) + (salary.max || 0)) / 2;
      }
      return sum;
    }, 0) / jobsThisWeek.filter(job => job.salary && (job.salary.min || job.salary.max)).length || 0
  };
  
if (existingWeekIndex >= 0) {
    this.weeklyStats[existingWeekIndex] = weekStats;
  } else {
    this.weeklyStats.push(weekStats);
  }
  
  // Keep only last 12 weeks of stats
  if (this.weeklyStats.length > 12) {
    this.weeklyStats = this.weeklyStats.slice(-12);
  }
};

// Update Active Jobs DB usage metrics
aiJobSearchSchema.methods.updateActiveJobsUsageMetrics = function() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Reset monthly counter if it's a new month
  if (!this.activeJobsConfig.lastApiCall || 
      this.activeJobsConfig.lastApiCall.getMonth() !== currentMonth ||
      this.activeJobsConfig.lastApiCall.getFullYear() !== currentYear) {
    this.activeJobsConfig.apiCallsUsed = 0;
  }
  
  // Calculate remaining calls for the month
  const remainingCalls = this.activeJobsConfig.monthlyLimit - this.activeJobsConfig.apiCallsUsed;
  
  // Update cost comparison
  const previousCost = 0.43; // Average other method cost
  const currentCost = 0.06;  // Active Jobs DB + GPT-4o cost
  this.activeJobsConfig.costComparison = {
    previousCostPerSearch: previousCost,
    currentCostPerSearch: currentCost,
    savingsPercent: Math.round(((previousCost - currentCost) / previousCost) * 100)
  };
  
  this.activeJobsConfig.lastApiCall = new Date();
};

aiJobSearchSchema.methods.addJobFound = function(jobData) {
  this.jobsFound.push({
    jobId: jobData.jobId,
    title: jobData.title,
    company: jobData.company,
    foundAt: new Date(),
    location: jobData.location || {},
    salary: jobData.salary || {},
    contentQuality: jobData.contentQuality || 'medium',
    extractionSuccess: jobData.extractionSuccess !== false,
    matchScore: jobData.matchScore,
    sourceUrl: jobData.sourceUrl,
    sourcePlatform: jobData.sourcePlatform,
    extractionMethod: jobData.extractionMethod || 'active_jobs_weekly',
    premiumAnalysis: jobData.premiumAnalysis || true,
    // Active Jobs DB fields
    apiSource: jobData.apiSource || 'active_jobs_db',
    activeJobsDBId: jobData.activeJobsDBId,
    jobBoardOrigin: jobData.jobBoardOrigin || jobData.sourcePlatform,
    directCompanyPosting: jobData.directCompanyPosting || false,
    salaryPredicted: jobData.salaryPredicted || false,
    // Enhanced job metadata
    jobType: jobData.jobType,
    experienceLevel: jobData.experienceLevel,
    workArrangement: jobData.workArrangement,
    benefits: jobData.benefits || [],
    requiredSkills: jobData.requiredSkills || [],
    preferredSkills: jobData.preferredSkills || []
  });
  
  this.totalJobsFound += 1;
  this.jobsFoundThisWeek += 1;
  
  return this.save();
};

aiJobSearchSchema.methods.addError = function(errorType, message, phase, context) {
  this.errors.push({
    timestamp: new Date(),
    errorType,
    errorMessage: message,
    phase: phase || 'general',
    context,
    resolved: false
  });
  
  return this.save();
};

// Track AI usage for weekly Active Jobs DB approach
aiJobSearchSchema.methods.updateAiUsage = function(phase, type, tokens = 0, cost = 0) {
  switch(phase) {
    case 'career_analysis':
      if (type === 'openai') this.aiUsage.openaiCareerAnalysis += 1;
      if (!this.aiUsage.costBreakdown.phase1Cost) this.aiUsage.costBreakdown.phase1Cost = 0;
      this.aiUsage.costBreakdown.phase1Cost += cost;
      break;
      
    case 'active_jobs_discovery':
      if (type === 'active_jobs_api') {
        this.aiUsage.activeJobsApiCalls += 1;
        this.searchMetrics.activeJobsDBCalls += 1;
        this.activeJobsConfig.apiCallsUsed += 1;
      }
      // Active Jobs DB is free, so no cost added
      this.aiUsage.costBreakdown.phase2Cost = 0;
      break;
      
    case 'web_search_discovery':
    case 'intelligent_discovery':
      // Legacy support for older searches
      if (!this.aiUsage.costBreakdown.phase2Cost) this.aiUsage.costBreakdown.phase2Cost = 0;
      this.aiUsage.costBreakdown.phase2Cost += cost;
      break;
      
    case 'premium_analysis':
      if (type === 'openai_analysis') this.aiUsage.openaiPremiumAnalyses += 1;
      if (type === 'openai_batch') this.aiUsage.openaiBatchAnalyses += 1;
      if (!this.aiUsage.costBreakdown.phase3Cost) this.aiUsage.costBreakdown.phase3Cost = 0;
      this.aiUsage.costBreakdown.phase3Cost += cost;
      break;
  }
  
  this.aiUsage.totalTokensUsed += tokens;
  this.aiUsage.estimatedCost += cost;
  this.aiUsage.costBreakdown.totalCost = 
    (this.aiUsage.costBreakdown.phase1Cost || 0) +
    (this.aiUsage.costBreakdown.phase2Cost || 0) +
    (this.aiUsage.costBreakdown.phase3Cost || 0);
  
  // Calculate cost savings vs other methods
  const otherMethodCost = 0.43; // Estimated other method cost
  this.aiUsage.costBreakdown.costSavings = otherMethodCost - this.aiUsage.costBreakdown.totalCost;
  
  return this.save();
};

aiJobSearchSchema.methods.addReasoningLog = function(phase, message, details = {}, success = true, duration = 0) {
  // Helper function to sanitize numeric values
  const sanitizeNumeric = (value) => {
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
      return 0;
    }
    return value;
  };
  
  // Sanitize all numeric fields in details
  const sanitizedDetails = { ...details };
  Object.keys(sanitizedDetails).forEach(key => {
    sanitizedDetails[key] = sanitizeNumeric(sanitizedDetails[key]);
  });
  
  const reasoningLog = {
    phase,
    message,
    details: sanitizedDetails,
    success,
    duration: sanitizeNumeric(duration),
    timestamp: new Date(),
    metadata: {
      // Phase-specific user-friendly info
      targetJobTitles: details.targetJobTitles,
      experienceLevel: details.experienceLevel,
      
      // Job discovery user-friendly info
      totalJobs: sanitizeNumeric(details.totalJobs || details.totalJobsFound),
      jobsReturned: sanitizeNumeric(details.jobsReturned),
      jobBoards: details.jobBoards || details.jobBoardsCovered,
      searchAttempts: sanitizeNumeric(details.searchAttempts),
      
      // Location and salary metadata
      locationsSearched: details.locationsSearched,
      salaryExtractionRate: sanitizeNumeric(details.salaryExtractionRate),
      avgSalary: sanitizeNumeric(details.avgSalary),
      remoteJobsFound: sanitizeNumeric(details.remoteJobsFound),
      
      // Analysis user-friendly info
      jobsAnalyzed: sanitizeNumeric(details.jobsAnalyzed),
      successfulAnalyses: sanitizeNumeric(details.successfulAnalyses),
      averageSkillsFound: sanitizeNumeric(details.averageSkillsFound),
      
      // Job details (user-friendly)
      companyName: details.company || details.companyName,
      jobTitle: details.jobTitle,
      skillsFound: sanitizeNumeric(details.skillsFound),
      analysisQuality: details.analysisQuality || details.qualityLevel,
      location: details.location,
      salaryRange: details.salaryRange,
      isRemote: details.isRemote,
      workArrangement: details.workArrangement,
      
      // Progress and completion info
      batchNumber: sanitizeNumeric(details.batchNumber),
      jobsInBatch: sanitizeNumeric(details.jobsInBatch),
      savedJobs: sanitizeNumeric(details.savedJobs),
      duplicatesSkipped: sanitizeNumeric(details.duplicatesSkipped),
      
      // User-friendly timing (convert milliseconds to seconds)
      searchTime: details.searchTime || (duration > 0 ? `${Math.round(duration / 1000)} seconds` : undefined),
      
      // Helpful context for users
      suggestion: details.suggestion,
      nextAction: details.nextAction,
      reason: details.reason,
      
      // Sample data (helpful for users)
      sampleCompanies: details.sampleCompanies,
      topCompanies: details.topCompanies,
      jobTitles: details.jobTitles,
      
      // Only include what helps users understand what's happening
      phase: details.phase,
      searchStrategy: details.searchStrategy,
      searchApproach: details.searchApproach,
      jobBoardsAvailable: details.jobBoardsAvailable
    }
  };
  
  this.reasoningLogs.push(reasoningLog);
  
  // Keep only the last 100 logs to prevent document from growing too large
  if (this.reasoningLogs.length > 100) {
    this.reasoningLogs = this.reasoningLogs.slice(-100);
  }
  
  return this.save();
};

// Check if weekly limit reached
aiJobSearchSchema.methods.isWeeklyLimitReached = function() {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);
  
  // Count jobs found this week
  const jobsThisWeek = this.jobsFound.filter(job => 
    new Date(job.foundAt) >= currentWeekStart
  ).length;
  
  return jobsThisWeek >= this.weeklyLimit;
};

// Get weekly progress
aiJobSearchSchema.methods.getWeeklyProgress = function() {
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const jobsThisWeek = this.jobsFound.filter(job => 
    new Date(job.foundAt) >= currentWeekStart
  );
  
  return {
    weekStart: currentWeekStart,
    jobsFound: jobsThisWeek.length,
    weeklyLimit: this.weeklyLimit,
    remaining: Math.max(0, this.weeklyLimit - jobsThisWeek.length),
    percentage: Math.round((jobsThisWeek.length / this.weeklyLimit) * 100),
    isComplete: jobsThisWeek.length >= this.weeklyLimit
  };
};

// Helper method to return user-friendly descriptions
aiJobSearchSchema.methods.getDefaultModelForPhase = function(phase) {
  switch(phase) {
    case 'career_analysis': return 'Career Analyzer';
    case 'active_jobs_discovery': return 'Weekly Job Discovery';
    case 'web_search_discovery':
    case 'intelligent_discovery':
    case 'content_extraction': return 'Job Discovery';
    case 'premium_analysis': return 'Job Analyzer';
    default: return 'Processing';
  }
};

// Method to get recent reasoning logs (for UI display)
aiJobSearchSchema.methods.getRecentReasoningLogs = function(limit = 10) {
  return this.reasoningLogs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

// Method to get reasoning logs by phase
aiJobSearchSchema.methods.getReasoningLogsByPhase = function(phase) {
  return this.reasoningLogs
    .filter(log => log.phase === phase)
    .sort((a, b) => b.timestamp - a.timestamp);
};

// Get performance summary for weekly Active Jobs DB approach
aiJobSearchSchema.methods.getWeeklyActiveJobsPerformanceSummary = function() {
  return {
    searchApproach: this.searchApproach || '3-phase-intelligent-active-jobs-weekly',
    approachVersion: this.approachVersion || '5.0-weekly-active-jobs-location-salary',
    qualityLevel: this.qualityLevel || 'active-jobs-weekly-enhanced',
    totalJobsFound: this.totalJobsFound,
    weeklyProgress: this.getWeeklyProgress(),
    successRate: this.optimization?.successRate || 0,
    activeJobsApiEfficiency: this.optimization?.activeJobsApiEfficiency || 0,
    premiumAnalysisAccuracy: this.optimization?.premiumAnalysisAccuracy || 0,
    avgContentQuality: this.searchMetrics?.avgContentQuality || 'unknown',
    costBreakdown: this.aiUsage?.costBreakdown || {},
    costSavings: this.activeJobsConfig?.costComparison?.savingsPercent || 0,
    lastSuccessfulSearch: this.lastSearchDate,
    apiHealth: this.activeJobsConfig?.apiHealth || 'not_configured',
    monthlyApiUsage: {
      used: this.activeJobsConfig?.apiCallsUsed || 0,
      limit: this.activeJobsConfig?.monthlyLimit || 1000,
      remaining: (this.activeJobsConfig?.monthlyLimit || 1000) - (this.activeJobsConfig?.apiCallsUsed || 0)
    },
    jobBoardsCovered: this.searchMetrics?.activeJobsDBJobBoardsCovered || [],
    locationsSearched: this.searchCriteria?.searchLocations || [],
    salaryMetrics: this.searchMetrics?.weeklyPerformance?.salaryTrends || {},
    isHighPerformance: (this.optimization?.successRate || 0) > 80 && 
                       (this.optimization?.activeJobsApiEfficiency || 0) > 0.5
  };
};

// Schedule next weekly run
aiJobSearchSchema.methods.scheduleNextWeeklyRun = function(dayOfWeek = 1, preferredTime = '09:00') {
  const now = new Date();
  const nextRun = new Date();
  
  // Check if we have API calls remaining for the month
  const remainingCalls = (this.activeJobsConfig?.monthlyLimit || 1000) - (this.activeJobsConfig?.apiCallsUsed || 0);
  
  if (remainingCalls <= 0) {
    // If no API calls remaining, schedule for next month
    nextRun.setMonth(now.getMonth() + 1);
    nextRun.setDate(1);
    this.addReasoningLog('initialization', 'Scheduled for next month - Active Jobs DB monthly limit reached', {
      remainingCalls: 0,
      nextResetDate: nextRun
    });
  } else {
    // Calculate next occurrence of the specified day of week
    const daysUntilNext = (dayOfWeek - now.getDay() + 7) % 7;
    if (daysUntilNext === 0 && now.getHours() >= parseInt(preferredTime.split(':')[0])) {
      // If it's today but past the preferred time, schedule for next week
      nextRun.setDate(now.getDate() + 7);
    } else {
      nextRun.setDate(now.getDate() + daysUntilNext);
    }
  }
  
  const [hours, minutes] = preferredTime.split(':');
  nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  this.schedule.nextScheduledRun = nextRun;
  this.schedule.frequency = 'weekly';
  this.schedule.dayOfWeek = dayOfWeek;
  this.schedule.preferredTime = preferredTime;
  this.schedule.isScheduled = true;
  
  // Update rate limit tracking
  this.schedule.activeJobsRateLimitTracking = {
    callsThisMonth: this.activeJobsConfig?.apiCallsUsed || 0,
    resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    remainingCalls: remainingCalls
  };
  
  return this.save();
};

aiJobSearchSchema.methods.pause = function(pauseUntil) {
  this.status = 'paused';
  if (pauseUntil) {
    this.schedule.pauseUntil = pauseUntil;
  }
  this.lastUpdateMessage = 'Weekly search paused by user';
  return this.save();
};

aiJobSearchSchema.methods.resume = function() {
  this.status = 'running';
  this.schedule.pauseUntil = null;
  this.lastUpdateMessage = 'Weekly search resumed by user - using Active Jobs DB approach';
  return this.save();
};

// Static methods
aiJobSearchSchema.statics.findActiveWeeklySearches = function() {
  return this.find({ 
    status: 'running',
    searchApproach: '3-phase-intelligent-active-jobs-weekly',
    'activeJobsConfig.apiCallsUsed': { $lt: 1000 }, // Has API calls remaining
    $or: [
      { 'schedule.nextScheduledRun': { $lte: new Date() } },
      { 'schedule.isScheduled': false }
    ]
  });
};

aiJobSearchSchema.statics.findUserSearches = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to get AI searches with reasoning logs for weekly Active Jobs DB approach
aiJobSearchSchema.statics.getWithReasoningLogs = function(userId, includeDeleted = false) {
  const query = { userId };
  
  if (!includeDeleted) {
    query.status = { $ne: 'cancelled' };
  }
  
  return this.find(query)
    .populate('resumeId', 'name')
    .sort({ createdAt: -1 })
    .select('+reasoningLogs');
};

// Get search statistics for weekly Active Jobs DB approach
aiJobSearchSchema.statics.getSearchStatistics = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        weeklyActiveJobsSearches: { $sum: { $cond: [{ $eq: ['$searchApproach', '3-phase-intelligent-active-jobs-weekly'] }, 1, 0] } },
        legacySearches: { $sum: { $cond: [{ $ne: ['$searchApproach', '3-phase-intelligent-active-jobs-weekly'] }, 1, 0] } },
        activeSearches: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        totalJobsFound: { $sum: '$totalJobsFound' },
        avgJobsPerSearch: { $avg: '$totalJobsFound' },
        avgJobsPerWeek: { $avg: '$jobsFoundThisWeek' },
        totalPremiumAnalyses: { $sum: '$searchMetrics.premiumAnalysesCompleted' },
        totalAiUsage: { $sum: '$aiUsage.totalTokensUsed' },
        estimatedTotalCost: { $sum: '$aiUsage.estimatedCost' },
        totalCostSavings: { $sum: '$aiUsage.costBreakdown.costSavings' },
        avgSuccessRate: { $avg: '$optimization.successRate' },
        avgActiveJobsApiEfficiency: { $avg: '$optimization.activeJobsApiEfficiency' },
        totalActiveJobsApiCalls: { $sum: '$searchMetrics.activeJobsDBCalls' },
        avgActiveJobsSuccessRate: { $avg: '$searchMetrics.activeJobsDBSuccessRate' }
      }
    }
  ]);
};

aiJobSearchSchema.statics.findScheduledWeeklySearches = function() {
  return this.find({
    'schedule.isScheduled': true,
    'schedule.nextScheduledRun': { $lte: new Date() },
    status: 'running',
    'activeJobsConfig.apiCallsUsed': { $lt: 1000 }, // Has API calls remaining
    $or: [
      { 'schedule.pauseUntil': { $exists: false } },
      { 'schedule.pauseUntil': null },
      { 'schedule.pauseUntil': { $lte: new Date() } }
    ]
  });
};

// Find searches that need API limit reset
aiJobSearchSchema.statics.findSearchesNeedingApiReset = function() {
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  
  return this.find({
    'activeJobsConfig.lastApiCall': { $lt: firstOfMonth },
    'activeJobsConfig.apiCallsUsed': { $gt: 0 }
  });
};

// Get Active Jobs DB usage summary
aiJobSearchSchema.statics.getActiveJobsApiUsageSummary = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), searchApproach: '3-phase-intelligent-active-jobs-weekly' } },
    {
      $group: {
        _id: null,
        totalApiCalls: { $sum: '$activeJobsConfig.apiCallsUsed' },
        totalJobsFound: { $sum: '$totalJobsFound' },
        avgJobsPerApiCall: { $avg: { $divide: ['$totalJobsFound', { $max: ['$activeJobsConfig.apiCallsUsed', 1] }] } },
        totalCostSavings: { $sum: '$activeJobsConfig.costComparison.savingsPercent' },
        activeSearches: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        monthlyApiUsage: { $avg: '$activeJobsConfig.apiCallsUsed' },
        jobBoardsCovered: { $addToSet: '$searchMetrics.activeJobsDBJobBoardsCovered' },
        avgWeeklyJobs: { $avg: '$jobsFoundThisWeek' },
        totalWeeksActive: { $sum: { $size: '$weeklyStats' } }
      }
    }
  ]);
};

// Virtual for search performance with weekly Active Jobs DB focus
aiJobSearchSchema.virtual('weeklyActiveJobsPerformanceSummary').get(function() {
  return {
    searchApproach: this.searchApproach || '3-phase-intelligent-active-jobs-weekly',
    successRate: this.optimization?.successRate || 0,
    activeJobsApiEfficiency: this.optimization?.activeJobsApiEfficiency || 0,
    premiumAnalysisAccuracy: this.optimization?.premiumAnalysisAccuracy || 0,
    avgContentQuality: this.searchMetrics?.avgContentQuality || 'unknown',
    totalJobs: this.totalJobsFound,
    weeklyProgress: this.getWeeklyProgress(),
    avgJobsPerApiCall: this.totalJobsFound / Math.max(1, this.searchMetrics?.activeJobsDBCalls || 1),
    estimatedCost: this.aiUsage?.estimatedCost || 0,
    costBreakdown: this.aiUsage?.costBreakdown || {},
    costSavingsPercent: this.activeJobsConfig?.costComparison?.savingsPercent || 0,
    apiHealthStatus: this.activeJobsConfig?.apiHealth || 'not_configured',
    monthlyApiUsage: {
      used: this.activeJobsConfig?.apiCallsUsed || 0,
      limit: this.activeJobsConfig?.monthlyLimit || 1000,
      remaining: (this.activeJobsConfig?.monthlyLimit || 1000) - (this.activeJobsConfig?.apiCallsUsed || 0),
      percentUsed: Math.round(((this.activeJobsConfig?.apiCallsUsed || 0) / (this.activeJobsConfig?.monthlyLimit || 1000)) * 100)
    },
    jobBoardsCovered: this.searchMetrics?.activeJobsDBJobBoardsCovered || [],
    locationsSearched: this.searchCriteria?.searchLocations?.map(loc => loc.name) || [],
    salaryTrends: this.searchMetrics?.weeklyPerformance?.salaryTrends || {},
    weeklyStats: this.weeklyStats || [],
    isHighPerformance: (this.optimization?.successRate || 0) > 80 && 
                       (this.optimization?.activeJobsApiEfficiency || 0) > 0.5,
    qualityLevel: this.qualityLevel || 'active-jobs-weekly-enhanced'
  };
});

// Virtual for recent reasoning logs (for UI)
aiJobSearchSchema.virtual('recentActiveJobsLogs').get(function() {
  return this.reasoningLogs
    .filter(log => log.phase === 'active_jobs_discovery' || log.metadata?.apiProvider === 'active_jobs_db')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
});

// Virtual for Active Jobs DB health and status
aiJobSearchSchema.virtual('activeJobsApiStatus').get(function() {
  const remainingCalls = (this.activeJobsConfig?.monthlyLimit || 1000) - (this.activeJobsConfig?.apiCallsUsed || 0);
  const percentUsed = Math.round(((this.activeJobsConfig?.apiCallsUsed || 0) / (this.activeJobsConfig?.monthlyLimit || 1000)) * 100);
  
  let status = 'healthy';
  let message = 'Active Jobs DB API ready for weekly job discovery';
  
  if (this.activeJobsConfig?.apiHealth === 'not_configured') {
    status = 'not_configured';
    message = 'Active Jobs DB API keys not configured. Set RAPIDAPI_KEY in .env file.';
  } else if (remainingCalls <= 0) {
    status = 'rate_limited';
    message = 'Monthly API limit reached. Weekly searches will resume next month.';
  } else if (percentUsed > 90) {
    status = 'warning';
    message = `API usage high (${percentUsed}%). ${remainingCalls} calls remaining this month.`;
  } else if (percentUsed > 75) {
    status = 'caution';
    message = `API usage at ${percentUsed}%. ${remainingCalls} calls remaining this month.`;
  }
  
  const weeklyProgress = this.getWeeklyProgress();
  
  return {
    status,
    message,
    usage: {
      used: this.activeJobsConfig?.apiCallsUsed || 0,
      limit: this.activeJobsConfig?.monthlyLimit || 1000,
      remaining: remainingCalls,
      percentUsed: percentUsed
    },
    weeklyProgress: {
      jobsFound: weeklyProgress.jobsFound,
      weeklyLimit: weeklyProgress.weeklyLimit,
      remaining: weeklyProgress.remaining,
      percentage: weeklyProgress.percentage,
      isComplete: weeklyProgress.isComplete
    },
    nextReset: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    costSavings: this.activeJobsConfig?.costComparison?.savingsPercent || 0,
    nextScheduledRun: this.schedule?.nextScheduledRun,
    searchLocations: this.searchCriteria?.searchLocations?.map(loc => loc.name) || []
  };
});

// Virtual for salary analysis
aiJobSearchSchema.virtual('salaryAnalysis').get(function() {
  const jobsWithSalary = this.jobsFound.filter(job => job.salary && (job.salary.min || job.salary.max));
  
  if (jobsWithSalary.length === 0) {
    return {
      totalJobs: this.jobsFound.length,
      jobsWithSalary: 0,
      extractionRate: 0,
      salaryRange: null,
      averageSalary: null,
      currency: 'USD'
    };
  }
  
  const salaries = jobsWithSalary.map(job => {
    const min = job.salary.min || 0;
    const max = job.salary.max || min;
    return (min + max) / 2;
  }).filter(salary => salary > 0);
  
  const avgSalary = salaries.reduce((sum, salary) => sum + salary, 0) / salaries.length;
  const minSalary = Math.min(...jobsWithSalary.map(job => job.salary.min || job.salary.max).filter(Boolean));
  const maxSalary = Math.max(...jobsWithSalary.map(job => job.salary.max || job.salary.min).filter(Boolean));
  
  return {
    totalJobs: this.jobsFound.length,
    jobsWithSalary: jobsWithSalary.length,
    extractionRate: Math.round((jobsWithSalary.length / this.jobsFound.length) * 100),
    salaryRange: {
      min: minSalary,
      max: maxSalary,
      average: Math.round(avgSalary)
    },
    averageSalary: Math.round(avgSalary),
    currency: jobsWithSalary[0]?.salary?.currency || 'USD',
    salaryDistribution: {
      byLocation: this.getLocationSalaryDistribution(),
      byJobBoard: this.getJobBoardSalaryDistribution()
    }
  };
});

// Helper method for location salary distribution
aiJobSearchSchema.methods.getLocationSalaryDistribution = function() {
  const locationSalaries = {};
  
  this.jobsFound.forEach(job => {
    if (!job.salary || (!job.salary.min && !job.salary.max)) return;
    
    const location = job.location?.parsed?.city || job.location?.original || 'Unknown';
    const salary = ((job.salary.min || 0) + (job.salary.max || 0)) / 2;
    
    if (!locationSalaries[location]) {
      locationSalaries[location] = { salaries: [], count: 0 };
    }
    
    locationSalaries[location].salaries.push(salary);
    locationSalaries[location].count++;
  });
  
  return Object.entries(locationSalaries).map(([location, data]) => ({
    location,
    count: data.count,
    averageSalary: Math.round(data.salaries.reduce((sum, s) => sum + s, 0) / data.salaries.length),
    minSalary: Math.min(...data.salaries),
    maxSalary: Math.max(...data.salaries)
  })).sort((a, b) => b.averageSalary - a.averageSalary);
};

// Helper method for job board salary distribution
aiJobSearchSchema.methods.getJobBoardSalaryDistribution = function() {
  const jobBoardSalaries = {};
  
  this.jobsFound.forEach(job => {
    if (!job.salary || (!job.salary.min && !job.salary.max)) return;
    
    const jobBoard = job.jobBoardOrigin || job.sourcePlatform || 'Unknown';
    const salary = ((job.salary.min || 0) + (job.salary.max || 0)) / 2;
    
    if (!jobBoardSalaries[jobBoard]) {
      jobBoardSalaries[jobBoard] = { salaries: [], count: 0 };
    }
    
    jobBoardSalaries[jobBoard].salaries.push(salary);
    jobBoardSalaries[jobBoard].count++;
  });
  
  return Object.entries(jobBoardSalaries).map(([jobBoard, data]) => ({
    jobBoard,
    count: data.count,
    averageSalary: Math.round(data.salaries.reduce((sum, s) => sum + s, 0) / data.salaries.length),
    minSalary: Math.min(...data.salaries),
    maxSalary: Math.max(...data.salaries)
  })).sort((a, b) => b.count - a.count);
};

// MIGRATION METHODS - These help with cleanup and migration

// Static method to migrate old enum values (one-time cleanup)
aiJobSearchSchema.statics.migrateOldEnumValues = async function() {
  console.log('🔄 Migrating old enum values to new weekly model...');
  
  const updates = [];
  
  // Find documents with old enum values
  const oldSearches = await this.find({
    $or: [
      { searchType: { $in: ['adzuna_api'] } },
      { 'schedule.frequency': 'daily' },
      { searchApproach: { $regex: /adzuna|daily/ } },
      { qualityLevel: { $regex: /adzuna/ } }
    ]
  });
  
  for (const search of oldSearches) {
    const updateData = {};
    
    // Map old values to new values
    if (search.searchType === 'adzuna_api') {
      updateData.searchType = 'weekly_active_jobs';
    }
    
    if (search.schedule?.frequency === 'daily') {
      updateData['schedule.frequency'] = 'weekly';
    }
    
    if (search.searchApproach && search.searchApproach.includes('adzuna')) {
      updateData.searchApproach = '3-phase-intelligent-active-jobs-weekly';
    }
    
    if (search.qualityLevel && search.qualityLevel.includes('adzuna')) {
      updateData.qualityLevel = 'active-jobs-weekly-enhanced';
    }
    
    // Add weekly model defaults
    updateData.approachVersion = '5.0-weekly-active-jobs-location-salary';
    updateData.lastUpdateMessage = 'Auto-migrated to weekly Active Jobs model';
    updateData.lastUpdated = new Date();
    
    if (Object.keys(updateData).length > 0) {
      updates.push({
        updateOne: {
          filter: { _id: search._id },
          update: { $set: updateData }
        }
      });
    }
  }
  
  if (updates.length > 0) {
    await this.bulkWrite(updates);
    console.log(`✅ Migrated ${updates.length} AI searches to weekly model`);
  } else {
    console.log('✅ No searches needed migration');
  }
  
  return updates.length;
};

// Static method to clean up any invalid documents
aiJobSearchSchema.statics.cleanupInvalidDocuments = async function() {
  console.log('🧹 Cleaning up invalid AI search documents...');
  
  try {
    // Use updateMany with runValidators: false to fix enum violations
    const result = await this.updateMany(
      {
        $or: [
          { searchType: { $nin: ['basic', 'enhanced', 'premium', 'intelligent', 'weekly_active_jobs'] } },
          { 'schedule.frequency': { $nin: ['weekly'] } },
          { searchApproach: { $nin: [
            '3-phase-intelligent', 
            '3-phase-intelligent-real-boards',
            '3-phase-intelligent-claude-web-search',
            '3-phase-intelligent-active-jobs-weekly'
          ] } },
          { qualityLevel: { $nin: ['standard', 'premium', 'intelligent', 'claude-web-search', 'active-jobs-weekly-enhanced'] } }
        ]
      },
      {
        $set: {
          searchType: 'weekly_active_jobs',
          'schedule.frequency': 'weekly',
          searchApproach: '3-phase-intelligent-active-jobs-weekly',
          qualityLevel: 'active-jobs-weekly-enhanced',
          approachVersion: '5.0-weekly-active-jobs-location-salary',
          lastUpdateMessage: 'Auto-fixed invalid enum values for weekly model',
          lastUpdated: new Date()
        }
      },
      { runValidators: false } // Disable validation during cleanup
    );
    
    console.log(`✅ Cleaned up ${result.modifiedCount} documents with invalid enum values`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
};

// Instance method to fix this specific document
aiJobSearchSchema.methods.fixEnumValues = function() {
  // Auto-fix enum values for this document
  const enumMigrationMap = {
    searchType: {
      'adzuna_api': 'weekly_active_jobs',
      'basic': 'basic',
      'enhanced': 'enhanced', 
      'premium': 'premium',
      'intelligent': 'intelligent',
      'weekly_active_jobs': 'weekly_active_jobs'
    },
    frequency: {
      'daily': 'weekly',
      'weekly': 'weekly'
    },
    searchApproach: {
      '5-phase-legacy': '3-phase-intelligent',
      '3-phase-intelligent-adzuna-api': '3-phase-intelligent-active-jobs-weekly',
      '3-phase-intelligent': '3-phase-intelligent',
      '3-phase-intelligent-real-boards': '3-phase-intelligent-real-boards',
      '3-phase-intelligent-claude-web-search': '3-phase-intelligent-claude-web-search',
      '3-phase-intelligent-active-jobs-weekly': '3-phase-intelligent-active-jobs-weekly'
    },
    qualityLevel: {
      'adzuna-api-enhanced': 'active-jobs-weekly-enhanced',
      'standard': 'standard',
      'premium': 'premium',
      'intelligent': 'intelligent',
      'claude-web-search': 'claude-web-search',
      'active-jobs-weekly-enhanced': 'active-jobs-weekly-enhanced'
    }
  };

  // Fix enum values
  if (this.searchType && enumMigrationMap.searchType[this.searchType]) {
    this.searchType = enumMigrationMap.searchType[this.searchType];
  }

  if (this.schedule?.frequency && enumMigrationMap.frequency[this.schedule.frequency]) {
    this.schedule.frequency = enumMigrationMap.frequency[this.schedule.frequency];
  }

  if (this.searchApproach && enumMigrationMap.searchApproach[this.searchApproach]) {
    this.searchApproach = enumMigrationMap.searchApproach[this.searchApproach];
  }

  if (this.qualityLevel && enumMigrationMap.qualityLevel[this.qualityLevel]) {
    this.qualityLevel = enumMigrationMap.qualityLevel[this.qualityLevel];
  }

  // Set weekly model defaults
  this.schedule = this.schedule || {};
  this.schedule.frequency = 'weekly';
  this.searchApproach = '3-phase-intelligent-active-jobs-weekly';
  this.qualityLevel = 'active-jobs-weekly-enhanced';
  this.approachVersion = '5.0-weekly-active-jobs-location-salary';
  this.lastUpdateMessage = 'Fixed enum values for weekly model';
  this.lastUpdated = new Date();
  
  return this;
};

// Helper method to safely save with enum fixes
aiJobSearchSchema.methods.safeSave = async function() {
  try {
    // First try to fix enum values
    this.fixEnumValues();
    
    // Then save
    return await this.save();
  } catch (error) {
    console.error('Error in safeSave:', error);
    
    // If validation still fails, try without validation
    try {
      return await this.save({ validateBeforeSave: false });
    } catch (saveError) {
      console.error('Error in safeSave without validation:', saveError);
      throw saveError;
    }
  }
};

// Helper method to safely delete with enum fixes
aiJobSearchSchema.methods.safeDelete = async function() {
  try {
    // Try to fix enum values first
    this.fixEnumValues();
    
    // Then delete
    return await this.deleteOne();
  } catch (error) {
    console.error('Error in safeDelete:', error);
    
    // If that fails, use updateOne to mark as deleted instead
    try {
      return await this.constructor.updateOne(
        { _id: this._id },
        { 
          $set: { 
            status: 'cancelled',
            lastUpdateMessage: 'Marked as cancelled due to enum validation issues',
            lastUpdated: new Date()
          }
        },
        { runValidators: false }
      );
    } catch (updateError) {
      console.error('Error in safeDelete fallback:', updateError);
      throw updateError;
    }
  }
};

// Static method to safely delete by ID
aiJobSearchSchema.statics.safeDeleteById = async function(searchId, userId) {
  try {
    console.log(`🗑️ Safely deleting AI search ${searchId} for user ${userId}`);
    
    // First try to find and fix the document
    const search = await this.findOne({ _id: searchId, userId });
    
    if (!search) {
      throw new Error('AI search not found');
    }
    
    // Try the safe delete method
    return await search.safeDelete();
    
  } catch (error) {
    console.error('Error in safeDeleteById:', error);
    
    // Final fallback: direct database operation
    try {
      const result = await this.deleteOne({ _id: searchId, userId });
      console.log(`✅ Direct delete successful for ${searchId}`);
      return result;
    } catch (directError) {
      console.error('Error in direct delete:', directError);
      throw new Error(`Failed to delete AI search: ${directError.message}`);
    }
  }
};

// Static method to safely update status (for pause/resume)
aiJobSearchSchema.statics.safeUpdateStatus = async function(searchId, userId, status, message) {
  try {
    console.log(`🔄 Safely updating AI search ${searchId} status to ${status}`);
    
    // Use updateOne with runValidators: false to avoid enum issues
    const result = await this.updateOne(
      { _id: searchId, userId },
      {
        $set: {
          status: status,
          lastUpdateMessage: message,
          lastUpdated: new Date(),
          // Fix any enum issues while we're at it
          searchType: 'weekly_active_jobs',
          'schedule.frequency': 'weekly',
          searchApproach: '3-phase-intelligent-active-jobs-weekly',
          qualityLevel: 'active-jobs-weekly-enhanced',
          approachVersion: '5.0-weekly-active-jobs-location-salary'
        }
      },
      { runValidators: false }
    );
    
    if (result.matchedCount === 0) {
      throw new Error('AI search not found');
    }
    
    console.log(`✅ Successfully updated AI search ${searchId} status`);
    return result;
    
  } catch (error) {
    console.error('Error in safeUpdateStatus:', error);
    throw new Error(`Failed to update AI search status: ${error.message}`);
  }
};

// Add error handling middleware for better debugging
aiJobSearchSchema.post('save', function(error, doc, next) {
  if (error.name === 'ValidationError') {
    console.error('AI Search Validation Error:', error.errors);
    
    // Try to auto-fix and save again
    try {
      doc.fixEnumValues();
      doc.save({ validateBeforeSave: false }).then(() => {
        console.log('✅ Auto-fixed validation errors and saved');
        next();
      }).catch(saveError => {
        console.error('❌ Auto-fix failed:', saveError);
        next(error);
      });
    } catch (fixError) {
      console.error('❌ Auto-fix attempt failed:', fixError);
      next(error);
    }
  } else {
    next(error);
  }
});

// Add middleware to log successful operations
aiJobSearchSchema.post('save', function(doc) {
  console.log(`✅ AI Search saved: ${doc._id} (${doc.status}) - ${doc.searchApproach}`);
});

aiJobSearchSchema.post('deleteOne', function(result) {
  console.log(`🗑️ AI Search deleted: ${result.deletedCount} document(s)`);
});

// Export the model
module.exports = mongoose.model('AiJobSearch', aiJobSearchSchema);