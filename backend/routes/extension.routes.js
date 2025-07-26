// backend/routes/extension.routes.js
const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { checkSubscriptionAccess } = require('../middleware/subscription.middleware');
const {
  checkExtensionAuth,
  getExtensionResumes,
  processAutoFill,
  enhanceField,
  getExtensionUsage,
  checkExtensionUsage
} = require('../controllers/extension.controller');

const router = express.Router();

// All extension routes require authentication
router.use(protect);

// Extension authentication check
router.get('/auth/check', checkExtensionAuth);

// Resume management for extension
router.get('/resumes', getExtensionResumes);

// Auto-fill functionality
router.post('/autofill', processAutoFill);

// AI field enhancement
router.post('/enhance-field', enhanceField);

// Usage tracking and limits
router.get('/usage', getExtensionUsage);
router.post('/check-usage', checkExtensionUsage);

module.exports = router;