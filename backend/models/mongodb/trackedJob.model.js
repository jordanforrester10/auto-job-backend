// backend/models/mongodb/trackedJob.model.js - Job Application Tracker Model
const mongoose = require('mongoose');

const trackedJobSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: [true, 'Job ID is required'],
    index: true
  },
  status: {
    type: String,
    enum: {
      values: ['interested', 'applied', 'interviewing', 'closed'],
      message: 'Status must be one of: interested, applied, interviewing, closed'
    },
    default: 'interested',
    index: true
  },
  notes: [{
    content: {
      type: String,
      required: [true, 'Note content is required'],
      maxlength: [2000, 'Note content cannot exceed 2000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  interviews: [{
    type: {
      type: String,
      enum: {
        values: ['phone', 'video', 'onsite', 'technical', 'behavioral', 'panel', 'final'],
        message: 'Interview type must be one of: phone, video, onsite, technical, behavioral, panel, final'
      },
      required: [true, 'Interview type is required']
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Interview scheduled date is required']
    },
    duration: {
      type: Number, // in minutes
      min: [15, 'Interview duration must be at least 15 minutes'],
      max: [480, 'Interview duration cannot exceed 8 hours']
    },
    interviewer: {
      name: String,
      title: String,
      email: String
    },
    location: {
      type: String,
      maxlength: [500, 'Location cannot exceed 500 characters']
    },
    notes: {
      type: String,
      maxlength: [2000, 'Interview notes cannot exceed 2000 characters']
    },
    outcome: {
      type: String,
      enum: {
        values: ['pending', 'passed', 'failed', 'cancelled', 'rescheduled'],
        message: 'Interview outcome must be one of: pending, passed, failed, cancelled, rescheduled'
      },
      default: 'pending'
    },
    feedback: {
      type: String,
      maxlength: [2000, 'Interview feedback cannot exceed 2000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    index: true
  },
  applicationDate: {
    type: Date,
    index: true
  },
  followUpReminders: [{
    date: {
      type: Date,
      required: [true, 'Follow-up reminder date is required']
    },
    message: {
      type: String,
      required: [true, 'Follow-up reminder message is required'],
      maxlength: [500, 'Follow-up reminder message cannot exceed 500 characters']
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be one of: low, medium, high, urgent'
    },
    default: 'medium',
    index: true
  },
  source: {
    type: String,
    enum: {
      values: ['manual', 'ai_discovery', 'referral', 'job_board', 'company_website', 'recruiter'],
      message: 'Source must be one of: manual, ai_discovery, referral, job_board, company_website, recruiter'
    },
    default: 'manual'
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  archivedAt: {
    type: Date,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    salaryExpectation: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    workArrangement: {
      type: String,
      enum: ['remote', 'hybrid', 'onsite', 'flexible']
    },
    applicationMethod: {
      type: String,
      enum: ['online', 'email', 'referral', 'recruiter', 'direct']
    },
    jobBoardUrl: String,
    companyContactInfo: {
      recruiterName: String,
      recruiterEmail: String,
      hiringManagerName: String,
      hiringManagerEmail: String
    },
    customFields: [{
      key: String,
      value: String,
      type: {
        type: String,
        enum: ['text', 'number', 'date', 'boolean'],
        default: 'text'
      }
    }]
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate tracking of same job by same user
trackedJobSchema.index({ 
  userId: 1, 
  jobId: 1 
}, { 
  unique: true,
  name: 'unique_user_job_tracking'
});

// Compound indexes for common queries
trackedJobSchema.index({ userId: 1, status: 1, lastActivity: -1 });
trackedJobSchema.index({ userId: 1, priority: 1, lastActivity: -1 });
trackedJobSchema.index({ userId: 1, isArchived: 1, lastActivity: -1 });
trackedJobSchema.index({ userId: 1, applicationDate: -1 });
trackedJobSchema.index({ userId: 1, 'interviews.scheduledDate': 1 });

// Index for cleanup operations
trackedJobSchema.index({ 
  status: 1, 
  archivedAt: 1 
}, {
  partialFilterExpression: { 
    status: 'closed',
    archivedAt: { $exists: true }
  }
});

// Virtual for getting job details
trackedJobSchema.virtual('jobDetails', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

// Virtual for getting user details
trackedJobSchema.virtual('userDetails', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Virtual for getting resume details
trackedJobSchema.virtual('resumeDetails', {
  ref: 'Resume',
  localField: 'resumeId',
  foreignField: '_id',
  justOne: true
});

// Virtual for upcoming interviews
trackedJobSchema.virtual('upcomingInterviews').get(function() {
  const now = new Date();
  return this.interviews.filter(interview => 
    interview.scheduledDate > now && 
    interview.outcome === 'pending'
  ).sort((a, b) => a.scheduledDate - b.scheduledDate);
});

// Virtual for completed interviews
trackedJobSchema.virtual('completedInterviews').get(function() {
  return this.interviews.filter(interview => 
    interview.outcome !== 'pending'
  ).sort((a, b) => b.scheduledDate - a.scheduledDate);
});

// Virtual for pending follow-ups
trackedJobSchema.virtual('pendingFollowUps').get(function() {
  const now = new Date();
  return this.followUpReminders.filter(reminder => 
    !reminder.completed && reminder.date <= now
  ).sort((a, b) => a.date - b.date);
});

// Virtual for days since last activity
trackedJobSchema.virtual('daysSinceLastActivity').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.lastActivity);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to update lastActivity
trackedJobSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastActivity = new Date();
  }
  
  // Auto-set applicationDate when status changes to 'applied'
  if (this.isModified('status') && this.status === 'applied' && !this.applicationDate) {
    this.applicationDate = new Date();
  }
  
  // Auto-archive when status changes to 'closed'
  if (this.isModified('status') && this.status === 'closed' && !this.archivedAt) {
    this.archivedAt = new Date();
    this.isArchived = true;
  }
  
  next();
});

// Pre-save middleware to update interview updatedAt
trackedJobSchema.pre('save', function(next) {
  if (this.isModified('interviews')) {
    this.interviews.forEach(interview => {
      if (interview.isModified && interview.isModified()) {
        interview.updatedAt = new Date();
      }
    });
  }
  next();
});

// Instance method to add a note
trackedJobSchema.methods.addNote = function(content) {
  this.notes.push({
    content: content,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to update status
trackedJobSchema.methods.updateStatus = function(newStatus, note = null) {
  const oldStatus = this.status;
  this.status = newStatus;
  this.lastActivity = new Date();
  
  // Add automatic note about status change
  const statusNote = `Status changed from ${oldStatus} to ${newStatus}`;
  this.notes.push({
    content: note ? `${statusNote}. ${note}` : statusNote,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return this.save();
};

// Instance method to schedule interview
trackedJobSchema.methods.scheduleInterview = function(interviewData) {
  this.interviews.push({
    ...interviewData,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  this.lastActivity = new Date();
  
  // Add note about interview scheduling
  this.notes.push({
    content: `${interviewData.type} interview scheduled for ${interviewData.scheduledDate.toLocaleDateString()}`,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return this.save();
};

// Instance method to add follow-up reminder
trackedJobSchema.methods.addFollowUpReminder = function(date, message) {
  this.followUpReminders.push({
    date: date,
    message: message,
    completed: false,
    createdAt: new Date()
  });
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to complete follow-up reminder
trackedJobSchema.methods.completeFollowUpReminder = function(reminderId) {
  const reminder = this.followUpReminders.id(reminderId);
  if (reminder) {
    reminder.completed = true;
    reminder.completedAt = new Date();
    this.lastActivity = new Date();
  }
  return this.save();
};

// Instance method to archive job
trackedJobSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to unarchive job
trackedJobSchema.methods.unarchive = function() {
  this.isArchived = false;
  this.archivedAt = null;
  this.lastActivity = new Date();
  return this.save();
};

// Static method to get user statistics
trackedJobSchema.statics.getUserStats = async function(userId) {
  return await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isArchived: false
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgDaysSinceActivity: {
          $avg: {
            $divide: [
              { $subtract: [new Date(), '$lastActivity'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: null,
        statusBreakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            avgDaysSinceActivity: { $round: ['$avgDaysSinceActivity', 1] }
          }
        },
        totalJobs: { $sum: '$count' }
      }
    }
  ]);
};

// Static method to find jobs needing follow-up
trackedJobSchema.statics.getJobsNeedingFollowUp = function(userId) {
  const now = new Date();
  return this.find({
    userId: userId,
    isArchived: false,
    'followUpReminders.date': { $lte: now },
    'followUpReminders.completed': false
  }).populate('jobId', 'title company');
};

// Static method to get upcoming interviews
trackedJobSchema.statics.getUpcomingInterviews = function(userId, days = 7) {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    userId: userId,
    isArchived: false,
    'interviews.scheduledDate': { 
      $gte: now, 
      $lte: futureDate 
    },
    'interviews.outcome': 'pending'
  }).populate('jobId', 'title company');
};

// Static method for cleanup of old archived jobs
trackedJobSchema.statics.cleanupOldArchivedJobs = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await this.deleteMany({
    status: 'closed',
    archivedAt: { $lt: cutoffDate }
  });
  
  console.log(`🧹 Cleaned up ${result.deletedCount} old archived jobs older than ${daysOld} days`);
  return result;
};

// Ensure virtual fields are serialized
trackedJobSchema.set('toJSON', { virtuals: true });
trackedJobSchema.set('toObject', { virtuals: true });

const TrackedJob = mongoose.model('TrackedJob', trackedJobSchema);

module.exports = TrackedJob;
