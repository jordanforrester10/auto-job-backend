// backend/utils/send-email.js - UPDATED FOR NAMECHEAP PRIVATE EMAIL
const nodemailer = require('nodemailer');

/**
 * Send email using nodemailer with NameCheap Private Email
 * @param {Object} options Email options (to, subject, text, html)
 */
const sendEmail = async (options) => {
  try {
    // Create a transporter using NameCheap Private Email SMTP
    const transporter = nodemailer.createTransporter({
      host: 'mail.privateemail.com',
      port: parseInt(process.env.SMTP_PORT) || 587, // 587 for TLS, 465 for SSL
      secure: process.env.SMTP_PORT === '465', // true for SSL (port 465), false for TLS (port 587)
      auth: {
        user: process.env.SMTP_USER, // Your NameCheap email address
        pass: process.env.SMTP_PASSWORD // Your NameCheap email password
      },
      tls: {
        // Accept self-signed certificates
        rejectUnauthorized: false
      }
    });
    
    // Verify connection configuration
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError) {
      console.error('❌ SMTP connection verification failed:', verifyError);
      throw verifyError;
    }
    
    // Define mail options
    const mailOptions = {
      from: `${process.env.FROM_NAME || 'Auto-Job.ai'} <${process.env.SMTP_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html,
      // Add plain text version for better deliverability
      text: options.text || options.html?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
    };
    
    // Send mail
    console.log(`📧 Sending email to ${options.email} via NameCheap SMTP...`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending email via NameCheap SMTP:', error);
    console.error('📋 Email config debug:', {
      host: 'mail.privateemail.com',
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      user: process.env.SMTP_USER,
      hasPassword: !!process.env.SMTP_PASSWORD
    });
    throw error;
  }
};

module.exports = sendEmail;