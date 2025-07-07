// backend/controllers/support.controller.js
const sendEmail = require('../utils/send-email');
const User = require('../models/mongodb/user.model');

const submitSupportRequest = async (req, res) => {
  try {
    const { name, email, subject, category, priority, message } = req.body;
    const userId = req.user?._id;

    // Validate required fields
    if (!name || !email || !subject || !category || !message) {
      return res.status(400).json({
        success: false,
        error: 'All required fields must be provided'
      });
    }

    // Get user info if authenticated
    let userInfo = null;
    if (req.user) {
      userInfo = {
        email: req.user.email,
        subscriptionTier: req.user.subscriptionTier || 'free',
        userId: req.user._id
      };
    }

    // Prepare email content
    const supportEmailContent = `
      <h2>New Support Request</h2>
      
      <h3>Contact Information:</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${userInfo ? `<p><strong>User Account:</strong> ${userInfo.email}</p>` : ''}
      ${userInfo ? `<p><strong>Subscription:</strong> ${userInfo.subscriptionTier}</p>` : ''}
      
      <h3>Request Details:</h3>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Priority:</strong> ${priority}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
      
      <hr>
      <p><small>Submitted at: ${new Date().toISOString()}</small></p>
      ${userInfo ? `<p><small>User ID: ${userInfo.userId}</small></p>` : '<p><small>Submitted by non-authenticated user</small></p>'}
    `;

    // Send email to support team
    await sendEmail({
      email: 'support@auto-job.ai', // Using 'email' instead of 'to' to match your utility
      subject: `[${priority.toUpperCase()}] ${category.toUpperCase()}: ${subject}`,
      html: supportEmailContent
    });

    // Send confirmation email to user
    const confirmationEmailContent = `
      <h2>Support Request Received</h2>
      
      <p>Dear ${name},</p>
      
      <p>Thank you for contacting auto-job.ai support. We have received your support request and will get back to you within 24 hours.</p>
      
      <h3>Your Request Summary:</h3>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Priority:</strong> ${priority}</p>
      <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      
      <p>If you have any urgent issues, please don't hesitate to reach out to us directly.</p>
      
      <p>Best regards,<br>
      The auto-job.ai Support Team</p>
      
      <hr>
      <p><small>This is an automated confirmation email. Please do not reply to this email.</small></p>
    `;

    await sendEmail({
      email: email, // Using 'email' instead of 'to' to match your utility
      subject: 'Support Request Confirmation - auto-job.ai',
      html: confirmationEmailContent
    });

    console.log(`Support request submitted by ${email} - Category: ${category}, Priority: ${priority}`);

    res.status(200).json({
      success: true,
      message: 'Support request submitted successfully',
      data: {
        submitted: true,
        category,
        priority,
        estimatedResponse: '24 hours'
      }
    });

  } catch (error) {
    console.error('Error submitting support request:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit support request. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getSupportCategories = async (req, res) => {
  try {
    const categories = [
      {
        value: 'technical',
        label: 'Technical Issue',
        description: 'Problems with app functionality, bugs, or errors'
      },
      {
        value: 'account',
        label: 'Account & Billing',
        description: 'Account access, subscription, or billing questions'
      },
      {
        value: 'feature',
        label: 'Feature Request',
        description: 'Suggestions for new features or improvements'
      },
      {
        value: 'general',
        label: 'General Question',
        description: 'General questions about using auto-job.ai'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Other inquiries not covered above'
      }
    ];

    res.status(200).json({
      success: true,
      data: { categories }
    });

  } catch (error) {
    console.error('Error fetching support categories:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support categories'
    });
  }
};

module.exports = {
  submitSupportRequest,
  getSupportCategories
};