// models/mongodb/job.model.js - UPDATED WITH ACTIVE JOBS DB SUPPORT
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    index: true
  },
  company: {
    type: String,
    required: true,
    index: true
  },
  location: {
    city: String,
    state: String,
    country: String,
    remote: Boolean,
    fullAddress: String
  },
  description: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    index: true
  },
  sourcePlatform: {
    type: String,
    enum: [
      'MANUAL',
      'AI_FOUND', 
      'AI_FOUND_OPTIMIZED', 
      'AI_FOUND_INTELLIGENT',
      // Real job board integration platforms
      'AI_FOUND_GREENHOUSE',
      'AI_FOUND_LEVER',
      'AI_FOUND_INDEED',
      // Adzuna API platform support (DEPRECATED - keeping for legacy data)
      'AI_FOUND_ADZUNA_INDEED',
      'AI_FOUND_ADZUNA_LINKEDIN', 
      'AI_FOUND_ADZUNA_MONSTER',
      'AI_FOUND_ADZUNA_CAREERBUILDER',
      'AI_FOUND_ADZUNA_GLASSDOOR',
      'AI_FOUND_ADZUNA_ZIPRECRUITER',
      'AI_FOUND_ADZUNA_DICE',
      'AI_FOUND_ADZUNA_PARTNER',
      'AI_FOUND_ADZUNA_DIRECT',
      'AI_FOUND_ADZUNA_OTHER',
      // NEW: Active Jobs DB platform support (CURRENT)
      'ACTIVE_JOBS_DB_DIRECT',
      'ACTIVE_JOBS_DB_GREENHOUSE',
      'ACTIVE_JOBS_DB_LEVER',
      'ACTIVE_JOBS_DB_WORKDAY',
      'ACTIVE_JOBS_DB_SMARTRECRUITERS',
      'ACTIVE_JOBS_DB_JOBVITE',
      'ACTIVE_JOBS_DB_BAMBOOHR',
      'ACTIVE_JOBS_DB_ICIMS',
      'ACTIVE_JOBS_DB_INDEED',
      'ACTIVE_JOBS_DB_LINKEDIN',
      'ACTIVE_JOBS_DB_GLASSDOOR',
      'ACTIVE_JOBS_DB_MONSTER',
      'ACTIVE_JOBS_DB_CAREERBUILDER',
      'ACTIVE_JOBS_DB_ZIPRECRUITER',
      'ACTIVE_JOBS_DB_DICE',
      'ACTIVE_JOBS_DB_COMPANY_DIRECT',
      'ACTIVE_JOBS_DB_OTHER'
    ],
    required: true
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    isExplicit: Boolean
  },
  jobType: {
    type: String,
    enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'TEMPORARY'],
    default: 'FULL_TIME'
  },
  applicationStatus: {
    type: String,
    enum: ['NOT_APPLIED', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'WITHDRAWN'],
    default: 'NOT_APPLIED',
    index: true
  },
  applicationDate: Date,
  isAiGenerated: {
    type: Boolean,
    default: false,
    index: true
  },
  aiSearchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AiJobSearch',
    index: true
  },
  
  // Enhanced parsed data with ACTIVE JOBS DB support
  parsedData: {
    requirements: [String],
    responsibilities: [String],
    qualifications: {
      required: [String],
      preferred: [String]
    },
    benefits: [String],
    keySkills: [{
      name: String,
      importance: {
        type: Number,
        min: 1,
        max: 10
      },
      category: {
        type: String,
        enum: ['technical', 'soft', 'business', 'domain', 'certification']
      },
      skillType: {
        type: String,
        enum: [
          'programming', 
          'management', 
          'analytical', 
          'communication', 
          'design', 
          'general',
          'knowledge',
          'extracted',
          'technical',
          'soft',
          'business',
          'certification',
          'tool',
          'framework',
          'language',
          'platform',
          'methodology',
          'domain'
        ]
      }
    }],
    experienceLevel: {
      type: String,
      enum: ['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive']
    },
    yearsOfExperience: {
      minimum: Number,
      preferred: Number
    },
    educationRequirements: [String],
    workArrangement: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite', 'unknown']
    },
    industryContext: String,
    roleCategory: String,
    seniorityLevel: String,
    technicalComplexity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    leadershipRequired: Boolean,
    certifications: [String],
    softSkills: [String],
    technicalSkills: [String],
    toolsAndTechnologies: [String],
    companySize: String,
    extractedAt: Date,
    extractionMethod: String,
    
    // Real job board specific data (LEGACY - keeping for existing data)
    realJobBoardData: {
      platform: String,
      originalUrl: String,
      postedDate: Date,
      jobBoardId: String,
      category: String,
      contractType: String,
      contractTime: String,
      salaryPredicted: Boolean,
      directCompanyPosting: Boolean,
      discoveryMethod: String,
      atsSystemUsed: String,
      hiringManagerInfo: String,
      teamInfo: String,
      techStackDetails: [String],
      companyBenefits: [String],
      growthOpportunities: [String]
    },
    
    // Adzuna API specific data (LEGACY - keeping for existing data)
    adzunaApiData: {
      platform: String,
      originalUrl: String,
      postedDate: Date,
      adzunaId: String,
      category: String,
      contractType: String,
      contractTime: String,
      salaryPredicted: Boolean,
      directCompanyPosting: Boolean,
      discoveryMethod: String
    },
    
    // NEW: Active Jobs DB specific data (CURRENT)
    activeJobsDBData: {
      platform: String,
      originalUrl: String,
      postedDate: Date,
      activeJobsDBId: String,
      category: String,
      job_type: String,
      experience_level: String,
      company_url: String,
      apply_url: String,
      remote: Boolean,
      discoveryMethod: String,
      isDirectEmployer: Boolean,
      atsSystemDetected: String,
      qualityScore: Number,
      premiumFeatures: {
        directEmployerLink: Boolean,
        hourlyUpdated: Boolean,
        verifiedPosting: Boolean,
        enhancedMetadata: Boolean
      }
    },
    
    // Analysis metadata
    analysisMetadata: {
      analyzedAt: Date,
      algorithmVersion: String,
      model: String,
      originalLength: Number,
      extractedSkillsCount: Number,
      costOptimized: Boolean,
      analysisType: String,
      estimatedCost: String,
      qualityLevel: String,
      sourceJobBoard: String,
      completeValidationApplied: Boolean,
      processingTime: Number,
      tokensUsed: Number,
      directEmployerAccess: Boolean,
      premiumDatabase: Boolean
    }
  },
  
  // Enhanced AI search metadata with Active Jobs DB support
  aiSearchMetadata: {
    searchScore: Number,
    discoveryMethod: String,
    extractionSuccess: Boolean,
    contentQuality: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    premiumAnalysis: Boolean,
    intelligentDiscovery: Boolean,
    realJobBoardDiscovery: Boolean, // LEGACY
    adzunaApiDiscovery: Boolean, // LEGACY
    activeJobsDBDiscovery: Boolean, // NEW: Current premium discovery method
    phase: String,
    originalPlatform: String,
    postedDate: Date,
    workArrangement: String,
    experienceLevel: String,
    department: String,
    companySize: String,
    industry: String,
    keyRequirements: [String],
    matchReason: String,
    benefits: [String],
    techStack: [String],
    relevanceScore: Number,
    isDirectEmployer: Boolean,
    
    // Real job board specific metadata (LEGACY)
    realJobBoardMetadata: {
      discoveryMethod: String,
      jobBoardProvider: String,
      atsSystemDetected: String,
      companyVerified: Boolean,
      postingQuality: String,
      directFromCompany: Boolean,
      enhancedContentAvailable: Boolean
    },
    
    // Adzuna API specific metadata (LEGACY)
    adzunaApiMetadata: {
      discoveryMethod: String,
      apiProvider: String,
      jobBoardsCovered: String,
      apiHealth: String,
      costEfficient: Boolean,
      reliability: String,
      completeValidationApplied: Boolean
    },
    
    // NEW: Active Jobs DB specific metadata (CURRENT)
    activeJobsDBMetadata: {
      discoveryMethod: String,
      apiProvider: String,
      premiumDatabaseAccess: Boolean,
      directEmployerLinks: Boolean,
      hourlyUpdates: Boolean,
      qualityGuaranteed: Boolean,
      bulkJobRetrieval: Boolean,
      worksForAllJobTypes: Boolean,
      atsSystemsSupported: [String],
      jobBoardsCovered: [String],
      companyCountCovered: Number,
      dataFreshness: String,
      verificationLevel: String,
      premiumFeatures: {
        directEmployerAccess: Boolean,
        enhancedJobMetadata: Boolean,
        realTimeUpdates: Boolean,
        qualityFiltering: Boolean,
        atsIntegration: Boolean
      }
    }
  },
  
  // Analysis status for tracking background processing
  analysisStatus: {
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'error'],
      default: 'pending'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    message: String,
    startedAt: Date,
    completedAt: Date,
    updatedAt: Date,
    canViewJob: {
      type: Boolean,
      default: true
    },
    skillsFound: Number,
    experienceLevel: String,
    modelUsed: String,
    analysisType: String,
    error: String,
    estimatedCompletion: Date,
    searchApproach: String,
    qualityLevel: String,
    isRealJobBoardDiscovery: Boolean, // LEGACY
    isActiveJobsDBDiscovery: Boolean, // NEW
    sourceJobBoard: String,
    isDirectEmployer: Boolean,
    premiumDatabase: Boolean
  },
  
  // Match analysis results
  matchAnalysis: {
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    },
    overallScore: Number,
    categoryScores: {
      skills: Number,
      experience: Number,
      education: Number
    },
    matchedSkills: [{
      skill: String,
      found: Boolean,
      importance: Number,
      resumeStrength: Number
    }],
    missingSkills: [{
      skill: String,
      importance: Number,
      suggestionToAdd: String
    }],
    strengthAreas: [String],
    improvementAreas: [String],
    lastAnalyzed: Date,
    analysisMetadata: {
      algorithmVersion: String,
      modelUsed: String
    }
  },
  
  // Cover letter reference
  coverLetterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CoverLetter'
  },
  
  // Notes and interactions
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // User interactions
  userInteractions: {
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    bookmarked: {
      type: Boolean,
      default: false
    },
    bookmarkedAt: Date,
    applied: {
      type: Boolean,
      default: false
    },
    appliedAt: Date,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String
  }
}, {
  timestamps: true
});

