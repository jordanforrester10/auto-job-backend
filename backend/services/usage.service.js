// backend/services/usage.service.js
const User = require('../models/mongodb/user.model');
const db = require('../config/postgresql');

class UsageService {
  /**
   * Plan limits configuration
   */
  static PLAN_LIMITS = {
    free: {
      resumeUploads: 1,
      resumeAnalysis: 1,
      jobImports: 3,
      resumeTailoring: 1,
      recruiterAccess: false,
      recruiterUnlocks: 0,
      aiJobDiscovery: false,
      aiAssistant: false,
      aiConversations: 0,
      aiMessagesPerConversation: 0
    },
    casual: {
      resumeUploads: 5,
      resumeAnalysis: 5,
      jobImports: 25,
      resumeTailoring: 25,
      recruiterAccess: true,
      recruiterUnlocks: 25,
      aiJobDiscovery: 1,
      aiAssistant: false,
      aiConversations: 0,
      aiMessagesPerConversation: 0
    },
    hunter: {
      resumeUploads: -1, // unlimited
      resumeAnalysis: -1, // unlimited
      jobImports: -1, // unlimited
      resumeTailoring: 50,
      recruiterAccess: true,
      recruiterUnlocks: -1, // unlimited
      aiJobDiscovery: -1, // unlimited
      aiAssistant: true,
      aiConversations: 5,
      aiMessagesPerConversation: 20
    }
  };

  /**
   * Check if user can perform an action
   * @param {string} userId - User ID
   * @param {string} action - Action to check
   * @param {number} quantity - Quantity needed (default: 1)
   * @returns {Object} Permission result
   */
  async checkUsageLimit(userId, action, quantity = 1) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const permission = user.canPerformAction(action, quantity);
      
