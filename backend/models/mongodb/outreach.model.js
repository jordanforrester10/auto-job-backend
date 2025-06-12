// backend/models/mongodb/outreach.model.js
const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  extractedInfo: {
    nextSteps: [String],
    scheduledMeeting: {
      type: Boolean,
      default: false
    },
    referralMade: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  _id: true
});

const followUpSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['drafted', 'sent', 'replied'],
    default: 'drafted'
  },
  type: {
    type: String,
    enum: ['reminder', 'additional_info', 'thank_you', 'check_in'],
    default: 'reminder'
  },
  scheduledFor: Date
}, {
  timestamps: true,
  _id: true
});

const outreachSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recruiterId: {
    type: String, // PostgreSQL recruiter ID
    required: true,
    index: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    index: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    index: true
  },
  
  // Message content
  messageContent: {
    type: String,
    required: true
  },
  messageTemplate: {
    type: String,
    enum: ['introduction', 'follow_up', 'application', 'thank_you', 'custom'],
    default: 'custom'
  },
  subject: String,
  
  // Customizations and personalization
  customizations: [{
    type: {
      type: String,
      enum: ['tone_adjustment', 'content_addition', 'length_modification', 'style_change']
    },
    description: String,
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // AI generation metadata
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiMetadata: {
    model: String,
    tokensUsed: Number,
    confidence: Number,
    generatedAt: Date,
    prompt: String
  },
  
  // Communication details
  sentVia: {
    type: String,
    enum: ['email', 'linkedin', 'phone', 'other'],
    default: 'linkedin'
  },
  status: {
    type: String,
    enum: ['drafted', 'sent', 'delivered', 'opened', 'replied', 'no_reply', 'bounced'],
    default: 'drafted'
  },
  
  // Timing
  sentAt: Date,
  deliveredAt: Date,
  openedAt: Date,
  scheduledFor: Date,
  
  // Responses and follow-ups
  replies: [replySchema],
  followUps: [followUpSchema],
  
  // Tracking and analytics
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    responseTime: Number, // Time to first response in hours
    engagementScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Campaign information
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  },
  campaignName: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Outcome tracking
  outcome: {
    result: {
      type: String,
      enum: ['meeting_scheduled', 'referral_received', 'application_submitted', 'no_response', 'not_interested', 'connection_made']
    },
    notes: String,
    nextSteps: [String],
    followUpDate: Date
  },
  
  // Tags and categorization
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  category: {
    type: String,
    enum: ['cold_outreach', 'warm_introduction', 'referral_request', 'application_follow_up', 'networking'],
    default: 'cold_outreach'
  },
  
  // Relationship context
  relationship: {
    connectionLevel: {
      type: String,
      enum: ['1st', '2nd', '3rd', 'none'],
      default: 'none'
    },
    mutualConnections: [String],
    previousInteractions: [{
      date: Date,
      type: String,
      notes: String
    }]
  },
  
  // Reminders and notifications
  reminders: [{
    type: {
      type: String,
      enum: ['follow_up', 'response_check', 'next_action']
    },
    scheduledFor: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  
  // Integration data
  integrations: {
    linkedinMessageId: String,
    emailMessageId: String,
    crmId: String,
    externalData: mongoose.Schema.Types.Mixed
  },
  
  // Archival and cleanup
  isActive: {
    type: Boolean,
    default: true
  },
  archivedAt: Date,
  archivedReason: String,
  
  // User notes
  notes: String,
  privateNotes: String,
  
}, {
  timestamps: true
});

// Indexes for performance
outreachSchema.index({ userId: 1, status: 1 });
outreachSchema.index({ userId: 1, createdAt: -1 });
outreachSchema.index({ recruiterId: 1, userId: 1 });
outreachSchema.index({ jobId: 1 });
outreachSchema.index({ status: 1, sentAt: 1 });
outreachSchema.index({ campaignId: 1 });
outreachSchema.index({ scheduledFor: 1 });
outreachSchema.index({ 'reminders.scheduledFor': 1, 'reminders.completed': 1 });

// Text search index
outreachSchema.index({
  messageContent: 'text',
  subject: 'text',
  notes: 'text',
  tags: 'text'
});

// Virtual for response time calculation
outreachSchema.virtual('responseTimeHours').get(function() {
  if (this.sentAt && this.replies && this.replies.length > 0) {
    const firstReply = this.replies[0];
    return Math.round((firstReply.receivedAt - this.sentAt) / (1000 * 60 * 60));
  }
  return null;
});

// Virtual for days since sent
outreachSchema.virtual('daysSinceSent').get(function() {
  if (this.sentAt) {
    return Math.floor((Date.now() - this.sentAt) / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for reply count
outreachSchema.virtual('replyCount').get(function() {
  return this.replies ? this.replies.length : 0;
});

// Virtual for follow-up count
outreachSchema.virtual('followUpCount').get(function() {
  return this.followUps ? this.followUps.length : 0;
});

// Pre-save middleware
outreachSchema.pre('save', function(next) {
  // Update engagement score based on interactions
  if (this.isModified('replies') || this.isModified('analytics')) {
    this.calculateEngagementScore();
  }
  
  // Update response time
  if (this.isModified('replies') && this.replies.length > 0 && this.sentAt) {
    const firstReply = this.replies[0];
    this.analytics.responseTime = (firstReply.receivedAt - this.sentAt) / (1000 * 60 * 60);
  }
  
  next();
});

// Instance methods
outreachSchema.methods.addReply = function(replyData) {
  this.replies.push({
    content: replyData.content,
    receivedAt: replyData.receivedAt || new Date(),
    sentiment: replyData.sentiment || 'neutral',
    extractedInfo: replyData.extractedInfo || {}
  });
  
  // Update status
  if (this.status === 'sent' || this.status === 'delivered') {
    this.status = 'replied';
  }
  
  return this.save();
};

outreachSchema.methods.addFollowUp = function(followUpData) {
  this.followUps.push({
    content: followUpData.content,
    type: followUpData.type || 'reminder',
    scheduledFor: followUpData.scheduledFor,
    status: followUpData.status || 'drafted'
  });
  
  return this.save();
};

outreachSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  
  // Schedule follow-up reminder if not replied within 7 days
  this.reminders.push({
    type: 'follow_up',
    scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  return this.save();
};

outreachSchema.methods.calculateEngagementScore = function() {
  let score = 0;
  
  // Base score for being sent
  if (this.status === 'sent' || this.status === 'delivered' || this.status === 'replied') {
    score += 20;
  }
  
  // Bonus for being opened/delivered
  if (this.status === 'delivered' || this.status === 'opened' || this.status === 'replied') {
    score += 20;
  }
  
  // Major bonus for replies
  score += Math.min(this.replies.length * 30, 60);
  
  // Bonus for positive sentiment
  const positivReplies = this.replies.filter(r => r.sentiment === 'positive').length;
  score += positiveReplies * 10;
  
  // Bonus for quick response
  if (this.analytics.responseTime && this.analytics.responseTime <= 24) {
    score += 15;
  }
  
  // Bonus for follow-ups
  score += Math.min(this.followUps.length * 5, 15);
  
  this.analytics.engagementScore = Math.min(score, 100);
  return this.analytics.engagementScore;
};

outreachSchema.methods.scheduleReminder = function(type, date) {
  this.reminders.push({
    type: type,
    scheduledFor: date,
    completed: false
  });
  
  return this.save();
};

outreachSchema.methods.markReminderComplete = function(reminderId) {
  const reminder = this.reminders.id(reminderId);
  if (reminder) {
    reminder.completed = true;
    reminder.completedAt = new Date();
  }
  
  return this.save();
};

// Static methods
outreachSchema.statics.findByRecruiter = function(recruiterId, userId, options = {}) {
  const query = { recruiterId, userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 10);
};

outreachSchema.statics.getAnalytics = function(userId, timeframe = '30d') {
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
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalOutreach: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        replied: { $sum: { $cond: [{ $eq: ['$status', 'replied'] }, 1, 0] } },
        avgEngagement: { $avg: '$analytics.engagementScore' },
        avgResponseTime: { $avg: '$analytics.responseTime' }
      }
    }
  ]);
};

outreachSchema.statics.findPendingReminders = function() {
  return this.find({
    'reminders.scheduledFor': { $lte: new Date() },
    'reminders.completed': false,
    isActive: true
  });
};

outreachSchema.statics.getTopPerformingTemplates = function(userId, limit = 5) {
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        status: { $in: ['sent', 'replied'] }
      }
    },
    {
      $group: {
        _id: '$messageTemplate',
        count: { $sum: 1 },
        responseRate: {
          $avg: {
            $cond: [{ $eq: ['$status', 'replied'] }, 1, 0]
          }
        },
        avgEngagement: { $avg: '$analytics.engagementScore' }
      }
    },
    {
      $sort: { responseRate: -1, avgEngagement: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

const Outreach = mongoose.model('Outreach', outreachSchema);

module.exports = Outreach;