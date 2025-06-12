// backend/routes/recruiter.routes.js - FIXED ROUTE ORDERING
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

// ===================================================================
// SPECIFIC ROUTES (MUST COME BEFORE PARAMETERIZED ROUTES)
// ===================================================================

/**
 * @route   GET /api/recruiters/search
 * @desc    Search recruiters with advanced filtering
 * @access  Private
 */
router.get('/search', protect, validateSearch, recruiterController.searchRecruiters);

/**
 * @route   GET /api/recruiters/filters
 * @desc    Get available filter options for recruiter search
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

// ===================================================================
// PARAMETERIZED ROUTES (MUST COME AFTER ALL SPECIFIC ROUTES)
// ===================================================================

/**
 * @route   GET /api/recruiters/:recruiterId
 * @desc    Get detailed recruiter information
 * @access  Private
 */
router.get('/:recruiterId', protect, validateRecruiterParams, recruiterController.getRecruiterById);

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
      'GET /api/recruiters/search - Search recruiters',
      'GET /api/recruiters/filters - Get filter options',
      'GET /api/recruiters/analytics - Get analytics',
      'POST /api/recruiters/generate-message - Generate AI message',
      'GET /api/recruiters/outreach - Get outreach campaigns',
      'POST /api/recruiters/outreach - Create outreach',
      'PUT /api/recruiters/outreach/:id - Update outreach',
      'DELETE /api/recruiters/outreach/:id - Delete outreach',
      'PUT /api/recruiters/outreach/:id/send - Send outreach',
      'GET /api/recruiters/:id - Get recruiter details'
    ]
  });
});

module.exports = router;