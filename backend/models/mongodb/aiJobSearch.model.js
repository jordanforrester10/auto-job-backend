// models/mongodb/aiJobSearch.model.js - UPDATED WITH NEW SEARCH APPROACHES
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
    enum: ['basic', 'enhanced', 'premium', 'intelligent'],
    default: 'intelligent'
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
    }
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
    phase2Duration: Number, // Job discovery time
    phase3Duration: Number, // Premium analysis time
    totalSearchDuration: Number,
    webSearchSuccessRate: Number, // Percentage of successful web searches
    premiumAnalysisSuccessRate: Number // Percentage of successful premium analyses
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
        '3-phase-intelligent-claude-web-search'
      ],
      default: '3-phase-intelligent-claude-web-search'
    },
    phase1Results: { // Career Analysis
      jobTitles: [String],
      keywords: [String],
      experienceLevel: String,
      duration: Number
    },
    phase2Results: { // Job Discovery (Claude Web Search)
      jobUrlsFound: Number,
      successfulExtractions: Number,
      averageContentLength: Number,
      duration: Number,
      webSearchQueries: Number,
      platformsSearched: [String]
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
      phase2Cost: String, // "$0.30-0.50"
      phase3Cost: String, // "$0.01-0.02"
      totalCost: String   // "$0.36-0.57"
    },
    errors: [String],
    qualityMetrics: {
      averageMatchScore: Number,
      contentQualityDistribution: {
        high: Number,
        medium: Number,
        low: Number
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
        'web_search_failed',
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
      enum: ['career_analysis', 'web_search_discovery', 'content_extraction', 'premium_analysis', 'job_saving', 'general']
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
    // Phase 2: Claude Web Search Discovery
    claudeWebSearches: {
      type: Number,
      default: 0
    },
    claudeContentExtractions: {
      type: Number,
      default: 0
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
      phase2Cost: Number, // Claude web search discovery
      phase3Cost: Number, // Premium analysis
      totalCost: Number
    }
  },
  
  // Search optimization
  optimization: {
    successRate: Number, // percentage of successful job discoveries
    avgRelevanceScore: Number,
    webSearchEfficiency: Number, // Jobs found per web search
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
    }
  },
  
  // User preferences learned over time
  learnedPreferences: {
    preferredCompanies: [String],
    avoidedCompanies: [String],
    preferredLocations: [String],
    successfulKeywords: [String],
    // Learned from web search discovery
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
    }
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
    lastSuccessfulSearchTime: Date
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
    }
  },
  
  // AI Reasoning Logs for search process tracking
  reasoningLogs: [{
    phase: {
      type: String,
      enum: [
        'initialization', 
        'career_analysis', 
        'intelligent_discovery', // Web search + content extraction
        'web_search_discovery',  // NEW: Specific for web search
        'content_extraction',    // NEW: Specific for content extraction
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
      
      // Phase 2: Web Search Discovery
      webSearchQueries: Number,
      jobUrlsFound: Number,
      successfulExtractions: Number,
      averageContentLength: Number,
      platformsSearched: [String],
      
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
      
      // Quality indicators
      matchScore: Number,
      contentQuality: String,
      analysisAccuracy: String,
      
      // NEW: Web search specific metadata
      searchQuery: String,
      searchResultsCount: Number,
      webSearchMethod: String,
      discoveryPlatform: String
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
  
  // UPDATED: Search approach metadata with new enum values
  searchApproach: {
    type: String,
    enum: [
      '5-phase-legacy', 
      '3-phase-intelligent', 
      '3-phase-intelligent-real-boards',
      '3-phase-intelligent-claude-web-search'
    ],
    default: '3-phase-intelligent-claude-web-search'
  },
  approachVersion: {
    type: String,
    default: '3.2-claude-web-search-api'
  },
  qualityLevel: {
    type: String,
    enum: ['standard', 'premium', 'intelligent', 'claude-web-search'],
    default: 'claude-web-search'
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
// NEW: Indexes for Claude web search approach
aiJobSearchSchema.index({ searchApproach: 1 });
aiJobSearchSchema.index({ qualityLevel: 1 });
aiJobSearchSchema.index({ 'reasoningLogs.metadata.qualityLevel': 1 });
aiJobSearchSchema.index({ 'reasoningLogs.metadata.webSearchMethod': 1 });

// Middleware
aiJobSearchSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  
  // Update performance metrics
  if (this.isModified('jobsFound')) {
    this.updatePerformanceMetrics();
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
  this.optimization.webSearchEfficiency = jobs.length / Math.max(this.searchMetrics.totalSearchesPerformed, 1);
  
  this.searchMetrics.lastPerformanceUpdate = new Date();
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
    extractionMethod: jobData.extractionMethod || 'claude_web_search_discovery',
    premiumAnalysis: jobData.premiumAnalysis || true
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

// UPDATED: Track AI usage for Claude web search approach
aiJobSearchSchema.methods.updateAiUsage = function(phase, type, tokens = 0, cost = 0) {
  switch(phase) {
    case 'career_analysis':
      if (type === 'openai') this.aiUsage.openaiCareerAnalysis += 1;
      if (!this.aiUsage.costBreakdown.phase1Cost) this.aiUsage.costBreakdown.phase1Cost = 0;
      this.aiUsage.costBreakdown.phase1Cost += cost;
      break;
      
    case 'web_search_discovery':
    case 'intelligent_discovery':
      if (type === 'claude_web_search') this.aiUsage.claudeWebSearches += 1;
      if (type === 'claude_content_extraction') this.aiUsage.claudeContentExtractions += 1;
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
  
  return this.save();
};

// UPDATED: Method to add reasoning log for Claude web search approach
aiJobSearchSchema.methods.addReasoningLog = function(phase, message, details = {}, success = true, duration = 0) {
  // Helper function to sanitize numeric values
  const sanitizeNumeric = (value) => {
    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
      return 0;
    }
    return value;
  };
  
  // Sanitize all numeric fields in details and metadata
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
      aiModel: details.aiModel || this.getDefaultModelForPhase(phase),
      
      // Phase-specific metadata (sanitized)
      targetJobTitles: details.targetJobTitles,
      targetKeywords: details.targetKeywords,
      experienceLevel: details.experienceLevel,
      
      // Web search specific metadata
      webSearchQueries: sanitizeNumeric(details.webSearchQueries),
      jobUrlsFound: sanitizeNumeric(details.jobUrlsFound),
      successfulExtractions: sanitizeNumeric(details.successfulExtractions),
      averageContentLength: sanitizeNumeric(details.averageContentLength),
      platformsSearched: details.platformsSearched,
      
      // Analysis metadata
      jobsAnalyzed: sanitizeNumeric(details.jobsAnalyzed),
      successfulAnalyses: sanitizeNumeric(details.successfulAnalyses),
      averageSkillsFound: sanitizeNumeric(details.averageSkillsFound),
      
      // General metadata
      errorDetails: details.error,
      companyName: details.company || details.companyName,
      jobTitle: details.jobTitle,
      contentLength: sanitizeNumeric(details.contentLength),
      extractionMethod: details.extractionMethod,
      batchSize: sanitizeNumeric(details.batchSize),
      qualityLevel: details.qualityLevel || 'claude-web-search',
      estimatedCost: details.costEstimate || details.estimatedCost,
      tokenUsage: sanitizeNumeric(details.tokenUsage),
      matchScore: sanitizeNumeric(details.matchScore),
      contentQuality: details.contentQuality,
      analysisAccuracy: details.analysisAccuracy,
      
      // Web search specific
      searchQuery: details.searchQuery,
      searchResultsCount: sanitizeNumeric(details.searchResultsCount),
      webSearchMethod: details.webSearchMethod || 'claude_web_search_api',
      discoveryPlatform: details.discoveryPlatform || details.platform
    }
  };
  
  this.reasoningLogs.push(reasoningLog);
  
  // Keep only the last 100 logs to prevent document from growing too large
  if (this.reasoningLogs.length > 100) {
    this.reasoningLogs = this.reasoningLogs.slice(-100);
  }
  
  return this.save();
};

// UPDATED: Helper method to get default model for each phase
aiJobSearchSchema.methods.getDefaultModelForPhase = function(phase) {
  switch(phase) {
    case 'career_analysis': return 'gpt-4-turbo';
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

// UPDATED: Method to get performance summary for Claude web search approach
aiJobSearchSchema.methods.getClaudeWebSearchPerformanceSummary = function() {
  return {
    searchApproach: this.searchApproach || '3-phase-intelligent-claude-web-search',
    approachVersion: this.approachVersion || '3.2-claude-web-search-api',
    qualityLevel: this.qualityLevel || 'claude-web-search',
    totalJobsFound: this.totalJobsFound,
    successRate: this.optimization?.successRate || 0,
    webSearchEfficiency: this.optimization?.webSearchEfficiency || 0,
    premiumAnalysisAccuracy: this.optimization?.premiumAnalysisAccuracy || 0,
    avgContentQuality: this.searchMetrics?.avgContentQuality || 'unknown',
    costBreakdown: this.aiUsage?.costBreakdown || {},
    lastSuccessfulSearch: this.lastSearchDate,
    isHighPerformance: (this.optimization?.successRate || 0) > 80 && 
                       (this.optimization?.webSearchEfficiency || 0) > 0.5
  };
};

aiJobSearchSchema.methods.scheduleNextRun = function(frequency = 'daily', preferredTime = '09:00') {
  const now = new Date();
  const nextRun = new Date();
  
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
  
  const [hours, minutes] = preferredTime.split(':');
  nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  this.schedule.nextScheduledRun = nextRun;
  this.schedule.frequency = frequency;
  this.schedule.preferredTime = preferredTime;
  this.schedule.isScheduled = true;
  
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
  this.lastUpdateMessage = 'Search resumed by user - using Claude web search approach';
  return this.save();
};

// Static methods
aiJobSearchSchema.statics.findActiveClaudeWebSearches = function() {
  return this.find({ 
    status: 'running',
    searchApproach: '3-phase-intelligent-claude-web-search',
    $or: [
      { 'schedule.nextScheduledRun': { $lte: new Date() } },
      { 'schedule.isScheduled': false }
    ]
  });
};

aiJobSearchSchema.statics.findUserSearches = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to get AI searches with reasoning logs for Claude web search approach
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

// UPDATED: Get search statistics for Claude web search approach
aiJobSearchSchema.statics.getSearchStatistics = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalSearches: { $sum: 1 },
        claudeWebSearches: { $sum: { $cond: [{ $eq: ['$searchApproach', '3-phase-intelligent-claude-web-search'] }, 1, 0] } },
        activeSearches: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
        totalJobsFound: { $sum: '$totalJobsFound' },
        avgJobsPerSearch: { $avg: '$totalJobsFound' },
        totalPremiumAnalyses: { $sum: '$searchMetrics.premiumAnalysesCompleted' },
        totalAiUsage: { $sum: '$aiUsage.totalTokensUsed' },
        estimatedTotalCost: { $sum: '$aiUsage.estimatedCost' },
        avgSuccessRate: { $avg: '$optimization.successRate' },
        avgWebSearchEfficiency: { $avg: '$optimization.webSearchEfficiency' }
      }
    }
  ]);
};

aiJobSearchSchema.statics.findScheduledSearches = function() {
  return this.find({
    'schedule.isScheduled': true,
    'schedule.nextScheduledRun': { $lte: new Date() },
    status: 'running',
    $or: [
      { 'schedule.pauseUntil': { $exists: false } },
      { 'schedule.pauseUntil': null },
      { 'schedule.pauseUntil': { $lte: new Date() } }
    ]
  });
};

// Virtual for search performance
aiJobSearchSchema.virtual('claudeWebSearchPerformanceSummary').get(function() {
  return {
    searchApproach: this.searchApproach || '3-phase-intelligent-claude-web-search',
    successRate: this.optimization?.successRate || 0,
    webSearchEfficiency: this.optimization?.webSearchEfficiency || 0,
    premiumAnalysisAccuracy: this.optimization?.premiumAnalysisAccuracy || 0,
    avgContentQuality: this.searchMetrics?.avgContentQuality || 'unknown',
    totalJobs: this.totalJobsFound,
    avgJobsPerSearch: this.totalJobsFound / Math.max(1, this.searchHistory.length),
    estimatedCost: this.aiUsage?.estimatedCost || 0,
    costBreakdown: this.aiUsage?.costBreakdown || {},
    isHighPerformance: (this.optimization?.successRate || 0) > 80 && 
                       (this.optimization?.webSearchEfficiency || 0) > 0.5,
    qualityLevel: this.qualityLevel || 'claude-web-search'
  };
});

// Virtual for recent reasoning logs (for UI)
aiJobSearchSchema.virtual('recentClaudeWebSearchLogs').get(function() {
  return this.reasoningLogs
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
});

module.exports = mongoose.model('AiJobSearch', aiJobSearchSchema);