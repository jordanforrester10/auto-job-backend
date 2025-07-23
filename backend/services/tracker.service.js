// backend/services/tracker.service.js - Job Application Tracker Background Service
const TrackedJob = require('../models/mongodb/trackedJob.model');
const schedule = require('node-schedule');

class TrackerService {
  constructor() {
    this.isInitialized = false;
    this.scheduledJobs = new Map();
  }

  /**
   * Initialize the tracker service and start scheduled jobs
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ Tracker service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Job Application Tracker Service...');

      // Start scheduled cleanup job
      this.startCleanupSchedule();

      // Start follow-up reminder notifications (if needed in future)
      this.startFollowUpSchedule();

      this.isInitialized = true;
      console.log('✅ Job Application Tracker Service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Tracker Service:', error);
      throw error;
    }
  }

  /**
   * Start the scheduled cleanup job for old archived jobs
   * Runs daily at 2:00 AM
   */
  startCleanupSchedule() {
    try {
      // Cancel existing cleanup job if it exists
      if (this.scheduledJobs.has('cleanup')) {
        this.scheduledJobs.get('cleanup').cancel();
      }

      // Schedule cleanup job to run daily at 2:00 AM
      const cleanupJob = schedule.scheduleJob('cleanup-old-jobs', '0 2 * * *', async () => {
        console.log('🧹 Starting scheduled cleanup of old archived jobs...');
        
        try {
          const result = await this.cleanupOldArchivedJobs();
          console.log(`✅ Cleanup completed: ${result.deletedCount} old jobs removed`);
        } catch (error) {
          console.error('❌ Cleanup job failed:', error);
        }
      });

      this.scheduledJobs.set('cleanup', cleanupJob);
      console.log('📅 Scheduled daily cleanup job at 2:00 AM');

    } catch (error) {
      console.error('❌ Failed to start cleanup schedule:', error);
    }
  }

  /**
   * Start the scheduled follow-up reminder check
   * Runs every hour to check for pending follow-ups
   */
  startFollowUpSchedule() {
    try {
      // Cancel existing follow-up job if it exists
      if (this.scheduledJobs.has('followup')) {
        this.scheduledJobs.get('followup').cancel();
      }

      // Schedule follow-up check to run every hour
      const followUpJob = schedule.scheduleJob('check-followups', '0 * * * *', async () => {
        console.log('📋 Checking for pending follow-up reminders...');
        
        try {
          const result = await this.checkPendingFollowUps();
          if (result.count > 0) {
            console.log(`📬 Found ${result.count} pending follow-ups across ${result.users} users`);
          }
        } catch (error) {
          console.error('❌ Follow-up check failed:', error);
        }
      });

      this.scheduledJobs.set('followup', followUpJob);
      console.log('📅 Scheduled hourly follow-up reminder checks');

    } catch (error) {
      console.error('❌ Failed to start follow-up schedule:', error);
    }
  }

  /**
   * Clean up old archived jobs (older than specified days)
   * @param {number} daysOld - Number of days old to consider for cleanup (default: 90)
   * @returns {Object} Cleanup result with count of deleted jobs
   */
  async cleanupOldArchivedJobs(daysOld = 90) {
    try {
      console.log(`🧹 Starting cleanup of archived jobs older than ${daysOld} days...`);

      const result = await TrackedJob.cleanupOldArchivedJobs(daysOld);

      // Log cleanup statistics
      if (result.deletedCount > 0) {
        console.log(`✅ Cleanup completed: Removed ${result.deletedCount} old archived jobs`);
      } else {
        console.log('ℹ️ No old archived jobs found for cleanup');
      }

      return {
        success: true,
        deletedCount: result.deletedCount,
        daysOld,
        cleanupDate: new Date()
      };

    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      return {
        success: false,
        error: error.message,
        deletedCount: 0,
        daysOld,
        cleanupDate: new Date()
      };
    }
  }

