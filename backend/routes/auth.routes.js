// backend/routes/auth.routes.js (updated with admin impersonation)
const express = require('express');
const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { 
  validateRegistration, 
  validateLogin, 
  validatePasswordReset,
  validateUpdateDetails,
  validateUpdatePassword,
  handleValidationErrors
} = require('../middleware/validation.middleware');

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, handleValidationErrors, authController.register);
router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.put('/reset-password/:token', validatePasswordReset, handleValidationErrors, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.use(protect); // All routes below this require authentication
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/resend-verification', authController.resendVerification);
router.put('/update-details', validateUpdateDetails, handleValidationErrors, authController.updateDetails);
router.put('/update-password', validateUpdatePassword, handleValidationErrors, authController.updatePassword);
router.delete('/delete-account', authController.deleteAccount);

// Admin impersonation routes (protected by admin check in controller)
router.get('/admin/users', authController.getUsers);
router.post('/admin/impersonate/:userId', authController.impersonateUser);
router.post('/admin/end-impersonation', authController.endImpersonation);

module.exports = router;