// models/mongodb/resume.model.js
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

module.exports = mongoose.model('Resume', resumeSchema);