// Indexes for better performance
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ userId: 1, applicationStatus: 1 });
jobSchema.index({ userId: 1, sourcePlatform: 1 });
jobSchema.index({ userId: 1, 'parsedData.experienceLevel': 1 });
jobSchema.index({ userId: 1, 'parsedData.workArrangement': 1 });
jobSchema.index({ title: 'text', company: 'text', description: 'text' });
jobSchema.index({ 'parsedData.keySkills.name': 1 });
jobSchema.index({ aiSearchId: 1 });
jobSchema.index({ sourceUrl: 1 });

// Real job board specific indexes (LEGACY)
jobSchema.index({ 'aiSearchMetadata.realJobBoardDiscovery': 1 });
jobSchema.index({ 'aiSearchMetadata.adzunaApiDiscovery': 1 });

// NEW: Active Jobs DB specific indexes (CURRENT)
jobSchema.index({ 'aiSearchMetadata.activeJobsDBDiscovery': 1 });
jobSchema.index({ 'aiSearchMetadata.isDirectEmployer': 1 });
jobSchema.index({ 'aiSearchMetadata.originalPlatform': 1 });
jobSchema.index({ 'aiSearchMetadata.relevanceScore': -1 });
jobSchema.index({ 'analysisStatus.premiumDatabase': 1 });

