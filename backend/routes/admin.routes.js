// backend/routes/admin.routes.js - CORRECTED VERSION
const express = require('express');
const router = express.Router();

// Import admin controller using the simple function exports
const adminController = require('../controllers/admin.controller');

// Import auth middleware - use the 'protect' function specifically
const { protect } = require('../middleware/auth.middleware');

// Admin middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
  console.log('🔍 Admin middleware check for user:', req.user?.email);
  
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  if (req.user.email !== 'jordforrester@gmail.com') {
    console.log('❌ Admin access denied for user:', req.user.email);
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  console.log('✅ Admin access granted for user:', req.user.email);
  next();
};

// Apply authentication middleware to all admin routes
router.use(protect);

// Apply admin middleware to all routes
router.use(adminMiddleware);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard data with all users and their stats
 * @access  Private (Admin only)
 */
router.get('/dashboard', adminController.getDashboardData);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get detailed information about a specific user
 * @access  Private (Admin only)
 */
router.get('/users/:userId', adminController.getUserDetail);

/**
 * @route   PUT /api/admin/users/:userId/subscription
 * @desc    Update user's subscription (admin action)
 * @access  Private (Admin only)
 */
router.put('/users/:userId/subscription', adminController.updateUserSubscription);

/**
 * @route   GET /api/admin/stats
 * @desc    Get system-wide statistics and analytics
 * @access  Private (Admin only)
 */
router.get('/stats', adminController.getSystemStats);

module.exports = router;