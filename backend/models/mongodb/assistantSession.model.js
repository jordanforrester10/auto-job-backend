// backend/models/mongodb/assistantSession.model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    suggestions: [String],
    resumeEdits: mongoose.Schema.Types.Mixed,
    actionItems: [String],
    confidence: Number,
    processingTime: Number,
    tokensUsed: Number
  }
});

const assistantSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: false
  },
  resumeSnapshot: {
    // Store resume data at time of session start for context
    name: String,
    parsedData: mongoose.Schema.Types.Mixed,
    version: Number,
    capturedAt: Date
  },
  context: {
    type: String,
    enum: ['resume_editing', 'job_matching', 'career_advice', 'interview_prep', 'general'],
    default: 'resume_editing'
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'expired'],
    default: 'active'
  },
  messages: [messageSchema],
  
  // Session analytics
  analytics: {
    totalMessages: {
      type: Number,
      default: 0
    },
    userMessages: {
      type: Number,
      default: 0
    },
    assistantMessages: {
      type: Number,
      default: 0
    },
    totalTokensUsed: {
      type: Number,
      default: 0
    },
    averageResponseTime: Number,
    sessionsLength: Number, // in seconds
    resumeChangesApplied: {
      type: Number,
      default: 0
    },
    userSatisfactionRating: Number,
    helpfulnessRating: Number
  },

  // AI Context and Memory
  aiContext: {
    userPreferences: {
      communicationStyle: String, // formal, casual, detailed, concise
      focusAreas: [String], // skills, experience, formatting, content
      careerGoals: String,
      industryFocus: String,
      experienceLevel: String
    },
    conversationSummary: String,
    keyTopicsDiscussed: [String],
    actionItemsGenerated: [String],
    improvementsImplemented: [String],
    pendingRecommendations: [String]
  },

  // Resume editing history during session
  resumeEditHistory: [{
    timestamp: Date,
    section: String,
    changeType: {
      type: String,
      enum: ['suggestion', 'applied', 'rejected', 'modified']
    },
    originalContent: String,
    suggestedContent: String,
    finalContent: String,
    aiReasoning: String
  }],

  // Session settings
  settings: {
    language: {
      type: String,
      default: 'en'
    },
    assistantPersonality: {
      type: String,
      enum: ['professional', 'friendly', 'detailed', 'concise'],
      default: 'professional'
    },
    autoApplyChanges: {
      type: Boolean,
      default: false
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    }
  },

  // Integration data
  integrations: {
    connectedJobs: [mongoose.Schema.Types.ObjectId],
    sharedWithRecruiter: Boolean,
    exportedSuggestions: [{
      timestamp: Date,
      format: String,
      destination: String
    }]
  },

  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  
  // Auto-expire sessions after 24 hours of inactivity
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
});

// Indexes
assistantSessionSchema.index({ sessionId: 1 }, { unique: true });
assistantSessionSchema.index({ userId: 1, status: 1 });
assistantSessionSchema.index({ resumeId: 1 });
assistantSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
assistantSessionSchema.index({ lastActivityAt: 1 });

// Middleware
assistantSessionSchema.pre('save', function(next) {
  this.lastActivityAt = new Date();
  
  // Update analytics
  if (this.isModified('messages')) {
    this.analytics.totalMessages = this.messages.length;
    this.analytics.userMessages = this.messages.filter(m => m.type === 'user').length;
    this.analytics.assistantMessages = this.messages.filter(m => m.type === 'assistant').length;
    
    // Calculate total tokens used
    this.analytics.totalTokensUsed = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.tokensUsed || 0);
    }, 0);
    
    // Calculate session length if ended
    if (this.status === 'ended' && this.endedAt) {
      this.analytics.sessionsLength = Math.round((this.endedAt - this.startedAt) / 1000);
    }
  }
  
  next();
});

