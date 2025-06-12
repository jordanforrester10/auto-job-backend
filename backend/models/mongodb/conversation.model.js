// backend/models/mongodb/conversation.model.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
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
    }
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
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active'
  },
  lastActiveAt: {
    type: Date,
    default: Date.now
  },
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

// Indexes for performance
conversationSchema.index({ userId: 1, status: 1, lastActiveAt: -1 });
conversationSchema.index({ userId: 1, category: 1 });
conversationSchema.index({ userId: 1, tags: 1 });
conversationSchema.index({ 'messages.type': 1, 'messages.createdAt': -1 });
conversationSchema.index({ 'summary.keyTopics': 1 });
conversationSchema.index({ lastActiveAt: -1 });

// Virtual for message count
conversationSchema.virtual('totalMessages').get(function() {
  return this.messages.length;
});

// Virtual for last message
conversationSchema.virtual('lastMessage').get(function() {
  return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
});

// Pre-save middleware to update analytics
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.analytics.messageCount = this.messages.length;
    this.analytics.tokensUsed = this.messages.reduce((total, msg) => {
      return total + (msg.metadata?.tokens || 0);
    }, 0);
    this.lastActiveAt = new Date();
  }
  next();
});

// Instance methods
conversationSchema.methods.addMessage = function(messageData) {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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
  
  return message;
};

conversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
};

conversationSchema.methods.getMessagesByType = function(type) {
  return this.messages.filter(msg => msg.type === type);
};

conversationSchema.methods.searchMessages = function(query) {
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
};

conversationSchema.methods.calculateEngagementScore = function() {
  const messageCount = this.messages.length;
  const userMessages = this.messages.filter(m => m.type === 'user').length;
  const aiMessages = this.messages.filter(m => m.type === 'ai').length;
  
  // Base score on conversation length
  let score = Math.min(messageCount * 2, 40);
  
  // Bonus for balanced conversation
  if (userMessages > 0 && aiMessages > 0) {
    const balance = Math.min(userMessages, aiMessages) / Math.max(userMessages, aiMessages);
    score += balance * 20;
  }
  
  // Bonus for user actions taken
  const actionCount = this.messages.reduce((count, msg) => {
    return count + (msg.metadata?.actions?.length || 0);
  }, 0);
  score += Math.min(actionCount * 5, 20);
  
  // Bonus for user satisfaction
  if (this.analytics.userSatisfaction?.rating) {
    score += (this.analytics.userSatisfaction.rating / 5) * 20;
  }
  
  this.analytics.engagementScore = Math.min(Math.round(score), 100);
  return this.analytics.engagementScore;
};

// Static methods
conversationSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId, status: { $ne: 'deleted' } };
  
  if (options.category) query.category = options.category;
  if (options.tags && options.tags.length > 0) query.tags = { $in: options.tags };
  if (options.pinned !== undefined) query.pinned = options.pinned;
  if (options.starred !== undefined) query.starred = options.starred;
  
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
    status: { $ne: 'deleted' },
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
    { $match: { userId: mongoose.Types.ObjectId(userId), status: { $ne: 'deleted' } } },
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

// Text search index
conversationSchema.index({
  title: 'text',
  description: 'text',
  'messages.content': 'text',
  'summary.keyTopics': 'text'
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;