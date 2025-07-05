// backend/services/subscription.service.js - FIXED TO USE STRIPE'S AUTHORITATIVE DATES
// test
const User = require('../models/mongodb/user.model');
const db = require('../config/postgresql');
const stripeService = require('./stripe.service');

class SubscriptionService {
  /**
   * FIXED: Get user's current subscription with authoritative Stripe dates
   * @param {string} userId - User ID
   * @returns {Object} Subscription details with fresh Stripe dates
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
          sp.features,
          sp.limits
        FROM user_subscriptions us
        LEFT JOIN subscription_plans sp ON sp.name = $2
        WHERE us.user_id = $1
      `, [userId, user.subscriptionTier]);

      const subscription = subscriptionQuery.rows[0];

      // 🎯 CRITICAL FIX: Always get fresh authoritative dates from Stripe for paid plans
      let enhancedUser = { ...user.toObject() };
      
      if (enhancedUser.subscriptionTier !== 'free' && enhancedUser.stripeCustomerId) {
        try {
          console.log(`🔄 Getting authoritative billing dates from Stripe for user ${userId}...`);
          
          // Get fresh subscription data directly from Stripe
          const freshData = await stripeService.getFreshSubscriptionData(userId);
          
          if (freshData && freshData.current_period_end && freshData.current_period_start) {
            const authoritativeStartDate = stripeService.safeTimestampToDate(freshData.current_period_start);
            const authoritativeEndDate = stripeService.safeTimestampToDate(freshData.current_period_end);
            
            if (authoritativeStartDate && authoritativeEndDate) {
              console.log(`✅ Using Stripe's authoritative dates:`);
              console.log(`   Start: ${authoritativeStartDate.toISOString()}`);
              console.log(`   End: ${authoritativeEndDate.toISOString()}`);
              
              // Update our database with authoritative dates
              await User.findByIdAndUpdate(userId, {
                subscriptionStartDate: authoritativeStartDate,
                subscriptionEndDate: authoritativeEndDate,
                subscriptionStatus: freshData.status,
                cancelAtPeriodEnd: freshData.cancel_at_period_end
              });
              
              // Use the authoritative dates
              enhancedUser.subscriptionStartDate = authoritativeStartDate;
              enhancedUser.subscriptionEndDate = authoritativeEndDate;
              enhancedUser.subscriptionStatus = freshData.status;
              enhancedUser.cancelAtPeriodEnd = freshData.cancel_at_period_end;
              
              console.log(`📅 Updated user with authoritative Stripe dates`);
            } else {
              console.warn(`⚠️ Could not parse Stripe dates for user ${userId}`);
            }
          } else {
            console.warn(`⚠️ No fresh period dates from Stripe for user ${userId}`);
          }
        } catch (stripeError) {
          console.error(`❌ Error fetching authoritative dates from Stripe: ${stripeError.message}`);
          // Continue with existing dates but log the issue
        }
      }

      // Get plan limits and usage
      const planLimits = user.getPlanLimits();
      const usageStats = user.getUsageStats();

      // Format dates properly for frontend
      if (enhancedUser.subscriptionEndDate) {
        enhancedUser.subscriptionEndDate = new Date(enhancedUser.subscriptionEndDate).toISOString();
      }
      if (enhancedUser.subscriptionStartDate) {
        enhancedUser.subscriptionStartDate = new Date(enhancedUser.subscriptionStartDate).toISOString();
      }

      return {
        user: {
          id: enhancedUser._id,
          email: enhancedUser.email,
          firstName: enhancedUser.firstName,
          lastName: enhancedUser.lastName,
          subscriptionTier: enhancedUser.subscriptionTier,
          subscriptionStatus: enhancedUser.subscriptionStatus,
          subscriptionStartDate: enhancedUser.subscriptionStartDate,
          subscriptionEndDate: enhancedUser.subscriptionEndDate,
          trialEndDate: enhancedUser.trialEndDate,
          cancelAtPeriodEnd: enhancedUser.cancelAtPeriodEnd,
          billingCycle: 'monthly',
          stripeCustomerId: enhancedUser.stripeCustomerId
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
   * Get all available subscription plans (Monthly only)
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
        limits: plan.limits || {},
        billingCycle: 'monthly'
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
   * Create checkout session for plan upgrade (Monthly only)
   * @param {string} userId - User ID
   * @param {string} planName - Plan to upgrade to
   * @param {string} successUrl - URL to redirect on success
   * @param {string} cancelUrl - URL to redirect on cancel
   * @returns {Object} Checkout session
   */
  async createCheckoutSession(userId, planName, successUrl, cancelUrl) {
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

      const priceId = plan.stripe_monthly_price_id;

      if (!priceId) {
        throw new Error(`No monthly price configured for ${planName} plan`);
      }

      // Create checkout session
      const session = await stripeService.createCheckoutSession({
        userId,
        priceId,
        successUrl,
        cancelUrl,
        planName
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
   * Change subscription plan (Monthly only)
   * @param {string} userId - User ID
   * @param {string} newPlanName - New plan name
   * @returns {Object} Updated subscription
   */
  async changeSubscriptionPlan(userId, newPlanName) {
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

      const newPriceId = plan.stripe_monthly_price_id;

      if (!newPriceId) {
        throw new Error(`No monthly price configured for ${newPlanName} plan`);
      }

      // Change plan in Stripe
      const updatedSubscription = await stripeService.changeSubscriptionPlan(
        subscription.stripe_subscription_id,
        newPriceId
      );

      // Update user in MongoDB
      await User.findByIdAndUpdate(userId, {
        subscriptionTier: newPlanName
      });

      return updatedSubscription;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw new Error('Failed to change subscription plan: ' + error.message);
    }
  }

/**
   * FIXED: Get user's billing history with enhanced Stripe data
   * @param {string} userId - User ID
   * @param {number} limit - Number of records to return
   * @returns {Object} Billing history with enhanced data
   */
  async getBillingHistory(userId, limit = 10) {
    try {
      console.log(`🔍 Getting billing history for user ${userId}`);

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get payment history from PostgreSQL first
      const historyQuery = await db.query(`
        SELECT 
          id,
          stripe_payment_intent_id,
          stripe_invoice_id,
          amount,
          currency,
          status,
          payment_method,
          billing_reason,
          description,
          invoice_url,
          receipt_url,
          created_at,
          updated_at
        FROM payment_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `, [userId, limit]);

      let billingHistory = historyQuery.rows;

      // If we have a Stripe customer ID, also get fresh data from Stripe
      if (user.stripeCustomerId && billingHistory.length < limit) {
        try {
          console.log(`🔄 Fetching fresh invoice data from Stripe for customer ${user.stripeCustomerId}`);
          
          // Get invoices directly from Stripe
          const stripeInvoices = await stripeService.getCustomerInvoices(user.stripeCustomerId, limit);
          
          console.log(`📊 Retrieved ${stripeInvoices.length} invoices from Stripe`);
          
          // Convert Stripe invoices to our billing history format
          const stripeHistoryItems = stripeInvoices
            .filter(invoice => invoice.status === 'paid') // Only include paid invoices
            .map(invoice => {
              // Determine the best date to use
              let paymentDate = null;
              
              if (invoice.status_transitions && invoice.status_transitions.paid_at) {
                paymentDate = new Date(invoice.status_transitions.paid_at * 1000);
              } else if (invoice.created) {
                paymentDate = new Date(invoice.created * 1000);
              } else {
                paymentDate = new Date();
              }

              console.log(`📅 Processing Stripe invoice ${invoice.id}:`, {
                created: invoice.created,
                status_transitions: invoice.status_transitions,
                calculated_date: paymentDate.toISOString(),
                amount_paid: invoice.amount_paid
              });

              return {
                id: invoice.id,
                stripe_invoice_id: invoice.id,
                stripe_payment_intent_id: invoice.payment_intent,
                amount: invoice.amount_paid / 100, // Convert cents to dollars
                currency: invoice.currency || 'usd',
                status: 'succeeded', // Since we're filtering for paid invoices
                payment_method: 'card',
                billing_reason: invoice.billing_reason || 'subscription_cycle',
                description: invoice.description || `Monthly subscription payment`,
                invoice_url: invoice.hosted_invoice_url,
                hosted_invoice_url: invoice.hosted_invoice_url,
                receipt_url: invoice.receipt_url,
                created_at: paymentDate.toISOString(),
                created: invoice.created,
                period_start: invoice.period_start,
                period_end: invoice.period_end,
                status_transitions: invoice.status_transitions,
                source: 'stripe_api' // Mark as coming from Stripe API
              };
            });

          // Merge with existing history, avoiding duplicates
          const existingInvoiceIds = new Set(billingHistory.map(h => h.stripe_invoice_id));
          const newStripeItems = stripeHistoryItems.filter(item => !existingInvoiceIds.has(item.stripe_invoice_id));
          
          if (newStripeItems.length > 0) {
            console.log(`📝 Adding ${newStripeItems.length} new items from Stripe`);
            billingHistory = [...billingHistory, ...newStripeItems];
            
            // Sort by date (newest first)
            billingHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Limit to requested number
            billingHistory = billingHistory.slice(0, limit);
          }
          
        } catch (stripeError) {
          console.error('Error fetching fresh data from Stripe:', stripeError);
          // Continue with PostgreSQL data only
        }
      }

      console.log(`✅ Returning ${billingHistory.length} billing history items`);
      
      // Log the dates we're returning for debugging
      billingHistory.forEach((item, index) => {
        console.log(`📋 Item ${index + 1}:`, {
          id: item.id || item.stripe_invoice_id,
          amount: item.amount,
          created_at: item.created_at,
          created: item.created,
          source: item.source || 'database'
        });
      });

      return billingHistory;
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
   * FIXED: Sync subscription status with authoritative Stripe dates
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

      console.log(`🔄 Syncing subscription with authoritative Stripe dates for user ${userId}`);

      // Use the stripe service's authoritative sync method
      const syncResult = await stripeService.syncUserSubscriptionFromStripe(userId);
      
      return syncResult;
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
   * Get plan comparison data (Monthly only)
   * @returns {Object} Plan comparison matrix
   */
  async getPlanComparison() {
    try {
      const plans = await this.getAvailablePlans();
      
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
          billingCycle: 'monthly',
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

  /**
   * FIXED: Get subscription with authoritative Stripe data
   * @param {string} userId - User ID
   * @returns {Object} Subscription with authoritative dates
   */
  async getSubscriptionWithFreshData(userId) {
    try {
      console.log(`🔄 Getting subscription with authoritative Stripe data for user ${userId}`);
      
      // This method now always fetches fresh data from Stripe
      const currentSub = await this.getCurrentSubscription(userId);
      
      return currentSub;
    } catch (error) {
      console.error('Error getting subscription with fresh data:', error);
      throw new Error('Failed to get subscription with fresh data: ' + error.message);
    }
  }

  /**
   * UTILITY: Validate subscription data integrity
   * @param {string} userId - User ID
   * @returns {Object} Validation results
   */
  async validateSubscriptionData(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const validation = {
        userId,
        valid: true,
        issues: [],
        recommendations: []
      };

      // Check if user has subscription tier but no Stripe customer ID
      if (user.subscriptionTier !== 'free' && !user.stripeCustomerId) {
        validation.valid = false;
        validation.issues.push('User has paid subscription tier but no Stripe customer ID');
        validation.recommendations.push('Sync with Stripe or downgrade to free plan');
      }

      // Check if user has missing subscription end date for paid plans
      if (user.subscriptionTier !== 'free' && !user.subscriptionEndDate) {
        validation.valid = false;
        validation.issues.push('User has paid subscription but missing end date');
        validation.recommendations.push('Sync subscription data from Stripe');
      }

      // Check if subscription is expired
      if (user.subscriptionEndDate && new Date(user.subscriptionEndDate) < new Date()) {
        validation.valid = false;
        validation.issues.push('Subscription appears to be expired');
        validation.recommendations.push('Check with Stripe for current status and sync data');
      }

      // Check PostgreSQL consistency
      if (user.stripeCustomerId) {
        const pgSubscription = await db.query(`
          SELECT * FROM user_subscriptions WHERE user_id = $1
        `, [userId]);

        if (pgSubscription.rows.length === 0) {
          validation.issues.push('Missing PostgreSQL subscription record');
          validation.recommendations.push('Create PostgreSQL subscription record');
        }
      }

      return validation;
    } catch (error) {
      console.error('Error validating subscription data:', error);
      throw new Error('Failed to validate subscription data: ' + error.message);
    }
  }

  /**
   * UTILITY: Fix subscription data for a user using authoritative Stripe data
   * @param {string} userId - User ID
   * @returns {Object} Fix results
   */
  async fixSubscriptionData(userId) {
    try {
      console.log(`🔧 Fixing subscription data with authoritative Stripe dates for user ${userId}...`);

      // First validate to see what needs fixing
      const validation = await this.validateSubscriptionData(userId);
      
      if (validation.valid) {
        return { message: 'Subscription data is already valid', validation };
      }

      console.log(`🔍 Found ${validation.issues.length} issues to fix`);

      // Try to sync from Stripe with authoritative dates
      let syncResult = null;
      try {
        syncResult = await this.syncSubscriptionStatus(userId);
        console.log(`✅ Sync completed with authoritative dates:`, syncResult);
      } catch (syncError) {
        console.warn(`⚠️ Sync failed: ${syncError.message}`);
      }

      // Re-validate after sync
      const postSyncValidation = await this.validateSubscriptionData(userId);
      
      return {
        message: 'Subscription data fix completed with authoritative Stripe dates',
        beforeFix: validation,
        afterFix: postSyncValidation,
        syncResult,
        fixed: validation.issues.length - postSyncValidation.issues.length
      };
    } catch (error) {
      console.error('Error fixing subscription data:', error);
      throw new Error('Failed to fix subscription data: ' + error.message);
    }
  }

  /**
   * ADMIN: Get subscription health dashboard data
   * @returns {Object} Health dashboard data
   */
  async getSubscriptionHealthDashboard() {
    try {
      // Get counts by subscription tier
      const tierCounts = await User.aggregate([
        {
          $group: {
            _id: '$subscriptionTier',
            count: { $sum: 1 }
          }
        }
      ]);

      // Get users with missing billing dates
      const missingDates = await User.countDocuments({
        subscriptionTier: { $in: ['casual', 'hunter'] },
        $or: [
          { subscriptionEndDate: null },
          { subscriptionEndDate: { $exists: false } }
        ]
      });

      // Get expired subscriptions
      const expiredSubs = await User.countDocuments({
        subscriptionTier: { $in: ['casual', 'hunter'] },
        subscriptionEndDate: { $lt: new Date() }
      });

      // Get recent payments
      const recentPayments = await db.query(`
        SELECT COUNT(*) as count, SUM(amount) as total_amount
        FROM payment_history 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        AND status = 'succeeded'
      `);

      // Get webhook health
      const webhookHealth = await db.query(`
        SELECT 
          COUNT(*) as total_webhooks,
          SUM(CASE WHEN processed = true THEN 1 ELSE 0 END) as processed_webhooks,
          SUM(CASE WHEN error_message IS NOT NULL THEN 1 ELSE 0 END) as failed_webhooks
        FROM webhook_events 
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);

      return {
        tierDistribution: tierCounts,
        healthMetrics: {
          totalUsers: tierCounts.reduce((sum, tier) => sum + tier.count, 0),
          paidUsers: tierCounts.filter(t => t._id !== 'free').reduce((sum, tier) => sum + tier.count, 0),
          freeUsers: tierCounts.find(t => t._id === 'free')?.count || 0,
          usersWithMissingDates: missingDates,
          expiredSubscriptions: expiredSubs,
          dataIntegrityScore: Math.max(0, 100 - (missingDates * 10) - (expiredSubs * 5))
        },
        recentActivity: {
          paymentsLast30Days: parseInt(recentPayments.rows[0]?.count || 0),
          revenueLast30Days: parseFloat(recentPayments.rows[0]?.total_amount || 0)
        },
        webhookHealth: {
          totalWebhooks: parseInt(webhookHealth.rows[0]?.total_webhooks || 0),
          processedWebhooks: parseInt(webhookHealth.rows[0]?.processed_webhooks || 0),
          failedWebhooks: parseInt(webhookHealth.rows[0]?.failed_webhooks || 0),
          successRate: webhookHealth.rows[0]?.total_webhooks > 0 
            ? (parseInt(webhookHealth.rows[0]?.processed_webhooks || 0) / parseInt(webhookHealth.rows[0]?.total_webhooks || 0)) * 100
            : 100
        }
      };
    } catch (error) {
      console.error('Error getting subscription health dashboard:', error);
      throw new Error('Failed to get health dashboard: ' + error.message);
    }
  }

  /**
   * UTILITY: Bulk fix subscription data for multiple users
   * @param {Array} userIds - Array of user IDs (optional)
   * @returns {Object} Bulk fix results
   */
  async bulkFixSubscriptionData(userIds = null) {
    try {
      console.log('🔧 Starting bulk subscription data fix with authoritative Stripe dates...');

      let targetUsers;
      if (userIds && userIds.length > 0) {
        targetUsers = userIds;
      } else {
        // Find all users with potential issues
        const usersWithIssues = await User.find({
          $or: [
            {
              subscriptionTier: { $in: ['casual', 'hunter'] },
              subscriptionEndDate: null
            },
            {
              subscriptionTier: { $in: ['casual', 'hunter'] },
              subscriptionEndDate: { $exists: false }
            },
            {
              subscriptionTier: { $in: ['casual', 'hunter'] },
              stripeCustomerId: null
            }
          ]
        }).select('_id');

        targetUsers = usersWithIssues.map(user => user._id.toString());
      }

      console.log(`📊 Found ${targetUsers.length} users to process`);

      const results = {
        total: targetUsers.length,
        fixed: 0,
        failed: 0,
        details: []
      };

      for (const userId of targetUsers) {
        try {
          console.log(`🔄 Processing user ${userId}...`);
          
          const fixResult = await this.fixSubscriptionData(userId);
          
          results.fixed++;
          results.details.push({
            userId,
            status: 'success',
            result: fixResult
          });

          console.log(`✅ Fixed subscription data for user ${userId}`);
        } catch (userError) {
          console.error(`❌ Failed to fix user ${userId}:`, userError.message);
          
          results.failed++;
          results.details.push({
            userId,
            status: 'failed',
            error: userError.message
          });
        }
      }

      console.log(`🎉 Bulk fix completed: ${results.fixed} fixed, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('Error in bulk fix:', error);
      throw new Error('Failed to bulk fix subscription data: ' + error.message);
    }
  }
}

module.exports = new SubscriptionService();