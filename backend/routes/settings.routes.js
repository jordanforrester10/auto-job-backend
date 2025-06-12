// backend/routes/settings.routes.js
const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { protect } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(protect);

// Profile management routes
router.get('/profile', settingsController.getProfile);
router.put('/profile', settingsController.updateProfile);

// Security routes
router.put('/change-password', settingsController.changePassword);
router.delete('/delete-account', settingsController.deleteAccount);

// Account verification routes
router.post('/send-verification-email', settingsController.sendVerificationEmail);
router.get('/verify-email/:token', settingsController.verifyEmail);

module.exports = router;