// backend/models/mongodb/conversation.model.js - ENHANCED FOR PERSISTENCE
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  type: {
    type: String,
    enum: ['user', 'ai', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    tokens: Number,
    model: String,
    temperature: Number,
    context: {
      page: String,
      resumeId: String,
      jobId: String,
      action: String
    },
    suggestions: [String],
    actions: [{
      type: String,
      confidence: Number,
      data: mongoose.Schema.Types.Mixed
    }],
    sentiment: {
      score: Number,
      magnitude: Number,
      label: String
    },
    // NEW: Resume editing specific metadata
    isResumeEdit: {
      type: Boolean,
      default: false
    },
    resumeChanges: [{
      section: String,
      action: String,
      reason: String
    }],
    newAnalysis: {
      overallScore: Number,
      atsCompatibility: Number,
      strengths: [String],
      weaknesses: [String]
    }
  },
  attachments: [{
    type: String,
    name: String,
    url: String,
    size: Number
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    originalContent: String,
    editedAt: Date,
    reason: String
  }]
}, {
  timestamps: true,
  _id: false
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'resume_help',
      'job_search',
      'career_advice',
      'interview_prep',
      'skill_development',
      'general',
      'troubleshooting'
    ],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  messages: [messageSchema],
  summary: {
    content: String,
    keyTopics: [String],
    actionItems: [String],
    outcomes: [String],
    generatedAt: Date,
    version: {
      type: Number,
      default: 1
    }
  },
  context: {
    primaryResumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume'
    },
    relatedJobIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job'
    }],
    skillsFocused: [String],
    careerGoals: [String],
    userSentiment: {
      overall: String,
      trend: String,
      lastUpdated: Date
    }
  },
  analytics: {
    messageCount: {
      type: Number,
      default: 0
    },
    tokensUsed: {
      type: Number,
      default: 0
    },
    averageResponseTime: {
      type: Number,
      default: 0
    },
    userSatisfaction: {
      rating: Number,
      feedback: String,
      ratedAt: Date
    },
    topActions: [{
      action: String,
      count: Number
    }],
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    insights: [{
      type: String,
      description: String,
      confidence: Number,
      actionable: Boolean,
      generatedAt: Date
    }],
    lastAnalyzedAt: Date
  },
  settings: {
    memoryEnabled: {
      type: Boolean,
      default: true
    },
    autoSummarize: {
      type: Boolean,
      default: true
    },
    shareWithTeam: {
      type: Boolean,
      default: false
    },
    archiveAfterDays: {
      type: Number,
      default: 90
    }
  },
  // ENHANCED: Better state management
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isStarred: {
    type: Boolean,
    default: false,
    index: true
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  // DEPRECATED: Keep for backward compatibility but use isActive instead
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  // Legacy fields - keep for backward compatibility
  pinned: {
    type: Boolean,
    default: false
  },
  starred: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ENHANCED: Compound indexes for better performance
conversationSchema.index({ userId: 1, isActive: 1, lastActiveAt: -1 });
conversationSchema.index({ userId: 1, category: 1, isActive: 1 });
conversationSchema.index({ userId: 1, tags: 1, isActive: 1 });
conversationSchema.index({ userId: 1, isStarred: 1, isActive: 1 });
conversationSchema.index({ userId: 1, isPinned: 1, isActive: 1 });
conversationSchema.index({ 'messages.type': 1, 'messages.createdAt': -1 });
conversationSchema.index({ 'summary.keyTopics': 1 });
conversationSchema.index({ lastActiveAt: -1 });

// Virtual for message count
conversationSchema.virtual('totalMessages').get(function() {
  return this.messages ? this.messages.length : 0;
});

// Virtual for last message
conversationSchema.virtual('lastMessage').get(function() {
  return this.messages && this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

// ENHANCED: Pre-save middleware with better analytics
conversationSchema.pre('save', function(next) {
  // Update message count and last active time when messages are modified
  if (this.isModified('messages')) {
    this.analytics.messageCount = this.messages ? this.messages.length : 0;
    this.analytics.tokensUsed = this.messages ? this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.tokens || 0);
    }, 0) : 0;
    this.lastActiveAt = new Date();
  }
  
  // Ensure backward compatibility
  if (this.isModified('isStarred')) {
    this.starred = this.isStarred;
  }
  if (this.isModified('isPinned')) {
    this.pinned = this.isPinned;
  }
  if (this.isModified('isActive')) {
    this.status = this.isActive ? 'active' : 'archived';
  }
  
  next();
});

