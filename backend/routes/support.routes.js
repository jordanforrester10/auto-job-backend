// backend/routes/support.routes.js
const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth.middleware');
const { 
  submitSupportRequest,
  getSupportCategories 
} = require('../controllers/support.controller');

// Apply optional authentication (works for both authenticated and non-authenticated users)
router.use(optionalAuth);

// POST /api/support/contact - Submit support request
router.post('/contact', submitSupportRequest);

// GET /api/support/categories - Get support categories
router.get('/categories', getSupportCategories);

module.exports = router;