// Compound indexes for common queries
jobSchema.index({ userId: 1, sourcePlatform: 1, createdAt: -1 });
jobSchema.index({ userId: 1, applicationStatus: 1, createdAt: -1 });
jobSchema.index({ userId: 1, 'matchAnalysis.overallScore': -1 });
jobSchema.index({ userId: 1, 'aiSearchMetadata.activeJobsDBDiscovery': 1, createdAt: -1 });

// Virtual for checking if job is from real job board (LEGACY)
jobSchema.virtual('isFromRealJobBoard').get(function() {
  return this.sourcePlatform && (
    this.sourcePlatform.includes('AI_FOUND_GREENHOUSE') ||
    this.sourcePlatform.includes('AI_FOUND_LEVER') ||
    this.sourcePlatform.includes('AI_FOUND_INDEED')
  );
});

// Virtual for checking if job is from Adzuna API (LEGACY)
jobSchema.virtual('isFromAdzunaApi').get(function() {
  return this.sourcePlatform && this.sourcePlatform.includes('AI_FOUND_ADZUNA');
});

// NEW: Virtual for checking if job is from Active Jobs DB (CURRENT)
jobSchema.virtual('isFromActiveJobsDB').get(function() {
  return this.sourcePlatform && this.sourcePlatform.includes('ACTIVE_JOBS_DB');
});

