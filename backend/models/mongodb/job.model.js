// models/mongodb/job.model.js - ENHANCED FOR REAL JOB BOARD INTEGRATION
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
      // NEW: Real job board platforms
      'AI_FOUND_GREENHOUSE',
      'AI_FOUND_LEVER', 
      'AI_FOUND_INDEED'
    ],
    default: 'MANUAL',
    index: true
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
  
  // Enhanced parsed data with real job board support
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
        enum: ['technical', 'soft', 'domain', 'certification']
      },
      skillType: String
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
    
    // NEW: Enhanced real job board specific data
    realJobBoardData: {
      platform: {
        type: String,
        enum: ['Greenhouse', 'Lever', 'Indeed']
      },
      originalUrl: String,
      postedDate: Date,
      applicationDeadline: Date,
      hiringManager: String,
      teamSize: String,
      techStack: [String],
      department: String,
      directCompanyPosting: {
        type: Boolean,
        default: false
      },
      atsSystem: String,
      jobBoardSpecificData: {
        // Greenhouse specific
        greenhouseJobId: String,
        greenhouseOfficeId: String,
        
        // Lever specific
        leverPostingId: String,
        leverTeam: String,
        
        // Indeed specific
        indeedJobKey: String,
        indeedCompanyId: String
      }
    },
    
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
      realJobBoardPosting: Boolean
    }
  },
  
  // Enhanced AI search metadata for real job boards
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
    phase: String,
    originalJobBoard: String,
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
    teamInfo: {
      hiringManager: String,
      teamSize: String,
      department: String
    },
    
    // NEW: Real job board quality metrics
    jobBoardQualityMetrics: {
      urlValidated: Boolean,
      contentLength: Number,
      hasComprehensiveDetails: Boolean,
      hasTechStack: Boolean,
      hasTeamInfo: Boolean,
      hasApplicationDeadline: Boolean,
      verifiedCompanyPosting: Boolean
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
    estimatedCompletion: Date
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

// NEW: Indexes for real job board queries
jobSchema.index({ 'parsedData.realJobBoardData.platform': 1 });
jobSchema.index({ 'parsedData.realJobBoardData.directCompanyPosting': 1 });
jobSchema.index({ 'aiSearchMetadata.realJobBoardDiscovery': 1 });
jobSchema.index({ 'aiSearchMetadata.originalJobBoard': 1 });

// Compound indexes for common queries
jobSchema.index({ userId: 1, sourcePlatform: 1, createdAt: -1 });
jobSchema.index({ userId: 1, applicationStatus: 1, createdAt: -1 });
jobSchema.index({ userId: 1, 'matchAnalysis.overallScore': -1 });

// Virtual for checking if job is from real job boards
jobSchema.virtual('isFromRealJobBoard').get(function() {
  return this.sourcePlatform && (
    this.sourcePlatform.includes('AI_FOUND_GREENHOUSE') ||
    this.sourcePlatform.includes('AI_FOUND_LEVER') ||
    this.sourcePlatform.includes('AI_FOUND_INDEED')
  );
});

// Virtual for getting source job board name
jobSchema.virtual('sourceJobBoardName').get(function() {
  if (!this.isFromRealJobBoard) return null;
  
  if (this.sourcePlatform.includes('GREENHOUSE')) return 'Greenhouse';
  if (this.sourcePlatform.includes('LEVER')) return 'Lever';
  if (this.sourcePlatform.includes('INDEED')) return 'Indeed';
  return null;
});

// Virtual for enhanced job quality score
jobSchema.virtual('qualityScore').get(function() {
  let score = 50; // Base score
  
  // Real job board bonus
  if (this.isFromRealJobBoard) score += 20;
  
  // Content quality
  if (this.aiSearchMetadata?.contentQuality === 'high') score += 15;
  else if (this.aiSearchMetadata?.contentQuality === 'medium') score += 10;
  
  // Premium analysis bonus
  if (this.aiSearchMetadata?.premiumAnalysis) score += 10;
  
  // Comprehensive details bonus
  if (this.aiSearchMetadata?.jobBoardQualityMetrics?.hasComprehensiveDetails) score += 5;
  
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
    techStack: this.parsedData?.realJobBoardData?.techStack || [],
    hiringManager: this.parsedData?.realJobBoardData?.hiringManager,
    teamSize: this.parsedData?.realJobBoardData?.teamSize,
    department: this.parsedData?.realJobBoardData?.department,
    directCompanyPosting: this.parsedData?.realJobBoardData?.directCompanyPosting || false,
    qualityMetrics: this.aiSearchMetadata?.jobBoardQualityMetrics || {}
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

// Static method to get real job board statistics
jobSchema.statics.getRealJobBoardStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        sourcePlatform: {
          $in: ['AI_FOUND_GREENHOUSE', 'AI_FOUND_LEVER', 'AI_FOUND_INDEED']
        }
      }
    },
    {
      $group: {
        _id: '$sourcePlatform',
        count: { $sum: 1 },
        avgQualityScore: { $avg: '$aiSearchMetadata.searchScore' },
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
        jobBoard: {
          $switch: {
            branches: [
              { case: { $eq: ['$_id', 'AI_FOUND_GREENHOUSE'] }, then: 'Greenhouse' },
              { case: { $eq: ['$_id', 'AI_FOUND_LEVER'] }, then: 'Lever' },
              { case: { $eq: ['$_id', 'AI_FOUND_INDEED'] }, then: 'Indeed' }
            ],
            default: 'Unknown'
          }
        },
        count: 1,
        avgQualityScore: { $round: ['$avgQualityScore', 1] },
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
    this.aiSearchMetadata.originalJobBoard = this.sourceJobBoardName;
  }
  
  // Ensure real job board data consistency
  if (this.isFromRealJobBoard && this.parsedData?.realJobBoardData) {
    this.parsedData.realJobBoardData.platform = this.sourceJobBoardName;
    this.parsedData.realJobBoardData.directCompanyPosting = true;
  }
  
  next();
});

// Post-save middleware for analytics
jobSchema.post('save', function(doc) {
  // Could trigger analytics events here for real job board tracking
  if (doc.isFromRealJobBoard && doc.isNew) {
    console.log(`📊 New real job board job saved: ${doc.title} from ${doc.sourceJobBoardName}`);
  }
});

module.exports = mongoose.model('Job', jobSchema);