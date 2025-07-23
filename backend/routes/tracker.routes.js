// backend/routes/tracker.routes.js - Job Application Tracker Routes
const express = require('express');
const router = express.Router();
const trackerController = require('../controllers/tracker.controller');
const authMiddleware = require('../middleware/auth.middleware');

// All tracker routes require authentication
router.use(authMiddleware.protect);

// IMPORTANT: Place specific routes BEFORE parameterized routes

// Get user statistics and dashboard data
router.get('/stats', trackerController.getStats);

// Archive all closed jobs
router.put('/archive-all-closed', trackerController.archiveAllClosed);

// Get all tracked jobs for a user (with filtering, pagination, sorting)
router.get('/jobs', trackerController.getTrackedJobs);

// Track a new job (with duplicate prevention)
router.post('/jobs', trackerController.trackJob);

// Get single tracked job by ID (must be before /:id/status and /:id/notes)
router.get('/jobs/:id', trackerController.getTrackedJobById);

// Update job status
router.put('/jobs/:id/status', trackerController.updateJobStatus);

// Update job notes
router.put('/jobs/:id/notes', trackerController.updateJobNotes);

// Add interview to tracked job
router.post('/jobs/:id/interview', trackerController.addInterview);

// Update tracked job (general update for priority, resumeId, metadata)
router.put('/jobs/:id', trackerController.updateTrackedJob);

// Delete/Remove job tracking
router.delete('/jobs/:id', trackerController.deleteTrackedJob);

module.exports = router;
