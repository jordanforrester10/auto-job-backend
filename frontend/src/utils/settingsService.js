// src/utils/settingsService.js
import api from './axios';

const settingsService = {
  /**
   * Get user profile information
   */
  getProfile: async () => {
    try {
      console.log('📋 Fetching user profile...');
      const response = await api.get('/settings/profile');
      console.log('✅ Profile fetched successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Get profile error:', error);
      throw error;
    }
  },

  /**
   * Update user profile information
   */
  updateProfile: async (profileData) => {
    try {
      console.log('📝 Updating user profile...', profileData);
      const response = await api.put('/settings/profile', profileData);
      console.log('✅ Profile updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      throw error;
    }
  },

  /**
   * Change user password
   */
  changePassword: async (passwordData) => {
    try {
      console.log('🔒 Changing password...');
      const response = await api.put('/settings/change-password', passwordData);
      console.log('✅ Password changed successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Change password error:', error);
      throw error;
    }
  },

  /**
   * Delete user account
   */
  deleteAccount: async (confirmationData = {}) => {
    try {
      console.log('🗑️ Deleting account...');
      const response = await api.delete('/settings/delete-account', {
        data: confirmationData
      });
      console.log('✅ Account deleted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Delete account error:', error);
      throw error;
    }
  },

  /**
   * Send email verification
   */
  sendVerificationEmail: async () => {
    try {
      console.log('📧 Sending verification email...');
      const response = await api.post('/settings/send-verification-email');
      console.log('✅ Verification email sent');
      return response.data;
    } catch (error) {
      console.error('❌ Send verification email error:', error);
      throw error;
    }
  },

  /**
   * Verify email address
   */
  verifyEmail: async (token) => {
    try {
      console.log('✉️ Verifying email...');
      const response = await api.get(`/settings/verify-email/${token}`);
      console.log('✅ Email verified successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Verify email error:', error);
      throw error;
    }
  },

  /**
   * Validate profile data before submission
   */
  validateProfileData: (profileData) => {
    const errors = [];

    // Required fields
    if (!profileData.firstName?.trim()) {
      errors.push('First name is required');
    }

    if (!profileData.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (!profileData.email?.trim()) {
      errors.push('Email address is required');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (profileData.email && !emailRegex.test(profileData.email)) {
      errors.push('Please enter a valid email address');
    }

    // Phone number validation (optional)
    if (profileData.phoneNumber) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(profileData.phoneNumber.replace(/\D/g, ''))) {
        errors.push('Please enter a valid phone number');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate password data before submission
   */
  validatePasswordData: (passwordData) => {
    const errors = [];

    if (!passwordData.currentPassword) {
      errors.push('Current password is required');
    }

    if (!passwordData.newPassword) {
      errors.push('New password is required');
    }

    if (!passwordData.confirmPassword) {
      errors.push('Please confirm your new password');
    }

    if (passwordData.newPassword && passwordData.newPassword.length < 8) {
      errors.push('New password must be at least 8 characters long');
    }

    if (passwordData.newPassword && passwordData.confirmPassword && 
        passwordData.newPassword !== passwordData.confirmPassword) {
      errors.push('New passwords do not match');
    }

    if (passwordData.currentPassword && passwordData.newPassword && 
        passwordData.currentPassword === passwordData.newPassword) {
      errors.push('New password must be different from current password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Calculate password strength
   */
  calculatePasswordStrength: (password) => {
    if (!password) return { strength: 0, label: '', color: 'default' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      symbols: /[^A-Za-z0-9]/.test(password)
    };

    // Calculate score
    Object.values(checks).forEach(check => {
      if (check) score += 20;
    });

    // Bonus for length
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Determine strength level
    let strength, label, color;
    if (score < 40) {
      strength = score;
      label = 'Weak';
      color = 'error';
    } else if (score < 60) {
      strength = score;
      label = 'Fair';
      color = 'warning';
    } else if (score < 80) {
      strength = score;
      label = 'Good';
      color = 'info';
    } else {
      strength = Math.min(score, 100);
      label = 'Strong';
      color = 'success';
    }

    return { strength, label, color, checks };
  },

  /**
   * Format phone number for display
   */
  formatPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Format US phone numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    
    // Return original if can't format
    return phoneNumber;
  },

  /**
   * Get error message from API response
   */
  getErrorMessage: (error) => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    } else if (error.response?.data?.message) {
      return error.response.data.message;
    } else if (error.message) {
      return error.message;
    } else {
      return 'An unexpected error occurred';
    }
  },

  /**
   * Check if email verification is needed
   */
  needsEmailVerification: (user) => {
    return user && !user.isEmailVerified;
  },

  /**
   * Calculate profile completion percentage
   */
  calculateProfileCompletion: (user) => {
    if (!user) return 0;

    const fields = [
      user.firstName,
      user.lastName,
      user.email,
      user.phoneNumber
    ];

    const completedFields = fields.filter(field => field && field.trim()).length;
    return Math.round((completedFields / fields.length) * 100);
  },

  /**
   * Get account security score
   */
  getSecurityScore: (user) => {
    if (!user) return 0;

    let score = 0;
    const maxScore = 100;

    // Email verification (40 points)
    if (user.isEmailVerified) score += 40;

    // Profile completeness (30 points)
    const completionPercentage = settingsService.calculateProfileCompletion(user);
    score += (completionPercentage / 100) * 30;

    // Account age (15 points)
    if (user.createdAt) {
      const accountAge = Date.now() - new Date(user.createdAt).getTime();
      const daysOld = accountAge / (1000 * 60 * 60 * 24);
      if (daysOld > 30) score += 15;
      else score += (daysOld / 30) * 15;
    }

    // Phone number (15 points)
    if (user.phoneNumber) score += 15;

    return Math.min(Math.round(score), maxScore);
  }
};

export default settingsService;