// backend/routes/subscription.routes.js - COMPLETE MONTHLY ONLY VERSION
const express = require('express');
const rateLimit = require('express-rate-limit');
const SubscriptionController = require('../controllers/subscription.controller');
const authMiddleware = require('../middleware/auth.middleware');
const SubscriptionMiddleware = require('../middleware/subscription.middleware');
const UsageMiddleware = require('../middleware/usage.middleware');
const { body, param, query, validationResult } = require('express-validator');

const router = express.Router();

// Rate limiting for subscription operations
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many subscription requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stripe webhook rate limiting (more permissive)
const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more webhook requests
  message: {
    success: false,
    error: 'Webhook rate limit exceeded'
  }
});

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// ======================================
// PUBLIC ROUTES (No authentication required)
// ======================================

/**
 * @route GET /api/subscriptions/plans
 * @desc Get all available subscription plans (Monthly only)
 * @access Public
 */
router.get('/plans', 
  subscriptionLimiter,
  SubscriptionController.getPlans
);

/**
 * @route GET /api/subscriptions/plans/compare
 * @desc Get plan comparison matrix (Monthly only)
 * @access Public
 */
router.get('/plans/compare', 
  subscriptionLimiter,
  SubscriptionController.getPlansComparison
);

/**
 * @route POST /api/subscriptions/webhook
 * @desc Handle Stripe webhooks
 * @access Public (but verified by Stripe signature)
 */
router.post('/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }), // Stripe requires raw body
  SubscriptionController.handleWebhook
);

// ======================================
// PROTECTED ROUTES (Authentication required)
// ======================================

/**
 * @route GET /api/subscriptions/current
 * @desc Get user's current subscription
 * @access Private
 */
router.get('/current',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionMiddleware.injectSubscriptionContext(),
  SubscriptionController.getCurrentSubscription
);

/**
 * @route GET /api/subscriptions/usage
 * @desc Get user's usage statistics
 * @access Private
 */
router.get('/usage',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionMiddleware.injectSubscriptionContext(),
  SubscriptionController.getUsageStats
);

/**
 * @route GET /api/subscriptions/usage/history
 * @desc Get user's usage history
 * @access Private
 */
router.get('/usage/history',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    query('months')
      .optional()
      .isInt({ min: 1, max: 24 })
      .withMessage('Months must be between 1 and 24')
  ],
  handleValidationErrors,
  SubscriptionController.getUsageHistory
);

/**
 * @route GET /api/subscriptions/usage/warnings
 * @desc Get usage warnings for user
 * @access Private
 */
router.get('/usage/warnings',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.getUsageWarnings
);

/**
 * @route POST /api/subscriptions/usage/track
 * @desc Manually track usage (for testing)
 * @access Private
 */
router.post('/usage/track',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    body('action')
      .notEmpty()
      .withMessage('Action is required')
      .isIn(['resumeUploads', 'resumeAnalysis', 'jobImports', 'resumeTailoring', 'recruiterUnlocks', 'aiJobDiscovery', 'aiConversations', 'aiMessagesTotal'])
      .withMessage('Invalid action'),
    body('quantity')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  handleValidationErrors,
  SubscriptionController.trackUsage
);

/**
 * @route GET /api/subscriptions/permissions/:feature
 * @desc Check permission for a specific feature
 * @access Private
 */
router.get('/permissions/:feature',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    param('feature')
      .notEmpty()
      .withMessage('Feature is required')
      .isIn(['resumeUploads', 'recruiterAccess', 'aiAssistant', 'aiJobDiscovery'])
      .withMessage('Invalid feature'),
    query('quantity')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100')
  ],
  handleValidationErrors,
  SubscriptionMiddleware.injectSubscriptionContext(),
  SubscriptionController.checkPermission
);

/**
 * @route POST /api/subscriptions/create-checkout
 * @desc Create Stripe checkout session (Monthly only)
 * @access Private
 */
router.post('/create-checkout',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    body('planName')
      .notEmpty()
      .withMessage('Plan name is required')
      .isIn(['casual', 'hunter'])
      .withMessage('Invalid plan name')
    // Note: No billingCycle validation since we only do monthly
  ],
  handleValidationErrors,
  SubscriptionController.createCheckoutSession
);

/**
 * @route POST /api/subscriptions/customer-portal
 * @desc Create customer portal session
 * @access Private
 */
router.post('/customer-portal',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionMiddleware.requireSubscription(['casual', 'hunter']),
  SubscriptionController.createCustomerPortal
);

/**
 * @route POST /api/subscriptions/cancel
 * @desc Cancel subscription
 * @access Private
 */
router.post('/cancel',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    body('atPeriodEnd')
      .optional()
      .isBoolean()
      .withMessage('atPeriodEnd must be a boolean')
  ],
  handleValidationErrors,
  SubscriptionMiddleware.requireSubscription(['casual', 'hunter']),
  SubscriptionController.cancelSubscription
);

/**
 * @route POST /api/subscriptions/resume
 * @desc Resume canceled subscription
 * @access Private
 */
router.post('/resume',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.resumeSubscription
);

/**
 * @route PUT /api/subscriptions/change-plan
 * @desc Change subscription plan (Monthly only)
 * @access Private
 */
router.put('/change-plan',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    body('newPlanName')
      .notEmpty()
      .withMessage('New plan name is required')
      .isIn(['casual', 'hunter'])
      .withMessage('Invalid plan name')
    // Note: No billingCycle validation since we only do monthly
  ],
  handleValidationErrors,
  SubscriptionMiddleware.requireSubscription(['casual', 'hunter']),
  SubscriptionController.changeSubscriptionPlan
);