// Enhanced virtual for getting source platform name
jobSchema.virtual('sourceJobBoardName').get(function() {
  // Active Jobs DB (CURRENT)
  if (this.isFromActiveJobsDB) {
    if (this.sourcePlatform.includes('GREENHOUSE')) return 'Greenhouse (Active Jobs DB)';
    if (this.sourcePlatform.includes('LEVER')) return 'Lever (Active Jobs DB)';
    if (this.sourcePlatform.includes('WORKDAY')) return 'Workday (Active Jobs DB)';
    if (this.sourcePlatform.includes('SMARTRECRUITERS')) return 'SmartRecruiters (Active Jobs DB)';
    if (this.sourcePlatform.includes('JOBVITE')) return 'Jobvite (Active Jobs DB)';
    if (this.sourcePlatform.includes('BAMBOOHR')) return 'BambooHR (Active Jobs DB)';
    if (this.sourcePlatform.includes('ICIMS')) return 'iCIMS (Active Jobs DB)';
    if (this.sourcePlatform.includes('INDEED')) return 'Indeed (Active Jobs DB)';
    if (this.sourcePlatform.includes('LINKEDIN')) return 'LinkedIn (Active Jobs DB)';
    if (this.sourcePlatform.includes('GLASSDOOR')) return 'Glassdoor (Active Jobs DB)';
    if (this.sourcePlatform.includes('MONSTER')) return 'Monster (Active Jobs DB)';
    if (this.sourcePlatform.includes('CAREERBUILDER')) return 'CareerBuilder (Active Jobs DB)';
    if (this.sourcePlatform.includes('ZIPRECRUITER')) return 'ZipRecruiter (Active Jobs DB)';
    if (this.sourcePlatform.includes('DICE')) return 'Dice (Active Jobs DB)';
    if (this.sourcePlatform.includes('COMPANY_DIRECT')) return 'Company Direct (Active Jobs DB)';
    return 'Active Jobs DB Premium';
  }
  
  // Real job board (LEGACY)
  if (this.isFromRealJobBoard) {
    if (this.sourcePlatform.includes('GREENHOUSE')) return 'Greenhouse';
    if (this.sourcePlatform.includes('LEVER')) return 'Lever';
    if (this.sourcePlatform.includes('INDEED')) return 'Indeed';
  }
  
  // Adzuna API (LEGACY)
  if (this.isFromAdzunaApi) {
    if (this.sourcePlatform.includes('INDEED')) return 'Indeed (Adzuna)';
    if (this.sourcePlatform.includes('LINKEDIN')) return 'LinkedIn (Adzuna)';
    if (this.sourcePlatform.includes('MONSTER')) return 'Monster (Adzuna)';
    if (this.sourcePlatform.includes('CAREERBUILDER')) return 'CareerBuilder (Adzuna)';
    if (this.sourcePlatform.includes('GLASSDOOR')) return 'Glassdoor (Adzuna)';
    if (this.sourcePlatform.includes('ZIPRECRUITER')) return 'ZipRecruiter (Adzuna)';
    if (this.sourcePlatform.includes('DICE')) return 'Dice (Adzuna)';
    return 'Adzuna Partner';
  }
  
  return 'Manual';
});

// Enhanced virtual for job quality score with Active Jobs DB premium scoring
jobSchema.virtual('qualityScore').get(function() {
  let score = 50; // Base score
  
  // Active Jobs DB premium bonus (CURRENT - highest quality)
  if (this.isFromActiveJobsDB) score += 35;
  // Real job board bonus (LEGACY)
  else if (this.isFromRealJobBoard) score += 25;
  // Adzuna API bonus (LEGACY)
  else if (this.isFromAdzunaApi) score += 20;
  
  // Content quality
  if (this.aiSearchMetadata?.contentQuality === 'high') score += 15;
  else if (this.aiSearchMetadata?.contentQuality === 'medium') score += 10;
  
  // Premium analysis bonus
  if (this.aiSearchMetadata?.premiumAnalysis) score += 10;
  
  // Direct employer bonus (Active Jobs DB advantage)
  if (this.aiSearchMetadata?.isDirectEmployer) score += 15;
  
  // Relevance score bonus
  if (this.aiSearchMetadata?.relevanceScore > 80) score += 5;
  
  return Math.min(score, 100);
});

