// models/mongodb/aiJobSearch.model.js - UPDATED WITH ADZUNA API SUPPORT
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
    experienceLevel: String,
    salaryRange: {
      min: Number,
      max: Number,
      currency: String
    },
    jobTypes: [String], // ['FULL_TIME', 'CONTRACT', etc.]
    industries: [String],
    companySizes: [String],
    workEnvironment: String // 'remote', 'hybrid', 'onsite', 'any'
  },
  status: {
    type: String,
    enum: ['running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'running'
  },
  searchType: {
    type: String,
    enum: ['basic', 'enhanced', 'premium', 'intelligent', 'adzuna_api'],
    default: 'adzuna_api'
  },
  dailyLimit: {
    type: Number,
    default: 10
  },
  jobsFoundToday: {
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
  
  // Enhanced tracking
  jobsFound: [{
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    title: String,
    company: String,
    foundAt: Date,
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
    // NEW: Adzuna API specific fields
    apiSource: {
      type: String,
      enum: ['adzuna_aggregator', 'claude_web_search', 'manual'],
      default: 'adzuna_aggregator'
    },
    adzunaId: String,
    jobBoardOrigin: String, // Indeed, LinkedIn, Monster, etc.
    directCompanyPosting: Boolean,
    salaryPredicted: Boolean
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
    avgProcessingTime: Number, // in seconds
    lastPerformanceUpdate: Date,
    // Phase specific metrics
    phase1Duration: Number, // Career analysis time
    phase2Duration: Number, // Job discovery time (Adzuna API)
    phase3Duration: Number, // Premium analysis time
    totalSearchDuration: Number,
    // NEW: Adzuna API specific metrics
    adzunaApiCalls: {
      type: Number,
      default: 0
    },
    adzunaSuccessRate: Number, // Percentage of successful API calls
    adzunaJobBoardsCovered: [String], // Which job boards returned results
    costSavings: Number // Cost savings vs Claude web search
  },
  
  // Search history
  searchHistory: [{
    searchDate: Date,
    searchApproach: {
      type: String,
      enum: [
        '5-phase-legacy', 
        '3-phase-intelligent', 
        '3-phase-intelligent-real-boards',
        '3-phase-intelligent-claude-web-search',
        '3-phase-intelligent-adzuna-api'
      ],
      default: '3-phase-intelligent-adzuna-api'
    },
    phase1Results: { // Career Analysis
      jobTitles: [String],
      keywords: [String],
      experienceLevel: String,
      duration: Number
    },
    phase2Results: { // Adzuna API Job Discovery
      apiCallsMade: Number,
      jobsReturned: Number,
      successfulApiCalls: Number,
      jobBoardsCovered: [String], // Indeed, LinkedIn, Monster, etc.
      averageContentLength: Number,
      duration: Number,
      costSavings: String // vs Claude web search
    },
    phase3Results: { // Premium Analysis
      jobsAnalyzed: Number,
      successfulAnalyses: Number,
      averageSkillsFound: Number,
      duration: Number
    },
    totalDuration: Number,
    costBreakdown: {
      phase1Cost: String, // "$0.05"
      phase2Cost: String, // "$0.00 (Free API)"
      phase3Cost: String, // "$0.01-0.02"
      totalCost: String,  // "$0.06-0.07"
      savings: String     // "87% cost reduction vs Claude"
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
        'adzuna_api_failed',
        'adzuna_auth_failed',
        'adzuna_rate_limited',
        'job_discovery_failed', 
        'premium_analysis_failed',
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
      enum: ['career_analysis', 'adzuna_api_discovery', 'web_search_discovery', 'content_extraction', 'premium_analysis', 'job_saving', 'general']
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
    // Phase 2: Adzuna API (No AI cost!)
    adzunaApiCalls: {
      type: Number,
      default: 0
    },
    adzunaApiCost: {
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
      phase1Cost: Number, // Career analysis
      phase2Cost: Number, // Adzuna API (always $0)
      phase3Cost: Number, // Premium analysis
      totalCost: Number,
      costSavings: Number // vs Claude web search
    }
  },
  
  // Search optimization
  optimization: {
    successRate: Number, // percentage of successful job discoveries
    avgRelevanceScore: Number,
    adzunaApiEfficiency: Number, // Jobs found per API call
    premiumAnalysisAccuracy: Number, // Successful analyses percentage
    bestSearchTimes: [String], // times of day with best results
    recommendedAdjustments: [String],
    // Quality metrics
    contentQualityTrend: String, // 'improving', 'stable', 'declining'
    matchScoreTrend: String,
    userSatisfactionIndicators: {
      viewedJobsRate: Number,
      appliedJobsRate: Number,
      favoriteJobsRate: Number
    },
    // NEW: Adzuna API specific optimization
    optimalJobTitles: [String], // Job titles that work best with Adzuna
    bestPerformingJobBoards: [String], // Which job boards yield best results
    locationOptimization: [String] // Best locations for API searches
  },
  
  // User preferences learned over time
  learnedPreferences: {
    preferredCompanies: [String],
    avoidedCompanies: [String],
    preferredLocations: [String],
    successfulKeywords: [String],
    // Learned from Adzuna API discovery
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
    // NEW: Adzuna API preferences
    preferredJobBoards: [String], // Indeed, LinkedIn, Monster, etc.
    bestPerformingSearchTerms: [String],
    optimalSalaryRanges: [{
      min: Number,
      max: Number,
      resultCount: Number
    }]
  },
  
  // Schedule and automation
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'bi-weekly', 'monthly'],
      default: 'daily'
    },
    preferredTime: String, // '09:00' format
    timezone: String,
    nextScheduledRun: Date,
    pauseUntil: Date,
    intelligentScheduling: {
      type: Boolean,
      default: false
    },
    optimalSearchDays: [String], // Days with best results
    lastSuccessfulSearchTime: Date,
    // NEW: API usage optimization
    adzunaRateLimitTracking: {
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
    matchScoreThreshold: {
      type: Number,
      default: 75
    },
    maxEmailsPerDay: {
      type: Number,
      default: 5
    },
    // Intelligent notifications
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
    // NEW: Adzuna API specific notifications
    adzunaApiFailures: {
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
        'adzuna_api_discovery',    // NEW: Adzuna API specific phase
        'intelligent_discovery',   // Legacy support
        'web_search_discovery',    // Legacy support
        'content_extraction',      // Legacy support
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
      type: Number, // Duration in milliseconds
      default: 0
    },
    metadata: {
      // Phase 1: Career Analysis
      targetJobTitles: [String],
      targetKeywords: [String],
      experienceLevel: String,
      
      // Phase 2: Adzuna API Discovery
      apiProvider: String, // 'adzuna_aggregator'
      apiCallsMade: Number,
      jobsReturned: Number,
      jobBoardsCovered: [String],
      averageContentLength: Number,
      
      // Phase 3: Premium Analysis
      jobsAnalyzed: Number,
      successfulAnalyses: Number,
      averageSkillsFound: Number,
      
      // General metadata
      aiModel: String,
      errorDetails: String,
      companyName: String,
      jobTitle: String,
      contentLength: Number,
      extractionMethod: String,
      batchSize: Number,
      qualityLevel: String,
      
      // Cost tracking per log entry
      estimatedCost: String,
      tokenUsage: Number,
      costSavings: String, // vs Claude web search
      
      // Quality indicators
      matchScore: Number,
      contentQuality: String,
      analysisAccuracy: String,
      
      // NEW: Adzuna API specific metadata
      adzunaJobId: String,
      originalJobBoard: String, // Indeed, LinkedIn, etc.
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
  
  // UPDATED: Search approach metadata with Adzuna support
  searchApproach: {
    type: String,
    enum: [
      '5-phase-legacy', 
      '3-phase-intelligent', 
      '3-phase-intelligent-real-boards',
      '3-phase-intelligent-claude-web-search',
      '3-phase-intelligent-adzuna-api'
    ],
    default: '3-phase-intelligent-adzuna-api'
  },
  approachVersion: {
    type: String,
    default: '4.0-adzuna-api-integration'
  },
  qualityLevel: {
    type: String,
    enum: ['standard', 'premium', 'intelligent', 'claude-web-search', 'adzuna-api-enhanced'],
    default: 'adzuna-api-enhanced'
  },
  
  // NEW: Adzuna API specific configuration and tracking
  adzunaConfig: {
    apiCallsUsed: {
      type: Number,
      default: 0
    },
    monthlyLimit: {
      type: Number,
      default: 1000 // Free tier limit
    },
    lastApiCall: Date,
    apiHealth: {
      type: String,
      enum: ['healthy', 'degraded', 'down', 'not_configured'],
      default: 'not_configured'
    },
    preferredJobBoards: [String], // User's preferred job boards
    searchOptimizations: {
      bestPerformingTitles: [String],
      optimalLocationTerms: [String],
      effectiveKeywords: [String]
    },
    costComparison: {
      previousCostPerSearch: Number, // Claude web search cost
      currentCostPerSearch: Number,  // Adzuna API cost
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
// NEW: Indexes for Adzuna API approach
aiJobSearchSchema.index({ searchApproach: 1 });
aiJobSearchSchema.index({ qualityLevel: 1 });
aiJobSearchSchema.index({ 'adzunaConfig.apiHealth': 1 });
aiJobSearchSchema.index({ 'jobsFound.apiSource': 1 });
aiJobSearchSchema.index({ 'jobsFound.jobBoardOrigin': 1 });

// Middleware
aiJobSearchSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  
  // Update performance metrics
  if (this.isModified('jobsFound')) {
    this.updatePerformanceMetrics();
  }
  
  // Update Adzuna API usage tracking
  if (this.isModified('adzunaConfig.apiCallsUsed')) {
    this.updateAdzunaUsageMetrics();
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
  
  // Calculate Adzuna API specific metrics
  const adzunaJobs = jobs.filter(job => job.apiSource === 'adzuna_aggregator');
  if (adzunaJobs.length > 0) {
    this.searchMetrics.adzunaJobBoardsCovered = [...new Set(adzunaJobs.map(job => job.jobBoardOrigin))];
    this.searchMetrics.adzunaSuccessRate = (adzunaJobs.length / this.searchMetrics.adzunaApiCalls) * 100;
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
  this.optimization.adzunaApiEfficiency = jobs.length / Math.max(this.searchMetrics.adzunaApiCalls, 1);
  
  this.searchMetrics.lastPerformanceUpdate = new Date();
};

// NEW: Update Adzuna API usage metrics
aiJobSearchSchema.methods.updateAdzunaUsageMetrics = function() {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  // Reset monthly counter if it's a new month
  if (!this.adzunaConfig.lastApiCall || 
      this.adzunaConfig.lastApiCall.getMonth() !== currentMonth ||
      this.adzunaConfig.lastApiCall.getFullYear() !== currentYear) {
    this.adzunaConfig.apiCallsUsed = 0;
  }
  
  // Calculate remaining calls for the month
  const remainingCalls = this.adzunaConfig.monthlyLimit - this.adzunaConfig.apiCallsUsed;
  
  // Update cost comparison
  const previousCost = 0.43; // Average Claude web search cost
  const currentCost = 0.06;  // Adzuna API + GPT-4o cost
  this.adzunaConfig.costComparison = {
    previousCostPerSearch: previousCost,
    currentCostPerSearch: currentCost,
    savingsPercent: Math.round(((previousCost - currentCost) / previousCost) * 100)
  };
  
  this.adzunaConfig.lastApiCall = new Date();
};

aiJobSearchSchema.methods.addJobFound = function(jobData) {
  this.jobsFound.push({
    jobId: jobData.jobId,
    title: jobData.title,
    company: jobData.company,
    foundAt: new Date(),
    contentQuality: jobData.contentQuality || 'medium',
    extractionSuccess: jobData.extractionSuccess !== false,
    matchScore: jobData.matchScore,
    sourceUrl: jobData.sourceUrl,
    sourcePlatform: jobData.sourcePlatform,
    extractionMethod: jobData.extractionMethod || 'adzuna_api_enhanced',
    premiumAnalysis: jobData.premiumAnalysis || true,
    // NEW: Adzuna API fields
    apiSource: jobData.apiSource || 'adzuna_aggregator',
    adzunaId: jobData.adzunaId,
    jobBoardOrigin: jobData.jobBoardOrigin || jobData.sourcePlatform,
    directCompanyPosting: jobData.directCompanyPosting || false,
    salaryPredicted: jobData.salaryPredicted || false
  });
  
  this.totalJobsFound += 1;
  this.jobsFoundToday += 1;
  
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

// UPDATED: Track AI usage for Adzuna API approach
aiJobSearchSchema.methods.updateAiUsage = function(phase, type, tokens = 0, cost = 0) {
  switch(phase) {
    case 'career_analysis':
      if (type === 'openai') this.aiUsage.openaiCareerAnalysis += 1;
      if (!this.aiUsage.costBreakdown.phase1Cost) this.aiUsage.costBreakdown.phase1Cost = 0;
      this.aiUsage.costBreakdown.phase1Cost += cost;
      break;
      
    case 'adzuna_api_discovery':
      if (type === 'adzuna_api') {
        this.aiUsage.adzunaApiCalls += 1;
        this.searchMetrics.adzunaApiCalls += 1;
        this.adzunaConfig.apiCallsUsed += 1;
      }
      // Adzuna API is free, so no cost added
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
  
  // Calculate cost savings vs Claude web search
  const claudeCost = 0.43; // Estimated Claude web search cost
  this.aiUsage.costBreakdown.costSavings = claudeCost - this.aiUsage.costBreakdown.totalCost;
  
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
      // USER-FRIENDLY METADATA (no technical details)
      
      // Phase-specific user-friendly info
      targetJobTitles: details.targetJobTitles,
      experienceLevel: details.experienceLevel,
      
      // Job discovery user-friendly info
      totalJobs: sanitizeNumeric(details.totalJobs || details.totalJobsFound),
      jobsReturned: sanitizeNumeric(details.jobsReturned),
      jobBoards: details.jobBoards || details.jobBoardsCovered,
      searchAttempts: sanitizeNumeric(details.searchAttempts),
      
      // Analysis user-friendly info
      jobsAnalyzed: sanitizeNumeric(details.jobsAnalyzed),
      successfulAnalyses: sanitizeNumeric(details.successfulAnalyses),
      averageSkillsFound: sanitizeNumeric(details.averageSkillsFound),
      
      // Job details (user-friendly)
      companyName: details.company || details.companyName,
      jobTitle: details.jobTitle,
      skillsFound: sanitizeNumeric(details.skillsFound),
      analysisQuality: details.analysisQuality || details.qualityLevel,
      
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
      
      // Remove all technical details that users don't need to see:
      // - No API provider info
      // - No model names (GPT-4o, Claude, etc.)
      // - No cost estimates
      // - No token usage
      // - No algorithm versions
      // - No error stack traces
      // - No technical extraction methods
      
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

// Also update the helper method to return user-friendly descriptions
aiJobSearchSchema.methods.getDefaultModelForPhase = function(phase) {
  // Return user-friendly descriptions instead of technical model names
  switch(phase) {
    case 'career_analysis': return 'Career Analyzer';
    case 'adzuna_api_discovery': return 'Job Board Search';
    case 'web_search_discovery':
    case 'intelligent_discovery':
    case 'content_extraction': return 'Job Discovery';
    case 'premium_analysis': return 'Job Analyzer';
    default: return 'Processing';
  }
};

// UPDATED: Helper method to get default model for each phase
aiJobSearchSchema.methods.getDefaultModelForPhase = function(phase) {
  switch(phase) {
    case 'career_analysis': return 'gpt-4-turbo';
    case 'adzuna_api_discovery': return 'adzuna-api';
    case 'web_search_discovery':
    case 'intelligent_discovery':
    case 'content_extraction': return 'claude-3.5-sonnet';
    case 'premium_analysis': return 'gpt-4o';
    default: return 'unknown';
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

// UPDATED: Method to get performance summary for Adzuna API approach
aiJobSearchSchema.methods.getAdzunaApiPerformanceSummary = function() {
  return {
    searchApproach: this.searchApproach || '3-phase-intelligent-adzuna-api',
    approachVersion: this.approachVersion || '4.0-adzuna-api-integration',
    qualityLevel: this.qualityLevel || 'adzuna-api-enhanced',
    totalJobsFound: this.totalJobsFound,
    successRate: this.optimization?.successRate || 0,
    adzunaApiEfficiency: this.optimization?.adzunaApiEfficiency || 0,
    premiumAnalysisAccuracy: this.optimization?.premiumAnalysisAccuracy || 0,
    avgContentQuality: this.searchMetrics?.avgContentQuality || 'unknown',
    costBreakdown: this.aiUsage?.costBreakdown || {},
    costSavings: this.adzunaConfig?.costComparison?.savingsPercent || 0,
    lastSuccessfulSearch: this.lastSearchDate,
    apiHealth: this.adzunaConfig?.apiHealth || 'not_configured',
    monthlyApiUsage: {
      used: this.adzunaConfig?.apiCallsUsed || 0,
      limit: this.adzunaConfig?.monthlyLimit || 1000,
      remaining: (this.adzunaConfig?.monthlyLimit || 1000) - (this.adzunaConfig?.apiCallsUsed || 0)
    },
    jobBoardsCovered: this.searchMetrics?.adzunaJobBoardsCovered || [],
    isHighPerformance: (this.optimization?.successRate || 0) > 80 && 
                       (this.optimization?.adzunaApiEfficiency || 0) > 0.5
  };
};

// Schedule next run with Adzuna API considerations
aiJobSearchSchema.methods.scheduleNextRun = function(frequency = 'daily', preferredTime = '09:00') {
  const now = new Date();
  const nextRun = new Date();
  
  // Check if we have API calls remaining for the month
  const remainingCalls = (this.adzunaConfig?.monthlyLimit || 1000) - (this.adzunaConfig?.apiCallsUsed || 0);
  
  if (remainingCalls <= 0) {
    // If no API calls remaining, schedule for next month
    nextRun.setMonth(now.getMonth() + 1);
    nextRun.setDate(1);
    this.addReasoningLog('initialization', 'Scheduled for next month - Adzuna API monthly limit reached', {
      remainingCalls: 0,
      nextResetDate: nextRun
    });
  } else {
    // Normal scheduling
    switch(frequency) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(now.getDate() + 7);
        break;
      case 'bi-weekly':
        nextRun.setDate(now.getDate() + 14);
        break;
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1);
        break;
    }
  }
  
  const [hours, minutes] = preferredTime.split(':');
  nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  this.schedule.nextScheduledRun = nextRun;
  this.schedule.frequency = frequency;
  this.schedule.preferredTime = preferredTime;
  this.schedule.isScheduled = true;
  
  // Update rate limit tracking
  this.schedule.adzunaRateLimitTracking = {
    callsThisMonth: this.adzunaConfig?.apiCallsUsed || 0,
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
  this.lastUpdateMessage = 'Search paused by user';
  return this.save();
};

aiJobSearchSchema.methods.resume = function() {
  this.status = 'running';
  this.schedule.pauseUntil = null;
  this.lastUpdateMessage = 'Search resumed by user - using Adzuna API approach';
  return this.save();
};

// Static methods
aiJobSearchSchema.statics.findActiveAdzunaSearches = function() {
  return this.find({ 
    status: 'running',
    searchApproach: '3-phase-intelligent-adzuna-api',
    'adzunaConfig.apiCallsUsed': { $lt: 1000 }, // Has API calls remaining
    $or: [
      { 'schedule.nextScheduledRun': { $lte: new Date() } },
      { 'schedule.isScheduled': false }
    ]
  });
};

aiJobSearchSchema.statics.findUserSearches = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to get AI searches with reasoning logs for Adzuna API approach
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

// UPDATED: Get search statistics for Adzuna API approach
aiJobSearchSchema.statics.getSearchStatistics = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        adzunaApiSearches: { $sum: { $cond: [{ $eq: ['$searchApproach', '3-phase-intelligent-adzuna-api'] }, 1, 0] } },
        claudeWebSearches: { $sum: { $cond: [{ $eq: ['$searchApproach', '3-phase-intelligent-claude-web-search'] }, 1, 0] } },
        activeSearches: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        totalJobsFound: { $sum: '$totalJobsFound' },
        avgJobsPerSearch: { $avg: '$totalJobsFound' },
        totalPremiumAnalyses: { $sum: '$searchMetrics.premiumAnalysesCompleted' },
        totalAiUsage: { $sum: '$aiUsage.totalTokensUsed' },
        estimatedTotalCost: { $sum: '$aiUsage.estimatedCost' },
        totalCostSavings: { $sum: '$aiUsage.costBreakdown.costSavings' },
        avgSuccessRate: { $avg: '$optimization.successRate' },
        avgAdzunaApiEfficiency: { $avg: '$optimization.adzunaApiEfficiency' },
        totalAdzunaApiCalls: { $sum: '$searchMetrics.adzunaApiCalls' },
        avgAdzunaSuccessRate: { $avg: '$searchMetrics.adzunaSuccessRate' }
      }
    }
  ]);
};

aiJobSearchSchema.statics.findScheduledSearches = function() {
  return this.find({
    'schedule.isScheduled': true,
    'schedule.nextScheduledRun': { $lte: new Date() },
    status: 'running',
    'adzunaConfig.apiCallsUsed': { $lt: 1000 }, // Has API calls remaining
    $or: [
      { 'schedule.pauseUntil': { $exists: false } },
      { 'schedule.pauseUntil': null },
      { 'schedule.pauseUntil': { $lte: new Date() } }
    ]
  });
};

// NEW: Find searches that need API limit reset
aiJobSearchSchema.statics.findSearchesNeedingApiReset = function() {
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  
  return this.find({
    'adzunaConfig.lastApiCall': { $lt: firstOfMonth },
    'adzunaConfig.apiCallsUsed': { $gt: 0 }
  });
};

// NEW: Get Adzuna API usage summary
aiJobSearchSchema.statics.getAdzunaApiUsageSummary = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), searchApproach: '3-phase-intelligent-adzuna-api' } },
    {
      $group: {
        _id: null,
        totalApiCalls: { $sum: '$adzunaConfig.apiCallsUsed' },
        totalJobsFound: { $sum: '$totalJobsFound' },
        avgJobsPerApiCall: { $avg: { $divide: ['$totalJobsFound', { $max: ['$adzunaConfig.apiCallsUsed', 1] }] } },
        totalCostSavings: { $sum: '$adzunaConfig.costComparison.savingsPercent' },
        activeSearches: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        monthlyApiUsage: { $avg: '$adzunaConfig.apiCallsUsed' },
        jobBoardsCovered: { $addToSet: '$searchMetrics.adzunaJobBoardsCovered' }
      }
    }
  ]);
};

// Virtual for search performance with Adzuna API focus
aiJobSearchSchema.virtual('adzunaApiPerformanceSummary').get(function() {
  return {
    searchApproach: this.searchApproach || '3-phase-intelligent-adzuna-api',
    successRate: this.optimization?.successRate || 0,
    adzunaApiEfficiency: this.optimization?.adzunaApiEfficiency || 0,
    premiumAnalysisAccuracy: this.optimization?.premiumAnalysisAccuracy || 0,
    avgContentQuality: this.searchMetrics?.avgContentQuality || 'unknown',
    totalJobs: this.totalJobsFound,
    avgJobsPerApiCall: this.totalJobsFound / Math.max(1, this.searchMetrics?.adzunaApiCalls || 1),
    estimatedCost: this.aiUsage?.estimatedCost || 0,
    costBreakdown: this.aiUsage?.costBreakdown || {},
    costSavingsPercent: this.adzunaConfig?.costComparison?.savingsPercent || 0,
    apiHealthStatus: this.adzunaConfig?.apiHealth || 'not_configured',
    monthlyApiUsage: {
      used: this.adzunaConfig?.apiCallsUsed || 0,
      limit: this.adzunaConfig?.monthlyLimit || 1000,
      remaining: (this.adzunaConfig?.monthlyLimit || 1000) - (this.adzunaConfig?.apiCallsUsed || 0),
      percentUsed: Math.round(((this.adzunaConfig?.apiCallsUsed || 0) / (this.adzunaConfig?.monthlyLimit || 1000)) * 100)
    },
    jobBoardsCovered: this.searchMetrics?.adzunaJobBoardsCovered || [],
    isHighPerformance: (this.optimization?.successRate || 0) > 80 && 
                       (this.optimization?.adzunaApiEfficiency || 0) > 0.5,
    qualityLevel: this.qualityLevel || 'adzuna-api-enhanced'
  };
});

// Virtual for recent reasoning logs (for UI)
aiJobSearchSchema.virtual('recentAdzunaApiLogs').get(function() {
  return this.reasoningLogs
    .filter(log => log.phase === 'adzuna_api_discovery' || log.metadata?.apiProvider === 'adzuna_aggregator')
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
});

// NEW: Virtual for Adzuna API health and status
aiJobSearchSchema.virtual('adzunaApiStatus').get(function() {
  const remainingCalls = (this.adzunaConfig?.monthlyLimit || 1000) - (this.adzunaConfig?.apiCallsUsed || 0);
  const percentUsed = Math.round(((this.adzunaConfig?.apiCallsUsed || 0) / (this.adzunaConfig?.monthlyLimit || 1000)) * 100);
  
  let status = 'healthy';
  let message = 'Adzuna API ready for job discovery';
  
  if (this.adzunaConfig?.apiHealth === 'not_configured') {
    status = 'not_configured';
    message = 'Adzuna API keys not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env file.';
  } else if (remainingCalls <= 0) {
    status = 'rate_limited';
    message = 'Monthly API limit reached. Searches will resume next month.';
  } else if (percentUsed > 90) {
    status = 'warning';
    message = `API usage high (${percentUsed}%). ${remainingCalls} calls remaining this month.`;
  } else if (percentUsed > 75) {
    status = 'caution';
    message = `API usage at ${percentUsed}%. ${remainingCalls} calls remaining this month.`;
  }
  
  return {
    status,
    message,
    usage: {
      used: this.adzunaConfig?.apiCallsUsed || 0,
      limit: this.adzunaConfig?.monthlyLimit || 1000,
      remaining: remainingCalls,
      percentUsed: percentUsed
    },
    nextReset: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    costSavings: this.adzunaConfig?.costComparison?.savingsPercent || 0
  };
});

module.exports = mongoose.model('AiJobSearch', aiJobSearchSchema);