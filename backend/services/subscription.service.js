// backend/services/subscription.service.js
const User = require('../models/mongodb/user.model');
const db = require('../config/postgresql');
const stripeService = require('./stripe.service');

class SubscriptionService {
  /**
   * Get user's current subscription with details
   * @param {string} userId - User ID
   * @returns {Object} Subscription details
   */
  async getCurrentSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get PostgreSQL subscription details
      const subscriptionQuery = await db.query(`
        SELECT 
          us.*,
          sp.display_name as plan_display_name,
          sp.description as plan_description,
          sp.price_monthly,
          sp.price_yearly,
          sp.features,
          sp.limits
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON sp.name = $2
        WHERE us.user_id = $1
      `, [userId, user.subscriptionTier]);

      const subscription = subscriptionQuery.rows[0];

      // Get plan limits and usage
      const planLimits = user.getPlanLimits();
      const usageStats = user.getUsageStats();

      return {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          subscriptionStartDate: user.subscriptionStartDate,
          subscriptionEndDate: user.subscriptionEndDate,
          trialEndDate: user.trialEndDate,
          cancelAtPeriodEnd: user.cancelAtPeriodEnd,
          billingCycle: user.billingCycle,
          stripeCustomerId: user.stripeCustomerId
        },
        subscription: subscription || null,
        planLimits,
        usageStats,
        isActive: user.hasActiveSubscription()
      };
    } catch (error) {
      console.error('Error getting current subscription:', error);
      throw new Error('Failed to get subscription: ' + error.message);
    }
  }

  /**
   * Get all available subscription plans
   * @returns {Array} Array of subscription plans
   */
  async getAvailablePlans() {
    try {
      const plansQuery = await db.query(`
        SELECT * FROM subscription_plans 
        WHERE is_active = true 
        ORDER BY sort_order ASC
      `);

      return plansQuery.rows.map(plan => ({
        ...plan,
        features: plan.features || {},
        limits: plan.limits || {}
      }));
    } catch (error) {
      console.error('Error getting available plans:', error);
      throw new Error('Failed to get plans: ' + error.message);
    }
  }

  /**
   * Check if user has permission for a specific feature
   * @param {string} userId - User ID
   * @param {string} feature - Feature to check
   * @param {number} quantity - Quantity needed (default: 1)
   * @returns {Object} Permission result
   */
  async checkPermission(userId, feature, quantity = 1) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user.canPerformAction(feature, quantity);
    } catch (error) {
      console.error('Error checking permission:', error);
      throw new Error('Failed to check permission: ' + error.message);
    }
  }

  /**
   * Track usage for a specific feature
   * @param {string} userId - User ID
   * @param {string} feature - Feature being used
   * @param {number} quantity - Quantity to track (default: 1)
   * @returns {Object} Updated usage stats
   */
  async trackUsage(userId, feature, quantity = 1) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user can perform this action
      const permission = user.canPerformAction(feature, quantity);
      if (!permission.allowed) {
        throw new Error(permission.reason);
      }

      // Track the usage
      await user.trackUsage(feature, quantity);

      // Also track in PostgreSQL for analytics
      await this.trackUsageInPostgreSQL(userId, feature, quantity);

      return user.getUsageStats();
    } catch (error) {
      console.error('Error tracking usage:', error);
      throw new Error('Failed to track usage: ' + error.message);
    }
  }

  /**
   * Track usage in PostgreSQL for analytics
   * @param {string} userId - User ID
   * @param {string} feature - Feature being used
   * @param {number} quantity - Quantity to track
   */
  async trackUsageInPostgreSQL(userId, feature, quantity) {
    try {
      const currentDate = new Date();
      const usagePeriod = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

      await db.query(`
        INSERT INTO user_usage (user_id, usage_period, ${feature})
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, usage_period) 
        DO UPDATE SET 
          ${feature} = user_usage.${feature} + $3,
          updated_at = NOW()
      `, [userId, usagePeriod, quantity]);
    } catch (error) {
      console.error('Error tracking usage in PostgreSQL:', error);
      // Don't throw error for analytics tracking failure
    }
  }

  /**
   * Create checkout session for plan upgrade
   * @param {string} userId - User ID
   * @param {string} planName - Plan to upgrade to
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @param {string} successUrl - URL to redirect on success
   * @param {string} cancelUrl - URL to redirect on cancel
   * @returns {Object} Checkout session
   */
  async createCheckoutSession(userId, planName, billingCycle, successUrl, cancelUrl) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get plan details
      const planQuery = await db.query(`
        SELECT * FROM subscription_plans 
        WHERE name = $1 AND is_active = true
      `, [planName]);

      const plan = planQuery.rows[0];
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Determine price ID based on billing cycle
      const priceId = billingCycle === 'yearly' 
        ? plan.stripe_yearly_price_id 
        : plan.stripe_monthly_price_id;

      if (!priceId) {
        throw new Error(`No price configured for ${planName} ${billingCycle} plan`);
      }

      // Create checkout session
      const session = await stripeService.createCheckoutSession({
        userId,
        priceId,
        successUrl,
        cancelUrl,
        planName,
        billingCycle
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session: ' + error.message);
    }
  }

  /**
   * Create customer portal session
   * @param {string} userId - User ID
   * @param {string} returnUrl - URL to return to after managing subscription
   * @returns {Object} Customer portal session
   */
  async createCustomerPortalSession(userId, returnUrl) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.stripeCustomerId) {
        throw new Error('User does not have a Stripe customer ID');
      }

      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        returnUrl
      );

      return session;
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw new Error('Failed to create customer portal session: ' + error.message);
    }
  }

  /**
   * Cancel subscription
   * @param {string} userId - User ID
   * @param {boolean} atPeriodEnd - Whether to cancel at period end
   * @returns {Object} Updated subscription
   */
  async cancelSubscription(userId, atPeriodEnd = true) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get subscription details from PostgreSQL
      const subscriptionQuery = await db.query(`
        SELECT stripe_subscription_id FROM user_subscriptions 
        WHERE user_id = $1 AND status = 'active'
      `, [userId]);

      const subscription = subscriptionQuery.rows[0];
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Cancel in Stripe
      const updatedSubscription = await stripeService.cancelSubscription(
        subscription.stripe_subscription_id,
        atPeriodEnd
      );

      // Update user in MongoDB
      await User.findByIdAndUpdate(userId, {
        cancelAtPeriodEnd: atPeriodEnd,
        subscriptionStatus: atPeriodEnd ? 'active' : 'canceled'
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error('Failed to cancel subscription: ' + error.message);
    }
  }

  /**
   * Resume subscription
   * @param {string} userId - User ID
   * @returns {Object} Updated subscription
   */
  async resumeSubscription(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get subscription details from PostgreSQL
      const subscriptionQuery = await db.query(`
        SELECT stripe_subscription_id FROM user_subscriptions 
        WHERE user_id = $1
      `, [userId]);

      const subscription = subscriptionQuery.rows[0];
      if (!subscription) {
        throw new Error('No subscription found');
      }

      // Resume in Stripe
      const updatedSubscription = await stripeService.resumeSubscription(
        subscription.stripe_subscription_id
      );

      // Update user in MongoDB
      await User.findByIdAndUpdate(userId, {
        cancelAtPeriodEnd: false,
        subscriptionStatus: 'active'
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw new Error('Failed to resume subscription: ' + error.message);
    }
  }

  /**
   * Change subscription plan
   * @param {string} userId - User ID
   * @param {string} newPlanName - New plan name
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @returns {Object} Updated subscription
   */
  async changeSubscriptionPlan(userId, newPlanName, billingCycle) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get current subscription
      const subscriptionQuery = await db.query(`
        SELECT stripe_subscription_id FROM user_subscriptions 
        WHERE user_id = $1 AND status = 'active'
      `, [userId]);

      const subscription = subscriptionQuery.rows[0];
      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Get new plan details
      const planQuery = await db.query(`
        SELECT * FROM subscription_plans 
        WHERE name = $1 AND is_active = true
      `, [newPlanName]);

      const plan = planQuery.rows[0];
      if (!plan) {
        throw new Error('Plan not found');
      }

      // Determine new price ID
      const newPriceId = billingCycle === 'yearly' 
        ? plan.stripe_yearly_price_id 
        : plan.stripe_monthly_price_id;

      if (!newPriceId) {
        throw new Error(`No price configured for ${newPlanName} ${billingCycle} plan`);
      }

      // Change plan in Stripe
      const updatedSubscription = await stripeService.changeSubscriptionPlan(
        subscription.stripe_subscription_id,
        newPriceId
      );

      // Update user in MongoDB
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: newPlanName,
        billingCycle: billingCycle
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw new Error('Failed to change subscription plan: ' + error.message);
    }
  }

  /**
   * Get user's billing history
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Array} Array of payment history records
   */
  async getBillingHistory(userId, limit = 10) {
    try {
      const historyQuery = await db.query(`
        SELECT * FROM payment_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);

      return historyQuery.rows;
    } catch (error) {
      console.error('Error getting billing history:', error);
      throw new Error('Failed to get billing history: ' + error.message);
    }
  }

  /**
   * Get usage analytics for a user
   * @param {string} userId - User ID
   * @param {number} months - Number of months to retrieve (default: 12)
   * @returns {Array} Array of usage data
   */
  async getUsageAnalytics(userId, months = 12) {
    try {
      const analyticsQuery = await db.query(`
        SELECT * FROM user_usage 
        WHERE user_id = $1 
        ORDER BY usage_period DESC 
        LIMIT $2
      `, [userId, months]);

      return analyticsQuery.rows;
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw new Error('Failed to get usage analytics: ' + error.message);
    }
  }

  /**
   * Sync subscription status with Stripe
   * @param {string} userId - User ID
   * @returns {Object} Updated subscription status
   */
  async syncSubscriptionStatus(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.stripeCustomerId) {
        return { message: 'No Stripe customer found' };
      }

      // Get subscription details from PostgreSQL
      const subscriptionQuery = await db.query(`
        SELECT stripe_subscription_id FROM user_subscriptions 
        WHERE user_id = $1
      `, [userId]);

      const subscription = subscriptionQuery.rows[0];
      if (!subscription || !subscription.stripe_subscription_id) {
        return { message: 'No Stripe subscription found' };
      }

      // Get current status from Stripe
      const stripeSubscription = await stripeService.getSubscription(
        subscription.stripe_subscription_id
      );

      // Update user in MongoDB
      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: stripeSubscription.status,
        subscriptionEndDate: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
      });

      // Update PostgreSQL
      await db.query(`
        UPDATE user_subscriptions SET
          status = $1,
          current_period_end = $2,
          cancel_at_period_end = $3,
          updated_at = NOW()
        WHERE user_id = $4
      `, [
        stripeSubscription.status,
        new Date(stripeSubscription.current_period_end * 1000),
        stripeSubscription.cancel_at_period_end,
        userId
      ]);

      return { 
        message: 'Subscription status synced',
        status: stripeSubscription.status
      };
    } catch (error) {
      console.error('Error syncing subscription status:', error);
      throw new Error('Failed to sync subscription status: ' + error.message);
    }
  }

  /**
   * Handle subscription expiration
   * @param {string} userId - User ID
   */
  async handleSubscriptionExpiration(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Downgrade to free plan
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: 'free',
        subscriptionStatus: 'canceled',
        cancelAtPeriodEnd: false
      });

      // Reset usage for free plan limits
      const now = new Date();
      await User.findByIdAndUpdate(userId, {
        currentUsage: {
          resumeUploads: 0,
          resumeAnalysis: 0,
          jobImports: 0,
          resumeTailoring: 0,
          recruiterUnlocks: 0,
          aiJobDiscovery: 0,
          aiConversations: 0,
          aiMessagesTotal: 0,
          resetDate: now
        }
      });

      console.log(`✅ User ${userId} downgraded to free plan due to subscription expiration`);
    } catch (error) {
      console.error('Error handling subscription expiration:', error);
      throw error;
    }
  }

  /**
   * Get plan comparison data
   * @returns {Object} Plan comparison matrix
   */
  async getPlanComparison() {
    try {
      const plans = await this.getAvailablePlans();
      
      // Define feature list for comparison
      const features = [
        'resumeUploads',
        'resumeAnalysis', 
        'jobImports',
        'resumeTailoring',
        'recruiterAccess',
        'recruiterUnlocks',
        'aiJobDiscovery',
        'aiAssistant',
        'aiConversations'
      ];

      const comparison = {
        plans: plans.map(plan => ({
          name: plan.name,
          displayName: plan.display_name,
          description: plan.description,
          priceMonthly: plan.price_monthly,
          priceYearly: plan.price_yearly,
          features: plan.features,
          limits: plan.limits
        })),
        featureMatrix: {}
      };

      // Build feature matrix
      features.forEach(feature => {
        comparison.featureMatrix[feature] = {};
        plans.forEach(plan => {
          const limit = plan.limits[feature];
          comparison.featureMatrix[feature][plan.name] = {
            available: plan.features[feature] || false,
            limit: limit === -1 ? 'Unlimited' : limit || 0
          };
        });
      });

      return comparison;
    } catch (error) {
      console.error('Error getting plan comparison:', error);
      throw new Error('Failed to get plan comparison: ' + error.message);
    }
  }
}

module.exports = new SubscriptionService();