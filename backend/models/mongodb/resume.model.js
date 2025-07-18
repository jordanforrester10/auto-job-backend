// backend/models/mongodb/resume.model.js - UPDATED WITH FLEXIBLE DATE HANDLING
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
      startDate: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            // Allow null, undefined, valid dates, or special strings
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') {
              // Allow special current job indicators
              const currentJobIndicators = ['present', 'current', 'ongoing', 'now'];
              if (currentJobIndicators.includes(value.toLowerCase())) return true;
              // Allow valid date strings
              return !isNaN(Date.parse(value));
            }
            return false;
          },
          message: 'Start date must be a valid date or date string'
        }
      },
      endDate: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            // Allow null, undefined, valid dates, or special strings
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') {
              // Allow special current job indicators
              const currentJobIndicators = ['present', 'current', 'ongoing', 'now'];
              if (currentJobIndicators.includes(value.toLowerCase())) return true;
              // Allow valid date strings
              return !isNaN(Date.parse(value));
            }
            return false;
          },
          message: 'End date must be a valid date, date string, or "Present"'
        }
      },
      description: String,
      highlights: [String],
      skills: [String]
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startDate: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') {
              const currentIndicators = ['present', 'current', 'ongoing', 'now'];
              if (currentIndicators.includes(value.toLowerCase())) return true;
              return !isNaN(Date.parse(value));
            }
            return false;
          },
          message: 'Start date must be a valid date or date string'
        }
      },
      endDate: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') {
              const currentIndicators = ['present', 'current', 'ongoing', 'now'];
              if (currentIndicators.includes(value.toLowerCase())) return true;
              return !isNaN(Date.parse(value));
            }
            return false;
          },
          message: 'End date must be a valid date, date string, or "Present"'
        }
      },
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
      dateObtained: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') return !isNaN(Date.parse(value));
            return false;
          },
          message: 'Date obtained must be a valid date or date string'
        }
      },
      validUntil: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') {
              const neverExpires = ['never', 'permanent', 'lifetime'];
              if (neverExpires.includes(value.toLowerCase())) return true;
              return !isNaN(Date.parse(value));
            }
            return false;
          },
          message: 'Valid until must be a valid date, date string, or "Never"'
        }
      }
    }],
    languages: [{
      language: String,
      proficiency: String
    }],
    projects: [{
      name: String,
      description: String,
      url: String,
      startDate: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') return !isNaN(Date.parse(value));
            return false;
          },
          message: 'Start date must be a valid date or date string'
        }
      },
      endDate: {
        type: mongoose.Schema.Types.Mixed, // 🔧 FIXED: Allow Date or String
        validate: {
          validator: function(value) {
            if (!value) return true;
            if (value instanceof Date) return true;
            if (typeof value === 'string') {
              const currentIndicators = ['present', 'current', 'ongoing', 'now'];
              if (currentIndicators.includes(value.toLowerCase())) return true;
              return !isNaN(Date.parse(value));
            }
            return false;
          },
          message: 'End date must be a valid date, date string, or "Present"'
        }
      },
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
  
  // 🆕 NEW: Personalized job preferences cache
  personalizedJobCache: {
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
      isPersonalizedJob: { type: Boolean, default: true }
    }],
    preferences: {
      locations: [mongoose.Schema.Types.Mixed],
      jobTitles: [String],
      includeRemote: Boolean
    },
    metadata: {
      generatedAt: { type: Date, default: Date.now },
      jobsCount: { type: Number, default: 0 },
      searchCriteria: mongoose.Schema.Types.Mixed,
      cacheVersion: { type: String, default: '1.0' }
    },
    cacheExpiry: {
      expiresAt: Date,
      isExpired: { type: Boolean, default: false }
    }
  },
  
  // 🆕 NEW: Onboarding status tracking
  onboardingStatus: {
    completed: { type: Boolean, default: false },
    completedAt: Date,
    preferencesSet: { type: Boolean, default: false },
    preferencesSetAt: Date,
    jobsGenerated: { type: Boolean, default: false },
    recruitersFound: { type: Boolean, default: false },
    lockedFlow: { type: Boolean, default: false }, // Prevents going back to preferences
    currentPreferences: {
      locations: [mongoose.Schema.Types.Mixed],
      jobTitles: [String],
      includeRemote: Boolean
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

// 🆕 NEW: Method to check if personalized job cache matches current preferences
resumeSchema.methods.hasValidPersonalizedJobCache = function(currentPreferences) {
  if (!this.personalizedJobCache || !this.personalizedJobCache.jobs || this.personalizedJobCache.jobs.length === 0) {
    return false;
  }
  
  // Check if cache is expired (1 hour for personalized jobs)
  const cacheAge = Date.now() - new Date(this.personalizedJobCache.metadata.generatedAt).getTime();
  const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
  
  if (cacheAge > maxAge) {
    return false;
  }
  
  // Check if preferences match
  const cachedPrefs = this.personalizedJobCache.preferences;
  if (!cachedPrefs) {
    return false;
  }
  
  // Compare job titles (case-insensitive, sorted)
  const cachedTitles = (cachedPrefs.jobTitles || []).map(t => t.toLowerCase()).sort();
  const currentTitles = (currentPreferences.jobTitles || []).map(t => t.toLowerCase()).sort();
  
  if (JSON.stringify(cachedTitles) !== JSON.stringify(currentTitles)) {
    return false;
  }
  
  // Compare locations (case-insensitive, sorted by name)
  const cachedLocations = (cachedPrefs.locations || []).map(l => (l.name || l).toLowerCase()).sort();
  const currentLocations = (currentPreferences.locations || []).map(l => (l.name || l).toLowerCase()).sort();
  
  if (JSON.stringify(cachedLocations) !== JSON.stringify(currentLocations)) {
    return false;
  }
  
  return true;
};

// 🆕 NEW: Method to get cached personalized jobs
resumeSchema.methods.getCachedPersonalizedJobs = function(currentPreferences) {
  if (!this.hasValidPersonalizedJobCache(currentPreferences)) {
    return null;
  }
  
  return {
    jobs: this.personalizedJobCache.jobs,
    metadata: {
      ...this.personalizedJobCache.metadata,
      fromCache: true,
      cacheAge: Math.floor((Date.now() - new Date(this.personalizedJobCache.metadata.generatedAt).getTime()) / (1000 * 60)) // minutes
    }
  };
};

// 🆕 NEW: Method to cache personalized jobs with preferences
resumeSchema.methods.cachePersonalizedJobs = function(jobs, preferences, searchMetadata = {}) {
  this.personalizedJobCache = {
    jobs: jobs || [],
    preferences: {
      locations: preferences.locations || [],
      jobTitles: preferences.jobTitles || [],
      includeRemote: preferences.includeRemote || false
    },
    metadata: {
      generatedAt: new Date(),
      jobsCount: jobs ? jobs.length : 0,
      searchCriteria: searchMetadata.searchCriteria || {},
      cacheVersion: '1.0'
    },
    cacheExpiry: {
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry for personalized jobs
      isExpired: false
    }
  };
  
  return this.save();
};

module.exports = mongoose.model('Resume', resumeSchema);
