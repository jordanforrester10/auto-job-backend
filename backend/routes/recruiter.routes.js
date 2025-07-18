// backend/routes/recruiter.routes.js - UPDATED WITH H1B FUNCTIONALITY
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const recruiterController = require('../controllers/recruiter.controller');

// Simple validation middleware (since we don't have express-validator setup)
const validate = (req, res, next) => {
  // For now, just pass through - we can add validation later
  next();
};

// ===================================================================
// VALIDATION MIDDLEWARE (Simplified for now)
// ===================================================================

const validateSearch = [validate];
const validateRecruiterParams = [validate];
const validateOutreachCreation = [validate];
const validateMessageGeneration = [validate];
const validateOutreachParams = [validate];
const validateUnlockParams = [validate];
const validateH1BParams = [validate]; // NEW: validation for H1B endpoints

// ===================================================================
// SPECIFIC ROUTES (MUST COME BEFORE PARAMETERIZED ROUTES)
// ===================================================================

/**
 * @route   GET /api/recruiters/search
 * @desc    Search recruiters with advanced filtering (including H1B filter)
 * @access  Private
 */
router.get('/search', protect, validateSearch, recruiterController.searchRecruiters);

/**
 * @route   GET /api/recruiters/filters
 * @desc    Get available filter options for recruiter search (including H1B data)
 * @access  Private
 */
router.get('/filters', protect, recruiterController.getFilterOptions);

/**
 * @route   GET /api/recruiters/analytics
 * @desc    Get outreach analytics and performance metrics
 * @access  Private
 */
router.get('/analytics', protect, recruiterController.getOutreachAnalytics);

/**
 * @route   POST /api/recruiters/generate-message
 * @desc    Generate AI-powered personalized message
 * @access  Private
 */
router.post('/generate-message', protect, validateMessageGeneration, recruiterController.generatePersonalizedMessage);

// ===================================================================
// NEW: H1B COMPANY ROUTES
// ===================================================================

/**
 * @route   GET /api/recruiters/h1b-companies
 * @desc    Search H1B sponsor companies
 * @access  Private
 * @query   query, industry, state, employeeRange, limit, offset
 */
router.get('/h1b-companies', protect, validateH1BParams, recruiterController.searchH1BCompanies);

/**
 * @route   GET /api/recruiters/h1b-company/:companyName
 * @desc    Get detailed H1B company information by name
 * @access  Private
 * @param   companyName - URL encoded company name
 */
router.get('/h1b-company/:companyName', protect, validateH1BParams, recruiterController.getH1BCompanyInfo);

// ===================================================================
// OUTREACH MANAGEMENT ROUTES (SPECIFIC PATHS)
// ===================================================================

/**
 * @route   GET /api/recruiters/outreach
 * @desc    Get user's outreach campaigns
 * @access  Private
 */
router.get('/outreach', protect, recruiterController.getUserOutreach);

/**
 * @route   POST /api/recruiters/outreach
 * @desc    Create a new outreach campaign
 * @access  Private
 */
router.post('/outreach', protect, validateOutreachCreation, recruiterController.createOutreach);

/**
 * @route   PUT /api/recruiters/outreach/:outreachId/send
 * @desc    Send a drafted outreach message
 * @access  Private
 */
router.put('/outreach/:outreachId/send', protect, validateOutreachParams, recruiterController.sendOutreach);

/**
 * @route   PUT /api/recruiters/outreach/:outreachId
 * @desc    Update an outreach campaign
 * @access  Private
 */
router.put('/outreach/:outreachId', protect, validateOutreachParams, recruiterController.updateOutreach);

/**
 * @route   DELETE /api/recruiters/outreach/:outreachId
 * @desc    Delete an outreach campaign
 * @access  Private
 */
router.delete('/outreach/:outreachId', protect, validateOutreachParams, recruiterController.deleteOutreach);

// ===================================================================
// FUTURE IMPLEMENTATION ROUTES (SPECIFIC PATHS)
// ===================================================================

/**
 * @route   GET /api/recruiters/campaigns
 * @desc    Get outreach campaigns
 * @access  Private
 * @note    Future implementation for campaign management
 */
router.get('/campaigns', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Campaign management feature coming soon',
    feature: 'campaign_management'
  });
});

/**
 * @route   POST /api/recruiters/bulk-outreach
 * @desc    Create bulk outreach to multiple recruiters
 * @access  Private
 * @note    Future implementation for bulk messaging
 */
router.post('/bulk-outreach', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Bulk outreach feature coming soon',
    feature: 'bulk_messaging'
  });
});

/**
 * @route   GET /api/recruiters/recommendations
 * @desc    Get AI-recommended recruiters based on user profile
 * @access  Private
 * @note    Future implementation for AI recommendations
 */
router.get('/recommendations', protect, (req, res) => {
  res.json({
    success: true,
    message: 'AI recruiter recommendations coming soon',
    feature: 'ai_recommendations'
  });
});

/**
 * NEW: @route   GET /api/recruiters/h1b-stats
 * @desc    Get H1B sponsor statistics and insights
 * @access  Private
 * @note    Future implementation for H1B analytics
 */
