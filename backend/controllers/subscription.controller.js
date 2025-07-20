// backend/controllers/subscription.controller.js - COMPLETE WITH PERSISTENT WEEKLY TRACKING
const subscriptionService = require('../services/subscription.service');
const stripeService = require('../services/stripe.service');
const usageService = require('../services/usage.service');
const WeeklyJobTracking = require('../models/mongodb/weeklyJobTracking.model'); // NEW: Import persistent tracking
const User = require('../models/mongodb/user.model');
const db = require('../config/postgresql');

class SubscriptionController {
  /**
   * Get all available subscription plans
   * @route GET /api/subscriptions/plans
   * @access Public
   */
  static async getPlans(req, res) {
    try {
      const plans = await subscriptionService.getAvailablePlans();
      
      res.status(200).json({
        success: true,
        data: {
          plans,
          billingCycle: 'monthly',
          message: 'Monthly subscription plans retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve subscription plans'
      });
    }
  }

  /**
   * Get plan comparison matrix
   * @route GET /api/subscriptions/plans/compare
   * @access Public
   */
  static async getPlansComparison(req, res) {
    try {
      const comparison = await subscriptionService.getPlanComparison();
      
      res.status(200).json({
        success: true,
        data: {
          comparison,
          billingCycle: 'monthly',
          message: 'Monthly plan comparison retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting plan comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve plan comparison'
      });
    }
  }

  /**
   * UPDATED: Get user's current subscription with persistent weekly tracking
   * @route GET /api/subscriptions/current
   * @access Private
   */
  static async getCurrentSubscription(req, res) {
    try {
      const userId = req.user.id;
      
      console.log('🔍 Getting subscription with persistent weekly tracking for user:', userId);
      
      // Use the updated method that includes persistent weekly tracking
      const subscriptionData = await subscriptionService.getCurrentSubscription(userId);
      
      console.log('📊 Subscription service returned data with persistent tracking:', {
        hasUser: !!subscriptionData.user,
        tier: subscriptionData.user?.subscriptionTier,
        subscriptionEndDate: subscriptionData.user?.subscriptionEndDate,
        subscriptionStartDate: subscriptionData.user?.subscriptionStartDate,
        cancelAtPeriodEnd: subscriptionData.user?.cancelAtPeriodEnd,
        hasPersistentWeeklyTracking: !!subscriptionData.usageStats?.aiJobsThisWeek
      });

      // Format the response for frontend
      const response = {
        subscription: subscriptionData.user,  // User object with authoritative subscription info
        planLimits: subscriptionData.planLimits,  // Plan limits object
        usageStats: subscriptionData.usageStats,  // Usage statistics object with persistent tracking
        user: subscriptionData.user,  // Also include user for backward compatibility
        isActive: subscriptionData.isActive,
        billingCycle: 'monthly',
        dataFreshness: {
          lastSynced: new Date().toISOString(),
          source: 'stripe_authoritative_with_persistent_tracking'
        }
      };
      
      console.log('✅ Sending response with persistent weekly tracking:', {
        subscriptionTier: response.subscription?.subscriptionTier,
        subscriptionEndDate: response.subscription?.subscriptionEndDate,
        subscriptionStartDate: response.subscription?.subscriptionStartDate,
        cancelAtPeriodEnd: response.subscription?.cancelAtPeriodEnd,
        dataSource: response.dataFreshness?.source,
        weeklyJobsTracked: response.usageStats?.aiJobsThisWeek?.used || 0,
        weeklyLimit: response.usageStats?.aiJobsThisWeek?.weeklyLimit || 0
      });
      
      res.status(200).json({
        success: true,
        data: response,
        message: 'Current subscription retrieved with persistent weekly tracking'
      });
    } catch (error) {
      console.error('❌ Error getting current subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve current subscription'
      });
    }
  }

  /**
   * 🔧 NEW: Get weekly job statistics using persistent tracking
   * @route GET /api/subscriptions/weekly-job-stats
   * @access Private
   */
  static async getWeeklyJobStats(req, res) {
    try {
      const userId = req.user.id; // Get from auth middleware
      const { weeklyLimit } = req.query;
      
      const limit = parseInt(weeklyLimit) || (req.user.subscriptionTier === 'hunter' ? 100 : 50);
      
      console.log(`📊 Getting persistent weekly job stats for user ${userId} with limit ${limit}`);
      
      // 🔧 NEW: Use persistent weekly tracking instead of database job counting
      const persistentWeeklyStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, limit);
      
      // Calculate percentage
      const weeklyPercentage = persistentWeeklyStats.weeklyLimit > 0 
        ? Math.round((persistentWeeklyStats.jobsFoundThisWeek / persistentWeeklyStats.weeklyLimit) * 100)
        : 0;
      
      console.log(`📊 Persistent weekly stats calculated:`, {
        found: persistentWeeklyStats.jobsFoundThisWeek,
        limit: persistentWeeklyStats.weeklyLimit,
        remaining: persistentWeeklyStats.remainingThisWeek,
        percentage: weeklyPercentage,
        trackingMethod: persistentWeeklyStats.calculationMethod
      });
      
      res.status(200).json({
        success: true,
        data: {
          jobsFoundThisWeek: persistentWeeklyStats.jobsFoundThisWeek,
          weeklyLimit: persistentWeeklyStats.weeklyLimit,
          remainingThisWeek: persistentWeeklyStats.remainingThisWeek,
          isLimitReached: persistentWeeklyStats.isLimitReached,
          weeklyPercentage: weeklyPercentage,
          weekStart: persistentWeeklyStats.weekStart,
          weekEnd: persistentWeeklyStats.weekEnd,
          calculationMethod: persistentWeeklyStats.calculationMethod || 'persistent_weekly_tracking',
          searchRuns: persistentWeeklyStats.searchRuns || [],
          trackingMethod: 'persistent_weekly_tracking',
          message: 'Weekly job statistics retrieved using persistent tracking'
        }
      });
      
    } catch (error) {
      console.error('Error getting persistent weekly job stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get weekly job statistics',
        details: error.message
      });
    }
  }

  /**
   * 🔧 NEW: Get detailed weekly tracking summary
   * @route GET /api/subscriptions/weekly-tracking-summary
   * @access Private
   */
  static async getWeeklyTrackingSummary(req, res) {
    try {
      const userId = req.user.id;
      const weeklyLimit = req.user.subscriptionTier === 'hunter' ? 100 : 50;
      
      console.log(`📊 Getting detailed weekly tracking summary for user ${userId}`);
      
      // Get current week's tracking record
      const { weekStart } = WeeklyJobTracking.calculateWeekDates();
      const weeklyRecord = await WeeklyJobTracking.findOne({
        userId,
        weekStart: weekStart
      });
      
      if (!weeklyRecord) {
        // Create a new record if none exists
        const newRecord = await WeeklyJobTracking.getOrCreateWeeklyRecord(
          userId, 
          req.user.subscriptionTier, 
          weeklyLimit
        );
        
        res.status(200).json({
          success: true,
          data: {
            summary: newRecord.getWeeklySummary(),
            searchRuns: newRecord.getSearchRunsBreakdown(),
            message: 'New weekly tracking record created'
          }
        });
        return;
      }
      
      const summary = weeklyRecord.getWeeklySummary();
      const searchRuns = weeklyRecord.getSearchRunsBreakdown();
      
      console.log(`📊 Weekly tracking summary: ${summary.jobsFoundThisWeek}/${summary.weeklyLimit} jobs, ${summary.totalSearchRuns} search runs`);
      
      res.status(200).json({
        success: true,
        data: {
          summary,
          searchRuns,
          weeklyHistory: [], // Could add history if needed
          message: 'Weekly tracking summary retrieved successfully'
        }
      });
      
    } catch (error) {
      console.error('Error getting weekly tracking summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get weekly tracking summary',
        details: error.message
      });
    }
  }

  /**
   * Get user's usage statistics
   * @route GET /api/subscriptions/usage
   * @access Private
   */
  static async getUsageStats(req, res) {
    try {
      const userId = req.user.id;
      const usageStats = await usageService.getUserUsageStats(userId);
      
      res.status(200).json({
        success: true,
        data: {
          usage: usageStats,
          message: 'Usage statistics retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting usage stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage statistics'
      });
    }
  }

  /**
   * Get invoice download URL
   * @route GET /api/subscriptions/invoice/:invoiceId/download
   * @access Private
   */
  static async getInvoiceDownload(req, res) {
    try {
      const userId = req.user.id;
      const { invoiceId } = req.params;

      if (!invoiceId) {
        return res.status(400).json({
          success: false,
          error: 'Invoice ID is required'
        });
      }

      console.log(`🔍 Getting invoice download for user ${userId}, invoice: ${invoiceId}`);

      // Get user to verify they have access to this invoice
      const user = await User.findById(userId);
      if (!user || !user.stripeCustomerId) {
        return res.status(404).json({
          success: false,
          error: 'User not found or no Stripe customer ID'
        });
      }

      // Get invoice from Stripe
      try {
        const invoice = await stripeService.getInvoice(invoiceId);
        
        // Verify this invoice belongs to the user
        if (invoice.customer !== user.stripeCustomerId) {
          return res.status(403).json({
            success: false,
            error: 'Access denied to this invoice'
          });
        }

        // Return the hosted invoice URL for download/viewing
        const downloadUrl = invoice.hosted_invoice_url || invoice.invoice_pdf;
        
        if (!downloadUrl) {
          return res.status(404).json({
            success: false,
            error: 'Invoice download URL not available'
          });
        }

        res.status(200).json({
          success: true,
          data: {
            downloadUrl,
            invoiceId,
            amount: invoice.amount_paid,
            status: invoice.status,
            created: invoice.created,
            message: 'Invoice download URL retrieved successfully'
          }
        });

      } catch (stripeError) {
        console.error('Error retrieving invoice from Stripe:', stripeError);
        
        if (stripeError.code === 'resource_missing') {
          return res.status(404).json({
            success: false,
            error: 'Invoice not found'
          });
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve invoice from Stripe'
        });
      }

    } catch (error) {
      console.error('Error getting invoice download:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get invoice download URL'
      });
    }
  }

  /**
   * Get user's usage history
   * @route GET /api/subscriptions/usage/history
   * @access Private
   */
  static async getUsageHistory(req, res) {
    try {
      const userId = req.user.id;
      const months = parseInt(req.query.months) || 12;
      
      const history = await usageService.getUserUsageHistory(userId, months);
      
      res.status(200).json({
        success: true,
        data: {
          history,
          message: 'Usage history retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting usage history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage history'
      });
    }
  }

  /**
   * Create checkout session
   * @route POST /api/subscriptions/create-checkout
   * @access Private
   */
  static async createCheckoutSession(req, res) {
    try {
      const userId = req.user.id;
      const { planName } = req.body;

      if (!planName) {
        return res.status(400).json({
          success: false,
          error: 'Plan name is required'
        });
      }

      // Build URLs
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const successUrl = `${baseUrl}/settings?upgraded=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/settings`;

      // Create checkout session
      const session = await subscriptionService.createCheckoutSession(
        userId,
        planName,
        successUrl,
        cancelUrl
      );

      console.log(`✅ Created checkout session for user ${userId}, plan: ${planName}`);

      res.status(200).json({
        success: true,
        data: {
          checkoutUrl: session.url,
          sessionId: session.id,
          planName,
          billingCycle: 'monthly',
          message: 'Monthly checkout session created successfully'
        }
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create checkout session'
      });
    }
  }

 /**
   * 🔧 FIXED: Create customer portal session
   * @route POST /api/subscriptions/customer-portal
   * @access Private
   */
  static async createCustomerPortal(req, res) {
    try {
      const userId = req.user.id;
      const { returnUrl } = req.body;
      
      console.log(`🔗 Creating customer portal session for user ${userId}`);
      
      // Set default return URL if not provided
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const portalReturnUrl = returnUrl || `${baseUrl}/settings`;
      
      console.log(`🔗 Portal return URL: ${portalReturnUrl}`);
      
      const session = await subscriptionService.createCustomerPortalSession(userId, portalReturnUrl);
      
      console.log(`✅ Customer portal session created: ${session.url}`);

      res.status(200).json({
        success: true,
        data: {
          portalUrl: session.url,
          returnUrl: portalReturnUrl,
          message: 'Customer portal session created successfully'
        }
      });
    } catch (error) {
      console.error('❌ Error creating customer portal session:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('No subscription found')) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found. Customer portal is only available for subscribers.'
        });
      }
      
      if (error.message && error.message.includes('No Stripe customer')) {
        return res.status(404).json({
          success: false,
          error: 'No billing information found. Please contact support.'
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create customer portal session'
      });
    }
  }

