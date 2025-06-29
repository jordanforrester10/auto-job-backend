// backend/controllers/subscription.controller.js - FIXED WEBHOOK PARSING
const subscriptionService = require('../services/subscription.service');
const stripeService = require('../services/stripe.service');
const usageService = require('../services/usage.service');
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
   * Get user's current subscription
   * @route GET /api/subscriptions/current
   * @access Private
   */
  static async getCurrentSubscription(req, res) {
    try {
      const userId = req.user.id;
      const subscription = await subscriptionService.getCurrentSubscription(userId);
      
      res.status(200).json({
        success: true,
        data: {
          subscription,
          billingCycle: 'monthly',
          message: 'Current subscription retrieved successfully'
        }
      });
    } catch (error) {
      console.error('Error getting current subscription:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve current subscription'
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
   * Create checkout session for subscription (Monthly only)
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
      const successUrl = `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/pricing`;

      const session = await subscriptionService.createCheckoutSession(
        userId,
        planName,
        successUrl,
        cancelUrl
      );

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
   * Create customer portal session
   * @route POST /api/subscriptions/customer-portal
   * @access Private
   */
  static async createCustomerPortal(req, res) {
    try {
      const userId = req.user.id;
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const returnUrl = `${baseUrl}/settings`;

      const session = await subscriptionService.createCustomerPortalSession(userId, returnUrl);

      res.status(200).json({
        success: true,
        data: {
          portalUrl: session.url,
          message: 'Customer portal session created successfully'
        }
      });
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create customer portal session'
      });
    }
  }

  /**
   * Cancel subscription
   * @route POST /api/subscriptions/cancel
   * @access Private
   */
  static async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const { atPeriodEnd = true } = req.body;

      const result = await subscriptionService.cancelSubscription(userId, atPeriodEnd);

      res.status(200).json({
        success: true,
        data: {
          subscription: result,
          message: atPeriodEnd 
            ? 'Subscription will be canceled at the end of the monthly billing period'
            : 'Subscription canceled immediately'
        }
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel subscription'
      });
    }
  }

  /**
   * Resume subscription
   * @route POST /api/subscriptions/resume
   * @access Private
   */
  static async resumeSubscription(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await subscriptionService.resumeSubscription(userId);

      res.status(200).json({
        success: true,
        data: {
          subscription: result,
          message: 'Monthly subscription resumed successfully'
        }
      });
    } catch (error) {
      console.error('Error resuming subscription:', error);
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
   * Sync subscription status with Stripe
   * @route POST /api/subscriptions/sync
   * @access Private
   */
  static async syncSubscription(req, res) {
    try {
      const userId = req.user.id;
      
      const result = await subscriptionService.syncSubscriptionStatus(userId);

      res.status(200).json({
        success: true,
        data: {
          result,
          message: 'Subscription status synced successfully'
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
   * Handle Stripe webhooks - FIXED VERSION
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
          // Parse the raw buffer to JSON
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
          // Verify webhook signature with raw buffer
          event = stripeService.verifyWebhookSignature(
            req.body, // This is the raw buffer from express.raw()
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

      // Handle the event
      await stripeService.handleWebhookEvent(event);

      res.status(200).json({
        success: true,
        message: `Webhook ${event.type} handled successfully`,
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
        recommendations: []
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

      health.healthScore = Math.max(0, health.healthScore);

      res.status(200).json({
        success: true,
        data: {
          health,
          message: 'Subscription health check completed'
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
}

module.exports = SubscriptionController;