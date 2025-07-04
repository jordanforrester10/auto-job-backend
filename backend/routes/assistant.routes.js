// backend/routes/assistant.routes.js - CLEANED VERSION WITH ONLY EXISTING FUNCTIONS
const express = require('express');
const router = express.Router();
const assistantController = require('../controllers/assistant.controller');
const { protect } = require('../middleware/auth.middleware');
const rateLimit = require('express-rate-limit');

// All assistant routes require authentication
router.use(protect);

// ===================================================================
// RATE LIMITING SETUP
// ===================================================================

// Rate limiting for AI operations with RAG context
const ragAiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Reduced limit for RAG operations
  message: {
    success: false,
    error: 'RAG AI operation rate limit exceeded. Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for mention suggestions
const mentionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60, // Allow frequent @-mention lookups
  message: {
    success: false,
    error: 'Mention lookup rate limit exceeded. Please wait before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Standard rate limiter for basic operations
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: 'Rate limit exceeded. Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===================================================================
// 🆕 RAG: @-MENTION ENDPOINTS
// ===================================================================

// Get mention suggestions for @-functionality
router.get('/mention-suggestions', mentionLimiter, assistantController.getMentionSuggestions);

// Get full context data for mentioned item
router.get('/context-data/:type/:id', standardLimiter, assistantController.getContextData);

// ===================================================================
// ENHANCED CHAT & CONVERSATION MANAGEMENT (with RAG)
// ===================================================================

// Enhanced main chat endpoint with RAG context support
router.post('/chat', ragAiLimiter, assistantController.chat);

// Conversation management
router.get('/conversations', standardLimiter, assistantController.getConversations);
router.get('/conversations/:conversationId', standardLimiter, assistantController.getConversation);
router.put('/conversations/:conversationId', standardLimiter, assistantController.updateConversation);
router.delete('/conversations/:conversationId', standardLimiter, assistantController.deleteConversation);

// ===================================================================
// SIMPLIFIED SEARCH (NO MEMORY SYSTEM)
// ===================================================================

// Search conversations only (memory system removed)
router.get('/search', standardLimiter, assistantController.search);

// ===================================================================
// SYSTEM & HEALTH
// ===================================================================

// System endpoints with RAG information
router.get('/capabilities', assistantController.getCapabilities);
router.get('/health', assistantController.healthCheck);

// ===================================================================
// CONTEXTUAL SUGGESTIONS
// ===================================================================

// Get contextual suggestions for current page
router.post('/contextual-suggestions', standardLimiter, assistantController.getContextualSuggestions);

// ===================================================================
// ERROR HANDLING MIDDLEWARE (enhanced for RAG)
// ===================================================================

// Enhanced error handling for RAG operations
router.use((error, req, res, next) => {
  console.error('Assistant route error:', {
    error: error.message,
    stack: error.stack,
    route: req.route?.path,
    method: req.method,
    userId: req.user?._id,
    ragContext: req.body?.context ? {
      hasAttachedResumes: req.body.context.attachedResumes?.length > 0,
      hasAttachedJobs: req.body.context.attachedJobs?.length > 0
    } : null,
    timestamp: new Date().toISOString()
  });

  // RAG-specific errors
  if (error.message.includes('context') || error.message.includes('RAG')) {
    return res.status(500).json({
      success: false,
      error: 'RAG context processing error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try removing attached context or using a simpler query',
      ragEnabled: true
    });
  }

  // Resume context errors
  if (error.message.includes('resume') || error.message.includes('Resume')) {
    return res.status(500).json({
      success: false,
      error: 'Resume processing error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try refreshing the page or re-attaching the resume context',
      ragEnabled: true
    });
  }

  // Job context errors
  if (error.message.includes('job') || error.message.includes('Job')) {
    return res.status(500).json({
      success: false,
      error: 'Job analysis error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try refreshing the page or re-attaching the job context',
      ragEnabled: true
    });
  }

  // Mention/context lookup errors
  if (error.message.includes('mention') || error.message.includes('lookup')) {
    return res.status(500).json({
      success: false,
      error: 'Context lookup error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try typing @ again to reload suggestions',
      ragEnabled: true
    });
  }

  // Conversation-specific errors
  if (error.message.includes('conversation') || error.message.includes('Conversation')) {
    return res.status(500).json({
      success: false,
      error: 'Conversation system error',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Try starting a new conversation or contact support',
      ragEnabled: true
    });
  }

  // OpenAI API errors (enhanced for RAG)
  if (error.message.includes('OpenAI') || error.status === 429) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'RAG operations require more processing time. Please try again in a few moments.',
      ragEnabled: true
    });
  }

  // Rate limiting errors (enhanced for RAG)
  if (error.status === 429 || error.message.includes('rate limit')) {
    const isRagOperation = req.route?.path?.includes('chat') || 
                          req.route?.path?.includes('context') ||
                          req.body?.context?.attachedResumes?.length > 0 ||
                          req.body?.context?.attachedJobs?.length > 0;

    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      details: isRagOperation ? 
        'RAG operations have lower rate limits due to processing complexity' : 
        'Rate limit exceeded for AI operations',
      suggestion: isRagOperation ?
        'RAG context processing is resource-intensive. Please wait a few minutes before trying again.' :
        'Please wait a few minutes before trying again',
      retryAfter: error.retryAfter || (isRagOperation ? 600 : 300),
      ragEnabled: true
    });
  }

  // File/upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large',
      suggestion: 'Please upload a file smaller than 10MB',
      ragEnabled: true
    });
  }

  // Authentication errors
  if (error.status === 401) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      suggestion: 'Please log in again',
      ragEnabled: true
    });
  }

  // Context validation errors
  if (error.message.includes('validation') || error.message.includes('invalid')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request data',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      suggestion: 'Check your attached context and try again',
      ragEnabled: true
    });
  }

  // Database connection errors
  if (error.message.includes('database') || error.message.includes('connection')) {
    return res.status(503).json({
      success: false,
      error: 'Database connection error',
      suggestion: 'Our servers are experiencing issues. Please try again shortly.',
      ragEnabled: true
    });
  }

  // Default error response (enhanced for RAG)
  res.status(error.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    suggestion: 'If you have attached context (@-mentions), try removing them and asking again.',
    ragEnabled: true,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ragContext: req.body?.context ? {
        hasAttachedResumes: req.body.context.attachedResumes?.length > 0,
        hasAttachedJobs: req.body.context.attachedJobs?.length > 0,
        page: req.body.context.page
      } : null
    })
  });
});

module.exports = router;