// backend/controllers/tracker.controller.js - Job Application Tracker Controller
const TrackedJob = require('../models/mongodb/trackedJob.model');
const Job = require('../models/mongodb/job.model');
const User = require('../models/mongodb/user.model');
const Resume = require('../models/mongodb/resume.model');
const usageService = require('../services/usage.service');
const mongoose = require('mongoose');

// Get all tracked jobs for a user with filtering, pagination, and sorting
exports.getTrackedJobs = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    // Extract query parameters
    const {
      status,
      priority,
      archived = 'false',
      search,
      sortBy = 'lastActivity',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      includeArchived = 'false'
    } = req.query;

    console.log('🔍 Filter parameters:', { status, priority, archived, search, sortBy, sortOrder, page, limit, includeArchived });

    // Build filter query
    const filter = { userId };

    // Status filter
    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        filter.status = { $in: status };
      } else {
        filter.status = status;
      }
    }

    // Priority filter
    if (priority && priority !== 'all') {
      if (Array.isArray(priority)) {
        filter.priority = { $in: priority };
      } else {
        filter.priority = priority;
      }
    }

    // Archive filter - FIXED LOGIC HERE
    if (includeArchived === 'true') {
      // Show only archived jobs
      filter.isArchived = true;
    } else if (includeArchived === 'false') {
      // Show only non-archived jobs (default behavior)
      filter.isArchived = false;
    } else if (includeArchived === 'both') {
      // Show both archived and non-archived jobs (no filter applied)
      // Don't add isArchived filter
    }

    console.log('🎯 Final filter object:', filter);

    // Build sort object
    const sortObj = {};
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    switch (sortBy) {
      case 'lastActivity':
        sortObj.lastActivity = sortDirection;
        break;
      case 'status':
        sortObj.status = sortDirection;
        sortObj.lastActivity = -1; // Secondary sort
        break;
      case 'priority':
        sortObj.priority = sortDirection;
        sortObj.lastActivity = -1; // Secondary sort
        break;
      case 'applicationDate':
        sortObj.applicationDate = sortDirection;
        break;
      case 'createdAt':
        sortObj.createdAt = sortDirection;
        break;
      default:
        sortObj.lastActivity = -1;
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items per page
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline for search functionality
    let pipeline = [
      { $match: filter }
    ];

    // Add lookup for job details if search is provided
    if (search && search.trim()) {
      pipeline.push(
        {
          $lookup: {
            from: 'jobs',
            localField: 'jobId',
            foreignField: '_id',
            as: 'jobDetails'
          }
        },
        {
          $match: {
            $or: [
              { 'jobDetails.title': { $regex: search.trim(), $options: 'i' } },
              { 'jobDetails.company': { $regex: search.trim(), $options: 'i' } },
              { 'notes.content': { $regex: search.trim(), $options: 'i' } }
            ]
          }
        }
      );
    } else {
      // Add lookup for job details even without search
      pipeline.push({
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'jobDetails'
        }
      });
    }

    // Add lookup for resume details
    pipeline.push({
      $lookup: {
        from: 'resumes',
        localField: 'resumeId',
        foreignField: '_id',
        as: 'resumeDetails'
      }
    });

    // Add sorting
    pipeline.push({ $sort: sortObj });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await TrackedJob.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    // Add pagination
    pipeline.push(
      { $skip: skip },
      { $limit: limitNum }
    );

    // Execute aggregation
    const trackedJobs = await TrackedJob.aggregate(pipeline);

    console.log(`📊 Found ${trackedJobs.length} tracked jobs (total: ${totalCount})`);
    console.log(`🗂️ Archive status: includeArchived=${includeArchived}, filter.isArchived=${filter.isArchived}`);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      data: {
        trackedJobs,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: limitNum
        },
        filters: {
          status,
          priority,
          archived,
          search,
          sortBy,
          sortOrder,
          includeArchived
        }
      }
    });

  } catch (error) {
    console.error('Error fetching tracked jobs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch tracked jobs', 
      error: error.message 
    });
  }
};