// ENHANCED: Instance methods
conversationSchema.methods.addMessage = function(messageData) {
  // Generate a more robust unique ID
  const messageId = messageData.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${this.messages.length}`;
  
  const message = {
    id: messageId,
    type: messageData.type,
    content: messageData.content,
    metadata: messageData.metadata || {},
    attachments: messageData.attachments || [],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  this.messages.push(message);
  this.lastActiveAt = new Date();
  this.markModified('messages');
  
  return message;
};

conversationSchema.methods.getRecentMessages = function(limit = 10) {
  if (!this.messages) return [];
  return this.messages
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

conversationSchema.methods.getMessagesByType = function(type) {
  if (!this.messages) return [];
  return this.messages.filter(msg => msg.type === type);
};

conversationSchema.methods.searchMessages = function(query) {
  if (!this.messages) return [];
  const searchRegex = new RegExp(query, 'i');
  return this.messages.filter(msg => 
    searchRegex.test(msg.content) || 
    (msg.metadata?.suggestions && msg.metadata.suggestions.some(s => searchRegex.test(s)))
  );
};

conversationSchema.methods.updateSummary = function(summaryData) {
  this.summary = {
    ...this.summary,
    ...summaryData,
    generatedAt: new Date(),
    version: (this.summary?.version || 0) + 1
  };
  this.markModified('summary');
};

conversationSchema.methods.calculateEngagementScore = function() {
  const messageCount = this.messages ? this.messages.length : 0;
  const userMessages = this.messages ? this.messages.filter(m => m.type === 'user').length : 0;
  const aiMessages = this.messages ? this.messages.filter(m => m.type === 'ai').length : 0;
  
  // Base score on conversation length
  let score = Math.min(messageCount * 2, 40);
  
  // Bonus for balanced conversation
  if (userMessages > 0 && aiMessages > 0) {
    const balance = Math.min(userMessages, aiMessages) / Math.max(userMessages, aiMessages);
    score += balance * 20;
  }
  
  // Bonus for user actions taken
  const actionCount = this.messages ? this.messages.reduce((count, msg) => {
    return count + (msg.metadata?.actions?.length || 0);
  }, 0) : 0;
  score += Math.min(actionCount * 5, 20);
  
  // Bonus for user satisfaction
  if (this.analytics.userSatisfaction?.rating) {
    score += (this.analytics.userSatisfaction.rating / 5) * 20;
  }
  
  this.analytics.engagementScore = Math.min(Math.round(score), 100);
  return this.analytics.engagementScore;
};

// ENHANCED: Static methods
conversationSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { 
    userId, 
    isActive: true  // Use isActive instead of status
  };
  
  if (options.category) query.category = options.category;
  if (options.tags && options.tags.length > 0) query.tags = { $in: options.tags };
  if (options.pinned !== undefined) query.isPinned = options.pinned;
  if (options.starred !== undefined) query.isStarred = options.starred;
  
  return this.find(query)
    .sort(options.sort || { lastActiveAt: -1 })
    .limit(options.limit || 50)
    .populate('context.primaryResumeId', 'name analysis.overallScore')
    .populate('context.relatedJobIds', 'title company');
};

conversationSchema.statics.searchConversations = function(userId, searchQuery, options = {}) {
  const searchRegex = new RegExp(searchQuery, 'i');
  
  return this.find({
    userId,
    isActive: true,
    $or: [
      { title: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
      { 'summary.keyTopics': searchRegex },
      { 'messages.content': searchRegex }
    ]
  })
  .sort({ lastActiveAt: -1 })
  .limit(options.limit || 20);
};

conversationSchema.statics.getConversationStats = function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId), isActive: true } },
    {
      $group: {
        _id: null,
        totalConversations: { $sum: 1 },
        totalMessages: { $sum: '$analytics.messageCount' },
        totalTokens: { $sum: '$analytics.tokensUsed' },
        avgEngagement: { $avg: '$analytics.engagementScore' },
        categoriesCount: { $addToSet: '$category' }
      }
    }
  ]);
};

// ENHANCED: Migration helper method
conversationSchema.statics.migrateToIsActive = async function(userId = null) {
  const query = userId ? { userId } : {};
  
  try {
    // Migrate status to isActive
    await this.updateMany(
      { ...query, status: 'active' },
      { $set: { isActive: true } }
    );
    
    await this.updateMany(
      { ...query, status: { $in: ['archived', 'deleted'] } },
      { $set: { isActive: false } }
    );
    
    // Migrate pinned/starred to isPinned/isStarred
    await this.updateMany(
      { ...query, pinned: true },
      { $set: { isPinned: true } }
    );
    
    await this.updateMany(
      { ...query, starred: true },
      { $set: { isStarred: true } }
    );
    
    console.log('✅ Conversation migration completed');
  } catch (error) {
    console.error('❌ Conversation migration failed:', error);
    throw error;
  }
};

// Text search index
conversationSchema.index({
  title: 'text',
  description: 'text',
  'messages.content': 'text',
  'summary.keyTopics': 'text'
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;