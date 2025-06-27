// backend/models/mongodb/user.model.js - UPDATED WITH SUBSCRIPTION FIELDS
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Changed from 'bcrypt' to 'bcryptjs'
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [8, 'Password should be at least 8 characters'],
    select: false // Don't return password by default
  },
  firstName: {
    type: String,
    required: [true, 'Please provide your first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please provide your last name'],
    trim: true
  },
  profilePicture: {
    type: String
  },
  location: {
    city: String,
    state: String,
    country: String
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  socialProfiles: {
    linkedin: String,
    github: String,
    portfolio: String
  },
  preferences: {
    jobTypes: [String],
    industries: [String],
    locations: [{
      city: String,
      state: String,
      country: String,
      remote: Boolean
    }],
    salaryRange: {
      min: Number,
      max: Number,
      currency: String
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      jobAlerts: {
        type: Boolean,
        default: true
      }
    }
  },
  accountType: {
    type: String,
    enum: ['Free', 'Basic', 'Premium'],
    default: 'Free'
  },
  
  // ======================================
  // NEW SUBSCRIPTION FIELDS START HERE
  // ======================================
  
  subscriptionTier: {
    type: String,
    enum: ['free', 'casual', 'hunter'],
    default: 'free'
  },
  stripeCustomerId: {
    type: String,
    sparse: true // Allow multiple documents with null values
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing', 'incomplete'],
    default: 'active'
  },
  subscriptionEndDate: {
    type: Date
  },
  subscriptionStartDate: {
    type: Date
  },
  trialEndDate: {
    type: Date
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  currentUsage: {
    resumeUploads: { type: Number, default: 0 },
    resumeAnalysis: { type: Number, default: 0 },
    jobImports: { type: Number, default: 0 },
    resumeTailoring: { type: Number, default: 0 },
    recruiterUnlocks: { type: Number, default: 0 },
    aiJobDiscovery: { type: Number, default: 0 },
    aiConversations: { type: Number, default: 0 },
    aiMessagesTotal: { type: Number, default: 0 },
    resetDate: { type: Date, default: Date.now }
  },
  usageHistory: [{
    month: { type: Date, required: true },
    usage: {
      resumeUploads: { type: Number, default: 0 },
      resumeAnalysis: { type: Number, default: 0 },
      jobImports: { type: Number, default: 0 },
      resumeTailoring: { type: Number, default: 0 },
      recruiterUnlocks: { type: Number, default: 0 },
      aiJobDiscovery: { type: Number, default: 0 },
      aiConversations: { type: Number, default: 0 },
      aiMessagesTotal: { type: Number, default: 0 }
    }
  }],
  
  // ======================================
  // END OF NEW SUBSCRIPTION FIELDS
  // ======================================
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  // Create a token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Set expiration (24 hours)
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  // Create a token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  
  // Set expiration (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  return token;
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Increment login attempts and lock account if needed
userSchema.methods.incrementLoginAttempts = async function() {
  // If previous lock has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Otherwise increment login attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock the account if we've reached max attempts (5) and it's not locked
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    // Lock for 1 hour
    updates.$set = { lockUntil: Date.now() + 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// ======================================
// NEW SUBSCRIPTION METHODS START HERE
// ======================================

// Get current subscription plan limits
userSchema.methods.getPlanLimits = function() {
  const PLAN_LIMITS = {
    free: {
      resumeUploads: 1,
      resumeAnalysis: 1,
      jobImports: 3,
      resumeTailoring: 1,
      recruiterAccess: false,
      recruiterUnlocks: 0,
      aiJobDiscovery: false,
      aiAssistant: false,
      aiConversations: 0,
      aiMessagesPerConversation: 0
    },
    casual: {
      resumeUploads: 5,
      resumeAnalysis: 5,
      jobImports: 25,
      resumeTailoring: 25,
      recruiterAccess: true,
      recruiterUnlocks: 25,
      aiJobDiscovery: 1,
      aiAssistant: false,
      aiConversations: 0,
      aiMessagesPerConversation: 0
    },
    hunter: {
      resumeUploads: -1, // unlimited
      resumeAnalysis: -1, // unlimited
      jobImports: -1, // unlimited
      resumeTailoring: 50,
      recruiterAccess: true,
      recruiterUnlocks: -1, // unlimited
      aiJobDiscovery: -1, // unlimited
      aiAssistant: true,
      aiConversations: 5,
      aiMessagesPerConversation: 20
    }
  };
  
  return PLAN_LIMITS[this.subscriptionTier] || PLAN_LIMITS.free;
};

// Check if user can perform a specific action
userSchema.methods.canPerformAction = function(action, quantity = 1) {
  const limits = this.getPlanLimits();
  const usage = this.currentUsage || {};
  
  // Check if feature is available for this plan
  if (action === 'recruiterAccess' && !limits.recruiterAccess) {
    return { allowed: false, reason: 'Recruiter access not available in your plan' };
  }
  
  if (action === 'aiAssistant' && !limits.aiAssistant) {
    return { allowed: false, reason: 'AI Assistant not available in your plan' };
  }
  
  if (action === 'aiJobDiscovery' && !limits.aiJobDiscovery) {
    return { allowed: false, reason: 'AI Job Discovery not available in your plan' };
  }
  
  // Check usage limits
  const limit = limits[action];
  if (limit === -1) {
    return { allowed: true }; // Unlimited
  }
  
  if (limit === 0) {
    return { allowed: false, reason: 'Feature not available in your plan' };
  }
  
  const currentUsed = usage[action] || 0;
  if (currentUsed + quantity > limit) {
    return { 
      allowed: false, 
      reason: `Usage limit exceeded. You have used ${currentUsed}/${limit} for this month`,
      current: currentUsed,
      limit: limit
    };
  }
  
  return { 
    allowed: true, 
    remaining: limit - currentUsed - quantity,
    current: currentUsed,
    limit: limit
  };
};

// Track usage for a specific action
userSchema.methods.trackUsage = async function(action, quantity = 1) {
  const now = new Date();
  const resetDate = this.currentUsage?.resetDate || new Date();
  
  // Check if we need to reset monthly usage
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    // Archive current usage to history
    if (this.currentUsage && Object.keys(this.currentUsage).length > 1) {
      this.usageHistory.push({
        month: resetDate,
        usage: { ...this.currentUsage }
      });
      
      // Keep only last 12 months of history
      if (this.usageHistory.length > 12) {
        this.usageHistory = this.usageHistory.slice(-12);
      }
    }
    
    // Reset current usage
    this.currentUsage = {
      resumeUploads: 0,
      resumeAnalysis: 0,
      jobImports: 0,
      resumeTailoring: 0,
      recruiterUnlocks: 0,
      aiJobDiscovery: 0,
      aiConversations: 0,
      aiMessagesTotal: 0,
      resetDate: now
    };
  }
  
  // Initialize currentUsage if it doesn't exist
  if (!this.currentUsage) {
    this.currentUsage = {
      resumeUploads: 0,
      resumeAnalysis: 0,
      jobImports: 0,
      resumeTailoring: 0,
      recruiterUnlocks: 0,
      aiJobDiscovery: 0,
      aiConversations: 0,
      aiMessagesTotal: 0,
      resetDate: now
    };
  }
  
  // Update usage
  this.currentUsage[action] = (this.currentUsage[action] || 0) + quantity;
  this.currentUsage.resetDate = now;
  
  return this.save();
};

// Get usage statistics
userSchema.methods.getUsageStats = function() {
  const limits = this.getPlanLimits();
  const usage = this.currentUsage || {};
  
  const stats = {};
  
  Object.keys(limits).forEach(action => {
    if (typeof limits[action] === 'number') {
      const limit = limits[action];
      const used = usage[action] || 0;
      
      stats[action] = {
        used,
        limit,
        unlimited: limit === -1,
        percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
        remaining: limit > 0 ? Math.max(0, limit - used) : -1
      };
    }
  });
  
  return stats;
};

// Check if subscription is active and valid
userSchema.methods.hasActiveSubscription = function() {
  if (this.subscriptionTier === 'free') return true;
  
  const now = new Date();
  return (
    this.subscriptionStatus === 'active' &&
    (!this.subscriptionEndDate || this.subscriptionEndDate > now)
  );
};

// ======================================
// END OF NEW SUBSCRIPTION METHODS
// ======================================

const User = mongoose.model('User', userSchema);

module.exports = User;