// Track a new job (with duplicate prevention)
exports.trackJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    const { 
      jobId, 
      status = 'interested',
      priority = 'medium',
      notes,
      resumeId,
      source = 'manual',
      metadata = {}
    } = req.body;

    // Validate required fields
    if (!jobId) {
      return res.status(400).json({ 
        success: false,
        message: 'Job ID is required' 
      });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid job ID format' 
      });
    }

    // Check if job exists and belongs to user
    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      return res.status(404).json({ 
        success: false,
        message: 'Job not found or does not belong to user' 
      });
    }

    // Check if resume exists and belongs to user (if provided)
    if (resumeId) {
      if (!mongoose.Types.ObjectId.isValid(resumeId)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid resume ID format' 
        });
      }

      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        return res.status(404).json({ 
          success: false,
          message: 'Resume not found or does not belong to user' 
        });
      }
    }

    // Check for existing tracking (duplicate prevention)
    const existingTracking = await TrackedJob.findOne({ userId, jobId });
    if (existingTracking) {
      return res.status(409).json({ 
        success: false,
        message: 'Job is already being tracked',
        data: {
          existingTracking: {
            id: existingTracking._id,
            status: existingTracking.status,
            createdAt: existingTracking.createdAt,
            lastActivity: existingTracking.lastActivity
          }
        }
      });
    }

    // Create tracked job
    const trackedJobData = {
      userId,
      jobId,
      status,
      priority,
      source,
      metadata,
      lastActivity: new Date()
    };

    if (resumeId) {
      trackedJobData.resumeId = resumeId;
    }

    const trackedJob = new TrackedJob(trackedJobData);

    // Add initial note if provided
    if (notes && notes.trim()) {
      trackedJob.notes.push({
        content: notes.trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await trackedJob.save();

    // Populate job and resume details for response
    await trackedJob.populate([
      { path: 'jobId', select: 'title company location salary jobType sourcePlatform' },
      { path: 'resumeId', select: 'name createdAt' }
    ]);

    console.log(`✅ Job tracking started: ${job.title} at ${job.company} (Status: ${status})`);

    res.status(201).json({
      success: true,
      message: 'Job tracking started successfully',
      data: {
        trackedJob
      }
    });

  } catch (error) {
    console.error('Error tracking job:', error);
    
    // Handle duplicate key error (backup to schema validation)
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false,
        message: 'Job is already being tracked' 
      });
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to track job', 
      error: error.message 
    });
  }
};

// Update job status
exports.updateJobStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { id } = req.params;
    const { status, note } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid tracked job ID' 
      });
    }

    if (!status) {
      return res.status(400).json({ 
        success: false,
        message: 'Status is required' 
      });
    }

    // Find tracked job
    const trackedJob = await TrackedJob.findOne({ _id: id, userId });
    if (!trackedJob) {
      return res.status(404).json({ 
        success: false,
        message: 'Tracked job not found' 
      });
    }

    // Update status using instance method
    await trackedJob.updateStatus(status, note);

    // Populate job details for response
    await trackedJob.populate('jobId', 'title company');

    console.log(`📊 Job status updated: ${trackedJob.jobId.title} -> ${status}`);

    res.status(200).json({
      success: true,
      message: 'Job status updated successfully',
      data: {
        trackedJob
      }
    });

  } catch (error) {
    console.error('Error updating job status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update job status', 
      error: error.message 
    });
  }
};

// Update job notes
exports.updateJobNotes = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { id } = req.params;
    const { note } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid tracked job ID' 
      });
    }

    if (!note || !note.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Note content is required' 
      });
    }

    // Find tracked job
    const trackedJob = await TrackedJob.findOne({ _id: id, userId });
    if (!trackedJob) {
      return res.status(404).json({ 
        success: false,
        message: 'Tracked job not found' 
      });
    }

    // Add note using instance method
    await trackedJob.addNote(note.trim());

    // Populate job details for response
    await trackedJob.populate('jobId', 'title company');

    console.log(`📝 Note added to job: ${trackedJob.jobId.title}`);

    res.status(200).json({
      success: true,
      message: 'Note added successfully',
      data: {
        trackedJob
      }
    });

  } catch (error) {
    console.error('Error updating job notes:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update job notes', 
      error: error.message 
    });
  }
};

