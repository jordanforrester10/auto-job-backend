// backend/utils/email-templates.js - COMPREHENSIVE BRANDED EMAIL SYSTEM
/**
 * Auto-Job.ai Branded Email Templates
 * Professional email templates with consistent branding and responsive design
 */

// Base email styling and branding
const EMAIL_STYLES = `
  <style>
    /* Reset and base styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    /* Main container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      font-family: 'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif;
      line-height: 1.6;
      color: #202124;
      background-color: #f5f7fa;
    }
    
    /* Header */
    .email-header {
      background: linear-gradient(135deg, #1a73e8 0%, #4285f4 100%);
      padding: 20px;
      text-align: center;
    }
    
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      color: white;
      text-decoration: none;
    }
    
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: white;
      margin: 0;
    }
    
    .tagline {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.9);
      margin: 5px 0 0 0;
    }
    
    /* Content area */
    .email-content {
      background-color: white;
      padding: 40px 30px;
      border-radius: 0;
    }
    
    .email-greeting {
      font-size: 24px;
      font-weight: 600;
      color: #202124;
      margin: 0 0 20px 0;
    }
    
    .email-text {
      font-size: 16px;
      line-height: 1.6;
      color: #5f6368;
      margin: 0 0 20px 0;
    }
    
    /* Buttons */
    .button-container {
      text-align: center;
      margin: 30px 0;
    }
    
    .primary-button {
      display: inline-block;
      background-color: #1a73e8;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 8px rgba(26, 115, 232, 0.3);
      transition: all 0.2s ease;
    }
    
    .primary-button:hover {
      background-color: #0d47a1;
      transform: translateY(-1px);
      box-shadow: 0 6px 12px rgba(26, 115, 232, 0.4);
    }
    
    .secondary-button {
      display: inline-block;
      background-color: transparent;
      color: #1a73e8 !important;
      text-decoration: none;
      padding: 12px 24px;
      border: 2px solid #1a73e8;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin-left: 12px;
    }
    
    /* Info boxes */
    .info-box {
      background-color: #e3f2fd;
      border-left: 4px solid #1a73e8;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .warning-box {
      background-color: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .success-box {
      background-color: #e8f5e8;
      border-left: 4px solid #4caf50;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    /* Features list */
    .features-list {
      list-style: none;
      padding: 0;
      margin: 20px 0;
    }
    
    .features-list li {
      padding: 8px 0;
      padding-left: 30px;
      position: relative;
      font-size: 15px;
      color: #5f6368;
    }
    
    .features-list li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #4caf50;
      font-weight: bold;
      font-size: 16px;
    }
    
    /* Footer */
    .email-footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      color: #5f6368;
      font-size: 14px;
      border-top: 1px solid #e8eaed;
    }
    
    .footer-links {
      margin: 20px 0;
    }
    
    .footer-links a {
      color: #1a73e8;
      text-decoration: none;
      margin: 0 15px;
    }
    
    .footer-links a:hover {
      text-decoration: underline;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      padding: 8px;
      background-color: #1a73e8;
      color: white;
      border-radius: 4px;
      text-decoration: none;
      font-size: 12px;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .email-content {
        padding: 25px 20px !important;
      }
      .primary-button, .secondary-button {
        display: block !important;
        width: 80% !important;
        margin: 10px auto !important;
        text-align: center !important;
      }
      .logo-text {
        font-size: 20px !important;
      }
    }
  </style>
`;

// Base email template structure with clean header
const createEmailTemplate = (content, title = "Auto-Job.ai") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  ${EMAIL_STYLES}
</head>
<body style="margin: 0; padding: 0; background-color: #f5f7fa;">
  <div class="email-container">
    <!-- Header with Logo Image -->
    <div class="email-header">
      <a href="https://auto-job.ai" class="logo-container" style="text-decoration: none;">
        <div style="text-align: center;">
          <h1 style="color: white; font-size: 28px; font-weight: 700; margin: 0; line-height: 1.2;">auto-job.ai</h1>
          <p style="color: rgba(255, 255, 255, 0.9); font-size: 14px; margin: 5px 0 0 0; line-height: 1.2;">Secure interviews faster with AI agents</p>
        </div>
      </a>
    </div>
    
    <!-- Content -->
    <div class="email-content">
      ${content}
    </div>
    
    <!-- Footer -->
    <div class="email-footer">
      <p style="margin: 20px 0 0 0;">
        © 2025 Auto-Job.ai. All rights reserved.<br>
        <a href="https://auto-job.ai/unsubscribe" style="color: #9aa0a6; font-size: 12px;">Unsubscribe</a> | 
        <a href="https://auto-job.ai/privacy" style="color: #9aa0a6; font-size: 12px;">Privacy Policy</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

