// backend/routes/resume.routes.js - FINAL WORKING VERSION
const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resume.controller');
const authMiddleware = require('../middleware/auth.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

console.log('🔧 Setting up resume routes...');



// 📡 REAL SSE endpoint - MUST be before auth middleware
console.log('📡 Registering SSE endpoint: /:id/optimization-progress');
router.get('/:id/optimization-progress', resumeController.getOptimizationProgress);

// 🔒 Apply auth middleware to all other routes
console.log('🔒 Applying auth middleware to remaining routes');
router.use(authMiddleware.protect);

// 📁 Other routes (all require authentication)
router.post('/upload', upload.single('file'), resumeController.uploadResume);
router.get('/', resumeController.getUserResumes);

// Specific routes BEFORE generic /:id
router.get('/status/:id', resumeController.getResumeProcessingStatus);
router.post('/:id/optimize-ats', resumeController.optimizeResumeForATS);
router.post('/analyze/:id', resumeController.analyzeResume);
router.post('/versions/:id', upload.single('file'), resumeController.addResumeVersion);
router.post('/tailor/:resumeId/:jobId', resumeController.createTailoredResume);
router.delete('/:id', resumeController.deleteResume);

router.get('/:id/job-suggestions', resumeController.getJobSuggestions);

// NEW: First-time user onboarding analysis endpoint
router.post('/:id/onboarding-analysis', resumeController.firstResumeAnalysis);

// Generic /:id route LAST
router.get('/:id', resumeController.getResumeById);

console.log('✅ Resume routes setup complete');

module.exports = router;
