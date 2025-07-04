// models/mongodb/job.model.js - FIXED SCHEMA WITH PROPER ENUM VALUES
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
      // Adzuna API platform support
      'AI_FOUND_ADZUNA_INDEED',
      'AI_FOUND_ADZUNA_LINKEDIN', 
      'AI_FOUND_ADZUNA_MONSTER',
      'AI_FOUND_ADZUNA_CAREERBUILDER',
      'AI_FOUND_ADZUNA_GLASSDOOR',
      'AI_FOUND_ADZUNA_ZIPRECRUITER',
      'AI_FOUND_ADZUNA_DICE',
      'AI_FOUND_ADZUNA_PARTNER',
      'AI_FOUND_ADZUNA_DIRECT',
      'AI_FOUND_ADZUNA_OTHER'
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
  
  // Enhanced parsed data with FIXED skill categories and types
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
      // FIXED: Updated category enum to match what validation functions produce
      category: {
        type: String,
        enum: ['technical', 'soft', 'business', 'domain', 'certification']
      },
      // FIXED: Expanded skillType enum to include all possible values from AI analysis
      skillType: {
        type: String,
        enum: [
          'programming', 
          'management', 
          'analytical', 
          'communication', 
          'design', 
          'general',
          'knowledge',     // ADDED: For domain knowledge skills
          'extracted',     // ADDED: For skills extracted by AI
          'technical',     // ADDED: For technical skills
          'soft',          // ADDED: For soft skills
          'business',      // ADDED: For business skills
          'certification', // ADDED: For certification requirements
          'tool',          // ADDED: For tools and technologies
          'framework',     // ADDED: For frameworks
          'language',      // ADDED: For programming languages
          'platform',      // ADDED: For platforms
          'methodology',   // ADDED: For methodologies
          'domain'         // ADDED: For domain-specific skills
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
    
    // Real job board specific data
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
    
    // Adzuna API specific data
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
      tokensUsed: Number
    }
  },
  
  // Enhanced AI search metadata
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
    realJobBoardDiscovery: Boolean,
    adzunaApiDiscovery: Boolean,
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
    
    // Real job board specific metadata
    realJobBoardMetadata: {
      discoveryMethod: String,
      jobBoardProvider: String,
      atsSystemDetected: String,
      companyVerified: Boolean,
      postingQuality: String,
      directFromCompany: Boolean,
      enhancedContentAvailable: Boolean
    },
    
    // Adzuna API specific metadata
    adzunaApiMetadata: {
      discoveryMethod: String,
      apiProvider: String,
      jobBoardsCovered: String,
      apiHealth: String,
      costEfficient: Boolean,
      reliability: String,
      completeValidationApplied: Boolean
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
    isRealJobBoardDiscovery: Boolean,
    sourceJobBoard: String
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

// Real job board specific indexes
jobSchema.index({ 'aiSearchMetadata.realJobBoardDiscovery': 1 });
jobSchema.index({ 'aiSearchMetadata.originalPlatform': 1 });
jobSchema.index({ 'aiSearchMetadata.relevanceScore': -1 });

// Adzuna API specific indexes
jobSchema.index({ 'aiSearchMetadata.adzunaApiDiscovery': 1 });
jobSchema.index({ 'aiSearchMetadata.originalPlatform': 1 });
jobSchema.index({ 'aiSearchMetadata.relevanceScore': -1 });

// Compound indexes for common queries
jobSchema.index({ userId: 1, sourcePlatform: 1, createdAt: -1 });
jobSchema.index({ userId: 1, applicationStatus: 1, createdAt: -1 });
jobSchema.index({ userId: 1, 'matchAnalysis.overallScore': -1 });

// Virtual for checking if job is from real job board
jobSchema.virtual('isFromRealJobBoard').get(function() {
  return this.sourcePlatform && (
    this.sourcePlatform.includes('AI_FOUND_GREENHOUSE') ||
    this.sourcePlatform.includes('AI_FOUND_LEVER') ||
    this.sourcePlatform.includes('AI_FOUND_INDEED')
  );
});

// Virtual for checking if job is from Adzuna API
jobSchema.virtual('isFromAdzunaApi').get(function() {
  return this.sourcePlatform && this.sourcePlatform.includes('AI_FOUND_ADZUNA');
});

// Virtual for getting source platform name
jobSchema.virtual('sourceJobBoardName').get(function() {
  if (this.isFromRealJobBoard) {
    if (this.sourcePlatform.includes('GREENHOUSE')) return 'Greenhouse';
    if (this.sourcePlatform.includes('LEVER')) return 'Lever';
    if (this.sourcePlatform.includes('INDEED')) return 'Indeed';
  }
  
  if (this.isFromAdzunaApi) {
    if (this.sourcePlatform.includes('INDEED')) return 'Indeed';
    if (this.sourcePlatform.includes('LINKEDIN')) return 'LinkedIn';
    if (this.sourcePlatform.includes('MONSTER')) return 'Monster';
    if (this.sourcePlatform.includes('CAREERBUILDER')) return 'CareerBuilder';
    if (this.sourcePlatform.includes('GLASSDOOR')) return 'Glassdoor';
    if (this.sourcePlatform.includes('ZIPRECRUITER')) return 'ZipRecruiter';
    if (this.sourcePlatform.includes('DICE')) return 'Dice';
    return 'Adzuna Partner';
  }
  
  return 'Manual';
});

// Virtual for enhanced job quality score
jobSchema.virtual('qualityScore').get(function() {
  let score = 50; // Base score
  
  // Real job board bonus
  if (this.isFromRealJobBoard) score += 25;
  // Adzuna API bonus
  else if (this.isFromAdzunaApi) score += 20;
  
  // Content quality
  if (this.aiSearchMetadata?.contentQuality === 'high') score += 15;
  else if (this.aiSearchMetadata?.contentQuality === 'medium') score += 10;
  
  // Premium analysis bonus
  if (this.aiSearchMetadata?.premiumAnalysis) score += 10;
  
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

// Method to get real job board specific data
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

// Method to get Adzuna API specific data
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

// Static method to find jobs from real job boards
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

// Static method to find jobs from Adzuna API
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

// Static method to get job discovery statistics
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
              { case: { $regex: ['$_id', /AI_FOUND_GREENHOUSE/] }, then: 'Greenhouse' },
              { case: { $regex: ['$_id', /AI_FOUND_LEVER/] }, then: 'Lever' },
              { case: { $regex: ['$_id', /AI_FOUND_INDEED/] }, then: 'Indeed' },
              { case: { $regex: ['$_id', /AI_FOUND_ADZUNA/] }, then: 'Adzuna API' }
            ],
            default: 'AI Discovery'
          }
        },
        count: 1,
        avgQualityScore: { $round: ['$avgQualityScore', 1] },
        avgRelevanceScore: { $round: ['$avgRelevanceScore', 1] },
        totalViews: 1,
        appliedJobs: 1,
        applicationRate: {
          $round: [{ $multiply: [{ $divide: ['$appliedJobs', '$count'] }, 100] }, 1]
        }
      }
    }
  ]);
};

