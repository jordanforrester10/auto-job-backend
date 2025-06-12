// backend/routes/assistant.routes.js - COMPLETE WITH RESUME EDITING ROUTES
const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistant.controller');
const { protect } = require('../middleware/auth.middleware'); // FIXED: Proper import
const rateLimit = require('express-rate-limit');

// All assistant routes require authentication
router.use(protect);

// ===================================================================
// RATE LIMITING SETUP
// ===================================================================

// Rate limiting for AI operations (more restrictive due to cost)
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // limit each IP to 50 AI operations per windowMs
  message: {
    success: false,
    error: 'AI operation rate limit exceeded. Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for memory operations
const memoryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 memory operations per windowMs
  message: {
    success: false,
    error: 'Memory operation rate limit exceeded. Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for resume operations (moderate)
const resumeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // limit each IP to 20 resume operations per windowMs
  message: {
    success: false,
    error: 'Resume operation rate limit exceeded. Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===================================================================
// ENHANCED CHAT & CONVERSATION MANAGEMENT
// ===================================================================

// Enhanced main chat endpoint with conversation management
router.post('/chat', aiLimiter, assistantController.chat);

// Conversation management
router.get('/conversations', assistantController.getConversations);
router.get('/conversations/:conversationId', assistantController.getConversation);
router.put('/conversations/:conversationId', assistantController.updateConversation);
router.delete('/conversations/:conversationId', assistantController.deleteConversation);

// Conversation utilities (placeholders - implement if needed)
router.post('/conversations/:conversationId/summary', assistantController.generateSummary);
router.get('/conversations/:conversationId/insights', assistantController.getConversationInsights);
router.get('/conversations/:conversationId/export', assistantController.exportConversation);

// Bulk operations
router.post('/conversations/bulk-update', assistantController.bulkUpdateConversations);

// ===================================================================
// MEMORY MANAGEMENT (with rate limiting)
// ===================================================================

// Memory CRUD operations
router.get('/memories', memoryLimiter, assistantController.getMemories);
router.post('/memories', memoryLimiter, assistantController.updateMemory);
router.delete('/memories/:memoryId', memoryLimiter, assistantController.deleteMemory);

// Memory insights and analytics
router.get('/memory-insights', memoryLimiter, assistantController.getMemoryInsights);
router.post('/memory-maintenance', memoryLimiter, assistantController.performMemoryMaintenance);

// ===================================================================
// ENHANCED RESUME OPERATIONS - FULL IMPLEMENTATION
// ===================================================================

// Core resume editing operations (with rate limiting) - THESE EXIST
router.post('/apply-resume-changes', resumeLimiter, assistantController.applyResumeChanges);
router.post('/optimize-ats', resumeLimiter, assistantController.optimizeForATS);
router.post('/analyze-resume', resumeLimiter, assistantController.analyzeResume);

// Real-time resume editing (PLACEHOLDER IMPLEMENTATIONS)
router.post('/resume/quick-edit', resumeLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Quick edit feature coming soon',
    suggestion: 'Use the apply-resume-changes endpoint for now'
  });
});

router.post('/resume/bulk-update', resumeLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Bulk update feature coming soon',
    suggestion: 'Use multiple apply-resume-changes calls for now'
  });
});

router.post('/resume/improvements', resumeLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Improvement suggestions feature coming soon',
    suggestion: 'Use the analyze-resume endpoint for detailed analysis'
  });
});

// Resume-specific AI operations (PLACEHOLDERS)
router.post('/resume/tailor-for-job', resumeLimiter, (req, res) => {
  res.json({
    success: true,
    message: 'Resume tailoring feature coming soon',
    suggestion: 'Use the apply-resume-changes endpoint for now'
  });
});

router.post('/resume/version-compare', (req, res) => {
  res.json({
    success: true,
    message: 'Version comparison feature coming soon',
    suggestion: 'Check the versions array in your resume data'
  });
});

// ===================================================================
// UNIVERSAL SEARCH
// ===================================================================

// Search across conversations and memories
router.get('/search', assistantController.search);

// ===================================================================
// ANALYTICS & INSIGHTS
// ===================================================================

// User analytics
router.get('/analytics', assistantController.getAnalytics);

// ===================================================================
// JOB MATCHING & CAREER GUIDANCE
// ===================================================================

// Job matching with memory context
router.post('/analyze-job-match', aiLimiter, assistantController.analyzeJobMatch);
router.post('/generate-cover-letter', aiLimiter, assistantController.generateCoverLetter);

// Career guidance with memory context
router.post('/career-advice', aiLimiter, assistantController.getCareerAdvice);
router.post('/contextual-suggestions', assistantController.getContextualSuggestions);
router.post('/personalized-tips', assistantController.getPersonalizedTips);

// ===================================================================
// SYSTEM & HEALTH
// ===================================================================

// Enhanced system endpoints
router.get('/capabilities', assistantController.getCapabilities);
router.get('/health', assistantController.healthCheck);
router.get('/usage-stats', assistantController.getUsageStats);
router.post('/track-interaction', assistantController.trackInteraction);
router.post('/reset-context', assistantController.resetContext);

// ===================================================================
// PLACEHOLDER ROUTES REMOVED - ALREADY DEFINED ABOVE
// ===================================================================

// ===================================================================
// ERROR HANDLING MIDDLEWARE
// ===================================================================

// Enhanced error handling for all operations
router.use((error, req, res, next) => {
  console.error('Assistant route error:', {
    error: error.message,
    stack: error.stack,
    route: req.route?.path,
    method: req.method,
    userId: req.user?._id,
    timestamp: new Date().toISOString()
  });

  // Resume-specific errors
  if (error.message.includes('resume') || error.message.includes('Resume')) {
    return res.status(500).json({
      success: false,
      error: 'Resume processing error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try refreshing the page or uploading the resume again'
    });
  }

  // Memory-specific errors
  if (error.message.includes('memory') || error.message.includes('Memory')) {
    return res.status(500).json({
      success: false,
      error: 'Memory system error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try refreshing the page or contact support if the issue persists'
    });
  }

  // Conversation-specific errors
  if (error.message.includes('conversation') || error.message.includes('Conversation')) {
    return res.status(500).json({
      success: false,
      error: 'Conversation system error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try starting a new conversation or contact support'
    });
  }

  // OpenAI API errors
  if (error.message.includes('OpenAI') || error.status === 429) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Please try again in a few moments'
    });
  }

  // Rate limiting errors
  if (error.status === 429 || error.message.includes('rate limit')) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      details: 'Rate limit exceeded for AI operations',
      suggestion: 'Please wait a few minutes before trying again',
      retryAfter: error.retryAfter || 300
    });
  }

  // File/upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      suggestion: 'Please upload a file smaller than 10MB'
    });
  }

  // Authentication errors
  if (error.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      suggestion: 'Please log in again'
    });
  }

  // Default error response
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
  });
});

module.exports = router;