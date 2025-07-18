// backend/controllers/auth.controller.js - COMPLETE FILE WITH WELCOME EMAIL FIX
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/mongodb/user.model');
const sendEmail = require('../utils/send-email');
const emailTemplates = require('../utils/email-templates');

// Admin emails for impersonation feature
const ADMIN_EMAILS = [
  'jordforrester@gmail.com'
];

/**
 * Generate JWT token for a user
 * @param {Object} user User object
 * @returns {String} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already in use'
      });
    }
    
    // Create the user
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      isEmailVerified: true // TEMPORARILY SET TO TRUE FOR TESTING
    });
    
    // Generate email verification token (but don't require it for now)
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    
    // Create verification URL - FIXED TO USE PROPER FRONTEND URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;
    
    // SEND WELCOME EMAIL (SEPARATE FROM VERIFICATION)
    try {
      console.log(`📧 Sending welcome email to ${user.email}...`);
      await sendEmail({
        email: user.email,
        subject: `🎉 Welcome to Auto-Job.ai, ${user.firstName}!`,
        html: emailTemplates.generateWelcomeEmail(user.firstName)
      });
      console.log('✅ Welcome email sent successfully');
    } catch (welcomeEmailError) {
      console.error('❌ Failed to send welcome email:', welcomeEmailError.message);
      // Don't fail registration due to welcome email issues
    }
    
    // Try to send verification email, but don't fail registration if it fails
    try {
      console.log(`📧 Sending verification email to ${user.email}...`);
      await sendEmail({
        email: user.email,
        subject: 'Email Verification - Auto-Job.ai',
        html: emailTemplates.generateEmailVerificationEmail(user.firstName, verificationUrl)
      });
      console.log('✅ Verification email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError.message);
      // Don't fail registration due to email issues
    }
    
    // Generate token
    const token = generateToken(user);
    
    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };
    
    res.cookie('token', token, cookieOptions);
    
    // Remove password from response
    user.password = undefined;
    
    res.status(201).json({
      success: true,
      token,
      data: {
        user,
        message: 'Registration successful! Welcome email and verification email sent to your inbox.'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed: ' + error.message
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password'
      });
    }
    
    // Check for user
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +loginAttempts +lockUntil');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Check if account is locked
    if (user.isLocked()) {
      return res.status(401).json({
        success: false,
        error: 'Account is temporarily locked. Please try again later.'
      });
    }
    
    // Check if password matches
    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      // Increment login attempts
      await user.incrementLoginAttempts();
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }
    
    // Reset login attempts on successful login
    await user.resetLoginAttempts();
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    
    // Generate token
    const token = generateToken(user);
    
    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };
    
    res.cookie('token', token, cookieOptions);
    
    // Remove password and security fields from response
    user.password = undefined;
    user.loginAttempts = undefined;
    user.lockUntil = undefined;
    
    res.status(200).json({
      success: true,
      token,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed: ' + error.message
    });
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  });
};

/**
 * Verify email
 * @route GET /api/auth/verify-email/:token
 * @access Public
 */
exports.verifyEmail = async (req, res) => {
  try {
    // Get hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    // Find user by verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Set email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };
    
    res.cookie('token', token, cookieOptions);
    
    res.status(200).json({
      success: true,
      token,
      data: {
        message: 'Email verified successfully'
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed'
    });
  }
};

/**
 * Resend verification email
 * @route POST /api/auth/resend-verification
 * @access Private
 */
exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email already verified'
      });
    }
    
    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save({ validateBeforeSave: false });
    
    // Create verification URL - FIXED TO USE PROPER FRONTEND URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${verificationToken}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Email Verification',
        html: emailTemplates.generateEmailVerificationEmail(user.firstName, verificationUrl)
      });
      
      res.status(200).json({
        success: true,
        data: {
          message: 'Verification email sent. Please check your inbox.'
        }
      });
    } catch (error) {
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        error: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email'
    });
  }
};

/**
 * Forgot password - FIXED TO USE PROPER FRONTEND URL
 * @route POST /api/auth/forgot-password
 * @access Public
 */
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email?.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'There is no user with this email'
      });
    }
    
    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });
    
    // Create reset URL - FIXED TO USE PROPER FRONTEND URL
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
    
    console.log('Generated reset URL:', resetUrl); // Debug log
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset',
        html: emailTemplates.generatePasswordResetEmail(user.firstName, resetUrl)
      });
      
      res.status(200).json({
        success: true,
        data: {
          message: 'Password reset email sent. Please check your inbox.'
        }
      });
    } catch (error) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        error: 'Email could not be sent'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Forgot password request failed'
    });
  }
};