// Instance methods
assistantSessionSchema.methods.addMessage = function(messageData) {
  const message = {
    id: messageData.id || new mongoose.Types.ObjectId().toString(),
    type: messageData.type,
    content: messageData.content,
    timestamp: new Date(),
    metadata: messageData.metadata || {}
  };
  
  this.messages.push(message);
  this.lastActivityAt = new Date();
  
  return this.save();
};

assistantSessionSchema.methods.updateContext = function(contextUpdates) {
  Object.assign(this.aiContext, contextUpdates);
  return this.save();
};

assistantSessionSchema.methods.addResumeEdit = function(editData) {
  const edit = {
    timestamp: new Date(),
    section: editData.section,
    changeType: editData.changeType,
    originalContent: editData.originalContent,
    suggestedContent: editData.suggestedContent,
    finalContent: editData.finalContent,
    aiReasoning: editData.aiReasoning
  };
  
  this.resumeEditHistory.push(edit);
  
  if (editData.changeType === 'applied') {
    this.analytics.resumeChangesApplied += 1;
  }
  
  return this.save();
};

assistantSessionSchema.methods.endSession = function(endData = {}) {
  this.status = 'ended';
  this.endedAt = new Date();
  
  if (endData.userSatisfactionRating) {
    this.analytics.userSatisfactionRating = endData.userSatisfactionRating;
  }
  
  if (endData.helpfulnessRating) {
    this.analytics.helpfulnessRating = endData.helpfulnessRating;
  }
  
  return this.save();
};

assistantSessionSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages.slice(-limit);
};

assistantSessionSchema.methods.getContextSummary = function() {
  return {
    sessionId: this.sessionId,
    context: this.context,
    resumeName: this.resumeSnapshot?.name,
    messageCount: this.messages.length,
    keyTopics: this.aiContext.keyTopicsDiscussed,
    userPreferences: this.aiContext.userPreferences,
    conversationSummary: this.aiContext.conversationSummary
  };
};

// Static methods
assistantSessionSchema.statics.findActiveSession = function(userId, resumeId = null) {
  const query = { 
    userId, 
    status: 'active',
    expiresAt: { $gt: new Date() }
  };
  
  if (resumeId) {
    query.resumeId = resumeId;
  }
  
  return this.findOne(query).sort({ lastActivityAt: -1 });
};

// Continuation of assistantSession.model.js

assistantSessionSchema.statics.getUserSessions = function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ lastActivityAt: -1 })
    .limit(limit)
    .select('sessionId context resumeSnapshot.name analytics startedAt lastActivityAt status');
};

assistantSessionSchema.statics.getSessionAnalytics = function(userId, timeframe = '30d') {
  const startDate = new Date();
  
  switch(timeframe) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        startedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalMessages: { $sum: '$analytics.totalMessages' },
        totalTokensUsed: { $sum: '$analytics.totalTokensUsed' },
        totalResumeChanges: { $sum: '$analytics.resumeChangesApplied' },
        avgSessionLength: { $avg: '$analytics.sessionsLength' },
        avgSatisfactionRating: { $avg: '$analytics.userSatisfactionRating' },
        avgHelpfulnessRating: { $avg: '$analytics.helpfulnessRating' }
      }
    }
  ]);
};

assistantSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.updateMany(
    { 
      status: 'active',
      expiresAt: { $lt: new Date() }
    },
    { 
      $set: { 
        status: 'expired',
        endedAt: new Date()
      }
    }
  );
};

// Virtual for session duration
assistantSessionSchema.virtual('duration').get(function() {
  if (this.endedAt) {
    return Math.round((this.endedAt - this.startedAt) / 1000);
  }
  return Math.round((new Date() - this.startedAt) / 1000);
});

// Virtual for session summary
assistantSessionSchema.virtual('summary').get(function() {
  return {
    id: this.sessionId,
    duration: this.duration,
    messageCount: this.messages.length,
    resumeName: this.resumeSnapshot?.name,
    context: this.context,
    changesApplied: this.analytics.resumeChangesApplied,
    isActive: this.status === 'active',
    lastActivity: this.lastActivityAt
  };
});

module.exports = mongoose.model('AssistantSession', assistantSessionSchema);