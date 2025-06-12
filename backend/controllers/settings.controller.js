// backend/controllers/settings.controller.js
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/mongodb/user.model');
const Resume = require('../models/mongodb/resume.model');
const Job = require('../models/mongodb/job.model');
const Outreach = require('../models/mongodb/outreach.model');
const sendEmail = require('../utils/send-email');

/**
 * Get user profile information
 */
exports.getProfile = async (req, res) => {
  try {
    console.log('📋 Getting profile for user:', req.user.id);
    
    const user = await User.findById(req.user.id).select('-password -passwordResetToken -passwordResetExpires');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    console.log('✅ Profile retrieved successfully');
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isEmailVerified: user.isEmailVerified,
          profilePicture: user.profilePicture,
          location: user.location,
          socialProfiles: user.socialProfiles,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile information'
    });
  }
};

/**
 * Update user profile information
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, location, socialProfiles } = req.body;
    const userId = req.user.id;

    console.log('📝 Updating profile for user:', userId);
    console.log('📝 Update data:', { firstName, lastName, email, phoneNumber });

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Check if email is already taken by another user
    if (email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email address is already in use'
        });
      }
    }

    // Prepare update data
    const updateData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phoneNumber: phoneNumber ? phoneNumber.trim() : '',
      updatedAt: new Date()
    };

    // If email changed, mark as unverified
    if (email !== req.user.email) {
      updateData.isEmailVerified = false;
      updateData.emailVerificationToken = crypto.randomBytes(32).toString('hex');
      updateData.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    }

    // Update location if provided
    if (location) {
      updateData.location = location;
    }

    // Update social profiles if provided
    if (socialProfiles) {
      updateData.socialProfiles = socialProfiles;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -passwordResetToken -passwordResetExpires');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Send verification email if email changed
    if (email !== req.user.email) {
      try {
        const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${updateData.emailVerificationToken}`;
        
        await sendEmail({
          email: updatedUser.email,
          subject: 'Verify Your New Email Address - auto-job.ai',
          message: `Hi ${updatedUser.firstName},\n\nPlease verify your new email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe auto-job.ai Team`
        });

        console.log('📧 Verification email sent to:', updatedUser.email);
      } catch (emailError) {
        console.error('📧 Failed to send verification email:', emailError);
        // Don't fail the update if email sending fails
      }
    }

    console.log('✅ Profile updated successfully');

    res.status(200).json({
      success: true,
      message: email !== req.user.email ? 'Profile updated successfully. Please check your email to verify your new email address.' : 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          isEmailVerified: updatedUser.isEmailVerified,
          profilePicture: updatedUser.profilePicture,
          location: updatedUser.location,
          socialProfiles: updatedUser.socialProfiles,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
};

/**
 * Change user password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    console.log('🔒 Changing password for user:', userId);

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10); // Use 10 rounds to match your user model
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
      updatedAt: new Date(),
      // Clear any password reset tokens
      passwordResetToken: undefined,
      passwordResetExpires: undefined
    });

    console.log('✅ Password changed successfully');

    // Send notification email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Changed Successfully - auto-job.ai',
        message: `Hi ${user.firstName},\n\nYour password has been changed successfully.\n\nIf you did not make this change, please contact our support team immediately.\n\nBest regards,\nThe auto-job.ai Team`
      });
    } catch (emailError) {
      console.error('📧 Failed to send password change notification:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
};

/**
 * Delete user account and all associated data
 */
exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { confirmationText } = req.body;

    console.log('🗑️ Deleting account for user:', userId);

    // Optional: Require confirmation text
    if (confirmationText && confirmationText !== 'DELETE') {
      return res.status(400).json({
        success: false,
        error: 'Please type DELETE to confirm account deletion'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Start deletion process
    console.log('🗑️ Starting account deletion process...');

    // Delete user's resumes
    const deletedResumes = await Resume.deleteMany({ userId });
    console.log(`🗑️ Deleted ${deletedResumes.deletedCount} resumes`);

    // Delete user's jobs
    const deletedJobs = await Job.deleteMany({ userId });
    console.log(`🗑️ Deleted ${deletedJobs.deletedCount} jobs`);

    // Delete user's outreach campaigns
    const deletedOutreach = await Outreach.deleteMany({ userId });
    console.log(`🗑️ Deleted ${deletedOutreach.deletedCount} outreach campaigns`);

    // TODO: Delete from PostgreSQL tables if needed
    // This would include recruiter outreach history, etc.

    // Finally, delete the user account
    await User.findByIdAndDelete(userId);
    console.log('🗑️ User account deleted');

    // Send farewell email
    try {
      await sendEmail({
        email: user.email,
        subject: 'Account Deleted Successfully - auto-job.ai',
        message: `Hi ${user.firstName},\n\nYour auto-job.ai account has been successfully deleted along with all associated data.\n\nWe're sorry to see you go. If you have any feedback or would like to return in the future, we'd love to hear from you.\n\nBest regards,\nThe auto-job.ai Team`
      });
    } catch (emailError) {
      console.error('📧 Failed to send farewell email:', emailError);
    }

    console.log('✅ Account deletion completed successfully');

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
};

/**
 * Send email verification
 */
exports.sendVerificationEmail = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📧 Sending verification email for user:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Update user with verification token
    await User.findByIdAndUpdate(userId, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    
    await sendEmail({
      email: user.email,
      subject: 'Verify Your Email Address - auto-job.ai',
      message: `Hi ${user.firstName},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nBest regards,\nThe auto-job.ai Team`
    });

    console.log('✅ Verification email sent successfully');

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully'
    });

  } catch (error) {
    console.error('❌ Send verification email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification email'
    });
  }
};

/**
 * Verify email address
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('✉️ Verifying email with token:', token);

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // Find user with valid verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired verification token'
      });
    }

    // Mark email as verified
    await User.findByIdAndUpdate(user._id, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
      updatedAt: new Date()
    });

    console.log('✅ Email verified successfully for user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('❌ Verify email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email'
    });
  }
};