// Method to check if job analysis is complete
jobSchema.methods.isAnalysisComplete = function() {
  return this.analysisStatus?.status === 'completed' &&
         this.parsedData && 
         Object.keys(this.parsedData).length > 0 && 
         !this.parsedData.analysisError;
};

// NEW: Method to get Active Jobs DB specific data (CURRENT)
jobSchema.methods.getActiveJobsDBData = function() {
  if (!this.isFromActiveJobsDB) return null;
  
  return {
    platform: this.sourceJobBoardName,
    originalUrl: this.parsedData?.activeJobsDBData?.originalUrl,
    postedDate: this.parsedData?.activeJobsDBData?.postedDate,
    activeJobsDBId: this.parsedData?.activeJobsDBData?.activeJobsDBId,
    category: this.parsedData?.activeJobsDBData?.category,
    isDirectEmployer: this.parsedData?.activeJobsDBData?.isDirectEmployer || false,
    company_url: this.parsedData?.activeJobsDBData?.company_url,
    apply_url: this.parsedData?.activeJobsDBData?.apply_url,
    remote: this.parsedData?.activeJobsDBData?.remote,
    experience_level: this.parsedData?.activeJobsDBData?.experience_level,
    discoveryMethod: this.parsedData?.activeJobsDBData?.discoveryMethod || 'premium_active_jobs_db_direct',
    atsSystemDetected: this.parsedData?.activeJobsDBData?.atsSystemDetected,
    qualityScore: this.parsedData?.activeJobsDBData?.qualityScore,
    premiumFeatures: this.parsedData?.activeJobsDBData?.premiumFeatures || {
      directEmployerLink: false,
      hourlyUpdated: true,
      verifiedPosting: true,
      enhancedMetadata: true
    }
  };
};

// Method to get real job board specific data (LEGACY)
jobSchema.methods.getRealJobBoardData = function() {
  if (!this.isFromRealJobBoard) return null;
  
  return {
    platform: this.sourceJobBoardName,
    originalUrl: this.parsedData?.realJobBoardData?.originalUrl,
    postedDate: this.parsedData?.realJobBoardData?.postedDate,
    jobBoardId: this.parsedData?.realJobBoardData?.jobBoardId,
    category: this.parsedData?.realJobBoardData?.category,
    directCompanyPosting: this.parsedData?.realJobBoardData?.directCompanyPosting || false,
    discoveryMethod: this.parsedData?.realJobBoardData?.discoveryMethod || 'real_job_board_integration',
    atsSystemUsed: this.parsedData?.realJobBoardData?.atsSystemUsed,
    techStackDetails: this.parsedData?.realJobBoardData?.techStackDetails || [],
    companyBenefits: this.parsedData?.realJobBoardData?.companyBenefits || []
  };
};

// Method to get Adzuna API specific data (LEGACY)
jobSchema.methods.getAdzunaApiData = function() {
  if (!this.isFromAdzunaApi) return null;
  
  return {
    platform: this.sourceJobBoardName,
    originalUrl: this.parsedData?.adzunaApiData?.originalUrl,
    postedDate: this.parsedData?.adzunaApiData?.postedDate,
    adzunaId: this.parsedData?.adzunaApiData?.adzunaId,
    category: this.parsedData?.adzunaApiData?.category,
    directCompanyPosting: this.parsedData?.adzunaApiData?.directCompanyPosting || false,
    discoveryMethod: this.parsedData?.adzunaApiData?.discoveryMethod || 'adzuna_api_aggregation'
  };
};

