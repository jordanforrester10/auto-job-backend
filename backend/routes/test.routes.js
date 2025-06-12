// backend/routes/test.routes.js
const express = require('express');
const sendEmail = require('../utils/send-email');
const emailTemplates = require('../utils/email-templates');

const router = express.Router();

router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an email address'
      });
    }
    
    const testUrl = 'http://localhost:3000/test';
    
    await sendEmail({
      email,
      subject: 'Test Email',
      html: emailTemplates.generateVerificationEmail('Test User', testUrl)
    });
    
    res.status(200).json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      error: 'Email could not be sent'
    });
  }
});

module.exports = router;