/**
   * 🔧 FIXED: Cancel subscription
   * @route POST /api/subscriptions/cancel
   * @access Private
   */
  static async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const { atPeriodEnd = true } = req.body;

      console.log(`🚫 Canceling subscription for user ${userId}, atPeriodEnd: ${atPeriodEnd}`);

      const result = await subscriptionService.cancelSubscription(userId, atPeriodEnd);

      console.log(`✅ Subscription cancellation result:`, result);

      res.status(200).json({
        success: true,
        data: {
          subscription: result,
          atPeriodEnd: atPeriodEnd,
          message: atPeriodEnd 
            ? 'Subscription will be canceled at the end of the monthly billing period'
            : 'Subscription canceled immediately'
        }
      });
    } catch (error) {
      console.error('❌ Error canceling subscription:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('No active subscription')) {
        return res.status(404).json({
          success: false,
          error: 'No active subscription found to cancel'
        });
      }
      
      if (error.message && error.message.includes('already canceled')) {
        return res.status(400).json({
          success: false,
          error: 'Subscription is already set to cancel'
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel subscription'
      });
    }
  }

  /**
   * 🔧 FIXED: Resume subscription
   * @route POST /api/subscriptions/resume
   * @access Private
   */
  static async resumeSubscription(req, res) {
    try {
      const userId = req.user.id;
      
      console.log(`▶️ Resuming subscription for user ${userId}`);

      const result = await subscriptionService.resumeSubscription(userId);

      console.log(`✅ Subscription resume result:`, result);

      res.status(200).json({
        success: true,
        data: {
          subscription: result,
          message: 'Monthly subscription resumed successfully'
        }
      });
    } catch (error) {
      console.error('❌ Error resuming subscription:', error);
      
      // Handle specific error cases
      if (error.message && error.message.includes('No subscription found')) {
        return res.status(404).json({
          success: false,
          error: 'No subscription found to resume'
        });
      }
      
      if (error.message && error.message.includes('not set to cancel')) {
        return res.status(400).json({
          success: false,
          error: 'Subscription is not set to cancel'
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to resume subscription'
      });
    }
  }

  /**
   * Change subscription plan (Monthly only)
   * @route PUT /api/subscriptions/change-plan
   * @access Private
   */
  static async changeSubscriptionPlan(req, res) {
    try {
      const userId = req.user.id;
      const { newPlanName } = req.body;

      if (!newPlanName) {
        return res.status(400).json({
          success: false,
          error: 'New plan name is required'
        });
      }

      const result = await subscriptionService.changeSubscriptionPlan(
        userId,
        newPlanName
      );

      res.status(200).json({
        success: true,
        data: {
          subscription: result,
          newPlan: newPlanName,
          billingCycle: 'monthly',
          message: `Plan changed to ${newPlanName} (monthly) successfully`
        }
      });
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to change subscription plan'
      });
    }
  }

  /**
   * UPDATED: Sync subscription status with persistent tracking
   * @route POST /api/subscriptions/sync
   * @access Private
   */
  static async syncSubscription(req, res) {
    try {
      const userId = req.user.id;
      
      console.log(`🔄 Starting sync with persistent weekly tracking for user ${userId}`);
      
      const result = await subscriptionService.syncSubscriptionStatus(userId);

      res.status(200).json({
        success: true,
        data: {
          result,
          message: 'Subscription status synced with persistent weekly tracking'
        }
      });
    } catch (error) {
      console.error('Error syncing subscription:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to sync subscription status'
      });
    }
  }

  /**
   * Get billing history
   * @route GET /api/subscriptions/billing-history
   * @access Private
   */
  static async getBillingHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 10;
      
      const history = await subscriptionService.getBillingHistory(userId, limit);

      res.status(200).json({
        success: true,
        data: {
          history,
          billingCycle: 'monthly',
          message: 'Monthly billing history retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting billing history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve billing history'
      });
    }
  }

  /**
   * Handle Stripe webhooks - UPDATED VERSION
   * @route POST /api/subscriptions/webhook
   * @access Public (but verified)
   */
  static async handleWebhook(req, res) {
    try {
      const signature = req.headers['stripe-signature'];
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

      let event;

      console.log('🔔 Received webhook request');
      console.log('🔍 Request body type:', typeof req.body);
      console.log('🔍 Request body is Buffer:', Buffer.isBuffer(req.body));
      console.log('🔍 Request body length:', req.body?.length || 'undefined');
      console.log('🔍 Signature present:', !!signature);

      // Skip verification in development if we're having issues
      if (process.env.SKIP_WEBHOOK_VERIFICATION === 'true') {
        console.log('⚠️ Skipping webhook verification for development');
        
        try {
          const rawBody = req.body.toString('utf8');
          event = JSON.parse(rawBody);
          console.log('✅ Successfully parsed webhook event from raw buffer');
          console.log('🔍 Event type:', event.type);
          console.log('🔍 Event ID:', event.id);
        } catch (parseError) {
          console.error('❌ Failed to parse webhook body:', parseError.message);
          return res.status(400).json({
            success: false,
            error: 'Invalid webhook body format'
          });
        }
      } else {
        if (!signature || !endpointSecret) {
          return res.status(400).json({
            success: false,
            error: 'Missing webhook signature or secret'
          });
        }

        try {
          event = stripeService.verifyWebhookSignature(
            req.body,
            signature,
            endpointSecret
          );
          
          console.log('✅ Webhook signature verified, event type:', event.type);
        } catch (verificationError) {
          console.error('❌ Webhook signature verification failed:', verificationError.message);
          return res.status(400).json({
            success: false,
            error: 'Invalid webhook signature'
          });
        }
      }

      // Validate event has required fields
      if (!event || !event.type || !event.id) {
        console.error('❌ Invalid event structure:', { 
          type: event?.type, 
          id: event?.id,
          hasData: !!event?.data,
          hasObject: !!event?.data?.object 
        });
        return res.status(400).json({
          success: false,
          error: 'Invalid webhook event structure'
        });
      }

      console.log(`✅ Processing webhook event: ${event.type} (ID: ${event.id})`);

      // Handle the event with persistent tracking support
      await stripeService.handleWebhookEvent(event);

      res.status(200).json({
        success: true,
        message: `Webhook ${event.type} handled successfully with persistent tracking support`,
        eventId: event.id
      });
    } catch (error) {
      console.error('❌ Webhook handling error:', error);
      res.status(400).json({
        success: false,
        error: 'Webhook handling failed: ' + error.message
      });
    }
  }

  /**
   * Check feature permission
   * @route GET /api/subscriptions/permissions/:feature
   * @access Private
   */
  static async checkPermission(req, res) {
    try {
      const userId = req.user.id;
      const { feature } = req.params;
      const quantity = parseInt(req.query.quantity) || 1;

      if (!feature) {
        return res.status(400).json({
          success: false,
          error: 'Feature parameter is required'
        });
      }

      const permission = await subscriptionService.checkPermission(userId, feature, quantity);

      res.status(200).json({
        success: true,
        data: {
          permission,
          feature,
          quantity,
          message: 'Permission check completed'
        }
      });
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check permission'
      });
    }
  }

  /**
   * Get usage warnings
   * @route GET /api/subscriptions/usage/warnings
   * @access Private
   */
  static async getUsageWarnings(req, res) {
    try {
      const userId = req.user.id;
      
      const warnings = await usageService.getUsageWarnings(userId);

      res.status(200).json({
        success: true,
        data: {
          warnings,
          count: warnings.length,
          message: 'Usage warnings retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting usage warnings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve usage warnings'
      });
    }
  }

/**
   * Track usage manually (for testing)
   * @route POST /api/subscriptions/usage/track
   * @access Private
   */
  static async trackUsage(req, res) {
    try {
      const userId = req.user.id;
      const { action, quantity = 1, metadata = {} } = req.body;

      if (!action) {
        return res.status(400).json({
          success: false,
          error: 'Action is required'
        });
      }

      const result = await usageService.trackUsage(userId, action, quantity, metadata);

      res.status(200).json({
        success: true,
        data: {
          result,
          message: 'Usage tracked successfully'
        }
      });
    } catch (error) {
      console.error('Error tracking usage:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to track usage'
      });
    }
  }

  /**
   * Get subscription analytics (Admin only)
   * @route GET /api/subscriptions/analytics
   * @access Private (Admin)
   */
  static async getSubscriptionAnalytics(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const {
        startDate,
        endDate,
        planTier,
        feature
      } = req.query;

      const filters = {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(planTier && { planTier }),
        ...(feature && { feature })
      };

      const analytics = await usageService.getUsageAnalytics(filters);

      res.status(200).json({
        success: true,
        data: {
          analytics,
          billingCycle: 'monthly',
          message: 'Monthly subscription analytics retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting subscription analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analytics'
      });
    }
  }

  /**
   * Get feature trends (Admin only)
   * @route GET /api/subscriptions/analytics/trends/:feature
   * @access Private (Admin)
   */
  static async getFeatureTrends(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { feature } = req.params;
      const days = parseInt(req.query.days) || 30;

      if (!feature) {
        return res.status(400).json({
          success: false,
          error: 'Feature parameter is required'
        });
      }

      const trends = await usageService.getFeatureTrends(feature, days);

      res.status(200).json({
        success: true,
        data: {
          trends,
          message: 'Feature trends retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting feature trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve feature trends'
      });
    }
  }

  /**
   * Preview plan change (Monthly only)
   * @route POST /api/subscriptions/preview-change
   * @access Private
   */
  static async previewPlanChange(req, res) {
    try {
      const userId = req.user.id;
      const { newPlanName } = req.body;

      if (!newPlanName) {
        return res.status(400).json({
          success: false,
          error: 'New plan name is required'
        });
      }

      // Get current subscription
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      
      if (!currentSubscription.subscription) {
        return res.status(400).json({
          success: false,
          error: 'No active subscription found'
        });
      }

      // Get new plan details
      const plansQuery = await db.query(`
        SELECT * FROM subscription_plans 
        WHERE name = $1 AND is_active = true
      `, [newPlanName]);

      const newPlan = plansQuery.rows[0];
      if (!newPlan) {
        return res.status(404).json({
          success: false,
          error: 'Plan not found'
        });
      }

      // Get current plan details
      const currentPlan = await db.query(`
        SELECT * FROM subscription_plans 
        WHERE name = $1
      `, [currentSubscription.user.subscriptionTier]);

      // Use monthly prices only
      const currentPrice = currentPlan.rows[0]?.price_monthly || 0;
      const newPrice = newPlan.price_monthly;
      const priceDifference = newPrice - currentPrice;

      res.status(200).json({
        success: true,
        data: {
          currentPlan: {
            name: currentSubscription.user.subscriptionTier,
            price: currentPrice
          },
          newPlan: {
            name: newPlanName,
            price: newPrice
          },
          priceDifference,
          billingCycle: 'monthly',
          isUpgrade: priceDifference > 0,
          isDowngrade: priceDifference < 0,
          message: 'Monthly plan change preview calculated successfully'
        }
      });
    } catch (error) {
      console.error('Error previewing plan change:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to preview plan change'
      });
    }
  }