// Method to update user interaction
jobSchema.methods.recordUserInteraction = function(interactionType, data = {}) {
  if (!this.userInteractions) {
    this.userInteractions = { viewCount: 0 };
  }
  
  switch (interactionType) {
    case 'view':
      this.userInteractions.viewCount += 1;
      this.userInteractions.lastViewed = new Date();
      break;
    case 'bookmark':
      this.userInteractions.bookmarked = true;
      this.userInteractions.bookmarkedAt = new Date();
      break;
    case 'unbookmark':
      this.userInteractions.bookmarked = false;
      this.userInteractions.bookmarkedAt = null;
      break;
    case 'apply':
      this.userInteractions.applied = true;
      this.userInteractions.appliedAt = new Date();
      this.applicationStatus = 'APPLIED';
      this.applicationDate = new Date();
      break;
    case 'rate':
      this.userInteractions.rating = data.rating;
      this.userInteractions.feedback = data.feedback;
      break;
  }
  
  return this.save();
};

// Static method to find jobs from real job boards (LEGACY)
jobSchema.statics.findRealJobBoardJobs = function(userId, options = {}) {
  const query = {
    userId,
    sourcePlatform: {
      $in: ['AI_FOUND_GREENHOUSE', 'AI_FOUND_LEVER', 'AI_FOUND_INDEED']
    }
  };
  
  if (options.jobBoard) {
    query.sourcePlatform = `AI_FOUND_${options.jobBoard.toUpperCase()}`;
  }
  
  if (options.dateRange) {
    query.createdAt = {
      $gte: options.dateRange.start,
      $lte: options.dateRange.end
    };
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find jobs from Adzuna API (LEGACY)
jobSchema.statics.findAdzunaApiJobs = function(userId, options = {}) {
  const query = {
    userId,
    sourcePlatform: {
      $regex: /^AI_FOUND_ADZUNA/
    }
  };
  
  if (options.jobBoard) {
    query.sourcePlatform = `AI_FOUND_ADZUNA_${options.jobBoard.toUpperCase()}`;
  }
  
  if (options.dateRange) {
    query.createdAt = {
      $gte: options.dateRange.start,
      $lte: options.dateRange.end
    };
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// NEW: Static method to find jobs from Active Jobs DB (CURRENT)
jobSchema.statics.findActiveJobsDBJobs = function(userId, options = {}) {
  const query = {
    userId,
    sourcePlatform: {
      $regex: /^ACTIVE_JOBS_DB/
    }
  };
  
  if (options.jobBoard) {
    query.sourcePlatform = `ACTIVE_JOBS_DB_${options.jobBoard.toUpperCase()}`;
  }
  
  if (options.directEmployerOnly) {
    query['aiSearchMetadata.isDirectEmployer'] = true;
  }
  
  if (options.dateRange) {
    query.createdAt = {
      $gte: options.dateRange.start,
      $lte: options.dateRange.end
    };
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Enhanced static method to get job discovery statistics
jobSchema.statics.getJobDiscoveryStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: '$sourcePlatform',
        count: { $sum: 1 },
        avgQualityScore: { $avg: '$aiSearchMetadata.searchScore' },
        avgRelevanceScore: { $avg: '$aiSearchMetadata.relevanceScore' },
        totalViews: { $sum: '$userInteractions.viewCount' },
        directEmployerJobs: {
          $sum: {
            $cond: [{ $eq: ['$aiSearchMetadata.isDirectEmployer', true] }, 1, 0]
          }
        },
        appliedJobs: {
          $sum: {
            $cond: [{ $eq: ['$applicationStatus', 'APPLIED'] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        discoveryMethod: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 'MANUAL'] }, then: 'Manual' },
              // Active Jobs DB (CURRENT)
              { case: { $regex: ['$_id', /ACTIVE_JOBS_DB_GREENHOUSE/] }, then: 'Greenhouse (Active Jobs DB)' },
              { case: { $regex: ['$_id', /ACTIVE_JOBS_DB_LEVER/] }, then: 'Lever (Active Jobs DB)' },
              { case: { $regex: ['$_id', /ACTIVE_JOBS_DB_WORKDAY/] }, then: 'Workday (Active Jobs DB)' },
              { case: { $regex: ['$_id', /ACTIVE_JOBS_DB_INDEED/] }, then: 'Indeed (Active Jobs DB)' },
              { case: { $regex: ['$_id', /ACTIVE_JOBS_DB_LINKEDIN/] }, then: 'LinkedIn (Active Jobs DB)' },
              { case: { $regex: ['$_id', /ACTIVE_JOBS_DB/] }, then: 'Active Jobs DB Premium' },
              // Real job board (LEGACY)
              { case: { $regex: ['$_id', /AI_FOUND_GREENHOUSE/] }, then: 'Greenhouse (Legacy)' },
              { case: { $regex: ['$_id', /AI_FOUND_LEVER/] }, then: 'Lever (Legacy)' },
              { case: { $regex: ['$_id', /AI_FOUND_INDEED/] }, then: 'Indeed (Legacy)' },
              // Adzuna API (LEGACY)
              { case: { $regex: ['$_id', /AI_FOUND_ADZUNA/] }, then: 'Adzuna API (Legacy)' }
            ],
            default: 'AI Discovery'
          }
        },
        count: 1,
        avgQualityScore: { $round: ['$avgQualityScore', 1] },
        avgRelevanceScore: { $round: ['$avgRelevanceScore', 1] },
        totalViews: 1,
        directEmployerJobs: 1,
        appliedJobs: 1,
        applicationRate: {
          $round: [{ $multiply: [{ $divide: ['$appliedJobs', '$count'] }, 100] }, 1]
        },
        directEmployerRate: {
          $round: [{ $multiply: [{ $divide: ['$directEmployerJobs', '$count'] }, 100] }, 1]
        },
        isPremiumSource: {
          $cond: [{ $regex: ['$_id', /ACTIVE_JOBS_DB/] }, true, false]
        }
      }
    }
  ]);
};

