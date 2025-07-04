// backend/utils/send-email.js - DEBUG VERSION WITH BETTER LOGGING
const nodemailer = require('nodemailer');

/**
 * Send email using nodemailer with NameCheap Private Email
 * @param {Object} options Email options (to, subject, text, html)
 */
const sendEmail = async (options) => {
  try {
    console.log('🔧 Email service configuration:');
    console.log('- Host:', 'mail.privateemail.com');
    console.log('- Port:', process.env.SMTP_PORT);
    console.log('- Secure:', process.env.SMTP_PORT === '465');
    console.log('- User:', process.env.SMTP_USER);
    console.log('- Has Password:', !!process.env.SMTP_PASSWORD);
    console.log('- From Name:', process.env.FROM_NAME);

    // Create a transporter using NameCheap Private Email SMTP
    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_PORT === '465', // true for SSL (port 465), false for TLS (port 587)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      },
      // Add debug logging
      debug: true,
      logger: true
    });
    
    // Verify connection configuration
    try {
      console.log('🔍 Verifying SMTP connection...');
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
      text: options.text || options.html?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      // Add additional headers for better deliverability
      headers: {
        'X-Mailer': 'Auto-Job.ai',
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal'
      }
    };
    
    console.log('📧 Mail options:');
    console.log('- From:', mailOptions.from);
    console.log('- To:', mailOptions.to);
    console.log('- Subject:', mailOptions.subject);
    console.log('- Has HTML:', !!mailOptions.html);
    console.log('- Has Text:', !!mailOptions.text);
    
    // Send mail
    console.log(`📤 Sending email to ${options.email} via NameCheap SMTP...`);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📋 Send info:', {
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending
    });
    
    return info;
  } catch (error) {
    console.error('❌ Error sending email via NameCheap SMTP:');
    console.error('🔍 Error details:', error);
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