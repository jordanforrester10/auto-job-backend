// routes/job.routes.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All job routes require authentication
router.use(authMiddleware.protect);

// Create a new job
router.post('/', jobController.createJob);

// Get all user jobs
router.get('/', jobController.getUserJobs);

// IMPORTANT: Place specific routes BEFORE parameterized routes

// Get analysis insights (must be before /:id)
router.get('/analysis-insights', jobController.getJobAnalysisInsights);

// AI Search Management Routes (must be before /:id)
router.get('/ai-searches', jobController.getUserAiSearches);
router.post('/ai-search/:searchId/pause', jobController.pauseAiSearch);
router.post('/ai-search/:searchId/resume', jobController.resumeAiSearch);
router.delete('/ai-search/:searchId', jobController.deleteAiSearch);

// Re-analyze job (must be before /:id)
router.post('/re-analyze/:id', jobController.reAnalyzeJob);

// Re-match job with best available resume (NEW - must be before /:id)
router.post('/rematch-best/:jobId', jobController.rematchJobWithBestResume);

// NEW: Get job analysis status (must be before /:id)
router.get('/analysis-status/:id', jobController.getJobAnalysisStatus);

// Get job by ID (this catches all /jobs/:id patterns, so it must come after specific routes)
router.get('/:id', jobController.getJobById);

// Get resume match status for a specific job
router.get('/:id/resume-match-status', jobController.getResumeMatchStatus);

// Update job
router.put('/:id', jobController.updateJob);

// Delete job
router.delete('/:id', jobController.deleteJob);

// Match resume with job
router.post('/match/:jobId/:resumeId', jobController.matchResumeWithJob);

// Get tailoring recommendations
router.post('/tailor/:jobId/:resumeId', jobController.tailorResumeToJob);

// Find jobs with AI
router.post('/find-with-ai/:resumeId', jobController.findJobsWithAi);

module.exports = router;