// Delete/Remove job tracking
exports.deleteTrackedJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid tracked job ID' 
      });
    }

    // Find and delete tracked job
    const trackedJob = await TrackedJob.findOneAndDelete({ _id: id, userId });
    if (!trackedJob) {
      return res.status(404).json({ 
        success: false,
        message: 'Tracked job not found' 
      });
    }

    // Get job details for logging
    const job = await Job.findById(trackedJob.jobId);
    const jobTitle = job ? `${job.title} at ${job.company}` : 'Unknown job';

    console.log(`🗑️ Job tracking removed: ${jobTitle}`);

    res.status(200).json({
      success: true,
      message: 'Job tracking removed successfully',
      data: {
        deletedJobId: trackedJob.jobId,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error deleting tracked job:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove job tracking', 
      error: error.message 
    });
  }
};

// Archive all closed jobs
exports.archiveAllClosed = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    // Find all closed jobs that aren't already archived
    const closedJobs = await TrackedJob.find({
      userId,
      status: 'closed',
      isArchived: false
    });

    if (closedJobs.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No closed jobs to archive',
        data: {
          archivedCount: 0
        }
      });
    }

    // Archive all closed jobs
    const result = await TrackedJob.updateMany(
      {
        userId,
        status: 'closed',
        isArchived: false
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          lastActivity: new Date()
        }
      }
    );

    console.log(`📦 Archived ${result.modifiedCount} closed jobs for user ${userId}`);

    res.status(200).json({
      success: true,
      message: `Successfully archived ${result.modifiedCount} closed jobs`,
      data: {
        archivedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error archiving closed jobs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to archive closed jobs', 
      error: error.message 
    });
  }
};

// Add interview to tracked job
exports.addInterview = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { id } = req.params;
    const interviewData = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid tracked job ID' 
      });
    }

    // Validate required interview fields
    if (!interviewData.type || !interviewData.scheduledDate) {
      return res.status(400).json({ 
        success: false,
        message: 'Interview type and scheduled date are required' 
      });
    }

    // Find tracked job
    const trackedJob = await TrackedJob.findOne({ _id: id, userId });
    if (!trackedJob) {
      return res.status(404).json({ 
        success: false,
        message: 'Tracked job not found' 
      });
    }

    // Schedule interview using instance method
    await trackedJob.scheduleInterview(interviewData);

    // Update status to interviewing if not already
    if (trackedJob.status === 'interested' || trackedJob.status === 'applied') {
      await trackedJob.updateStatus('interviewing', 'Interview scheduled');
    }

    // Populate job details for response
    await trackedJob.populate('jobId', 'title company');

    console.log(`📅 Interview scheduled: ${interviewData.type} for ${trackedJob.jobId.title}`);

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: {
        trackedJob
      }
    });

  } catch (error) {
    console.error('Error adding interview:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to schedule interview', 
      error: error.message 
    });
  }
};