/**
 * 1. ACCOUNT CREATION & WELCOME EMAIL
 */
exports.generateWelcomeEmail = (firstName, verificationUrl = null) => {
  const content = `
    <h2 class="email-greeting">Welcome to Auto-Job.ai, ${firstName}! 🎉</h2>
    
    <p class="email-text">
      We're thrilled to have you join thousands of job seekers who are securing interviews faster with AI-powered automation.
    </p>
    
    ${verificationUrl ? `
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">📧 First, let's verify your email address</p>
      <p style="margin: 8px 0 0 0; font-size: 14px;">Click the button below to verify your email and unlock all features.</p>
    </div>
    
    <div class="button-container">
      <a href="${verificationUrl}" class="primary-button">Verify Email Address</a>
    </div>
    ` : `
    <div class="success-box">
      <p style="margin: 0; font-weight: 600;">✅ Your account is ready to go!</p>
    </div>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/dashboard" class="primary-button">Start Using Auto-Job.ai</a>
    </div>
    `}
    
    <h3 style="color: #202124; margin: 30px 0 15px 0;">What you can do right now:</h3>
    <ul class="features-list">
      <li><strong>Upload your resume</strong> - Get instant AI analysis and improvement suggestions</li>
      <li><strong>Import job descriptions</strong> - Analyze job matches and tailor your applications</li>
      <li><strong>Browse recruiters</strong> - Connect with hiring managers in your industry</li>
      <li><strong>Set up job alerts</strong> - Get notified about relevant opportunities</li>
    </ul>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">🚀 Pro Tip</p>
      <p style="margin: 8px 0 0 0;">Start by uploading your resume for instant feedback, then browse our job database to find your perfect match!</p>
    </div>
    
    <p class="email-text">
      Questions? Reply to this email or visit our <a href="https://auto-job.ai/help" style="color: #1a73e8;">Help Center</a>. 
      Our team is here to help you succeed.
    </p>
    
    <p class="email-text" style="margin-bottom: 0;">
      Best regards,<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Welcome to Auto-Job.ai!");
};

/**
 * 2. EMAIL VERIFICATION
 */
exports.generateEmailVerificationEmail = (firstName, verificationUrl) => {
  const content = `
    <h2 class="email-greeting">Hi ${firstName}, please verify your email 📧</h2>
    
    <p class="email-text">
      To complete your Auto-Job.ai account setup and start securing interviews faster, 
      please verify your email address by clicking the button below.
    </p>
    
    <div class="button-container">
      <a href="${verificationUrl}" class="primary-button">Verify Email Address</a>
    </div>
    
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">⏰ This link expires in 24 hours</p>
      <p style="margin: 8px 0 0 0;">For security reasons, this verification link will expire. If you need a new link, just try logging in again.</p>
    </div>
    
    <p class="email-text">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 14px; border: 1px solid #e8eaed;">
      ${verificationUrl}
    </p>
    
    <p class="email-text">
      If you didn't create an account with Auto-Job.ai, you can safely ignore this email.
    </p>
    
    <p class="email-text" style="margin-bottom: 0;">
      Best regards,<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Verify Your Email - Auto-Job.ai");
};

/**
 * 3. PASSWORD RESET
 */