// Pre-save middleware
jobSchema.pre('save', function(next) {
  // Auto-detect Active Jobs DB from source platform (CURRENT)
  if (this.isModified('sourcePlatform') && this.isFromActiveJobsDB) {
    if (!this.aiSearchMetadata) this.aiSearchMetadata = {};
    this.aiSearchMetadata.activeJobsDBDiscovery = true;
    this.aiSearchMetadata.originalPlatform = this.sourceJobBoardName;
    this.aiSearchMetadata.premiumAnalysis = true;
  }
  
  // Auto-detect real job board from source platform (LEGACY)
  if (this.isModified('sourcePlatform') && this.isFromRealJobBoard) {
    if (!this.aiSearchMetadata) this.aiSearchMetadata = {};
    this.aiSearchMetadata.realJobBoardDiscovery = true;
    this.aiSearchMetadata.originalPlatform = this.sourceJobBoardName;
  }
  
  // Auto-detect Adzuna API from source platform (LEGACY)
  if (this.isModified('sourcePlatform') && this.isFromAdzunaApi) {
    if (!this.aiSearchMetadata) this.aiSearchMetadata = {};
    this.aiSearchMetadata.adzunaApiDiscovery = true;
    this.aiSearchMetadata.originalPlatform = this.sourceJobBoardName;
  }
  
  // Ensure job board data consistency
  if (this.isFromActiveJobsDB && this.parsedData?.activeJobsDBData) {
    this.parsedData.activeJobsDBData.platform = this.sourceJobBoardName;
  }
  
  if (this.isFromRealJobBoard && this.parsedData?.realJobBoardData) {
    this.parsedData.realJobBoardData.platform = this.sourceJobBoardName;
  }
  
  if (this.isFromAdzunaApi && this.parsedData?.adzunaApiData) {
    this.parsedData.adzunaApiData.platform = this.sourceJobBoardName;
  }
  
  next();
});

// Post-save middleware for analytics
jobSchema.post('save', function(doc) {
  // Analytics events for job board tracking
  if (doc.isFromActiveJobsDB && doc.isNew) {
    console.log(`📊 New Active Jobs DB premium job saved: ${doc.title} from ${doc.sourceJobBoardName} (Relevance: ${doc.aiSearchMetadata?.relevanceScore || 'N/A'}%)${doc.aiSearchMetadata?.isDirectEmployer ? ' [DIRECT EMPLOYER]' : ''}`);
  }
  
  if (doc.isFromRealJobBoard && doc.isNew) {
    console.log(`📊 New real job board job saved: ${doc.title} from ${doc.sourceJobBoardName} (Relevance: ${doc.aiSearchMetadata?.relevanceScore || 'N/A'}%)`);
  }
  
  if (doc.isFromAdzunaApi && doc.isNew) {
    console.log(`📊 New Adzuna API job saved: ${doc.title} from ${doc.sourceJobBoardName} (Relevance: ${doc.aiSearchMetadata?.relevanceScore || 'N/A'}%)`);
  }
});

module.exports = mongoose.model('Job', jobSchema);