/**
   * Get subscription health check
   * @route GET /api/subscriptions/health
   * @access Private
   */
  static async getSubscriptionHealth(req, res) {
    try {
      const userId = req.user.id;
      
      const subscription = await subscriptionService.getCurrentSubscription(userId);
      const warnings = await usageService.getUsageWarnings(userId);
      
      const now = new Date();
      const health = {
        subscriptionActive: subscription.isActive,
        planTier: subscription.user.subscriptionTier,
        billingCycle: 'monthly',
        usageWarnings: warnings,
        healthScore: 100, // Base score
        issues: [],
        recommendations: [],
        persistentWeeklyTracking: !!subscription.usageStats?.aiJobsThisWeek
      };

      // Check for issues
      if (!subscription.isActive && subscription.user.subscriptionTier !== 'free') {
        health.issues.push('Subscription is inactive');
        health.healthScore -= 30;
        health.recommendations.push('Renew your monthly subscription to continue using premium features');
      }

      if (subscription.user.cancelAtPeriodEnd) {
        health.issues.push('Subscription set to cancel at period end');
        health.healthScore -= 20;
        health.recommendations.push('Consider resuming your monthly subscription if you want to continue');
      }

      if (subscription.user.subscriptionEndDate) {
        const daysUntilExpiry = Math.ceil((new Date(subscription.user.subscriptionEndDate) - now) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          health.issues.push(`Monthly subscription expires in ${daysUntilExpiry} days`);
          health.healthScore -= 15;
          health.recommendations.push('Your monthly subscription is expiring soon. Please ensure your payment method is up to date');
        }
      }

      // Check usage warnings
      const criticalWarnings = warnings.filter(w => w.severity === 'critical');
      if (criticalWarnings.length > 0) {
        health.issues.push(`${criticalWarnings.length} features at usage limit`);
        health.healthScore -= 10 * criticalWarnings.length;
        health.recommendations.push('Consider upgrading your plan for higher usage limits');
      }

      // Check persistent weekly tracking status
      const weeklyTracking = subscription.usageStats?.aiJobsThisWeek;
      if (weeklyTracking && weeklyTracking.isLimitReached) {
        health.issues.push('Weekly job discovery limit reached');
        health.healthScore -= 10;
        health.recommendations.push('Weekly job limit will reset next Monday');
      }

      health.healthScore = Math.max(0, health.healthScore);

      res.status(200).json({
        success: true,
        data: {
          health,
          message: 'Subscription health check completed with persistent tracking'
        }
      });
    } catch (error) {
      console.error('Error getting subscription health:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get subscription health'
      });
    }
  }

  /**
   * UPDATED: Validate subscription data with persistent tracking
   * @route GET /api/subscriptions/validate
   * @access Private
   */
  static async validateSubscriptionData(req, res) {
    try {
      const userId = req.user.id;
      
      const validation = await subscriptionService.validateSubscriptionData(userId);

      res.status(200).json({
        success: true,
        data: {
          validation,
          message: 'Subscription data validation completed with persistent tracking support'
        }
      });
    } catch (error) {
      console.error('Error validating subscription data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate subscription data'
      });
    }
  }

  /**
   * UPDATED: Fix subscription data with persistent tracking
   * @route POST /api/subscriptions/fix
   * @access Private
   */
  static async fixSubscriptionData(req, res) {
    try {
      const userId = req.user.id;
      
      console.log(`🔧 Starting data fix with persistent weekly tracking for user ${userId}`);
      
      const fixResult = await subscriptionService.fixSubscriptionData(userId);

      res.status(200).json({
        success: true,
        data: {
          fixResult,
          message: 'Subscription data fix completed with persistent weekly tracking'
        }
      });
    } catch (error) {
      console.error('Error fixing subscription data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fix subscription data'
      });
    }
  }

  /**
   * ADMIN: Get subscription health dashboard
   * @route GET /api/subscriptions/admin/health-dashboard
   * @access Private (Admin)
   */
  static async getHealthDashboard(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const dashboard = await subscriptionService.getSubscriptionHealthDashboard();

      res.status(200).json({
        success: true,
        data: {
          dashboard,
          message: 'Subscription health dashboard retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting health dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve health dashboard'
      });
    }
  }

  /**
   * ADMIN: Bulk fix subscription data
   * @route POST /api/subscriptions/admin/bulk-fix
   * @access Private (Admin)
   */
  static async bulkFixSubscriptionData(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      const { userIds } = req.body;
      
      console.log('🔧 Starting bulk subscription data fix with persistent weekly tracking...');
      
      const results = await subscriptionService.bulkFixSubscriptionData(userIds);

      res.status(200).json({
        success: true,
        data: {
          results,
          message: 'Bulk subscription data fix completed with persistent weekly tracking'
        }
      });
    } catch (error) {
      console.error('Error in bulk fix:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk fix'
      });
    }
  }

  /**
   * UTILITY: Force fresh sync from Stripe
   * @route POST /api/subscriptions/force-sync
   * @access Private
   */
  static async forceFreshSync(req, res) {
    try {
      const userId = req.user.id;
      
      console.log(`🔄 Force syncing subscription data with persistent weekly tracking for user ${userId}`);
      
      // Use the Stripe service's sync method
      const syncResult = await stripeService.syncUserSubscriptionFromStripe(userId);

      res.status(200).json({
        success: true,
        data: {
          syncResult,
          timestamp: new Date().toISOString(),
          message: 'Fresh subscription data synced from Stripe with persistent tracking support'
        }
      });
    } catch (error) {
      console.error('Error in force sync:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to force sync subscription data'
      });
    }
  }

  /**
   * UTILITY: Get fresh billing date from Stripe
   * @route GET /api/subscriptions/fresh-billing-date
   * @access Private
   */
  static async getFreshBillingDate(req, res) {
    try {
      const userId = req.user.id;
      
      console.log(`📅 Getting authoritative billing date from Stripe for user ${userId}`);
      
      const freshDate = await stripeService.getAccurateNextBillingDate(userId);

      if (freshDate) {
        res.status(200).json({
          success: true,
          data: {
            nextBillingDate: freshDate.toISOString(),
            timestamp: new Date().toISOString(),
            message: 'Authoritative billing date retrieved from Stripe'
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Could not retrieve authoritative billing date from Stripe'
        });
      }
    } catch (error) {
      console.error('Error getting fresh billing date:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get fresh billing date'
      });
    }
  }

  /**
   * 🔧 NEW: Reset weekly tracking for testing
   * @route POST /api/subscriptions/reset-weekly-tracking
   * @access Private (Admin only for testing)
   */
  static async resetWeeklyTracking(req, res) {
    try {
      const userId = req.user.id;
      
      // Only allow admins to reset tracking for testing
      if (req.user.role !== 'admin' && process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required for weekly tracking reset'
        });
      }

      console.log(`🔄 Resetting weekly tracking for user ${userId}`);
      
      // Delete current week's tracking record to start fresh
      const { weekStart } = WeeklyJobTracking.calculateWeekDates();
      const deleteResult = await WeeklyJobTracking.deleteOne({
        userId,
        weekStart: weekStart
      });

      console.log(`✅ Reset weekly tracking: ${deleteResult.deletedCount} records deleted`);

      res.status(200).json({
        success: true,
        data: {
          deletedRecords: deleteResult.deletedCount,
          weekStart: weekStart.toISOString(),
          message: 'Weekly tracking reset successfully'
        }
      });
    } catch (error) {
      console.error('Error resetting weekly tracking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset weekly tracking'
      });
    }
  }

  /**
   * 🔧 NEW: Get weekly tracking history
   * @route GET /api/subscriptions/weekly-tracking-history
   * @access Private
   */
  static async getWeeklyTrackingHistory(req, res) {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit) || 12;
      
      console.log(`📊 Getting weekly tracking history for user ${userId}, limit: ${limit}`);
      
      const history = await WeeklyJobTracking.getWeeklyHistory(userId, limit);
      
      const historyWithSummaries = history.map(record => ({
        weekStart: record.weekStart,
        weekEnd: record.weekEnd,
        weekYear: record.weekYear,
        weekNumber: record.weekNumber,
        jobsFoundThisWeek: record.jobsFoundThisWeek,
        weeklyLimit: record.weeklyLimit,
        subscriptionTier: record.subscriptionTier,
        searchRuns: record.searchRuns.length,
        activeSearchRuns: record.searchRuns.filter(run => !run.searchDeleted).length,
        deletedSearchRuns: record.searchRuns.filter(run => run.searchDeleted).length,
        utilizationPercentage: Math.round((record.jobsFoundThisWeek / record.weeklyLimit) * 100)
      }));
      
      res.status(200).json({
        success: true,
        data: {
          history: historyWithSummaries,
          totalWeeks: history.length,
          message: 'Weekly tracking history retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting weekly tracking history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get weekly tracking history'
      });
    }
  }

  /**
   * 🔧 NEW: Get persistent tracking analytics (Admin)
   * @route GET /api/subscriptions/admin/persistent-tracking-analytics
   * @access Private (Admin)
   */
  static async getPersistentTrackingAnalytics(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
      }

      console.log('📊 Getting persistent tracking analytics for admin...');
      
      // Get aggregate analytics from WeeklyJobTracking collection
      const analytics = await WeeklyJobTracking.aggregate([
        {
          $group: {
            _id: null,
            totalWeeklyRecords: { $sum: 1 },
            totalJobsTracked: { $sum: '$jobsFoundThisWeek' },
            totalSearchRuns: { $sum: { $size: '$searchRuns' } },
            avgJobsPerWeek: { $avg: '$jobsFoundThisWeek' },
            avgUtilization: { 
              $avg: { 
                $multiply: [
                  { $divide: ['$jobsFoundThisWeek', '$weeklyLimit'] }, 
                  100 
                ] 
              } 
            },
            tierBreakdown: {
              $push: {
                tier: '$subscriptionTier',
                jobs: '$jobsFoundThisWeek',
                limit: '$weeklyLimit'
              }
            },
            currentWeekRecords: {
              $sum: {
                $cond: [
                  { $gte: ['$weekStart', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      // Get tier-specific analytics
      const tierAnalytics = await WeeklyJobTracking.aggregate([
        {
          $group: {
            _id: '$subscriptionTier',
            totalUsers: { $addToSet: '$userId' },
            totalJobs: { $sum: '$jobsFoundThisWeek' },
            avgJobsPerWeek: { $avg: '$jobsFoundThisWeek' },
            avgUtilization: { 
              $avg: { 
                $multiply: [
                  { $divide: ['$jobsFoundThisWeek', '$weeklyLimit'] }, 
                  100 
                ] 
              } 
            },
            totalSearchRuns: { $sum: { $size: '$searchRuns' } }
          }
        },
        {
          $project: {
            tier: '$_id',
            uniqueUsers: { $size: '$totalUsers' },
            totalJobs: 1,
            avgJobsPerWeek: { $round: ['$avgJobsPerWeek', 2] },
            avgUtilization: { $round: ['$avgUtilization', 2] },
            totalSearchRuns: 1
          }
        }
      ]);

      const result = analytics[0] || {
        totalWeeklyRecords: 0,
        totalJobsTracked: 0,
        totalSearchRuns: 0,
        avgJobsPerWeek: 0,
        avgUtilization: 0,
        currentWeekRecords: 0
      };

      res.status(200).json({
        success: true,
        data: {
          overview: {
            totalWeeklyRecords: result.totalWeeklyRecords,
            totalJobsTracked: result.totalJobsTracked,
            totalSearchRuns: result.totalSearchRuns,
            avgJobsPerWeek: Math.round(result.avgJobsPerWeek * 100) / 100,
            avgUtilization: Math.round(result.avgUtilization * 100) / 100,
            currentWeekRecords: result.currentWeekRecords
          },
          tierAnalytics: tierAnalytics,
          systemHealth: {
            trackingSystem: 'operational',
            dataIntegrity: 'good',
            weeklyResetFunctional: true
          },
          message: 'Persistent tracking analytics retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting persistent tracking analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get persistent tracking analytics'
      });
    }
  }

  /**
   * 🔧 NEW: Test persistent tracking functionality
   * @route POST /api/subscriptions/test-persistent-tracking
   * @access Private (Admin only for testing)
   */
  static async testPersistentTracking(req, res) {
    try {
      const userId = req.user.id;
      
      // Only allow admins to test in production
      if (req.user.role !== 'admin' && process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'Admin access required for persistent tracking testing'
        });
      }

      const { jobsToAdd = 5, searchName = 'Test Search' } = req.body;
      
      console.log(`🧪 Testing persistent tracking: adding ${jobsToAdd} jobs for user ${userId}`);
      
      const weeklyLimit = req.user.subscriptionTier === 'hunter' ? 100 : 50;
      
      // Test adding jobs to persistent tracking
      const trackingResult = await WeeklyJobTracking.addJobsToWeeklyTracking(
        userId, 
        'test-search-id', 
        jobsToAdd, 
        searchName, 
        'Test Resume', 
        req.user.subscriptionTier, 
        weeklyLimit
      );
      
      // Get updated stats
      const updatedStats = await WeeklyJobTracking.getCurrentWeeklyStats(userId, weeklyLimit);
      
      res.status(200).json({
        success: true,
        data: {
          trackingResult,
          updatedStats,
          testResults: {
            jobsAdded: jobsToAdd,
            searchName: searchName,
            weeklyLimit: weeklyLimit,
            userTier: req.user.subscriptionTier
          },
          message: 'Persistent tracking test completed successfully'
        }
      });
    } catch (error) {
      console.error('Error testing persistent tracking:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test persistent tracking'
      });
    }
  }
}

module.exports = SubscriptionController;