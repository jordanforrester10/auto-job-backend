// backend/models/mongodb/user.model.js
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

const User = mongoose.model('User', userSchema);

module.exports = User;