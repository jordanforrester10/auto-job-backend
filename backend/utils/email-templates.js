// backend/utils/email-templates.js
/**
 * Generate verification email HTML
 * @param {string} firstName User's first name
 * @param {string} verificationUrl Verification URL
 * @returns {string} HTML email content
 */
exports.generateVerificationEmail = (firstName, verificationUrl) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .logo {
            text-align: center;
            margin-bottom: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
          }
          .button {
            display: inline-block;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="logo">
          <h2>Job Application Platform</h2>
        </div>
        <div class="container">
          <h2>Hello ${firstName},</h2>
          <p>Welcome to the Job Application Platform! Please verify your email address to get started.</p>
          <p>This link will expire in 24 hours.</p>
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Job Application Platform. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  };
  
  /**
   * Generate password reset email HTML
   * @param {string} firstName User's first name
   * @param {string} resetUrl Reset URL
   * @returns {string} HTML email content
   */
  exports.generatePasswordResetEmail = (firstName, resetUrl) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .logo {
            text-align: center;
            margin-bottom: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 5px;
            padding: 20px;
          }
          .button {
            display: inline-block;
            background-color: #3498db;
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #777;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="logo">
          <h2>Job Application Platform</h2>
        </div>
        <div class="container">
          <h2>Hello ${firstName},</h2>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <p>This link will expire in 10 minutes.</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 Job Application Platform. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </body>
      </html>
    `;
  };