      return {
        userId,
        action,
        quantity,
        allowed: permission.allowed,
        reason: permission.reason,
        current: permission.current || 0,
        limit: permission.limit || 0,
        remaining: permission.remaining || 0,
        plan: user.subscriptionTier,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error checking usage limit:', error);
      throw new Error('Failed to check usage limit: ' + error.message);
    }
  }

  /**
   * Track usage for a specific action
   * @param {string} userId - User ID
   * @param {string} action - Action being performed
   * @param {number} quantity - Quantity to track (default: 1)
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Updated usage information
   */
  async trackUsage(userId, action, quantity = 1, metadata = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user can perform this action first
      const permission = user.canPerformAction(action, quantity);
      if (!permission.allowed) {
        throw new Error(permission.reason);
      }

      // Track usage in MongoDB
      await user.trackUsage(action, quantity);

      // Track usage in PostgreSQL for analytics
      await this.trackUsageInAnalytics(userId, action, quantity, metadata);

      // Get updated usage stats
      const updatedUser = await User.findById(userId);
      const usageStats = updatedUser.getUsageStats();

      return {
        success: true,
        action,
        quantity,
        usageStats,
        remaining: permission.limit > 0 ? permission.limit - (permission.current + quantity) : -1,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw new Error('Failed to track usage: ' + error.message);
    }
  }

  /**
   * Track usage in PostgreSQL for analytics and reporting
   * @param {string} userId - User ID
   * @param {string} action - Action being performed
   * @param {number} quantity - Quantity tracked
   * @param {Object} metadata - Additional metadata
   */
  async trackUsageInAnalytics(userId, action, quantity, metadata = {}) {
    try {
      const currentDate = new Date();
      const usagePeriod = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      // Map action names to database columns
      const actionMapping = {
        resumeUploads: 'resume_uploads',
        resumeAnalysis: 'resume_analysis',
        jobImports: 'job_imports',
        resumeTailoring: 'resume_tailoring',
        recruiterUnlocks: 'recruiter_unlocks',
        aiJobDiscovery: 'ai_job_discovery',
        aiConversations: 'ai_conversations',
        aiMessagesTotal: 'ai_messages_total'
      };

      const dbColumn = actionMapping[action];
      if (!dbColumn) {
        console.warn(`Unknown action for analytics tracking: ${action}`);
        return;
      }

      // Update or insert usage record
      await db.query(`
        INSERT INTO user_usage (user_id, usage_period, ${dbColumn})
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, usage_period) 
        DO UPDATE SET 
          ${dbColumn} = COALESCE(user_usage.${dbColumn}, 0) + $3,
          updated_at = NOW()
      `, [userId, usagePeriod, quantity]);

      // For AI Assistant, also track detailed usage
      if (action === 'aiConversations' || action === 'aiMessagesTotal') {
        await this.trackAIUsageDetails(userId, action, quantity, metadata);
      }

    } catch (error) {
      console.error('Error tracking usage in analytics:', error);
      // Don't throw error for analytics tracking failure
    }
  }

  /**
   * Track detailed AI Assistant usage
   * @param {string} userId - User ID
   * @param {string} action - AI action
   * @param {number} quantity - Quantity
   * @param {Object} metadata - Metadata including conversation details
   */
  async trackAIUsageDetails(userId, action, quantity, metadata) {
    try {
      await db.query(`
        INSERT INTO ai_assistant_usage (
          user_id, conversation_id, message_count, tokens_used, 
          cost_usd, feature_type, usage_date
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
      `, [
        userId,
        metadata.conversationId || null,
        action === 'aiMessagesTotal' ? quantity : 0,
        metadata.tokensUsed || 0,
        metadata.costUsd || 0,
        metadata.featureType || 'general',
      ]);
    } catch (error) {
      console.error('Error tracking AI usage details:', error);
    }
  }

  /**
   * Get current usage statistics for a user
   * @param {string} userId - User ID
   * @returns {Object} Usage statistics
   */
  async getUserUsageStats(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const usageStats = user.getUsageStats();
      const planLimits = user.getPlanLimits();

      return {
        userId,
        plan: user.subscriptionTier,
        planLimits,
        currentUsage: user.currentUsage || {},
        usageStats,
        resetDate: user.currentUsage?.resetDate || new Date(),
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        hasActiveSubscription: user.hasActiveSubscription()
      };
    } catch (error) {
      console.error('Error getting user usage stats:', error);
      throw new Error('Failed to get usage stats: ' + error.message);
    }
  }

  /**
   * Reset monthly usage for all users (called by cron job)
   * @returns {Object} Reset summary
   */
  async resetMonthlyUsage() {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      console.log('Starting monthly usage reset...');

      // Get all users that need reset
      const users = await User.find({
        'currentUsage.resetDate': { $lt: lastMonth }
      });

      let resetCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          // Archive current usage to history
          if (user.currentUsage && Object.keys(user.currentUsage).length > 1) {
            user.usageHistory.push({
              month: user.currentUsage.resetDate || lastMonth,
              usage: { ...user.currentUsage }
            });

            // Keep only last 12 months
            if (user.usageHistory.length > 12) {
              user.usageHistory = user.usageHistory.slice(-12);
            }
          }

          // Reset current usage
          user.currentUsage = {
            resumeUploads: 0,
            resumeAnalysis: 0,
            jobImports: 0,
            resumeTailoring: 0,
            recruiterUnlocks: 0,
            aiJobDiscovery: 0,
            aiConversations: 0,
            aiMessagesTotal: 0,
            resetDate: now
          };

          await user.save();
          resetCount++;
        } catch (userError) {
          console.error(`Error resetting usage for user ${user._id}:`, userError);
          errorCount++;
        }
      }

      console.log(`✅ Monthly usage reset completed: ${resetCount} users reset, ${errorCount} errors`);

      return {
        success: true,
        resetCount,
        errorCount,
        totalProcessed: users.length,
        resetDate: now
      };
    } catch (error) {
      console.error('Error during monthly usage reset:', error);
      throw new Error('Failed to reset monthly usage: ' + error.message);
    }
  }

  /**
   * Get usage analytics for admin dashboard
   * @param {Object} filters - Filters for analytics
   * @returns {Object} Usage analytics
   */
  async getUsageAnalytics(filters = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        planTier = null,
        feature = null
      } = filters;

      // Get usage data from PostgreSQL
      let query = `
        SELECT 
          usage_period,
          COUNT(DISTINCT user_id) as active_users,
          SUM(resume_uploads) as total_resume_uploads,
          SUM(resume_analysis) as total_resume_analysis,
          SUM(job_imports) as total_job_imports,
          SUM(resume_tailoring) as total_resume_tailoring,
          SUM(recruiter_unlocks) as total_recruiter_unlocks,
          SUM(ai_job_discovery) as total_ai_job_discovery,
          SUM(ai_conversations) as total_ai_conversations,
          SUM(ai_messages_total) as total_ai_messages,
          AVG(resume_uploads) as avg_resume_uploads,
          AVG(job_imports) as avg_job_imports
        FROM user_usage 
        WHERE usage_period >= $1 AND usage_period <= $2
      `;

      const queryParams = [startDate, endDate];

      if (feature) {
        query += ` AND ${feature} > 0`;
      }

      query += ` GROUP BY usage_period ORDER BY usage_period ASC`;

      const analyticsResult = await db.query(query, queryParams);

      // Get user distribution by plan
      const planDistributionQuery = await db.query(`
        SELECT 
          us.status,
          sp.display_name as plan_name,
          COUNT(*) as user_count
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON sp.name = us.subscription_plan_id::text
        GROUP BY us.status, sp.display_name
        ORDER BY user_count DESC
      `);

      // Get top features by usage
      const featureUsageQuery = await db.query(`
        SELECT 
          'resume_uploads' as feature, SUM(resume_uploads) as total_usage
        FROM user_usage WHERE usage_period >= $1 AND usage_period <= $2
        UNION ALL
        SELECT 
          'job_imports' as feature, SUM(job_imports) as total_usage
        FROM user_usage WHERE usage_period >= $1 AND usage_period <= $2
        UNION ALL
        SELECT 
          'recruiter_unlocks' as feature, SUM(recruiter_unlocks) as total_usage
        FROM user_usage WHERE usage_period >= $1 AND usage_period <= $2
        ORDER BY total_usage DESC
      `, [startDate, endDate]);

      return {
        dateRange: { startDate, endDate },
        usageData: analyticsResult.rows,
        planDistribution: planDistributionQuery.rows,
        featureUsage: featureUsageQuery.rows,
        summary: {
          totalActiveUsers: analyticsResult.rows.reduce((sum, row) => 
            Math.max(sum, parseInt(row.active_users)), 0),
          totalFeatureUsage: featureUsageQuery.rows.reduce((sum, row) => 
            sum + parseInt(row.total_usage), 0)
        }
      };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw new Error('Failed to get usage analytics: ' + error.message);
    }
  }

  /**
   * Get user usage history
   * @param {string} userId - User ID
   * @param {number} months - Number of months to retrieve
   * @returns {Array} Usage history
   */
  async getUserUsageHistory(userId, months = 12) {
    try {
      // Get from PostgreSQL analytics
      const historyQuery = await db.query(`
        SELECT * FROM user_usage 
        WHERE user_id = $1 
        ORDER BY usage_period DESC 
        LIMIT $2
      `, [userId, months]);

      // Also get from MongoDB for current period
      const user = await User.findById(userId);
      const currentUsage = user?.currentUsage || {};

      return {
        currentPeriod: {
          period: currentUsage.resetDate || new Date(),
          usage: currentUsage
        },
        history: historyQuery.rows,
        planTier: user?.subscriptionTier || 'free'
      };
    } catch (error) {
      console.error('Error getting user usage history:', error);
      throw new Error('Failed to get usage history: ' + error.message);
    }
  }

  /**
   * Validate usage before performing action
   * @param {string} userId - User ID
   * @param {string} action - Action to validate
   * @param {number} quantity - Quantity needed
   * @returns {Object} Validation result
   */
  async validateUsage(userId, action, quantity = 1) {
    try {
      const permission = await this.checkUsageLimit(userId, action, quantity);
      
      if (!permission.allowed) {
        return {
          valid: false,
          reason: permission.reason,
          current: permission.current,
          limit: permission.limit,
          upgradeRequired: true,
          recommendedPlan: this.getRecommendedPlan(action)
        };
      }

      return {
        valid: true,
        current: permission.current,
        limit: permission.limit,
        remaining: permission.remaining
      };
    } catch (error) {
      console.error('Error validating usage:', error);
      throw new Error('Failed to validate usage: ' + error.message);
    }
  }

  /**
   * Get recommended plan for a specific feature
   * @param {string} action - Action that exceeded limit
   * @returns {string} Recommended plan name
   */
  getRecommendedPlan(action) {
    const featurePlanMap = {
      resumeUploads: 'casual',
      jobImports: 'casual',
      recruiterUnlocks: 'casual',
      aiJobDiscovery: 'casual',
      aiAssistant: 'hunter',
      aiConversations: 'hunter'
    };

    return featurePlanMap[action] || 'casual';
  }

  /**
   * Get usage warnings for users approaching limits
   * @param {string} userId - User ID
   * @returns {Array} Array of warnings
   */
  async getUsageWarnings(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const usageStats = user.getUsageStats();
      const warnings = [];

      Object.keys(usageStats).forEach(action => {
        const stat = usageStats[action];
        if (!stat.unlimited && stat.percentage >= 80) {
          warnings.push({
            action,
            percentage: stat.percentage,
            used: stat.used,
            limit: stat.limit,
            remaining: stat.remaining,
            severity: stat.percentage >= 95 ? 'critical' : 'warning'
          });
        }
      });

      return warnings;
    } catch (error) {
      console.error('Error getting usage warnings:', error);
      throw new Error('Failed to get usage warnings: ' + error.message);
    }
  }

  /**
   * Bulk track usage for multiple actions
   * @param {string} userId - User ID
   * @param {Array} actions - Array of {action, quantity} objects
   * @returns {Object} Bulk tracking result
   */
  async bulkTrackUsage(userId, actions) {
    try {
      const results = [];
      const errors = [];

      for (const { action, quantity = 1, metadata = {} } of actions) {
        try {
          const result = await this.trackUsage(userId, action, quantity, metadata);
          results.push({ action, ...result });
        } catch (error) {
          errors.push({ action, error: error.message });
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        processed: results.length,
        failed: errors.length
      };
    } catch (error) {
      console.error('Error in bulk track usage:', error);
      throw new Error('Failed to bulk track usage: ' + error.message);
    }
  }

  /**
   * Get feature usage trends
   * @param {string} feature - Feature to analyze
   * @param {number} days - Number of days to analyze
   * @returns {Object} Usage trends
   */
  async getFeatureTrends(feature, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const featureMapping = {
        resumeUploads: 'resume_uploads',
        jobImports: 'job_imports',
        recruiterUnlocks: 'recruiter_unlocks',
        aiConversations: 'ai_conversations'
      };

      const dbColumn = featureMapping[feature];
      if (!dbColumn) {
        throw new Error('Invalid feature for trend analysis');
      }

      const trendsQuery = await db.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(DISTINCT user_id) as active_users,
          SUM(${dbColumn}) as total_usage,
          AVG(${dbColumn}) as avg_usage_per_user
        FROM user_usage 
        WHERE created_at >= $1 AND ${dbColumn} > 0
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `, [startDate]);

      return {
        feature,
        period: { startDate, endDate: new Date(), days },
        trends: trendsQuery.rows,
        summary: {
          totalUsers: new Set(trendsQuery.rows.map(r => r.active_users)).size,
          totalUsage: trendsQuery.rows.reduce((sum, r) => sum + parseInt(r.total_usage), 0),
          avgDailyUsage: trendsQuery.rows.reduce((sum, r) => sum + parseFloat(r.avg_usage_per_user), 0) / trendsQuery.rows.length
        }
      };
    } catch (error) {
      console.error('Error getting feature trends:', error);
      throw new Error('Failed to get feature trends: ' + error.message);
    }
  }
}

module.exports = new UsageService();