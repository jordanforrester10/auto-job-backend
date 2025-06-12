// backend/routes/search.routes.js
const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/search.controller');
const { protect } = require('../middleware/auth.middleware');

/**
 * Search Routes
 * All routes require authentication
 */

// @desc    Global search across all content types
// @route   GET /api/search
// @access  Private
// @params  query (required), category (optional: all|jobs|resumes|recruiters), limit (optional)
router.get('/', protect, SearchController.globalSearch);

// @desc    Get search suggestions as user types
// @route   GET /api/search/suggestions
// @access  Private
// @params  query (required), limit (optional)
router.get('/suggestions', protect, SearchController.getSearchSuggestions);

// @desc    Get popular/trending searches
// @route   GET /api/search/popular
// @access  Private
router.get('/popular', protect, SearchController.getPopularSearches);

module.exports = router;