// Get user statistics and dashboard data
exports.getStats = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    // Get basic statistics
    const stats = await TrackedJob.getUserStats(userId);
    const basicStats = stats.length > 0 ? stats[0] : { statusBreakdown: [], totalJobs: 0 };

    // Get jobs needing follow-up
    const jobsNeedingFollowUp = await TrackedJob.getJobsNeedingFollowUp(userId);

    // Get upcoming interviews
    const upcomingInterviews = await TrackedJob.getUpcomingInterviews(userId, 7);

    // Get recent activity (last 10 activities)
    const recentActivity = await TrackedJob.find({
      userId,
      isArchived: false
    })
    .sort({ lastActivity: -1 })
    .limit(10)
    .populate('jobId', 'title company')
    .select('status lastActivity notes');

    // Calculate additional metrics
    const totalTracked = basicStats.totalJobs;
    const statusCounts = {};
    basicStats.statusBreakdown.forEach(item => {
      statusCounts[item.status] = item.count;
    });

    // Calculate conversion rates
    const appliedCount = statusCounts.applied || 0;
    const interviewingCount = statusCounts.interviewing || 0;
    const closedCount = statusCounts.closed || 0;

    const applicationRate = totalTracked > 0 ? Math.round((appliedCount / totalTracked) * 100) : 0;
    const interviewRate = appliedCount > 0 ? Math.round((interviewingCount / appliedCount) * 100) : 0;

    // Get priority distribution
    const priorityStats = await TrackedJob.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          isArchived: false
        }
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const priorityCounts = {};
    priorityStats.forEach(item => {
      priorityCounts[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalTracked,
          statusBreakdown: basicStats.statusBreakdown,
          statusCounts,
          priorityCounts,
          metrics: {
            applicationRate,
            interviewRate,
            pendingFollowUps: jobsNeedingFollowUp.length,
            upcomingInterviews: upcomingInterviews.length
          }
        },
        jobsNeedingFollowUp: jobsNeedingFollowUp.slice(0, 5), // Limit to 5 for dashboard
        upcomingInterviews: upcomingInterviews.slice(0, 5), // Limit to 5 for dashboard
        recentActivity: recentActivity.map(job => ({
          id: job._id,
          jobTitle: job.jobId?.title || 'Unknown',
          company: job.jobId?.company || 'Unknown',
          status: job.status,
          lastActivity: job.lastActivity,
          lastNote: job.notes.length > 0 ? job.notes[job.notes.length - 1].content : null
        }))
      }
    });

  } catch (error) {
    console.error('Error getting tracker stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get tracker statistics', 
      error: error.message 
    });
  }
};

// Get single tracked job by ID
exports.getTrackedJobById = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid tracked job ID' 
      });
    }

    const trackedJob = await TrackedJob.findOne({ _id: id, userId })
      .populate('jobId')
      .populate('resumeId', 'name createdAt')
      .populate('userId', 'firstName lastName email');

    if (!trackedJob) {
      return res.status(404).json({ 
        success: false,
        message: 'Tracked job not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: {
        trackedJob
      }
    });

  } catch (error) {
    console.error('Error fetching tracked job:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch tracked job', 
      error: error.message 
    });
  }
};

// Update tracked job (general update)
exports.updateTrackedJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid tracked job ID' 
      });
    }

    // Find tracked job
    const trackedJob = await TrackedJob.findOne({ _id: id, userId });
    if (!trackedJob) {
      return res.status(404).json({ 
        success: false,
        message: 'Tracked job not found' 
      });
    }

    // Update allowed fields
    const allowedUpdates = ['priority', 'resumeId', 'metadata'];
    const actualUpdates = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        actualUpdates[field] = updates[field];
      }
    });

    // Validate resumeId if provided
    if (actualUpdates.resumeId) {
      if (!mongoose.Types.ObjectId.isValid(actualUpdates.resumeId)) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid resume ID format' 
        });
      }

      const resume = await Resume.findOne({ _id: actualUpdates.resumeId, userId });
      if (!resume) {
        return res.status(404).json({ 
          success: false,
          message: 'Resume not found or does not belong to user' 
        });
      }
    }

    // Apply updates
    Object.assign(trackedJob, actualUpdates);
    trackedJob.lastActivity = new Date();

    await trackedJob.save();

    // Populate for response
    await trackedJob.populate([
      { path: 'jobId', select: 'title company' },
      { path: 'resumeId', select: 'name' }
    ]);

    console.log(`✏️ Tracked job updated: ${trackedJob.jobId.title}`);

    res.status(200).json({
      success: true,
      message: 'Tracked job updated successfully',
      data: {
        trackedJob
      }
    });

  } catch (error) {
    console.error('Error updating tracked job:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update tracked job', 
      error: error.message 
    });
  }
};