router.get('/h1b-stats', protect, (req, res) => {
  res.json({
    success: true,
    message: 'H1B statistics and insights feature coming soon',
    feature: 'h1b_analytics',
    plannedFeatures: [
      'Top H1B sponsoring industries',
      'H1B approval rates by company',
      'Geographical distribution of H1B sponsors',
      'H1B sponsorship trends over time'
    ]
  });
});

// ===================================================================
// PARAMETERIZED ROUTES (MUST COME AFTER ALL SPECIFIC ROUTES)
// ===================================================================

/**
 * @route   GET /api/recruiters/:recruiterId
 * @desc    Get detailed recruiter information (with H1B company info if applicable)
 * @access  Private
 */
router.get('/:recruiterId', protect, validateRecruiterParams, recruiterController.getRecruiterById);

/**
 * @route   POST /api/recruiters/:recruiterId/unlock
 * @desc    Unlock recruiter details for casual plan users
 * @access  Private
 * @note    Costs 1 recruiter unlock credit for casual users
 */
router.post('/:recruiterId/unlock', protect, validateUnlockParams, recruiterController.unlockRecruiter);

// ===================================================================
// ADVANCED OUTREACH FEATURES (Future Implementation)
// ===================================================================

/**
 * @route   POST /api/recruiters/outreach/:outreachId/reply
 * @desc    Record a reply to an outreach message
 * @access  Private
 * @note    Future implementation for reply tracking
 */
router.post('/outreach/:outreachId/reply', protect, validateOutreachParams, (req, res) => {
  res.json({
    success: true,
    message: 'Reply tracking feature coming soon',
    feature: 'reply_tracking'
  });
});

/**
 * @route   POST /api/recruiters/outreach/:outreachId/follow-up
 * @desc    Create a follow-up message
 * @access  Private
 * @note    Future implementation for automated follow-ups
 */
router.post('/outreach/:outreachId/follow-up', protect, validateOutreachParams, (req, res) => {
  res.json({
    success: true,
    message: 'Automated follow-up feature coming soon',
    feature: 'automated_follow_ups'
  });
});

// ===================================================================
// RECRUITER UNLOCK MANAGEMENT (Future Implementation)
// ===================================================================

/**
 * @route   GET /api/recruiters/:recruiterId/unlock-status
 * @desc    Check if recruiter is unlocked for current user
 * @access  Private
 * @note    Future implementation for unlock status checking
 */
router.get('/:recruiterId/unlock-status', protect, validateRecruiterParams, (req, res) => {
  res.json({
    success: true,
    message: 'Unlock status checking feature coming soon',
    feature: 'unlock_status_check'
  });
});

/**
 * @route   GET /api/recruiters/unlocked/list
 * @desc    Get list of all unlocked recruiters for current user
 * @access  Private
 * @note    Future implementation for unlocked recruiters list
 */
router.get('/unlocked/list', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Unlocked recruiters list feature coming soon',
    feature: 'unlocked_list'
  });
});

// ===================================================================
// NEW: H1B-SPECIFIC ADVANCED FEATURES (Future Implementation)
// ===================================================================

/**
 * @route   GET /api/recruiters/h1b-trends
 * @desc    Get H1B sponsorship trends and analysis
 * @access  Private
 * @note    Future implementation for H1B trend analysis
 */
router.get('/h1b-trends', protect, (req, res) => {
  res.json({
    success: true,
    message: 'H1B trends analysis feature coming soon',
    feature: 'h1b_trends',
    plannedFeatures: [
      'Year-over-year H1B application trends',
      'Industry-wise H1B sponsorship changes',
      'Geographic shifts in H1B sponsorship',
      'Company size vs H1B sponsorship correlation'
    ]
  });
});

/**
 * @route   POST /api/recruiters/h1b-alerts
 * @desc    Set up alerts for new H1B sponsor companies
 * @access  Private
 * @note    Future implementation for H1B sponsorship alerts
 */
router.post('/h1b-alerts', protect, (req, res) => {
  res.json({
    success: true,
    message: 'H1B sponsorship alerts feature coming soon',
    feature: 'h1b_alerts',
    plannedFeatures: [
      'New H1B sponsor company notifications',
      'Industry-specific H1B alerts',
      'Location-based H1B sponsorship updates',
      'Custom H1B criteria matching alerts'
    ]
  });
});

// ===================================================================
// ERROR HANDLING
// ===================================================================

// Handle 404 for recruiter routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Recruiter API endpoint not found',
    suggestion: 'Check the API documentation for available recruiter endpoints',
    requestedPath: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /api/recruiters/search - Search recruiters (with H1B filter)',
      'GET /api/recruiters/filters - Get filter options (includes H1B data)',
      'GET /api/recruiters/analytics - Get analytics',
      'POST /api/recruiters/generate-message - Generate AI message',
      'GET /api/recruiters/h1b-companies - Search H1B companies (NEW)',
      'GET /api/recruiters/h1b-company/:name - Get H1B company info (NEW)',
      'GET /api/recruiters/outreach - Get outreach campaigns',
      'POST /api/recruiters/outreach - Create outreach',
      'PUT /api/recruiters/outreach/:id - Update outreach',
      'DELETE /api/recruiters/outreach/:id - Delete outreach',
      'PUT /api/recruiters/outreach/:id/send - Send outreach',
      'GET /api/recruiters/:id - Get recruiter details (with H1B info)',
      'POST /api/recruiters/:id/unlock - Unlock recruiter'
    ]
  });
});

module.exports = router;