/**
 * @route POST /api/subscriptions/preview-change
 * @desc Preview plan change (calculate costs) - Monthly only
 * @access Private
 */
router.post('/preview-change',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    body('newPlanName')
      .notEmpty()
      .withMessage('New plan name is required')
      .isIn(['casual', 'hunter'])
      .withMessage('Invalid plan name')
  ],
  handleValidationErrors,
  SubscriptionMiddleware.requireSubscription(['casual', 'hunter']),
  SubscriptionController.previewPlanChange
);

/**
 * @route POST /api/subscriptions/sync
 * @desc Sync subscription status with Stripe
 * @access Private
 */
router.post('/sync',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.syncSubscription
);

/**
 * @route GET /api/subscriptions/billing-history
 * @desc Get billing history
 * @access Private
 */
router.get('/billing-history',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  SubscriptionController.getBillingHistory
);

/**
 * @route GET /api/subscriptions/health
 * @desc Get subscription health check
 * @access Private
 */
router.get('/health',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionMiddleware.injectSubscriptionContext(),
  SubscriptionMiddleware.handleTrialPeriod(),
  SubscriptionController.getSubscriptionHealth
);

// ======================================
// ADMIN-ONLY ROUTES
// ======================================

/**
 * @route GET /api/subscriptions/analytics
 * @desc Get subscription analytics (Admin only)
 * @access Private (Admin)
 */
router.get('/analytics',
  subscriptionLimiter,
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('planTier')
      .optional()
      .isIn(['free', 'casual', 'hunter'])
      .withMessage('Invalid plan tier'),
    query('feature')
      .optional()
      .isIn(['resumeUploads', 'jobImports', 'recruiterUnlocks', 'aiConversations'])
      .withMessage('Invalid feature')
  ],
  handleValidationErrors,
  SubscriptionController.getSubscriptionAnalytics
);

/**
 * @route GET /api/subscriptions/analytics/trends/:feature
 * @desc Get feature usage trends (Admin only)
 * @access Private (Admin)
 */
router.get('/analytics/trends/:feature',
  subscriptionLimiter,
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  [
    param('feature')
      .notEmpty()
      .withMessage('Feature is required')
      .isIn(['resumeUploads', 'jobImports', 'recruiterUnlocks', 'aiConversations'])
      .withMessage('Invalid feature'),
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365')
  ],
  handleValidationErrors,
  SubscriptionController.getFeatureTrends
);

// ======================================
// EXAMPLE USAGE MIDDLEWARE INTEGRATION
// ======================================

/**
 * Example middleware usage for existing routes
 * These would be added to your existing controllers
 */

// Example: Resume upload with usage checking and tracking
// router.post('/upload', 
//   authMiddleware.protect,
//   UsageMiddleware.checkUsageLimit('resumeUploads', 1),
//   // ... existing middleware ...
//   UsageMiddleware.trackUsage('resumeUploads', 1, (req, res, body) => ({
//     fileName: body.data?.resume?.fileName,
//     fileSize: body.data?.resume?.fileSize
//   })),
//   ResumeController.uploadResume
// );

// Example: Job import with usage checking
// router.post('/import',
//   authMiddleware.protect,
//   UsageMiddleware.checkUsageLimit('jobImports', 1),
//   // ... existing middleware ...
//   UsageMiddleware.trackUsage('jobImports', 1),
//   JobController.importJob
// );

// Example: Recruiter unlock with feature and usage checking
// router.get('/:id/unlock',
//   authMiddleware.protect,
//   SubscriptionMiddleware.requireFeature('recruiterAccess'),
//   UsageMiddleware.checkUsageLimit('recruiterUnlocks', 1),
//   // ... existing middleware ...
//   UsageMiddleware.trackUsage('recruiterUnlocks', 1, (req, res, body) => ({
//     recruiterId: req.params.id,
//     recruiterName: body.data?.recruiter?.name
//   })),
//   RecruiterController.unlockRecruiter
// );

// Example: AI Assistant chat with comprehensive usage tracking
// router.post('/chat',
//   authMiddleware.protect,
//   SubscriptionMiddleware.requireFeature('aiAssistant'),
//   UsageMiddleware.checkUsageLimit('aiConversations', 1), // For new conversations
//   // ... existing middleware ...
//   UsageMiddleware.trackAIUsage(), // Special AI tracking middleware
//   AssistantController.chat
// );

// ======================================
// ERROR HANDLING MIDDLEWARE
// ======================================

// Error handling middleware for subscription routes
router.use((error, req, res, next) => {
  console.error('Subscription route error:', error);

  // Handle Stripe-specific errors
  if (error.type && error.type.includes('Stripe')) {
    return res.status(400).json({
      success: false,
      error: 'Payment processing error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }

  // Handle subscription-specific errors
  if (error.message && error.message.includes('subscription')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Handle usage limit errors
  if (error.message && error.message.includes('limit')) {
    return res.status(403).json({
      success: false,
      error: error.message,
      upgradeRequired: true,
      billingCycle: 'monthly'
    });
  }

  // Default error handling
  res.status(500).json({
    success: false,
    error: 'Subscription service error',
    details: process.env.NODE_ENV !== 'production' ? error.message : undefined
  });
});

module.exports = router;