// backend/middleware/subscription.middleware.js
const User = require('../models/mongodb/user.model');
const subscriptionService = require('../services/subscription.service');

class SubscriptionMiddleware {
  /**
   * Verify user has active subscription
   * @param {Array} allowedPlans - Array of plan names that can access this route
   */
  static requireSubscription(allowedPlans = ['casual', 'hunter']) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // Check if user's plan is in allowed plans
        if (!allowedPlans.includes(user.subscriptionTier)) {
          return res.status(403).json({
            success: false,
            error: 'Subscription upgrade required',
            details: {
              currentPlan: user.subscriptionTier,
              requiredPlans: allowedPlans,
              upgradeRequired: true
            }
          });
        }

        // Check if subscription is active
        if (!user.hasActiveSubscription()) {
          return res.status(403).json({
            success: false,
            error: 'Active subscription required',
            details: {
              subscriptionStatus: user.subscriptionStatus,
              subscriptionEndDate: user.subscriptionEndDate,
              renewalRequired: true
            }
          });
        }

        // Add subscription info to request for later use
        req.subscription = {
          tier: user.subscriptionTier,
          status: user.subscriptionStatus,
          endDate: user.subscriptionEndDate,
          isActive: user.hasActiveSubscription()
        };

        next();
      } catch (error) {
        console.error('Subscription middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Subscription verification failed'
        });
      }
    };
  }

  /**
   * Require specific plan tier
   * @param {string} minimumPlan - Minimum plan required ('free', 'casual', 'hunter')
   */
  static requirePlan(minimumPlan) {
    const planHierarchy = { free: 0, casual: 1, hunter: 2 };
    
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        const userPlanLevel = planHierarchy[user.subscriptionTier] || 0;
        const requiredPlanLevel = planHierarchy[minimumPlan] || 0;

        if (userPlanLevel < requiredPlanLevel) {
          return res.status(403).json({
            success: false,
            error: 'Plan upgrade required',
            details: {
              currentPlan: user.subscriptionTier,
              requiredPlan: minimumPlan,
              upgradeRequired: true
            }
          });
        }

        // For non-free plans, also check if subscription is active
        if (minimumPlan !== 'free' && !user.hasActiveSubscription()) {
          return res.status(403).json({
            success: false,
            error: 'Active subscription required',
            details: {
              subscriptionStatus: user.subscriptionStatus,
              subscriptionEndDate: user.subscriptionEndDate,
              renewalRequired: true
            }
          });
        }

        req.subscription = {
          tier: user.subscriptionTier,
          status: user.subscriptionStatus,
          endDate: user.subscriptionEndDate,
          isActive: user.hasActiveSubscription()
        };

        next();
      } catch (error) {
        console.error('Plan requirement middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Plan verification failed'
        });
      }
    };
  }

  /**
   * Require specific feature access
   * @param {string} feature - Feature name to check
   */
  static requireFeature(feature) {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        const planLimits = user.getPlanLimits();
        
        // Check feature access based on feature type
        if (feature === 'recruiterAccess' && !planLimits.recruiterAccess) {
          return res.status(403).json({
            success: false,
            error: 'Recruiter access not available in your plan',
            details: {
              feature,
              currentPlan: user.subscriptionTier,
              upgradeRequired: true,
              recommendedPlan: 'casual'
            }
          });
        }

        if (feature === 'aiAssistant' && !planLimits.aiAssistant) {
          return res.status(403).json({
            success: false,
            error: 'AI Assistant not available in your plan',
            details: {
              feature,
              currentPlan: user.subscriptionTier,
              upgradeRequired: true,
              recommendedPlan: 'hunter'
            }
          });
        }

        if (feature === 'aiJobDiscovery' && !planLimits.aiJobDiscovery) {
          return res.status(403).json({
            success: false,
            error: 'AI Job Discovery not available in your plan',
            details: {
              feature,
              currentPlan: user.subscriptionTier,
              upgradeRequired: true,
              recommendedPlan: 'casual'
            }
          });
        }

        req.subscription = {
          tier: user.subscriptionTier,
          status: user.subscriptionStatus,
          endDate: user.subscriptionEndDate,
          isActive: user.hasActiveSubscription(),
          planLimits
        };

        next();
      } catch (error) {
        console.error('Feature requirement middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Feature verification failed'
        });
      }
    };
  }

  /**
   * Inject subscription context into request
   * This middleware adds subscription info to all authenticated requests
   */
  static injectSubscriptionContext() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return next(); // Skip for unauthenticated requests
        }

        const user = await User.findById(userId);
        if (!user) {
          return next(); // Skip if user not found
        }

        // Add subscription context to request
        req.subscription = {
          tier: user.subscriptionTier,
          status: user.subscriptionStatus,
          startDate: user.subscriptionStartDate,
          endDate: user.subscriptionEndDate,
          trialEndDate: user.trialEndDate,
          cancelAtPeriodEnd: user.cancelAtPeriodEnd,
          billingCycle: user.billingCycle,
          isActive: user.hasActiveSubscription(),
          planLimits: user.getPlanLimits(),
          usageStats: user.getUsageStats(),
          stripeCustomerId: user.stripeCustomerId
        };

        // Also add to response for client-side access
        res.locals.subscription = req.subscription;

        next();
      } catch (error) {
        console.error('Subscription context injection error:', error);
        // Don't fail the request, just continue without subscription context
        next();
      }
    };
  }

  /**
   * Check subscription status and sync with Stripe if needed
   */
  static checkSubscriptionStatus() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return next();
        }

        const user = await User.findById(userId);
        if (!user || user.subscriptionTier === 'free') {
          return next();
        }

        // Check if subscription might be expired
        const now = new Date();
        if (user.subscriptionEndDate && user.subscriptionEndDate < now && user.subscriptionStatus === 'active') {
          console.log(`Detected potentially expired subscription for user ${userId}, syncing with Stripe...`);
          
          try {
            await subscriptionService.syncSubscriptionStatus(userId);
          } catch (syncError) {
            console.error('Error syncing subscription status:', syncError);
            // Continue with existing status rather than failing the request
          }
        }

        next();
      } catch (error) {
        console.error('Subscription status check error:', error);
        next(); // Continue with request
      }
    };
  }

  /**
   * Handle trial period logic
   */
  static handleTrialPeriod() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return next();
        }

        const user = await User.findById(userId);
        if (!user) {
          return next();
        }

        // Check if trial is ending soon (within 3 days)
        if (user.trialEndDate) {
          const now = new Date();
          const trialEnd = new Date(user.trialEndDate);
          const daysUntilExpiry = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
            req.trialWarning = {
              daysRemaining: daysUntilExpiry,
              trialEndDate: trialEnd,
              upgradeRequired: true
            };
          }
        }

        next();
      } catch (error) {
        console.error('Trial period check error:', error);
        next();
      }
    };
  }

  /**
   * Add subscription information to API responses
   */
  static addSubscriptionToResponse() {
    return (req, res, next) => {
      // Override res.json to include subscription info
      const originalJson = res.json;
      
      res.json = function(body) {
        if (req.subscription && body && typeof body === 'object' && body.success !== false) {
          body.subscription = {
            tier: req.subscription.tier,
            status: req.subscription.status,
            isActive: req.subscription.isActive,
            planLimits: req.subscription.planLimits,
            usageStats: req.subscription.usageStats
          };

          // Add trial warning if present
          if (req.trialWarning) {
            body.trialWarning = req.trialWarning;
          }
        }
        
        return originalJson.call(this, body);
      };

      next();
    };
  }

  /**
   * Log subscription-related activities
   */
  static logSubscriptionActivity() {
    return (req, res, next) => {
      if (req.subscription && req.method !== 'GET') {
        console.log(`Subscription Activity: ${req.method} ${req.originalUrl} - User: ${req.user?.id} - Plan: ${req.subscription.tier} - Status: ${req.subscription.status}`);
      }
      next();
    };
  }
}

module.exports = SubscriptionMiddleware;