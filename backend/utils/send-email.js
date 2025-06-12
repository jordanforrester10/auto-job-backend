// backend/utils/send-email.js
const nodemailer = require('nodemailer');

/**
 * Send email using nodemailer with Gmail
 * @param {Object} options Email options (to, subject, text, html)
 */
const sendEmail = async (options) => {
  try {
    // Create a transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD // App Password, not regular password
      }
    });
    
    // Define mail options
    const mailOptions = {
      from: `${process.env.FROM_NAME} <${process.env.GMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      html: options.html
    };
    
    // Send mail
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

module.exports = sendEmail;