// Pre-save middleware
jobSchema.pre('save', function(next) {
  // Auto-detect real job board from source platform
  if (this.isModified('sourcePlatform') && this.isFromRealJobBoard) {
    if (!this.aiSearchMetadata) this.aiSearchMetadata = {};
    this.aiSearchMetadata.realJobBoardDiscovery = true;
    this.aiSearchMetadata.originalPlatform = this.sourceJobBoardName;
  }
  
  // Auto-detect Adzuna API from source platform
  if (this.isModified('sourcePlatform') && this.isFromAdzunaApi) {
    if (!this.aiSearchMetadata) this.aiSearchMetadata = {};
    this.aiSearchMetadata.adzunaApiDiscovery = true;
    this.aiSearchMetadata.originalPlatform = this.sourceJobBoardName;
  }
  
  // Ensure job board data consistency
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
  if (doc.isFromRealJobBoard && doc.isNew) {
    console.log(`📊 New real job board job saved: ${doc.title} from ${doc.sourceJobBoardName} (Relevance: ${doc.aiSearchMetadata?.relevanceScore || 'N/A'}%)`);
  }
  
  if (doc.isFromAdzunaApi && doc.isNew) {
    console.log(`📊 New Adzuna API job saved: ${doc.title} from ${doc.sourceJobBoardName} (Relevance: ${doc.aiSearchMetadata?.relevanceScore || 'N/A'}%)`);
  }
});

module.exports = mongoose.model('Job', jobSchema);