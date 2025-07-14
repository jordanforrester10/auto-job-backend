// backend/models/mongodb/weeklyJobTracking.model.js - NEW FILE
const mongoose = require('mongoose');

const weeklyJobTrackingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  weekStart: {
    type: Date,
    required: true
  },
  weekEnd: {
    type: Date,
    required: true
  },
  weekYear: {
    type: Number,
    required: true // e.g., 2025
  },
  weekNumber: {
    type: Number,
    required: true // e.g., 29 (week 29 of the year)
  },
  jobsFoundThisWeek: {
    type: Number,
    default: 0
  },
  weeklyLimit: {
    type: Number,
    required: true // 50 for Casual, 100 for Hunter
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'casual', 'hunter'],
    required: true
  },
  searchRuns: [{
    searchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiJobSearch'
    },
    runDate: {
      type: Date,
      default: Date.now
    },
    jobsFound: {
      type: Number,
      default: 0
    },
    searchName: String,
    resumeName: String,
    searchDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
weeklyJobTrackingSchema.index({ userId: 1, weekStart: 1 }, { unique: true });
weeklyJobTrackingSchema.index({ userId: 1, weekYear: 1, weekNumber: 1 });
weeklyJobTrackingSchema.index({ weekStart: 1, weekEnd: 1 });

// Static method to get or create weekly tracking record
weeklyJobTrackingSchema.statics.getOrCreateWeeklyRecord = async function(userId, subscriptionTier, weeklyLimit) {
  const now = new Date();
  const { weekStart, weekEnd, weekYear, weekNumber } = this.calculateWeekDates(now);
  
  let weeklyRecord = await this.findOne({
    userId,
    weekStart: weekStart
  });
  
  if (!weeklyRecord) {
    weeklyRecord = new this({
      userId,
      weekStart,
      weekEnd,
      weekYear,
      weekNumber,
      jobsFoundThisWeek: 0,
      weeklyLimit,
      subscriptionTier,
      searchRuns: []
    });
    await weeklyRecord.save();
  }
  
  return weeklyRecord;
};

// Static method to calculate week dates (Monday to Sunday)
weeklyJobTrackingSchema.statics.calculateWeekDates = function(date = new Date()) {
  const startOfWeek = new Date(date);
  const dayOfWeek = date.getUTCDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  startOfWeek.setUTCDate(date.getUTCDate() - daysToSubtract);
  startOfWeek.setUTCHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  endOfWeek.setUTCHours(23, 59, 59, 999);
  
  // Calculate week number and year
  const weekYear = startOfWeek.getUTCFullYear();
  const firstDayOfYear = new Date(weekYear, 0, 1);
  const weekNumber = Math.ceil(((startOfWeek - firstDayOfYear) / 86400000 + firstDayOfYear.getUTCDay() + 1) / 7);
  
  return {
    weekStart: startOfWeek,
    weekEnd: endOfWeek,
    weekYear,
    weekNumber
  };
};

// Static method to add jobs to weekly tracking
weeklyJobTrackingSchema.statics.addJobsToWeeklyTracking = async function(userId, searchId, jobsFound, searchName, resumeName, subscriptionTier, weeklyLimit) {
  try {
    console.log(`📊 Adding ${jobsFound} jobs to weekly tracking for user ${userId}`);
    
    const weeklyRecord = await this.getOrCreateWeeklyRecord(userId, subscriptionTier, weeklyLimit);
    
    // Check if we would exceed the weekly limit
    const newTotal = weeklyRecord.jobsFoundThisWeek + jobsFound;
    const jobsToAdd = Math.min(jobsFound, weeklyRecord.weeklyLimit - weeklyRecord.jobsFoundThisWeek);
    
    if (jobsToAdd <= 0) {
      console.log(`⚠️ Weekly limit already reached: ${weeklyRecord.jobsFoundThisWeek}/${weeklyRecord.weeklyLimit}`);
      return {
        success: false,
        reason: 'weekly_limit_reached',
        current: weeklyRecord.jobsFoundThisWeek,
        limit: weeklyRecord.weeklyLimit,
        remaining: 0
      };
    }
    
    // Add the search run record
    weeklyRecord.searchRuns.push({
      searchId,
      runDate: new Date(),
      jobsFound: jobsToAdd,
      searchName,
      resumeName,
      searchDeleted: false
    });
    
    // Update the total
    weeklyRecord.jobsFoundThisWeek += jobsToAdd;
    weeklyRecord.lastUpdated = new Date();
    
    await weeklyRecord.save();
    
    console.log(`✅ Added ${jobsToAdd} jobs to weekly tracking. New total: ${weeklyRecord.jobsFoundThisWeek}/${weeklyRecord.weeklyLimit}`);
    
    return {
      success: true,
      jobsAdded: jobsToAdd,
      totalThisWeek: weeklyRecord.jobsFoundThisWeek,
      weeklyLimit: weeklyRecord.weeklyLimit,
      remaining: weeklyRecord.weeklyLimit - weeklyRecord.jobsFoundThisWeek,
      isLimitReached: weeklyRecord.jobsFoundThisWeek >= weeklyRecord.weeklyLimit
    };
    
  } catch (error) {
    console.error('Error adding jobs to weekly tracking:', error);
    throw error;
  }
};

// Static method to get current weekly stats
weeklyJobTrackingSchema.statics.getCurrentWeeklyStats = async function(userId, weeklyLimit = 50) {
  try {
    const { weekStart } = this.calculateWeekDates();
    
    const weeklyRecord = await this.findOne({
      userId,
      weekStart: weekStart
    });
    
    if (!weeklyRecord) {
      return {
        jobsFoundThisWeek: 0,
        weeklyLimit: weeklyLimit,
        remainingThisWeek: weeklyLimit,
        isLimitReached: false,
        weekStart: weekStart,
        weekEnd: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000 + 23 * 60 * 60 * 1000 + 59 * 1000),
        calculationMethod: 'persistent_weekly_tracking'
      };
    }
    
    return {
      jobsFoundThisWeek: weeklyRecord.jobsFoundThisWeek,
      weeklyLimit: weeklyRecord.weeklyLimit,
      remainingThisWeek: Math.max(0, weeklyRecord.weeklyLimit - weeklyRecord.jobsFoundThisWeek),
      isLimitReached: weeklyRecord.jobsFoundThisWeek >= weeklyRecord.weeklyLimit,
      weekStart: weeklyRecord.weekStart,
      weekEnd: weeklyRecord.weekEnd,
      searchRuns: weeklyRecord.searchRuns || [],
      calculationMethod: 'persistent_weekly_tracking'
    };
    
  } catch (error) {
    console.error('Error getting current weekly stats:', error);
    return {
      jobsFoundThisWeek: 0,
      weeklyLimit: weeklyLimit,
      remainingThisWeek: weeklyLimit,
      isLimitReached: false,
      weekStart: new Date(),
      weekEnd: new Date(),
      error: error.message,
      calculationMethod: 'error_fallback'
    };
  }
};