exports.generatePasswordResetEmail = (firstName, resetUrl) => {
  const content = `
    <h2 class="email-greeting">Password Reset Request 🔐</h2>
    
    <p class="email-text">
      Hi ${firstName}, we received a request to reset your Auto-Job.ai password. 
      Click the button below to create a new password.
    </p>
    
    <div class="button-container">
      <a href="${resetUrl}" class="primary-button">Reset Password</a>
    </div>
    
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">⚠️ Security Notice</p>
      <p style="margin: 8px 0 0 0;">This reset link expires in 10 minutes for your security. If you need more time, just request another reset.</p>
    </div>
    
    <p class="email-text">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 14px; border: 1px solid #e8eaed;">
      ${resetUrl}
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">🛡️ Account Security Tips</p>
      <ul style="margin: 8px 0 0 20px; padding: 0;">
        <li>Use a strong, unique password</li>
        <li>Don't share your login credentials</li>
        <li>Log out from shared devices</li>
      </ul>
    </div>
    
    <p class="email-text">
      If you didn't request this password reset, please ignore this email. Your account remains secure.
    </p>
    
    <p class="email-text" style="margin-bottom: 0;">
      Best regards,<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Reset Your Password - Auto-Job.ai");
};

/**
 * 4. SUBSCRIPTION UPGRADE SUCCESS
 */
exports.generateSubscriptionUpgradeEmail = (firstName, planName, features, nextBillingDate) => {
  const planEmoji = planName.toLowerCase() === 'hunter' ? '🏆' : '🚀';
  
  const content = `
    <h2 class="email-greeting">Welcome to ${planName}! ${planEmoji}</h2>
    
    <p class="email-text">
      Hi ${firstName}, congratulations on upgrading to Auto-Job.ai ${planName}! 
      Your new features are now active and ready to supercharge your job search.
    </p>
    
    <div class="success-box">
      <p style="margin: 0; font-weight: 600;">✅ Upgrade Complete</p>
      <p style="margin: 8px 0 0 0;">Your ${planName} features are now active. Start using them immediately!</p>
    </div>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/dashboard" class="primary-button">Explore Your New Features</a>
      <a href="https://app.auto-job.ai/settings" class="secondary-button">View Subscription</a>
    </div>
    
    <h3 style="color: #202124; margin: 30px 0 15px 0;">Your new ${planName} features:</h3>
    <ul class="features-list">
      ${features.map(feature => `<li>${feature}</li>`).join('')}
    </ul>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">💡 Getting Started Tips</p>
      <ul style="margin: 8px 0 0 20px; padding: 0;">
        <li>Try the enhanced resume analysis for deeper insights</li>
        <li>Use unlimited job imports to build your pipeline</li>
        <li>Connect with recruiters to expand your network</li>
        ${planName.toLowerCase() === 'hunter' ? '<li>Chat with our AI Assistant for personalized guidance</li>' : ''}
      </ul>
    </div>
    
    <p class="email-text">
      <strong>Next billing date:</strong> ${new Date(nextBillingDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </p>
    
    <p class="email-text">
      Need help getting started? Check out our <a href="https://auto-job.ai/help" style="color: #1a73e8;">Help Center</a> 
      or reply to this email with any questions.
    </p>
    
    <p class="email-text" style="margin-bottom: 0;">
      Thank you for choosing Auto-Job.ai!<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, `Welcome to ${planName} - Auto-Job.ai`);
};

/**
 * 5. SUBSCRIPTION DOWNGRADE
 */
exports.generateSubscriptionDowngradeEmail = (firstName, oldPlan, newPlan, effectiveDate, lostFeatures) => {
  const content = `
    <h2 class="email-greeting">Subscription Updated</h2>
    
    <p class="email-text">
      Hi ${firstName}, we've processed your subscription change from ${oldPlan} to ${newPlan}.
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">📅 Change Details</p>
      <p style="margin: 8px 0 0 0;">
        <strong>Previous Plan:</strong> ${oldPlan}<br>
        <strong>New Plan:</strong> ${newPlan}<br>
        <strong>Effective Date:</strong> ${new Date(effectiveDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    </div>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/dashboard" class="primary-button">Continue Using Auto-Job.ai</a>
      <a href="https://app.auto-job.ai/settings" class="secondary-button">Manage Subscription</a>
    </div>
    
    ${lostFeatures && lostFeatures.length > 0 ? `
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">📋 Features No Longer Available</p>
      <ul style="margin: 8px 0 0 20px; padding: 0;">
        ${lostFeatures.map(feature => `<li>${feature}</li>`).join('')}
      </ul>
    </div>
    
    <h3 style="color: #202124; margin: 30px 0 15px 0;">Want these features back?</h3>
    <p class="email-text">
      You can upgrade anytime to regain access to premium features. We're here to help you succeed in your job search.
    </p>
    
    <div class="button-container" style="margin-top: 20px;">
      <a href="https://app.auto-job.ai/pricing" class="primary-button">View Upgrade Options</a>
    </div>
    ` : ''}
    
    <p class="email-text">
      We appreciate your continued use of Auto-Job.ai. If you have any questions about your subscription 
      or need assistance, please don't hesitate to reach out.
    </p>
    
    <p class="email-text" style="margin-bottom: 0;">
      Best regards,<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Subscription Updated - Auto-Job.ai");
};

/**
 * 6. PAYMENT FAILED
 */
exports.generatePaymentFailedEmail = (firstName, planName, amount, nextRetryDate, updatePaymentUrl) => {
  const content = `
    <h2 class="email-greeting">Payment Issue - Action Required 💳</h2>
    
    <p class="email-text">
      Hi ${firstName}, we had trouble processing your payment for Auto-Job.ai ${planName}. 
      To keep your premium features active, please update your payment information.
    </p>
    
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">⚠️ Payment Failed</p>
      <p style="margin: 8px 0 0 0;">
        <strong>Plan:</strong> ${planName}<br>
        <strong>Amount:</strong> $${amount}<br>
        <strong>Next Retry:</strong> ${new Date(nextRetryDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
    </div>
    
    <div class="button-container">
      <a href="${updatePaymentUrl}" class="primary-button">Update Payment Method</a>
      <a href="https://app.auto-job.ai/settings" class="secondary-button">Manage Subscription</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">🔧 How to Fix This</p>
      <ol style="margin: 8px 0 0 20px; padding: 0;">
        <li>Click "Update Payment Method" above</li>
        <li>Add a new card or update your existing payment info</li>
        <li>Your subscription will automatically resume</li>
      </ol>
    </div>
    
    <p class="email-text">
      <strong>What happens next?</strong><br>
      We'll automatically retry your payment in a few days. If the payment continues to fail, 
      your subscription may be suspended to prevent additional charges.
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">💬 Need Help?</p>
      <p style="margin: 8px 0 0 0;">
        Having trouble with your payment? Our support team is here to help. 
        Reply to this email or visit our Help Center.
      </p>
    </div>
    
    <p class="email-text" style="margin-bottom: 0;">
      Thank you for using Auto-Job.ai,<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Payment Failed - Auto-Job.ai");
};

/**
 * 7. SUBSCRIPTION CANCELED
 */
exports.generateSubscriptionCanceledEmail = (firstName, planName, endDate, feedbackUrl = null) => {
  const content = `
    <h2 class="email-greeting">Sorry to see you go, ${firstName} 😢</h2>
    
    <p class="email-text">
      We've successfully canceled your Auto-Job.ai ${planName} subscription. 
      Your premium features will remain active until ${new Date(endDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}.
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">📅 Cancellation Details</p>
      <p style="margin: 8px 0 0 0;">
        <strong>Canceled Plan:</strong> ${planName}<br>
        <strong>End Date:</strong> ${new Date(endDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}<br>
        <strong>What's Next:</strong> Your account will switch to our Free plan
      </p>
    </div>
    
    <h3 style="color: #202124; margin: 30px 0 15px 0;">You'll still have access to:</h3>
    <ul class="features-list">
      <li>Basic resume analysis</li>
      <li>Limited job imports</li>
      <li>Basic recruiter search</li>
      <li>Core job tracking features</li>
    </ul>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/dashboard" class="primary-button">Continue with Free Plan</a>
      <a href="https://app.auto-job.ai/settings" class="secondary-button">Reactivate Subscription</a>
    </div>
    
    ${feedbackUrl ? `
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">💬 Help Us Improve</p>
      <p style="margin: 8px 0 0 0;">
        Your feedback helps us build a better product. Could you spare 2 minutes to tell us why you canceled?
      </p>
      <div style="margin-top: 12px;">
        <a href="${feedbackUrl}" style="color: #1a73e8; text-decoration: none; font-weight: 600;">Share Feedback →</a>
      </div>
    </div>
    ` : ''}
    
    <div class="success-box">
      <p style="margin: 0; font-weight: 600;">🚪 Easy to Come Back</p>
      <p style="margin: 8px 0 0 0;">
        Changed your mind? You can reactivate your subscription anytime with just one click. 
        All your data and settings will be preserved.
      </p>
    </div>
    
    <p class="email-text">
      Thank you for trying Auto-Job.ai ${planName}. We hope our Free plan continues to help you 
      in your job search, and we'd love to have you back anytime!
    </p>
    
    <p class="email-text" style="margin-bottom: 0;">
      Wishing you success in your career,<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Subscription Canceled - Auto-Job.ai");
};

/**
 * 8. USAGE LIMIT WARNING
 */
exports.generateUsageLimitWarningEmail = (firstName, feature, currentUsage, limit, planName) => {
  const percentage = Math.round((currentUsage / limit) * 100);
  const remaining = limit - currentUsage;
  
  const content = `
    <h2 class="email-greeting">Usage Alert: ${feature} ⚠️</h2>
    
    <p class="email-text">
      Hi ${firstName}, you're approaching your monthly limit for ${feature} on your ${planName} plan.
    </p>
    
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">📊 Current Usage</p>
      <p style="margin: 8px 0 0 0;">
        <strong>${feature}:</strong> ${currentUsage} of ${limit} used (${percentage}%)<br>
        <strong>Remaining:</strong> ${remaining} this month<br>
        <strong>Resets:</strong> ${new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
      </p>
    </div>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/pricing" class="primary-button">Upgrade for More</a>
      <a href="https://app.auto-job.ai/settings" class="secondary-button">View Usage</a>
    </div>
    
    <h3 style="color: #202124; margin: 30px 0 15px 0;">Get unlimited access with Hunter:</h3>
    <ul class="features-list">
      <li>Unlimited resume uploads and analysis</li>
      <li>Unlimited job imports and matching</li>
      <li>Unlimited recruiter connections</li>
      <li>AI Assistant with personalized guidance</li>
      <li>Priority support</li>
    </ul>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">💡 Pro Tip</p>
      <p style="margin: 8px 0 0 0;">
        Upgrade now to avoid any interruption in your job search. Hunter users land interviews 3x faster!
      </p>
    </div>
    
    <p class="email-text" style="margin-bottom: 0;">
      Questions about upgrading?<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Usage Alert - Auto-Job.ai");
};

/**
 * 9. TRIAL EXPIRING SOON
 */
exports.generateTrialExpiringEmail = (firstName, daysLeft, trialEndDate) => {
  const urgencyEmoji = daysLeft <= 1 ? '🚨' : daysLeft <= 3 ? '⏰' : '📅';
  
  const content = `
    <h2 class="email-greeting">Your trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} ${urgencyEmoji}</h2>
    
    <p class="email-text">
      Hi ${firstName}, your Auto-Job.ai free trial ends on ${new Date(trialEndDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}. Don't lose access to the features that are accelerating your job search!
    </p>
    
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">⏳ Trial Status</p>
      <p style="margin: 8px 0 0 0;">
        <strong>Time Remaining:</strong> ${daysLeft} day${daysLeft !== 1 ? 's' : ''}<br>
        <strong>Trial Ends:</strong> ${new Date(trialEndDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}<br>
        <strong>What Happens:</strong> Account switches to Free plan
      </p>
    </div>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/pricing" class="primary-button">Choose Your Plan</a>
      <a href="https://app.auto-job.ai/dashboard" class="secondary-button">Continue Trial</a>
    </div>
    
    <h3 style="color: #202124; margin: 30px 0 15px 0;">What you'll lose without upgrading:</h3>
    <ul class="features-list">
      <li>Advanced resume analysis and optimization</li>
      <li>Unlimited job imports and matching</li>
      <li>Full recruiter database access</li>
      <li>AI-powered application assistance</li>
      <li>Priority customer support</li>
    </ul>
    
    <div class="success-box">
      <p style="margin: 0; font-weight: 600;">🎯 Your Trial Results So Far</p>
      <p style="margin: 8px 0 0 0;">
        You've already started building momentum. Keep the progress going with a paid plan!
      </p>
    </div>
    
    <p class="email-text">
      <strong>Special offer:</strong> Upgrade now and get your first month for just $9.99 (50% off)!
    </p>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/pricing?promo=TRIAL50" class="primary-button">Claim 50% Off</a>
    </div>
    
    <p class="email-text" style="margin-bottom: 0;">
      Need help choosing the right plan?<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Trial Expiring Soon - Auto-Job.ai");
};

/**
 * 10. WEEKLY DIGEST EMAIL
 */
exports.generateWeeklyDigestEmail = (firstName, stats, insights, recommendedJobs) => {
  const content = `
    <h2 class="email-greeting">Your Weekly Job Search Summary 📊</h2>
    
    <p class="email-text">
      Hi ${firstName}, here's how your job search performed this week and what to focus on next.
    </p>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">📈 This Week's Activity</p>
      <p style="margin: 8px 0 0 0;">
        <strong>Resume Views:</strong> ${stats.resumeViews || 0}<br>
        <strong>Job Applications:</strong> ${stats.applications || 0}<br>
        <strong>New Job Matches:</strong> ${stats.newMatches || 0}<br>
        <strong>Recruiter Connections:</strong> ${stats.recruiterConnections || 0}
      </p>
    </div>
    
    ${insights && insights.length > 0 ? `
    <h3 style="color: #202124; margin: 30px 0 15px 0;">💡 Insights & Recommendations</h3>
    <ul class="features-list">
      ${insights.map(insight => `<li>${insight}</li>`).join('')}
    </ul>
    ` : ''}
    
    ${recommendedJobs && recommendedJobs.length > 0 ? `
    <div class="success-box">
      <p style="margin: 0; font-weight: 600;">🎯 New Job Matches</p>
      <p style="margin: 8px 0 0 0;">We found ${recommendedJobs.length} new jobs that match your profile this week!</p>
    </div>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/jobs" class="primary-button">View New Matches</a>
    </div>
    ` : ''}
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">🚀 Action Items for Next Week</p>
      <ul style="margin: 8px 0 0 20px; padding: 0;">
        <li>Review and apply to your top 3 job matches</li>
        <li>Update your resume based on recent feedback</li>
        <li>Connect with 2-3 new recruiters in your field</li>
        <li>Set up job alerts for emerging opportunities</li>
      </ul>
    </div>
    
    <p class="email-text">
      Keep up the momentum! Consistent action leads to interview success.
    </p>
    
    <div class="button-container">
      <a href="https://app.auto-job.ai/dashboard" class="primary-button">Continue Job Search</a>
    </div>
    
    <p class="email-text" style="margin-bottom: 0;">
      Happy job hunting!<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Weekly Job Search Summary - Auto-Job.ai");
};

/**
 * 11. NEW FEATURE ANNOUNCEMENT
 */
exports.generateFeatureAnnouncementEmail = (firstName, featureName, description, benefits, ctaUrl) => {
  const content = `
    <h2 class="email-greeting">New Feature: ${featureName} 🎉</h2>
    
    <p class="email-text">
      Hi ${firstName}, we're excited to introduce ${featureName} - a powerful new feature designed to accelerate your job search success!
    </p>
    
    <div class="success-box">
      <p style="margin: 0; font-weight: 600;">✨ What's New</p>
      <p style="margin: 8px 0 0 0;">${description}</p>
    </div>
    
    <div class="button-container">
      <a href="${ctaUrl}" class="primary-button">Try ${featureName} Now</a>
    </div>
    
    <h3 style="color: #202124; margin: 30px 0 15px 0;">How ${featureName} helps you:</h3>
    <ul class="features-list">
      ${benefits.map(benefit => `<li>${benefit}</li>`).join('')}
    </ul>
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">🎓 Getting Started</p>
      <p style="margin: 8px 0 0 0;">
        ${featureName} is available now in your dashboard. Check out our quick tutorial to get the most out of this new feature.
      </p>
      <div style="margin-top: 12px;">
        <a href="https://auto-job.ai/help/${featureName.toLowerCase().replace(/\s+/g, '-')}" style="color: #1a73e8; text-decoration: none; font-weight: 600;">View Tutorial →</a>
      </div>
    </div>
    
    <p class="email-text">
      We're constantly working to give you the best tools for landing your dream job. 
      Let us know what you think about ${featureName}!
    </p>
    
    <p class="email-text" style="margin-bottom: 0;">
      Happy job hunting!<br>
      <strong>The Auto-Job.ai Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, `New Feature: ${featureName} - Auto-Job.ai`);
};

/**
 * 12. ACCOUNT SECURITY ALERT
 */
exports.generateSecurityAlertEmail = (firstName, alertType, details, actionUrl = null) => {
  const alertEmojis = {
    'login': '🔐',
    'password_change': '🔒', 
    'email_change': '📧',
    'suspicious_activity': '⚠️'
  };
  
  const emoji = alertEmojis[alertType] || '🔔';
  
  const content = `
    <h2 class="email-greeting">Security Alert ${emoji}</h2>
    
    <p class="email-text">
      Hi ${firstName}, we're writing to inform you about recent activity on your Auto-Job.ai account.
    </p>
    
    <div class="warning-box">
      <p style="margin: 0; font-weight: 600;">🔍 Account Activity</p>
      <p style="margin: 8px 0 0 0;">${details}</p>
    </div>
    
    ${actionUrl ? `
    <div class="button-container">
      <a href="${actionUrl}" class="primary-button">Secure My Account</a>
      <a href="https://app.auto-job.ai/settings" class="secondary-button">Account Settings</a>
    </div>
    ` : `
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">✅ No Action Required</p>
      <p style="margin: 8px 0 0 0;">This is just a notification. Your account remains secure.</p>
    </div>
    `}
    
    <div class="info-box">
      <p style="margin: 0; font-weight: 600;">🛡️ If this wasn't you:</p>
      <ol style="margin: 8px 0 0 20px; padding: 0;">
        <li>Change your password immediately</li>
        <li>Review your account settings</li>
        <li>Contact our support team</li>
        <li>Consider enabling two-factor authentication</li>
      </ol>
    </div>
    
    <p class="email-text">
      Your account security is our top priority. If you have any concerns or didn't authorize this activity, 
      please contact us immediately.
    </p>
    
    <div class="button-container">
      <a href="mailto:support@auto-job.ai" class="primary-button">Contact Support</a>
    </div>
    
    <p class="email-text" style="margin-bottom: 0;">
      Stay secure,<br>
      <strong>The Auto-Job.ai Security Team</strong>
    </p>
  `;
  
  return createEmailTemplate(content, "Security Alert - Auto-Job.ai");
};

/**
 * UTILITY FUNCTIONS
 */

// Generate plain text version of email (for accessibility)
exports.generatePlainTextVersion = (htmlContent) => {
  return htmlContent
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
};

// Email validation helper
exports.validateEmailData = (data) => {
  const required = ['firstName'];
  const missing = required.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required email data: ${missing.join(', ')}`);
  }
  
  return true;
};

// Email type mapping for easy reference
exports.EMAIL_TYPES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification', 
  PASSWORD_RESET: 'password_reset',
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  SUBSCRIPTION_DOWNGRADE: 'subscription_downgrade',
  PAYMENT_FAILED: 'payment_failed',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  USAGE_WARNING: 'usage_warning',
  TRIAL_EXPIRING: 'trial_expiring',
  WEEKLY_DIGEST: 'weekly_digest',
  FEATURE_ANNOUNCEMENT: 'feature_announcement',
  SECURITY_ALERT: 'security_alert'
};