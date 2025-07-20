// backend/routes/subscription.routes.js - FIXED VERSION WITH ALL ENDPOINTS
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
 * @route GET /api/subscriptions/invoice/:invoiceId/download
 * @desc Get invoice download URL
 * @access Private
 */
router.get('/invoice/:invoiceId/download', 
  subscriptionLimiter,
  authMiddleware.protect, 
  SubscriptionController.getInvoiceDownload
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
  ],
  handleValidationErrors,
  SubscriptionController.createCheckoutSession
);

/**
 * 🔧 FIXED: Customer portal route with proper error handling
 * @route POST /api/subscriptions/customer-portal
 * @desc Create customer portal session
 * @access Private
 */
router.post('/customer-portal',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    body('returnUrl')
      .optional()
      .isURL()
      .withMessage('Return URL must be a valid URL')
  ],
  handleValidationErrors,
  SubscriptionController.createCustomerPortal
);

/**
 * 🔧 FIXED: Cancel subscription route with proper validation
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
  SubscriptionController.cancelSubscription
);

/**
 * 🔧 FIXED: Resume subscription route
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
 * @route GET /api/subscriptions/weekly-job-stats
 * @desc Get weekly job discovery statistics
 * @access Private
 */
router.get('/weekly-job-stats', 
  subscriptionLimiter,
  authMiddleware.protect,
  [
    query('weeklyLimit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Weekly limit must be between 1 and 500')
  ],
  handleValidationErrors,
  SubscriptionController.getWeeklyJobStats
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
  SubscriptionController.getSubscriptionHealth
);

/**
 * @route GET /api/subscriptions/validate
 * @desc Validate subscription data
 * @access Private
 */
router.get('/validate',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.validateSubscriptionData
);

/**
 * @route POST /api/subscriptions/fix
 * @desc Fix subscription data
 * @access Private
 */
router.post('/fix',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.fixSubscriptionData
);

/**
 * @route POST /api/subscriptions/force-sync
 * @desc Force fresh sync from Stripe
 * @access Private
 */
router.post('/force-sync',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.forceFreshSync
);

/**
 * @route GET /api/subscriptions/fresh-billing-date
 * @desc Get fresh billing date from Stripe
 * @access Private
 */
router.get('/fresh-billing-date',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.getFreshBillingDate
);

// ======================================
// WEEKLY TRACKING ROUTES
// ======================================

/**
 * @route GET /api/subscriptions/weekly-tracking-summary
 * @desc Get detailed weekly tracking summary
 * @access Private
 */
router.get('/weekly-tracking-summary',
  subscriptionLimiter,
  authMiddleware.protect,
  SubscriptionController.getWeeklyTrackingSummary
);

/**
 * @route GET /api/subscriptions/weekly-tracking-history
 * @desc Get weekly tracking history
 * @access Private
 */
router.get('/weekly-tracking-history',
  subscriptionLimiter,
  authMiddleware.protect,
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 52 })
      .withMessage('Limit must be between 1 and 52')
  ],
  handleValidationErrors,
  SubscriptionController.getWeeklyTrackingHistory
);

/**
 * @route POST /api/subscriptions/reset-weekly-tracking
 * @desc Reset weekly tracking for testing (Admin only)
 * @access Private (Admin)
 */
router.post('/reset-weekly-tracking',
  subscriptionLimiter,
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  SubscriptionController.resetWeeklyTracking
);

/**
 * @route POST /api/subscriptions/test-persistent-tracking
 * @desc Test persistent tracking functionality (Admin only)
 * @access Private (Admin)
 */
router.post('/test-persistent-tracking',
  subscriptionLimiter,
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  [
    body('jobsToAdd')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Jobs to add must be between 1 and 100'),
    body('searchName')
      .optional()
      .isString()
      .withMessage('Search name must be a string')
  ],
  handleValidationErrors,
  SubscriptionController.testPersistentTracking
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

/**
 * @route GET /api/subscriptions/admin/health-dashboard
 * @desc Get subscription health dashboard (Admin only)
 * @access Private (Admin)
 */
router.get('/admin/health-dashboard',
  subscriptionLimiter,
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  SubscriptionController.getHealthDashboard
);

/**
 * @route GET /api/subscriptions/admin/persistent-tracking-analytics
 * @desc Get persistent tracking analytics (Admin only)
 * @access Private (Admin)
 */
router.get('/admin/persistent-tracking-analytics',
  subscriptionLimiter,
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  SubscriptionController.getPersistentTrackingAnalytics
);

/**
 * @route POST /api/subscriptions/admin/bulk-fix
 * @desc Bulk fix subscription data (Admin only)
 * @access Private (Admin)
 */
router.post('/admin/bulk-fix',
  subscriptionLimiter,
  authMiddleware.protect,
  authMiddleware.restrictTo('admin'),
  [
    body('userIds')
      .optional()
      .isArray()
      .withMessage('User IDs must be an array')
  ],
  handleValidationErrors,
  SubscriptionController.bulkFixSubscriptionData
);

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