/**
 * Reset password
 * @route PUT /api/auth/reset-password/:token
 * @access Public
 */
exports.resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    // Find user by reset token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };
    
    res.cookie('token', token, cookieOptions);
    
    res.status(200).json({
      success: true,
      token,
      data: {
        message: 'Password reset successful'
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Password reset failed'
    });
  }
};

/**
 * Get current logged in user
 * @route GET /api/auth/me
 * @access Private
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user data'
    });
  }
};

/**
 * Update user details
 * @route PUT /api/auth/update-details
 * @access Private
 */
exports.updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber,
      location: req.body.location,
      socialProfiles: req.body.socialProfiles
    };
    
    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Update details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user details'
    });
  }
};

/**
 * Update password
 * @route PUT /api/auth/update-password
 * @access Private
 */
exports.updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Set new password
    user.password = req.body.newPassword;
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    // Set cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + (process.env.JWT_COOKIE_EXPIRE || 30) * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };
    
    res.cookie('token', token, cookieOptions);
    
    res.status(200).json({
      success: true,
      token,
      data: {
        message: 'Password updated successfully'
      }
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update password'
    });
  }
};

/**
 * Delete user account
 * @route DELETE /api/auth/delete-account
 * @access Private
 */
exports.deleteAccount = async (req, res) => {
  try {
    // Soft delete - set active to false
    await User.findByIdAndUpdate(req.user.id, {
      active: false
    });
    
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });
    
    res.status(200).json({
      success: true,
      data: {
        message: 'Account deactivated successfully'
      }
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
};

/**
 * Admin impersonate user
 * @route POST /api/auth/admin/impersonate/:userId
 * @access Private (Admin only)
 */
exports.impersonateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user; // From auth middleware

    // Verify admin privileges
    if (!ADMIN_EMAILS.includes(adminUser.email)) {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      });
    }

    // Find the user to impersonate
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Create impersonation token with special claims
    const impersonationPayload = {
      id: targetUser._id,
      email: targetUser.email,
      role: targetUser.role,
      isImpersonating: true,
      impersonatedBy: adminUser.email,
      originalAdminId: adminUser.id
    };

    const impersonationToken = jwt.sign(
      impersonationPayload,
      process.env.JWT_SECRET,
      { expiresIn: '2h' } // Shorter expiry for security
    );

    // Log impersonation for audit trail
    console.log(`🔐 ADMIN IMPERSONATION: ${adminUser.email} is impersonating ${targetUser.email} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      token: impersonationToken,
      data: {
        user: {
          _id: targetUser._id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          subscriptionTier: targetUser.subscriptionTier,
          currentUsage: targetUser.currentUsage,
          isImpersonating: true,
          impersonatedBy: adminUser.email
        }
      }
    });

  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to impersonate user'
    });
  }
};

/**
 * End admin impersonation
 * @route POST /api/auth/admin/end-impersonation
 * @access Private (Admin impersonation only)
 */
exports.endImpersonation = async (req, res) => {
  try {
    const currentUser = req.user;

    // Verify this is an impersonation session
    if (!currentUser.isImpersonating || !currentUser.originalAdminId) {
      return res.status(400).json({
        success: false,
        error: 'Not in impersonation mode'
      });
    }

    // Find the original admin user
    const adminUser = await User.findById(currentUser.originalAdminId);
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        error: 'Original admin user not found'
      });
    }

    // Create new admin token
    const adminToken = generateToken(adminUser);

    // Log end of impersonation
    console.log(`🔐 END IMPERSONATION: ${currentUser.impersonatedBy} ended impersonation of ${currentUser.email} at ${new Date().toISOString()}`);

    res.status(200).json({
      success: true,
      token: adminToken,
      data: {
        user: {
          _id: adminUser._id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          subscriptionTier: adminUser.subscriptionTier,
          currentUsage: adminUser.currentUsage
        }
      }
    });

  } catch (error) {
    console.error('End impersonation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to end impersonation'
    });
  }
};

/**
 * Get users list for admin
 * @route GET /api/auth/admin/users
 * @access Private (Admin only)
 */
exports.getUsers = async (req, res) => {
  try {
    const adminUser = req.user;

    // Verify admin privileges
    if (!ADMIN_EMAILS.includes(adminUser.email)) {
      return res.status(403).json({
        success: false,
        error: 'Admin privileges required'
      });
    }

    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = search ? {
      $or: [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ]
    } : {};

    const users = await User.find(searchQuery)
      .select('_id email firstName lastName subscriptionTier createdAt lastLogin')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: skip + users.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};