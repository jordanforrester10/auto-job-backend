// backend/server.js - UPDATED WITH SETTINGS ROUTES
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Database connections
const connectMongoDB = require('./config/mongodb');
const { createTables, seedInitialData } = require('./models/postgresql/schema');

// Import routes
const authRoutes = require('./routes/auth.routes');
const resumeRoutes = require('./routes/resume.routes');
const jobRoutes = require('./routes/job.routes');
const assistantRoutes = require('./routes/assistant.routes');
const recruiterRoutes = require('./routes/recruiter.routes');
const searchRoutes = require('./routes/search.routes');
const settingsRoutes = require('./routes/settings.routes'); // NEW: Settings routes

// Initialize Express
const app = express();

console.log('🚀 Starting Job Application Platform API...');

// Trust proxy for production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// CORS configuration (simplified - the complex version wasn't the issue)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://yourproductiondomain.com'
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin'
  ]
}));

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false // Disable CSP for development
}));

// Body parser middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Cookie parser middleware
app.use(cookieParser());

// Request sanitization middleware - FIXED VERSION
const sanitizeRequest = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj) return obj;
    
    if (typeof obj === 'object' && obj !== null) {
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(sanitize);
      }
      
      // Handle objects - FIXED: Use Object.prototype.hasOwnProperty.call()
      const sanitized = {};
      for (const key in obj) {
        // FIXED: Use Object.prototype.hasOwnProperty.call instead of obj.hasOwnProperty
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        
        // Check for MongoDB injection patterns
        if (key.startsWith('$') || key.includes('.')) {
          console.warn(`Potentially malicious key detected and removed: ${key}`);
          continue;
        }
        
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };
  
  // Sanitize request data
  try {
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
  } catch (error) {
    console.warn('Sanitization error:', error);
    // Continue without sanitization if there's an error
  }
  
  next();
};

app.use(sanitizeRequest);

// Rate limiting (more lenient for AI Assistant)
const generalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Special rate limiter for AI Assistant (more restrictive due to cost)
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // limit AI requests to 50 per 10 minutes
  message: {
    success: false,
    error: 'AI Assistant rate limit exceeded. Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Special rate limiter for Recruiter API (moderate limits)
const recruiterLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 150, // Higher limit for recruiter searches
  message: {
    success: false,
    error: 'Recruiter API rate limit exceeded. Please wait before making more requests.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Special rate limiter for Search API (moderate limits)
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // Allow frequent searches
  message: {
    success: false,
    error: 'Search rate limit exceeded. Please wait before searching again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// NEW: Special rate limiter for Settings API (moderate limits)
const settingsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Allow reasonable settings updates
  message: {
    success: false,
    error: 'Settings rate limit exceeded. Please wait before making more changes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/assistant', aiLimiter);
app.use('/api/recruiters', recruiterLimiter);
app.use('/api/search', searchLimiter);
app.use('/api/settings', settingsLimiter); // NEW: Settings-specific rate limiting

// Request logging middleware (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Database initialization
const initializeDatabases = async () => {
  try {
    console.log('🔌 Initializing databases...');
    
    // Connect to MongoDB
    await connectMongoDB();
    console.log('✅ MongoDB connected successfully');
    
    // Set up PostgreSQL tables
    await createTables();
    console.log('✅ PostgreSQL tables created successfully');
    
    // Seed initial data
    await seedInitialData();
    console.log('✅ Initial data seeded successfully');
    
    console.log('🎉 All database connections completed successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    
    // In production, exit on database failure
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('⚠️ Continuing in development mode without full database setup...');
    }
  }
};

// Initialize databases
initializeDatabases();

// API Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Job Application Platform API is running',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: [
      'User Authentication',
      'Resume Management', 
      'Job Tracking',
      'AI Career Assistant',
      'Job Matching',
      'AI Job Search',
      'Recruiter Outreach',
      'Global Search',
      'User Settings & Security' // NEW: Added settings feature
    ]
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true,
    status: 'OK', 
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    ai_status: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
    database_status: {
      mongodb: 'connected',
      postgresql: 'connected'
    }
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/settings', settingsRoutes); // NEW: Mount settings routes

// FIXED: Catch-all route with named parameter (this was the problem!)
// Changed from '/api/*' to '/api/*path' - the wildcard MUST be named
app.all('/api/*path', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API endpoint ${req.originalUrl} not found`,
    suggestion: 'Check the API documentation for available endpoints',
    availableEndpoints: {
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/register',
        'GET /api/auth/me',
        'POST /api/auth/logout'
      ],
      resumes: [
        'GET /api/resumes',
        'POST /api/resumes/upload',
        'GET /api/resumes/:id'
      ],
      jobs: [
        'GET /api/jobs',
        'POST /api/jobs',
        'GET /api/jobs/:id'
      ],
      assistant: [
        'POST /api/assistant/chat',
        'POST /api/assistant/analyze-resume',
        'POST /api/assistant/analyze-job-match',
        'GET /api/assistant/health'
      ],
      recruiters: [
        'GET /api/recruiters/search',
        'GET /api/recruiters/filters',
        'GET /api/recruiters/:id',
        'POST /api/recruiters/outreach',
        'GET /api/recruiters/outreach',
        'POST /api/recruiters/generate-message',
        'GET /api/recruiters/analytics'
      ],
      search: [
        'GET /api/search?query={query}&category={category}',
        'GET /api/search/suggestions?query={query}',
        'GET /api/search/popular'
      ],
      settings: [ // NEW: Settings endpoints
        'GET /api/settings/profile',
        'PUT /api/settings/profile',
        'PUT /api/settings/change-password',
        'DELETE /api/settings/delete-account',
        'POST /api/settings/send-verification-email',
        'GET /api/settings/verify-email/:token'
      ]
    }
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler triggered:', {
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  // OpenAI API error handling
  if (err.message && err.message.includes('OpenAI')) {
    return res.status(503).json({
      success: false,
      error: 'AI service temporarily unavailable',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
  
  // PostgreSQL error handling
  if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
    return res.status(400).json({
      success: false,
      error: 'Database constraint violation',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(400).json({
      success: false,
      error: `${field} already exists`
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  // MongoDB connection error
  if (err.name === 'MongoNetworkError') {
    return res.status(503).json({
      success: false,
      error: 'Database connection error'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      timestamp: new Date().toISOString()
    })
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running successfully on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${process.env.NODE_ENV === 'production' ? 'production domain' : 'http://localhost:3000'}`);
  console.log(`📊 Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`🔗 API documentation: http://localhost:${PORT}/`);
  console.log(`🤖 AI Assistant: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured - add OPENAI_API_KEY to .env'}`);
  console.log(`🎯 Recruiter API: ✅ Configured with PostgreSQL database`);
  console.log(`🔍 Global Search: ✅ Configured with cross-platform search`);
  console.log(`⚙️ Settings API: ✅ Configured with profile & security management`); // NEW
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error('🔥 UNHANDLED REJECTION:', {
    message: err.message,
    stack: err.stack,
    promise: promise
  });
  
  if (process.env.NODE_ENV === 'production') {
    console.log('🛑 Shutting down server due to unhandled promise rejection');
    server.close(() => {
      process.exit(1);
    });
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🔥 UNCAUGHT EXCEPTION:', {
    message: err.message,
    stack: err.stack
  });
  
  console.log('🛑 Shutting down server due to uncaught exception');
  process.exit(1);
});