// Static method to mark search as deleted (but preserve job count)
weeklyJobTrackingSchema.statics.markSearchAsDeleted = async function(userId, searchId) {
  try {
    console.log(`🗑️ Marking search ${searchId} as deleted in weekly tracking for user ${userId}`);
    
    const { weekStart } = this.calculateWeekDates();
    
    const result = await this.updateOne(
      {
        userId,
        weekStart: weekStart,
        'searchRuns.searchId': searchId
      },
      {
        $set: {
          'searchRuns.$.searchDeleted': true,
          'searchRuns.$.deletedAt': new Date(),
          lastUpdated: new Date()
        }
      }
    );
    
    console.log(`📊 Marked search as deleted in weekly tracking: ${result.modifiedCount} records updated`);
    
    return result.modifiedCount > 0;
    
  } catch (error) {
    console.error('Error marking search as deleted in weekly tracking:', error);
    return false;
  }
};

// Instance method to get weekly summary
weeklyJobTrackingSchema.methods.getWeeklySummary = function() {
  return {
    userId: this.userId,
    weekStart: this.weekStart,
    weekEnd: this.weekEnd,
    weekYear: this.weekYear,
    weekNumber: this.weekNumber,
    jobsFoundThisWeek: this.jobsFoundThisWeek,
    weeklyLimit: this.weeklyLimit,
    remaining: Math.max(0, this.weeklyLimit - this.jobsFoundThisWeek),
    percentage: Math.round((this.jobsFoundThisWeek / this.weeklyLimit) * 100),
    isLimitReached: this.jobsFoundThisWeek >= this.weeklyLimit,
    subscriptionTier: this.subscriptionTier,
    totalSearchRuns: this.searchRuns.length,
    activeSearchRuns: this.searchRuns.filter(run => !run.searchDeleted).length,
    deletedSearchRuns: this.searchRuns.filter(run => run.searchDeleted).length
  };
};

// Instance method to get search runs breakdown
weeklyJobTrackingSchema.methods.getSearchRunsBreakdown = function() {
  return this.searchRuns.map(run => ({
    searchId: run.searchId,
    runDate: run.runDate,
    jobsFound: run.jobsFound,
    searchName: run.searchName,
    resumeName: run.resumeName,
    searchDeleted: run.searchDeleted,
    deletedAt: run.deletedAt
  }));
};

// Static method to reset weekly counts (for new week)
weeklyJobTrackingSchema.statics.resetWeeklyCountsIfNeeded = async function() {
  const { weekStart } = this.calculateWeekDates();
  
  // This is automatically handled by the getOrCreateWeeklyRecord method
  // which creates new records for new weeks
  console.log(`📅 Weekly tracking automatically creates new records for week starting ${weekStart.toISOString()}`);
};

// Static method to get weekly tracking history for a user
weeklyJobTrackingSchema.statics.getWeeklyHistory = async function(userId, limit = 12) {
  return this.find({ userId })
    .sort({ weekStart: -1 })
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('WeeklyJobTracking', weeklyJobTrackingSchema);