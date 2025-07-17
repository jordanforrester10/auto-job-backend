// backend/models/mongodb/resume.model.js - UPDATED WITH JOB CACHING
const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  processingStatus: {
    status: {
      type: String,
      enum: ['pending', 'uploading', 'parsing', 'analyzing', 'completed', 'error'],
      default: 'pending'
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    message: {
      type: String,
      default: ''
    },
    error: {
      type: String,
      default: ''
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  name: {
    type: String,
    required: true
  },
  originalFilename: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    enum: ['PDF', 'DOCX', 'DOC'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  parsedData: {
    contactInfo: {
      name: String,
      email: String,
      phone: String,
      location: String,
      websites: [String]
    },
    summary: String,
    experience: [{
      company: String,
      title: String,
      location: String,
      startDate: Date,
      endDate: Date,
      description: String,
      highlights: [String],
      skills: [String]
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: Date,
      endDate: Date,
      gpa: Number,
      highlights: [String]
    }],
    skills: [{
      name: String,
      level: String,
      yearsOfExperience: Number
    }],
    certifications: [{
      name: String,
      issuer: String,
      dateObtained: Date,
      validUntil: Date
    }],
    languages: [{
      language: String,
      proficiency: String
    }],
    projects: [{
      name: String,
      description: String,
      url: String,
      startDate: Date,
      endDate: Date,
      skills: [String]
    }]
  },
  analysis: {
    overallScore: Number,
    atsCompatibility: Number,
    profileSummary: {
      currentRole: String,
      careerLevel: String,
      industries: [String],
      suggestedJobTitles: [String],
      suggestedIndustries: [String]
    },
    strengths: [String],
    weaknesses: [String],
    keywordsSuggestions: [String],
    improvementAreas: [{
      section: String,
      suggestions: [String],
      improvedSnippets: [{
        original: String,
        improved: String
      }]
    }]
  },
  
  // 🆕 NEW: Onboarding job cache to prevent repeated API calls
  onboardingJobCache: {
    jobs: [{
      id: String,
      title: String,
      company: String,
      location: mongoose.Schema.Types.Mixed,
      description: String,
      salary: mongoose.Schema.Types.Mixed,
      jobType: String,
      sourceUrl: String,
      parsedData: mongoose.Schema.Types.Mixed,
      analysis: mongoose.Schema.Types.Mixed,
      isOnboardingJob: { type: Boolean, default: true },
      enhancedForOnboarding: Boolean
    }],
    recruiters: [{
      id: String,
      firstName: String,
      lastName: String,
      fullName: String,
      title: String,
      email: String,
      linkedinUrl: String,
      company: mongoose.Schema.Types.Mixed,
      industry: String,
      isOnboardingRecruiter: { type: Boolean, default: true }
    }],
    metadata: {
      generatedAt: { type: Date, default: Date.now },
      jobsCount: { type: Number, default: 0 },
      recruitersCount: { type: Number, default: 0 },
      searchCriteria: mongoose.Schema.Types.Mixed,
      apiCallsMade: { type: Number, default: 0 },
      cacheVersion: { type: String, default: '1.0' }
    },
    // Cache expiry settings
    cacheExpiry: {
      expiresAt: Date, // Optional: auto-expire after X days
      isExpired: { type: Boolean, default: false }
    }
  },
  
  // New fields for tailored resumes
  isTailored: {
    type: Boolean,
    default: false
  },
  tailoredForJob: {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    },
    jobTitle: String,
    company: String,
    originalResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    }
  },
  versions: [{
    versionNumber: Number,
    createdAt: Date,
    fileUrl: String,
    changesDescription: String,
    jobId: mongoose.Schema.Types.ObjectId
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 🆕 NEW: Method to check if onboarding job cache is valid
resumeSchema.methods.hasValidOnboardingJobCache = function() {
  if (!this.onboardingJobCache || !this.onboardingJobCache.jobs || this.onboardingJobCache.jobs.length === 0) {
    return false;
  }
  
  // Check if cache is expired (optional - you can set expiry days)
  if (this.onboardingJobCache.cacheExpiry && this.onboardingJobCache.cacheExpiry.expiresAt) {
    return new Date() < this.onboardingJobCache.cacheExpiry.expiresAt;
  }
  
  // Check if cache is too old (fallback - 7 days)
  const cacheAge = Date.now() - new Date(this.onboardingJobCache.metadata.generatedAt).getTime();
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  
  return cacheAge < maxAge;
};

// 🆕 NEW: Method to get cached onboarding data
resumeSchema.methods.getCachedOnboardingData = function() {
  if (!this.hasValidOnboardingJobCache()) {
    return null;
  }
  
  return {
    jobs: this.onboardingJobCache.jobs,
    recruiters: this.onboardingJobCache.recruiters || [],
    metadata: {
      ...this.onboardingJobCache.metadata,
      fromCache: true,
      cacheAge: Math.floor((Date.now() - new Date(this.onboardingJobCache.metadata.generatedAt).getTime()) / (1000 * 60 * 60)) // hours
    }
  };
};

// 🆕 NEW: Method to cache onboarding data
resumeSchema.methods.cacheOnboardingData = function(jobs, recruiters, searchMetadata = {}) {
  this.onboardingJobCache = {
    jobs: jobs || [],
    recruiters: recruiters || [],
    metadata: {
      generatedAt: new Date(),
      jobsCount: jobs ? jobs.length : 0,
      recruitersCount: recruiters ? recruiters.length : 0,
      searchCriteria: searchMetadata.searchCriteria || {},
      apiCallsMade: searchMetadata.apiCallsMade || 1,
      cacheVersion: '1.0'
    },
    cacheExpiry: {
      expiresAt: null, // Set to null for no expiry, or new Date(Date.now() + 7*24*60*60*1000) for 7 days
      isExpired: false
    }
  };
  
  return this.save();
};

module.exports = mongoose.model('Resume', resumeSchema);
