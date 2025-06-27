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
  
  // Enhanced parsed data with FIXED skill categories
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
      // FIXED: Updated enum to match what the validation functions produce
      category: {
        type: String,
        enum: ['technical', 'soft', 'business'] // ADDED 'business', REMOVED 'domain' and 'certification' as they're not used
      },
      skillType: {
        type: String,
        enum: ['programming', 'management', 'analytical', 'communication', 'design', 'general']
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
      completeValidationApplied: Boolean
    }
  },
  
  // Enhanced AI search metadata for Adzuna API
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
    qualityLevel: String
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

// Adzuna API specific indexes
jobSchema.index({ 'aiSearchMetadata.adzunaApiDiscovery': 1 });
jobSchema.index({ 'aiSearchMetadata.originalPlatform': 1 });
jobSchema.index({ 'aiSearchMetadata.relevanceScore': -1 });

// Compound indexes for common queries
jobSchema.index({ userId: 1, sourcePlatform: 1, createdAt: -1 });
jobSchema.index({ userId: 1, applicationStatus: 1, createdAt: -1 });
jobSchema.index({ userId: 1, 'matchAnalysis.overallScore': -1 });

// Virtual for checking if job is from Adzuna API
jobSchema.virtual('isFromAdzunaApi').get(function() {
  return this.sourcePlatform && this.sourcePlatform.includes('AI_FOUND_ADZUNA');
});

// Virtual for getting source platform name
jobSchema.virtual('sourceJobBoardName').get(function() {
  if (!this.isFromAdzunaApi) return null;
  
  if (this.sourcePlatform.includes('INDEED')) return 'Indeed';
  if (this.sourcePlatform.includes('LINKEDIN')) return 'LinkedIn';
  if (this.sourcePlatform.includes('MONSTER')) return 'Monster';
  if (this.sourcePlatform.includes('CAREERBUILDER')) return 'CareerBuilder';
  if (this.sourcePlatform.includes('GLASSDOOR')) return 'Glassdoor';
  if (this.sourcePlatform.includes('ZIPRECRUITER')) return 'ZipRecruiter';
  if (this.sourcePlatform.includes('DICE')) return 'Dice';
  
  return 'Adzuna Partner';
});

// Virtual for enhanced job quality score
jobSchema.virtual('qualityScore').get(function() {
  let score = 50; // Base score
  
  // Adzuna API bonus
  if (this.isFromAdzunaApi) score += 20;
  
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

// Static method to get Adzuna API statistics
jobSchema.statics.getAdzunaApiStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        sourcePlatform: { $regex: /^AI_FOUND_ADZUNA/ }
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
        jobBoard: {
          $switch: {
            branches: [
              { case: { $regex: ['$_id', /INDEED/] }, then: 'Indeed' },
              { case: { $regex: ['$_id', /LINKEDIN/] }, then: 'LinkedIn' },
              { case: { $regex: ['$_id', /MONSTER/] }, then: 'Monster' },
              { case: { $regex: ['$_id', /CAREERBUILDER/] }, then: 'CareerBuilder' },
              { case: { $regex: ['$_id', /GLASSDOOR/] }, then: 'Glassdoor' }
            ],
            default: 'Adzuna Partner'
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
  // Auto-detect Adzuna API from source platform
  if (this.isModified('sourcePlatform') && this.isFromAdzunaApi) {
    if (!this.aiSearchMetadata) this.aiSearchMetadata = {};
    this.aiSearchMetadata.adzunaApiDiscovery = true;
    this.aiSearchMetadata.originalPlatform = this.sourceJobBoardName;
  }
  
  // Ensure Adzuna API data consistency
  if (this.isFromAdzunaApi && this.parsedData?.adzunaApiData) {
    this.parsedData.adzunaApiData.platform = this.sourceJobBoardName;
  }
  
  next();
});

// Post-save middleware for analytics
jobSchema.post('save', function(doc) {
  // Analytics events for Adzuna API tracking
  if (doc.isFromAdzunaApi && doc.isNew) {
    console.log(`📊 New Adzuna API job saved: ${doc.title} from ${doc.sourceJobBoardName} (Relevance: ${doc.aiSearchMetadata?.relevanceScore || 'N/A'}%)`);
  }
});

module.exports = mongoose.model('Job', jobSchema);