  /**
   * Check for pending follow-up reminders across all users
   * This could be extended to send notifications in the future
   * @returns {Object} Summary of pending follow-ups
   */
  async checkPendingFollowUps() {
    try {
      const now = new Date();

      // Find all tracked jobs with pending follow-ups
      const jobsWithPendingFollowUps = await TrackedJob.aggregate([
        {
          $match: {
            isArchived: false,
            'followUpReminders.date': { $lte: now },
            'followUpReminders.completed': false
          }
        },
        {
          $group: {
            _id: '$userId',
            jobCount: { $sum: 1 },
            pendingFollowUps: {
              $push: {
                jobId: '$jobId',
                trackedJobId: '$_id',
                followUpReminders: {
                  $filter: {
                    input: '$followUpReminders',
                    cond: {
                      $and: [
                        { $lte: ['$$this.date', now] },
                        { $eq: ['$$this.completed', false] }
                      ]
                    }
                  }
                }
              }
            }
          }
        },
        {
          $project: {
            userId: '$_id',
            jobCount: 1,
            totalPendingFollowUps: {
              $sum: {
                $map: {
                  input: '$pendingFollowUps',
                  as: 'job',
                  in: { $size: '$$job.followUpReminders' }
                }
              }
            }
          }
        }
      ]);

      const totalUsers = jobsWithPendingFollowUps.length;
      const totalPendingFollowUps = jobsWithPendingFollowUps.reduce(
        (sum, user) => sum + user.totalPendingFollowUps, 
        0
      );

      // In the future, this could trigger email notifications or in-app notifications
      // For now, we just log the statistics

      return {
        success: true,
        count: totalPendingFollowUps,
        users: totalUsers,
        checkDate: now,
        userBreakdown: jobsWithPendingFollowUps
      };

    } catch (error) {
      console.error('❌ Error checking pending follow-ups:', error);
      return {
        success: false,
        error: error.message,
        count: 0,
        users: 0,
        checkDate: new Date()
      };
    }
  }

  /**
   * Get service statistics and health information
   * @returns {Object} Service statistics
   */
  async getServiceStats() {
    try {
      // Get total tracked jobs count
      const totalTrackedJobs = await TrackedJob.countDocuments({ isArchived: false });
      
      // Get archived jobs count
      const archivedJobs = await TrackedJob.countDocuments({ isArchived: true });
      
      // Get status distribution
      const statusStats = await TrackedJob.aggregate([
        {
          $match: { isArchived: false }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get jobs with upcoming interviews (next 7 days)
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const upcomingInterviews = await TrackedJob.countDocuments({
        isArchived: false,
        'interviews.scheduledDate': { 
          $gte: now, 
          $lte: nextWeek 
        },
        'interviews.outcome': 'pending'
      });

      // Get pending follow-ups count
      const pendingFollowUps = await TrackedJob.countDocuments({
        isArchived: false,
        'followUpReminders.date': { $lte: now },
        'followUpReminders.completed': false
      });

      return {
        service: {
          isInitialized: this.isInitialized,
          scheduledJobsCount: this.scheduledJobs.size,
          scheduledJobs: Array.from(this.scheduledJobs.keys())
        },
        statistics: {
          totalTrackedJobs,
          archivedJobs,
          statusDistribution: statusStats.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          upcomingInterviews,
          pendingFollowUps
        },
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('❌ Error getting service stats:', error);
      return {
        service: {
          isInitialized: this.isInitialized,
          error: error.message
        },
        statistics: null,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Manually trigger cleanup (for testing or admin purposes)
   * @param {number} daysOld - Number of days old to consider for cleanup
   * @returns {Object} Cleanup result
   */
  async manualCleanup(daysOld = 90) {
    console.log('🔧 Manual cleanup triggered...');
    return await this.cleanupOldArchivedJobs(daysOld);
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduledJobs() {
    try {
      console.log('🛑 Stopping all scheduled tracker jobs...');
      
      this.scheduledJobs.forEach((job, name) => {
        job.cancel();
        console.log(`✅ Stopped scheduled job: ${name}`);
      });
      
      this.scheduledJobs.clear();
      console.log('✅ All tracker scheduled jobs stopped');

    } catch (error) {
      console.error('❌ Error stopping scheduled jobs:', error);
    }
  }

  /**
   * Restart all scheduled jobs
   */
  async restartScheduledJobs() {
    try {
      console.log('🔄 Restarting tracker scheduled jobs...');
      
      this.stopScheduledJobs();
      this.startCleanupSchedule();
      this.startFollowUpSchedule();
      
      console.log('✅ Tracker scheduled jobs restarted');

    } catch (error) {
      console.error('❌ Error restarting scheduled jobs:', error);
    }
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown() {
    try {
      console.log('🛑 Shutting down Job Application Tracker Service...');
      
      this.stopScheduledJobs();
      this.isInitialized = false;
      
      console.log('✅ Job Application Tracker Service shut down successfully');

    } catch (error) {
      console.error('❌ Error during tracker service shutdown:', error);
    }
  }
}

// Create singleton instance
const trackerService = new TrackerService();

// Export the service instance and individual methods for flexibility
module.exports = {
  trackerService,
  
  // Direct method exports for convenience
  initialize: () => trackerService.initialize(),
  cleanupOldArchivedJobs: (daysOld) => trackerService.cleanupOldArchivedJobs(daysOld),
  checkPendingFollowUps: () => trackerService.checkPendingFollowUps(),
  getServiceStats: () => trackerService.getServiceStats(),
  manualCleanup: (daysOld) => trackerService.manualCleanup(daysOld),
  shutdown: () => trackerService.shutdown()
};
