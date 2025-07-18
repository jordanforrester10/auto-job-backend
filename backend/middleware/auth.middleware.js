// backend/middleware/auth.middleware.js - Updated with Impersonation Support
const jwt = require('jsonwebtoken');
const User = require('../models/mongodb/user.model');

/**
 * Middleware to protect routes that require authentication
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Also check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route - no token provided'
      });
    }
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if this is an impersonation token
      if (decoded.isImpersonating) {
        // For impersonation tokens, use the decoded data directly
        // but still verify the target user exists
        const targetUser = await User.findById(decoded.id);
        
        if (!targetUser) {
          return res.status(401).json({
            success: false,
            error: 'Impersonated user no longer exists'
          });
        }
        
        if (!targetUser.active) {
          return res.status(401).json({
            success: false,
            error: 'Impersonated user account has been deactivated'
          });
        }
        
        // Create impersonation user object with special properties
        req.user = {
          _id: targetUser._id,
          id: targetUser._id,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          role: targetUser.role,
          subscriptionTier: targetUser.subscriptionTier,
          currentUsage: targetUser.currentUsage,
          active: targetUser.active,
          isEmailVerified: targetUser.isEmailVerified,
          // Impersonation specific fields
          isImpersonating: true,
          impersonatedBy: decoded.impersonatedBy,
          originalAdminId: decoded.originalAdminId
        };
        
        req.userId = targetUser._id;
        
        console.log(`🔐 Impersonation request: ${decoded.impersonatedBy} acting as ${targetUser.email}`);
        return next();
      }
      
      // For normal tokens, find the user by ID
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'The user belonging to this token no longer exists'
        });
      }
      
      // Check if user is active
      if (!user.active) {
        return res.status(401).json({
          success: false,
          error: 'This account has been deactivated'
        });
      }
      
      // TEMPORARILY DISABLED EMAIL VERIFICATION CHECK FOR DEBUGGING
      // TODO: Re-enable this after login is working
      /*
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          error: 'Please verify your email to access this resource'
        });
      }
      */
      
      // Set user in request object
      req.user = user;
      req.userId = user._id; // Add this for compatibility
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication server error'
    });
  }
};

/**
 * Middleware to restrict access based on user role
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};

/**
 * Middleware to check if email is verified
 * Soft check - allows request but adds verified status to req object
 */
exports.checkEmailVerification = async (req, res, next) => {
  try {
    if (req.user && !req.user.isEmailVerified) {
      req.isEmailVerified = false;
    } else {
      req.isEmailVerified = true;
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 * Useful for routes that work for both authenticated and non-authenticated users
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Also check for token in cookies
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    if (token) {
      try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Handle impersonation tokens in optional auth too
        if (decoded.isImpersonating) {
          const targetUser = await User.findById(decoded.id);
          
          if (targetUser && targetUser.active) {
            req.user = {
              _id: targetUser._id,
              id: targetUser._id,
              email: targetUser.email,
              firstName: targetUser.firstName,
              lastName: targetUser.lastName,
              role: targetUser.role,
              subscriptionTier: targetUser.subscriptionTier,
              currentUsage: targetUser.currentUsage,
              active: targetUser.active,
              isEmailVerified: targetUser.isEmailVerified,
              isImpersonating: true,
              impersonatedBy: decoded.impersonatedBy,
              originalAdminId: decoded.originalAdminId
            };
            req.userId = targetUser._id;
            req.isAuthenticated = true;
          }
        } else {
          // Find the user by ID for normal tokens
          const user = await User.findById(decoded.id);
          
          if (user && user.active) {
            req.user = user;
            req.userId = user._id;
            req.isAuthenticated = true;
          }
        }
      } catch (jwtError) {
        // Token is invalid, but that's okay for optional auth
        console.log('Optional auth - invalid token:', jwtError.message);
      }
    }
    
    // Always continue regardless of token validity
    next();
  } catch (error) {
    // Even if there's an error, continue (optional auth)
    console.error('Optional auth middleware error:', error);
    next();
  }
};