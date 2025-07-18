// controllers/job.controller.js - UPDATED WITH FEATURE GATING
const Job = require('../models/mongodb/job.model');
const Resume = require('../models/mongodb/resume.model');
const jobAnalysisService = require('../services/jobAnalysis.service');
const jobMatchingService = require('../services/jobMatching.service');
const resumeTailoringService = require('../services/resumeTailoring.service');
const jobSearchService = require('../services/jobSearch.service');
const subscriptionService = require('../services/subscription.service');
const usageService = require('../services/usage.service');
const mongoose = require('mongoose');

// Enhanced background processing for manual jobs (uses premium GPT-4o)
async function processJobInBackground(jobId, jobMetadata = {}) {
  try {
    console.log(`🔍 Starting premium analysis for manually uploaded job: ${jobId}`);
    
    // Get the job from the database
    const job = await Job.findById(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Update status: Starting analysis (10%)
    await updateJobAnalysisStatus(jobId, 'analyzing', 10, 'Starting premium job analysis...');
    
    // Add realistic delay to show progress
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Update status: Extracting requirements (40%)
    await updateJobAnalysisStatus(jobId, 'analyzing', 40, 'Extracting job requirements with GPT-4o...');
    
    // Analyze the job using PREMIUM GPT-4o service for manual uploads
    console.log('🤖 Starting premium job analysis with GPT-4o...');
    const parsedData = await jobAnalysisService.analyzeJob(job.description, {
      title: job.title,
      company: job.company,
      location: job.location,
      ...jobMetadata
    }, {
      isAiDiscovery: false,    // Use premium GPT-4o for manual jobs
      prioritizeCost: false    // Prioritize quality for manual uploads
    });
    
    // Update status: Processing results (80%)
    await updateJobAnalysisStatus(jobId, 'analyzing', 80, 'Processing premium analysis results...');
    
    // Add small delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update the job with parsed data
    job.parsedData = parsedData;
    job.updatedAt = new Date();
    
    // Mark analysis as complete with final status
    await updateJobAnalysisStatus(jobId, 'completed', 100, 
      `Premium analysis complete! Found ${parsedData.keySkills?.length || 0} key skills with GPT-4o.`, {
        completedAt: new Date(),
        skillsFound: parsedData.keySkills?.length || 0,
        experienceLevel: parsedData.experienceLevel,
        canViewJob: true,
        modelUsed: parsedData.analysisMetadata?.model || 'gpt-4o',
        analysisType: 'manual_upload_premium'
      });
    
    await job.save();
    
    console.log(`✅ Premium job analysis completed successfully for: ${job.title}`);
    console.log(`📊 Results: ${parsedData.keySkills?.length || 0} skills, model: ${parsedData.analysisMetadata?.model}, cost: ${parsedData.analysisMetadata?.estimatedCost}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error in premium background processing:', error);
    
    // Update job to indicate analysis failed
    await updateJobAnalysisStatus(jobId, 'error', 0, `Premium analysis failed: ${error.message}`, {
      error: error.message,
      canViewJob: true,
      modelUsed: 'error'
    });
    
    throw error;
  }
}

async function updateJobAnalysisStatus(jobId, status, progress, message, additionalData = {}) {
  try {
    const job = await Job.findById(jobId);
    if (!job) {
      console.error(`Job not found for status update: ${jobId}`);
      return false;
    }
    
    job.analysisStatus = {
      status,
      progress,
      message,
      updatedAt: new Date(),
      ...additionalData
    };
    
    if (status === 'completed') {
      job.analysisStatus.completedAt = new Date();
    }
    
    await job.save();
    console.log(`📊 Updated analysis status for ${jobId}: ${status} (${progress}%) - ${message}`);
    return true;
  } catch (err) {
    console.error('Error updating job analysis status:', err);
    return false;
  }
}



// Create a new job with premium analysis - WITH USAGE LIMITS
exports.createJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // 🔒 FEATURE GATING: Check job import limits before processing
    console.log('🔒 Checking job import limits for user:', userId);
    
    try {
      const importPermission = await usageService.checkUsageLimit(userId, 'jobImports', 1);
      
      if (!importPermission.allowed) {
        console.log('❌ Job import limit exceeded:', importPermission.reason);
        return res.status(403).json({ 
          message: 'Job import limit reached',
          error: importPermission.reason,
          current: importPermission.current,
          limit: importPermission.limit,
          plan: importPermission.plan,
          upgradeRequired: true,
          feature: 'jobImports'
        });
      }
      
      console.log('✅ Job import permission granted:', {
        current: importPermission.current,
        limit: importPermission.limit,
        remaining: importPermission.remaining
      });
      
    } catch (permissionError) {
      console.error('❌ Error checking job import permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate job import permission',
        error: permissionError.message 
      });
    }
    
    const { 
      title, 
      company, 
      location, 
      description, 
      sourceUrl, 
      salary,
      jobType 
    } = req.body;
    
    // Validate required fields
    if (!title || !company || !description) {
      return res.status(400).json({ 
        message: 'Job title, company, and description are required' 
      });
    }
    
    // Create the job with initial analysis status
    const job = new Job({
      userId,
      title,
      company,
      location: location || {},
      description,
      sourceUrl,
      salary: salary || {},
      jobType: jobType || 'FULL_TIME',
      sourcePlatform: 'MANUAL',
      analysisStatus: {
        status: 'pending',
        progress: 0,
        message: 'Premium analysis queued...',
        startedAt: new Date(),
        canViewJob: false,
        estimatedCompletion: new Date(Date.now() + 45000), // 45 seconds for premium analysis
        analysisType: 'manual_upload_premium'
      }
    });
    
    // Save job to database
    await job.save();
    
    // 🔒 FEATURE GATING: Track successful job import AFTER job is saved
    try {
      await usageService.trackUsage(userId, 'jobImports', 1, {
        jobId: job._id.toString(),
        title: title,
        company: company,
        importType: 'manual',
        sourcePlatform: 'MANUAL'
      });
      console.log('✅ Job import usage tracked successfully');
    } catch (trackingError) {
      console.error('❌ Error tracking job import usage (non-critical):', trackingError);
      // Don't fail the job creation if tracking fails
    }
    
    console.log(`🔍 Manual job created: ${job.title} at ${job.company} - Starting premium analysis...`);
    
    // Process job in background with premium analysis
    processJobInBackground(job._id, { title, company, location }).catch(err => {
      console.error('Background job processing error:', err);
    });
    
    res.status(201).json({
      message: 'Job created successfully and premium analysis initiated',
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        createdAt: job.createdAt,
        analysisStatus: job.analysisStatus
      }
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Failed to create job', error: error.message });
  }
};

// Get all user jobs with enhanced analysis status and usage stats
exports.getUserJobs = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const jobs = await Job.find({ userId }).sort({ createdAt: -1 });
    
    // 🔒 FEATURE GATING: Get usage statistics to include in response
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        jobImports: userUsage.usageStats.jobImports,
        plan: userUsage.plan,
        planLimits: {
          jobImports: userUsage.planLimits.jobImports,
          aiJobDiscovery: userUsage.planLimits.aiJobDiscovery
        }
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats (non-critical):', usageError);
    }
    
    // Enhance jobs with analysis status information and job board approach info
    const enhancedJobs = jobs.map(job => {
      const jobObj = job.toObject();
      
      // Determine analysis status
      let analysisStatus = 'completed';
      let progress = 100;
      let message = 'Analysis complete';
      let canViewJob = true;
      let modelUsed = 'unknown';
      let analysisType = 'unknown';
      let isRealJobBoardDiscovery = false;
      let sourceJobBoard = null;
      
      if (job.analysisStatus) {
        analysisStatus = job.analysisStatus.status;
        progress = job.analysisStatus.progress;
        message = job.analysisStatus.message;
        canViewJob = job.analysisStatus.status === 'completed' || job.analysisStatus.status === 'error';
        modelUsed = job.analysisStatus.modelUsed || 'unknown';
        analysisType = job.analysisStatus.analysisType || 'unknown';
      } else if (!job.parsedData || Object.keys(job.parsedData).length === 0) {
        analysisStatus = 'pending';
        progress = 0;
        message = 'Analysis pending...';
        canViewJob = false;
      } else if (job.parsedData.analysisMetadata) {
        modelUsed = job.parsedData.analysisMetadata.model || 'completed';
        analysisType = job.parsedData.analysisMetadata.analysisType || 'completed';
      }
      
      // Check if this is from real job board discovery
      isRealJobBoardDiscovery = job.sourcePlatform && (
        job.sourcePlatform.includes('AI_FOUND_GREENHOUSE') ||
        job.sourcePlatform.includes('AI_FOUND_LEVER') ||
        job.sourcePlatform.includes('AI_FOUND_INDEED')
      );
      
      // Extract source job board
      if (isRealJobBoardDiscovery) {
        if (job.sourcePlatform.includes('GREENHOUSE')) sourceJobBoard = 'Greenhouse';
        else if (job.sourcePlatform.includes('LEVER')) sourceJobBoard = 'Lever';
        else if (job.sourcePlatform.includes('INDEED')) sourceJobBoard = 'Indeed';
      }
      
      return {
        ...jobObj,
        analysisStatus: {
          status: analysisStatus,
          progress: progress,
          message: message,
          canViewJob: canViewJob,
          skillsFound: job.parsedData?.keySkills?.length || 0,
          experienceLevel: job.parsedData?.experienceLevel,
          modelUsed: modelUsed,
          analysisType: analysisType,
          isAiDiscovery: job.sourcePlatform === 'AI_FOUND' || 
                        job.sourcePlatform === 'AI_FOUND_OPTIMIZED' ||
                        job.sourcePlatform === 'AI_FOUND_INTELLIGENT' ||
                        isRealJobBoardDiscovery,
          isRealJobBoardDiscovery: isRealJobBoardDiscovery,
          sourceJobBoard: sourceJobBoard,
          searchApproach: isRealJobBoardDiscovery ? '3-phase-real-job-boards' : 
                         (job.sourcePlatform?.includes('AI_FOUND') ? 'legacy-ai' : 'manual'),
          qualityLevel: analysisType?.includes('premium') ? 'premium' : 'standard',
          updatedAt: job.analysisStatus?.updatedAt || job.updatedAt,
          realJobBoardData: job.parsedData?.realJobBoardData || null
        }
      };
    });
    
    res.status(200).json({ 
      jobs: enhancedJobs,
      usageStats: usageStats
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
  }
};

// Get job by ID with real job board context
exports.getJobById = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const jobId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }
    
    const job = await Job.findOne({ _id: jobId, userId });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    res.status(200).json({ job });
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ message: 'Failed to fetch job', error: error.message });
  }
};

// Get job analysis status with real job board information
exports.getJobAnalysisStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const jobId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }
    
    const job = await Job.findOne({ _id: jobId, userId }, 'analysisStatus parsedData title company createdAt sourcePlatform');
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    let status = 'completed';
    let progress = 100;
    let message = 'Analysis complete';
    let canViewJob = true;
    let skillsFound = 0;
    let experienceLevel = null;
    let modelUsed = 'unknown';
    let analysisType = 'unknown';
    let isRealJobBoardDiscovery = false;
    let sourceJobBoard = null;
    
    if (job.analysisStatus && job.analysisStatus.status) {
      status = job.analysisStatus.status;
      progress = job.analysisStatus.progress || 0;
      message = job.analysisStatus.message || 'Processing...';
      canViewJob = job.analysisStatus.canViewJob !== false;
      skillsFound = job.analysisStatus.skillsFound || 0;
      experienceLevel = job.analysisStatus.experienceLevel;
      modelUsed = job.analysisStatus.modelUsed || 'unknown';
      analysisType = job.analysisStatus.analysisType || 'unknown';
    } 
    else if (job.parsedData && Object.keys(job.parsedData).length > 0 && !job.parsedData.analysisError) {
      status = 'completed';
      progress = 100;
      message = `Premium analysis complete! Found ${job.parsedData.keySkills?.length || 0} key skills.`;
      canViewJob = true;
      skillsFound = job.parsedData.keySkills?.length || 0;
      experienceLevel = job.parsedData.experienceLevel;
      modelUsed = job.parsedData.analysisMetadata?.model || 'gpt-4o';
      analysisType = job.parsedData.analysisMetadata?.analysisType || 'premium';
    }
    else if (job.parsedData && job.parsedData.analysisError) {
      status = 'error';
      progress = 0;
      message = 'Analysis failed';
      canViewJob = true;
    }
    else {
      status = 'pending';
      progress = 0;
      message = 'Analysis pending...';
      canViewJob = false;
    }
    
    // Check if this is from real job board discovery
    isRealJobBoardDiscovery = job.sourcePlatform && (
      job.sourcePlatform.includes('AI_FOUND_GREENHOUSE') ||
      job.sourcePlatform.includes('AI_FOUND_LEVER') ||
      job.sourcePlatform.includes('AI_FOUND_INDEED')
    );
    
    // Extract source job board
    if (isRealJobBoardDiscovery) {
      if (job.sourcePlatform.includes('GREENHOUSE')) sourceJobBoard = 'Greenhouse';
      else if (job.sourcePlatform.includes('LEVER')) sourceJobBoard = 'Lever';
      else if (job.sourcePlatform.includes('INDEED')) sourceJobBoard = 'Indeed';
    }
    
    console.log(`📊 Analysis Status for job ${jobId}: ${status} (${progress}%) - ${message}`);
    
    res.status(200).json({ 
      analysisStatus: {
        status,
        progress,
        message,
        updatedAt: job.analysisStatus?.updatedAt || new Date(),
        skillsFound,
        experienceLevel,
        isAnalysisComplete: status === 'completed',
        canViewJob: canViewJob,
        modelUsed: modelUsed,
        analysisType: analysisType,
        isRealJobBoardDiscovery: isRealJobBoardDiscovery,
        sourceJobBoard: sourceJobBoard,
        searchApproach: isRealJobBoardDiscovery ? '3-phase-real-job-boards' : 
                       (job.sourcePlatform?.includes('AI_FOUND') ? 'legacy-ai' : 'manual'),
        qualityLevel: analysisType?.includes('premium') ? 'premium' : 'standard',
        error: job.analysisStatus?.error || job.parsedData?.analysisError
      },
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        createdAt: job.createdAt,
        sourcePlatform: job.sourcePlatform
      },
      realJobBoardInfo: isRealJobBoardDiscovery ? {
        description: 'This job was discovered using our ENHANCED 3-Phase approach with REAL job board integration',
        sourceJobBoard: sourceJobBoard,
        benefits: [
          `Discovered from actual ${sourceJobBoard} company posting`,
          'Real job content from company ATS platform',
          'Premium GPT-4o analysis (same quality as manual jobs)',
          'Enhanced job matching and relevance',
          'Direct company posting verification'
        ],
        jobBoardFeatures: {
          greenhouse: 'Tech startups and scale-ups with comprehensive job details',
          lever: 'Growth-stage companies with detailed role information',
          indeed: 'Established companies with verified direct postings'
        }[sourceJobBoard?.toLowerCase()] || 'High-quality company job posting'
      } : null
    });
  } catch (error) {
    console.error('Error fetching job analysis status:', error);
    res.status(500).json({ message: 'Failed to fetch analysis status', error: error.message });
  }
};

// Update job
exports.updateJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const jobId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }
    
    const job = await Job.findOne({ _id: jobId, userId });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    const { 
      title, 
      company, 
      location, 
      description, 
      sourceUrl, 
      salary,
      jobType,
      applicationStatus,
      notes
    } = req.body;
    
    let needsReanalysis = false;
    
    // Update fields if provided
    if (title && title !== job.title) {
      job.title = title;
      needsReanalysis = true;
    }
    if (company && company !== job.company) {
      job.company = company;
      needsReanalysis = true;
    }
    if (location) job.location = location;
    if (description && description !== job.description) {
      job.description = description;
      job.parsedData = {}; // Clear parsedData to trigger re-analysis
      needsReanalysis = true;
    }
    if (sourceUrl) job.sourceUrl = sourceUrl;
    if (salary) job.salary = salary;
    if (jobType) job.jobType = jobType;
    if (applicationStatus) job.applicationStatus = applicationStatus;
    
    // Add a new note if provided
    if (notes && notes.content) {
      job.notes.push({
        content: notes.content,
        createdAt: new Date()
      });
    }
    
    await job.save();
    
    // If significant changes were made, trigger re-analysis with PREMIUM model
    if (needsReanalysis) {
      processJobInBackground(job._id, {
        title: job.title,
        company: job.company,
        location: job.location
      }).catch(err => {
        console.error('Background job processing error after update:', err);
      });
    }
    
    res.status(200).json({
      message: 'Job updated successfully',
      job: {
        id: job._id,
        title: job.title,
        company: job.company,
        updatedAt: job.updatedAt
      },
      reanalysisTriggered: needsReanalysis,
      reanalysisNote: needsReanalysis ? 'Premium re-analysis initiated with GPT-4o' : null
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ message: 'Failed to update job', error: error.message });
  }
};

// Delete job
exports.deleteJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const jobId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }
    
    const job = await Job.findOne({ _id: jobId, userId });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    await Job.deleteOne({ _id: jobId });
    
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Failed to delete job', error: error.message });
  }
};

// Match resume with job - WITH USAGE LIMITS FOR TAILORING
exports.matchResumeWithJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const { jobId, resumeId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid job ID or resume ID' });
    }
    
    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Check if the job has been analyzed
    if (!job.parsedData || Object.keys(job.parsedData).length === 0 || job.parsedData.analysisError) {
      console.log('Job analysis missing or failed, attempting re-analysis...');
      try {
        await processJobInBackground(jobId, {
          title: job.title,
          company: job.company,
          location: job.location
        });
        const updatedJob = await Job.findById(jobId);
        if (!updatedJob.parsedData || Object.keys(updatedJob.parsedData).length === 0) {
          throw new Error('Job re-analysis failed');
        }
        Object.assign(job, updatedJob);
      } catch (analysisError) {
        console.error('Job re-analysis failed:', analysisError);
        return res.status(400).json({ 
          message: 'Job analysis not complete and re-analysis failed. Please try again later.',
          error: analysisError.message
        });
      }
    }
    
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      return res.status(400).json({ message: 'Resume parsing not complete. Please try again later.' });
    }
    
    console.log(`Starting enhanced matching for job "${job.title}" with resume "${resume.name}"`);
    
    const matchResults = await jobMatchingService.matchResumeWithJob(resumeId, jobId);
    
    job.matchAnalysis = {
      resumeId,
      lastAnalyzed: new Date(),
      ...matchResults
    };
    await job.save();
    
    console.log(`Enhanced matching completed - Overall Score: ${matchResults.overallScore}%`);
    
    res.status(200).json({
      message: 'Enhanced resume-job matching completed successfully',
      matchAnalysis: job.matchAnalysis,
      matchingVersion: matchResults.analysisMetadata?.algorithmVersion || '2.0'
    });
  } catch (error) {
    console.error('Error in enhanced matching:', error);
    res.status(500).json({ 
      message: 'Failed to match resume with job', 
      error: error.message,
      suggestion: 'Please ensure both the job and resume have been properly analyzed'
    });
  }
};

// Get tailoring recommendations - UPDATED: NO USAGE TRACKING HERE
exports.tailorResumeToJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const { jobId, resumeId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(jobId) || !mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid job ID or resume ID' });
    }
    
    const job = await Job.findOne({ _id: jobId, userId });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    if (!job.parsedData || Object.keys(job.parsedData).length === 0 || job.parsedData.analysisError) {
      return res.status(400).json({ message: 'Job analysis not complete. Please try again later.' });
    }
    
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      return res.status(400).json({ message: 'Resume parsing not complete. Please try again later.' });
    }
    
    if (!job.matchAnalysis || !job.matchAnalysis.overallScore) {
      console.log('No match analysis found, performing matching first...');
      const matchResults = await jobMatchingService.matchResumeWithJob(resumeId, jobId);
      job.matchAnalysis = {
        resumeId,
        lastAnalyzed: new Date(),
        ...matchResults
      };
      await job.save();
    }
    
    const tailoringResult = await resumeTailoringService.getTailoringRecommendations(resumeId, jobId);
    
    res.status(200).json({
      message: 'Resume tailoring recommendations generated successfully',
      tailoringResult,
      matchScore: job.matchAnalysis.overallScore
    });
  } catch (error) {
    console.error('Error generating resume tailoring recommendations:', error);
    res.status(500).json({ 
      message: 'Failed to generate resume tailoring recommendations', 
      error: error.message 
    });
  }
};

// Find jobs with ENHANCED AI (Real Job Board Integration) - WITH STRICT PLAN PERMISSIONS
// 🔧 FIXED: Find jobs with AI - now properly extracts and passes location data
exports.findJobsWithAi = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // 🔒 ENHANCED FEATURE GATING: Strict plan-based AI job discovery permissions
    console.log('🔒 Checking AI job discovery permissions for user:', userId);
    
    let currentSubscription = null; // Declare in function scope
    
    try {
      currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const userPlan = currentSubscription.user.subscriptionTier;
      const aiDiscoveryAllowed = currentSubscription.planLimits.aiJobDiscovery;
      
      console.log(`📊 User plan: ${userPlan}, AI discovery allowed: ${aiDiscoveryAllowed}`);
      
      // RESTRICTION 1: Free users cannot access AI job discovery at all
      if (userPlan === 'free') {
        console.log('❌ AI job discovery denied - Free plan user');
        return res.status(403).json({ 
          message: 'AI job discovery not available on Free plan',
          error: 'This feature requires Casual plan or higher',
          currentPlan: userPlan,
          upgradeRequired: true,
          feature: 'aiJobDiscovery',
          availableOn: ['casual', 'hunter'],
          upgradeMessage: 'Upgrade to Casual plan to unlock AI job discovery',
          upgradeUrl: '/pricing'
        });
      }
      
      // RESTRICTION 2: Check if AI job discovery feature is enabled for the plan
      if (!aiDiscoveryAllowed) {
        console.log('❌ AI job discovery not available on current plan:', userPlan);
        return res.status(403).json({ 
          message: 'AI job discovery not available on your current plan',
          error: 'This feature is not included in your subscription',
          currentPlan: userPlan,
          upgradeRequired: true,
          feature: 'aiJobDiscovery'
        });
      }
      
      // RESTRICTION 3: For Casual plan, check usage limits (1 discovery per month)
      if (userPlan === 'casual') {
        const discoveryPermission = await usageService.checkUsageLimit(userId, 'aiJobDiscovery', 1);
        
        if (!discoveryPermission.allowed) {
          console.log('❌ AI job discovery limit exceeded for Casual plan:', discoveryPermission.reason);
          return res.status(403).json({ 
            message: 'AI job discovery limit reached for Casual plan',
            error: discoveryPermission.reason,
            current: discoveryPermission.current,
            limit: discoveryPermission.limit,
            plan: discoveryPermission.plan,
            upgradeRequired: true,
            feature: 'aiJobDiscovery',
            upgradeOption: 'Upgrade to Hunter plan for unlimited AI job discovery',
            upgradeMessage: 'You\'ve used your 1 AI job discovery for this month. Upgrade to Hunter for unlimited searches.',
            upgradeUrl: '/pricing'
          });
        }
        
        console.log('✅ AI job discovery permission granted for Casual plan:', {
          current: discoveryPermission.current,
          limit: discoveryPermission.limit,
          remaining: discoveryPermission.remaining
        });
      }
      
      // RESTRICTION 4: Hunter users have unlimited access (no additional checks needed)
      if (userPlan === 'hunter') {
        console.log('✅ AI job discovery permission granted for Hunter plan (unlimited)');
      }
      
    } catch (permissionError) {
      console.error('❌ Error checking AI job discovery permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI job discovery permission',
        error: permissionError.message 
      });
    }
    
    const { resumeId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      return res.status(400).json({ message: 'Resume parsing not complete. Please try again later.' });
    }
    
    // 🔧 FIX: Properly extract searchCriteria from request body including job titles
    console.log('🚀 Backend: Received AI job search request');
    console.log('📋 Backend: Resume ID:', resumeId);
    console.log('👤 Backend: User ID:', userId);
    console.log('📦 Backend: Full request body:', JSON.stringify(req.body, null, 2));
    
    // Extract searchCriteria from request body
    const {
      jobTitles,
      searchLocations,
      includeRemote,
      experienceLevel,
      jobTypes,
      salaryRange,
      workEnvironment
    } = req.body;
    
    // 🆕 NEW: Validate job titles input
    if (!jobTitles || !Array.isArray(jobTitles) || jobTitles.length === 0) {
      return res.status(400).json({
        message: 'Job titles are required',
        error: 'Please provide at least one job title to search for',
        field: 'jobTitles'
      });
    }
    
    if (jobTitles.length > 10) {
      return res.status(400).json({
        message: 'Too many job titles',
        error: 'Maximum 10 job titles allowed',
        field: 'jobTitles'
      });
    }
    
    // Validate each job title
    for (const title of jobTitles) {
      if (!title || typeof title !== 'string' || title.trim().length < 2 || title.trim().length > 100) {
        return res.status(400).json({
          message: 'Invalid job title',
          error: 'Each job title must be 2-100 characters long',
          field: 'jobTitles',
          invalidTitle: title
        });
      }
    }
    
    // Clean and normalize job titles
    const normalizedJobTitles = jobTitles.map(title => title.trim()).filter(title => title.length > 0);
    
    // Build searchCriteria object with all received data including job titles
    const searchCriteria = {
      jobTitles: normalizedJobTitles, // 🆕 NEW: Include job titles
      searchLocations: searchLocations || [{ name: 'Remote', type: 'remote' }],
      includeRemote: includeRemote !== false,
      experienceLevel: experienceLevel || 'mid',
      jobTypes: jobTypes || ['FULL_TIME'],
      salaryRange: salaryRange || null,
      workEnvironment: workEnvironment || 'any'
    };
    
    console.log('🌍 Backend: Extracted search locations:', JSON.stringify(searchCriteria.searchLocations, null, 2));
    console.log('🏠 Backend: Include remote:', searchCriteria.includeRemote);
    console.log('📊 Backend: Full search criteria:', JSON.stringify(searchCriteria, null, 2));
    
    // Validate searchLocations format
    if (!Array.isArray(searchCriteria.searchLocations) || searchCriteria.searchLocations.length === 0) {
      console.log('⚠️ Backend: Invalid searchLocations, defaulting to Remote');
      searchCriteria.searchLocations = [{ name: 'Remote', type: 'remote' }];
    }
    
    // Log the locations we're about to search
    const locationNames = searchCriteria.searchLocations.map(loc => loc.name);
    console.log(`🔍 Backend: Starting AI search for locations: ${locationNames.join(', ')}`);
    
    // 🔒 FEATURE GATING: Track AI job discovery usage for Casual plan users
    try {
      if (currentSubscription.user.subscriptionTier === 'casual') {
        await usageService.trackUsage(userId, 'aiJobDiscovery', 1, {
          resumeId: resumeId,
          searchType: 'weekly_multi_location_discovery',
          initiatedAt: new Date(),
          planRestriction: 'casual_monthly_limit',
          locations: locationNames
        });
        console.log('✅ AI job discovery usage tracked for Casual plan user');
      } else if (currentSubscription.user.subscriptionTier === 'hunter') {
        // For Hunter users, we still track for analytics but don't enforce limits
        await usageService.trackUsage(userId, 'aiJobDiscovery', 1, {
          resumeId: resumeId,
          searchType: 'weekly_multi_location_discovery',
          initiatedAt: new Date(),
          planRestriction: 'hunter_unlimited',
          locations: locationNames
        });
        console.log('✅ AI job discovery usage tracked for Hunter plan user (unlimited)');
      }
    } catch (trackingError) {
      console.error('❌ Error tracking AI job discovery usage (non-critical):', trackingError);
      // Don't fail the job discovery if tracking fails, but log the issue
    }
    
    // 🔧 FIX: Call jobSearchService with proper parameter order and data
    console.log('🚀 Backend: Calling jobSearchService.findJobsWithAi with:', {
      userId,
      resumeId,
      searchCriteria
    });
    
    // Start ENHANCED AI job search with proper location data
    const searchResult = await jobSearchService.findJobsWithAi(userId, resumeId, searchCriteria);
    
    console.log('✅ Backend: AI job search initiated successfully');
    console.log('📊 Backend: Search result:', JSON.stringify(searchResult, null, 2));
    
    // Return success response
    res.status(202).json({
      message: searchResult.message || 'Weekly AI job search with multi-location support initiated successfully!',
      status: 'processing',
      data: {
        searchId: searchResult.searchId,
        searchMethod: searchResult.searchMethod || 'Weekly Multi-Location Discovery',
        weeklyLimit: searchResult.weeklyLimit,
        locations: locationNames,
        nextRun: searchResult.nextRun
      },
      planInfo: {
        currentPlan: currentSubscription?.user?.subscriptionTier || 'unknown',
        unlimited: currentSubscription?.user?.subscriptionTier === 'hunter',
        remainingSearches: currentSubscription?.user?.subscriptionTier === 'casual' 
          ? Math.max(0, 1 - (currentSubscription?.usageStats?.aiJobDiscovery?.used || 0))
          : -1 // unlimited for hunter
      },
      weeklySearchInfo: {
        searchApproach: 'Weekly Multi-Location Discovery with Enhanced Salary Extraction',
        targetLocations: locationNames,
        weeklyJobLimit: searchResult.weeklyLimit,
        searchFrequency: 'Every Monday at 9 AM',
        features: [
          'Smart location-based job discovery',
          'Enhanced salary extraction from job descriptions',
          'Premium analysis with GPT-4o for all discovered jobs',
          'Direct employer links and company verification',
          'Weekly automation with pause/resume controls'
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Backend: Error initiating weekly AI job search:', error);
    res.status(500).json({ 
      message: 'Failed to initiate weekly AI job search with multi-location support', 
      error: error.message 
    });
  }
};

// Re-analyze a job with premium model
exports.reAnalyzeJob = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const jobId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }
    
    const job = await Job.findOne({ _id: jobId, userId });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    console.log(`Manual re-analysis triggered for job: ${job.title} at ${job.company}`);
    
    // Perform re-analysis with PREMIUM model for manual triggers
    const analysisResult = await jobAnalysisService.analyzeJob(job.description, {
      title: job.title,
      company: job.company,
      location: job.location
    }, {
      isAiDiscovery: false,    // Use premium GPT-4o for manual re-analysis
      prioritizeCost: false    // Prioritize quality
    });
    
    // Update the job
    job.parsedData = analysisResult;
    job.updatedAt = new Date();
    
    // Clear any existing match analysis since the job has changed
    if (job.matchAnalysis) {
      job.matchAnalysis = null;
    }
    
    await job.save();
    
    res.status(200).json({
      message: 'Job re-analysis completed successfully with premium model',
      analysisResult: {
        skillsFound: analysisResult.keySkills?.length || 0,
        experienceLevel: analysisResult.experienceLevel,
        algorithmVersion: analysisResult.analysisMetadata?.algorithmVersion,
        modelUsed: analysisResult.analysisMetadata?.model,
        estimatedCost: analysisResult.analysisMetadata?.estimatedCost,
        analysisType: analysisResult.analysisMetadata?.analysisType,
        analyzedAt: analysisResult.analysisMetadata?.analyzedAt
      }
    });
  } catch (error) {
    console.error('Error re-analyzing job:', error);
    res.status(500).json({ 
      message: 'Failed to re-analyze job', 
      error: error.message 
    });
  }
};

// Re-match job with best available resume
exports.rematchJobWithBestResume = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    console.log(`Re-matching job ${jobId} with best resume for user ${userId}`);
    
    const result = await jobMatchingService.matchJobWithBestResume(jobId, userId);
    
    console.log('Re-matching completed:', {
      jobId,
      usedResumeId: result.usedResume.id,
      usedResumeName: result.usedResume.name,
      isTailored: result.usedResume.isTailored,
      newMatchScore: result.matchAnalysis.overallScore
    });
    
    res.status(200).json({
      message: 'Job re-matched with best available resume',
      matchAnalysis: result.matchAnalysis,
      usedResume: result.usedResume
    });
    
  } catch (error) {
    console.error('Error re-matching job:', error);
    res.status(500).json({ 
      message: 'Failed to re-match job with best resume', 
      error: error.message 
    });
  }
};

// Get resume match status for a specific job
exports.getResumeMatchStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const jobId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }
    
    const resumes = await Resume.find({ userId });
    const job = await Job.findOne({ _id: jobId, userId });
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    const tailoredResumes = await Resume.find({ 
      userId, 
      isTailored: true, 
      'tailoredForJob.jobId': jobId 
    });
    
    const resumeStatusMap = {};
    
    resumes.forEach(resume => {
      const resumeId = resume._id.toString();
      resumeStatusMap[resumeId] = {
        id: resume._id,
        name: resume.name,
        isMatched: job.matchAnalysis && job.matchAnalysis.resumeId && 
                   job.matchAnalysis.resumeId.toString() === resumeId,
        isTailored: false,
        tailoredVersions: []
      };
    });
    
    tailoredResumes.forEach(tailoredResume => {
      const originalResumeId = tailoredResume.tailoredForJob?.originalResumeId?.toString();
      
      if (originalResumeId && resumeStatusMap[originalResumeId]) {
        resumeStatusMap[originalResumeId].isTailored = true;
        resumeStatusMap[originalResumeId].tailoredVersions.push({
          id: tailoredResume._id,
          name: tailoredResume.name,
          createdAt: tailoredResume.createdAt
        });
      } else {
        console.log('Found tailored resume without clear original reference:', tailoredResume.name);
      }
    });
    
    res.status(200).json({ 
      resumeStatusMap,
      jobMatchedResumeId: job.matchAnalysis?.resumeId?.toString() || null
    });
  } catch (error) {
    console.error('Error fetching resume match status:', error);
    res.status(500).json({ message: 'Failed to fetch resume match status', error: error.message });
  }
};

// Get job analysis insights with real job board statistics
exports.getJobAnalysisInsights = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // Get all user's jobs with analysis data
    const jobs = await Job.find({ 
      userId,
      parsedData: { $exists: true, $ne: {} }
    });
    
    // 🔒 FEATURE GATING: Get usage statistics for insights
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        jobImports: userUsage.usageStats.jobImports,
        aiJobDiscovery: userUsage.usageStats.aiJobDiscovery,
        plan: userUsage.plan,
        planLimits: userUsage.planLimits
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats for insights (non-critical):', usageError);
    }
    
    // Calculate insights with model usage breakdown and real job board stats
    const insights = {
      totalJobsAnalyzed: jobs.length,
      experienceLevels: {},
      topSkillsRequired: {},
      industryDistribution: {},
      averageSkillsPerJob: 0,
      recentAnalyses: [],
      modelUsageStats: {
        'gpt-4o': 0,           // Premium for both manual and AI discovery
        'gpt-4o-mini': 0,      // Legacy (now deprecated)
        'fallback': 0,         // Fallback analyses
        'unknown': 0
      },
      costBreakdown: {
        manualJobs: { count: 0, estimatedCost: 0 },
        aiDiscoveryJobs: { count: 0, estimatedCost: 0 },
        totalEstimatedCost: 0
      },
      // ENHANCED: Real job board statistics
      realJobBoardStats: {
        totalRealJobBoardJobs: 0,
        jobBoardBreakdown: {
          greenhouse: 0,
          lever: 0,
          indeed: 0
        },
        averageContentQuality: 'unknown',
        realVsLegacyAI: {
          realJobBoards: 0,
          legacyAI: 0,
          manual: 0
        }
      }
    };
    
    let totalSkills = 0;
    
    jobs.forEach(job => {
      if (job.parsedData && !job.parsedData.analysisError) {
        // Experience levels
        const expLevel = job.parsedData.experienceLevel || 'unknown';
        insights.experienceLevels[expLevel] = (insights.experienceLevels[expLevel] || 0) + 1;
        
        // Industry distribution
        const industry = job.parsedData.industryContext || 'unknown';
        insights.industryDistribution[industry] = (insights.industryDistribution[industry] || 0) + 1;
        
        // Skills aggregation
        if (job.parsedData.keySkills && Array.isArray(job.parsedData.keySkills)) {
          totalSkills += job.parsedData.keySkills.length;
          job.parsedData.keySkills.forEach(skill => {
            const skillName = skill.name || skill;
            insights.topSkillsRequired[skillName] = (insights.topSkillsRequired[skillName] || 0) + 1;
          });
        }
        
        // Model usage tracking
        const model = job.parsedData.analysisMetadata?.model || 'unknown';
        const modelKey = model.includes('mini') ? 'gpt-4o-mini' : 
                        model.includes('gpt-4o') ? 'gpt-4o' : 
                        model.includes('fallback') ? 'fallback' : 'unknown';
        insights.modelUsageStats[modelKey]++;
        
        // Enhanced job classification with real job board detection
        const isRealJobBoard = job.sourcePlatform && (
          job.sourcePlatform.includes('AI_FOUND_GREENHOUSE') ||
          job.sourcePlatform.includes('AI_FOUND_LEVER') ||
          job.sourcePlatform.includes('AI_FOUND_INDEED')
        );
        
        const isAiDiscovery = job.sourcePlatform === 'AI_FOUND' || 
                             job.sourcePlatform === 'AI_FOUND_OPTIMIZED' ||
                             job.sourcePlatform === 'AI_FOUND_INTELLIGENT' ||
                             isRealJobBoard;
        
        if (isRealJobBoard) {
          insights.realJobBoardStats.totalRealJobBoardJobs++;
          insights.realJobBoardStats.realVsLegacyAI.realJobBoards++;
          
          // Track specific job board
          if (job.sourcePlatform.includes('GREENHOUSE')) {
            insights.realJobBoardStats.jobBoardBreakdown.greenhouse++;
          } else if (job.sourcePlatform.includes('LEVER')) {
            insights.realJobBoardStats.jobBoardBreakdown.lever++;
          } else if (job.sourcePlatform.includes('INDEED')) {
            insights.realJobBoardStats.jobBoardBreakdown.indeed++;
          }
        } else if (isAiDiscovery) {
          insights.realJobBoardStats.realVsLegacyAI.legacyAI++;
        } else {
          insights.realJobBoardStats.realVsLegacyAI.manual++;
        }
        
        // Cost tracking
        if (isAiDiscovery) {
          insights.costBreakdown.aiDiscoveryJobs.count++;
          insights.costBreakdown.aiDiscoveryJobs.estimatedCost += 0.02; // Premium analysis cost
        } else {
          insights.costBreakdown.manualJobs.count++;
          insights.costBreakdown.manualJobs.estimatedCost += 0.02; // Premium analysis cost
        }
        
        // Recent analyses with job board info
        if (job.parsedData.analysisMetadata?.analyzedAt) {
          insights.recentAnalyses.push({
            jobId: job._id,
            title: job.title,
            company: job.company,
            analyzedAt: job.parsedData.analysisMetadata.analyzedAt,
            skillsFound: job.parsedData.keySkills?.length || 0,
            model: job.parsedData.analysisMetadata.model,
            analysisType: job.parsedData.analysisMetadata.analysisType,
            sourcePlatform: job.sourcePlatform,
            isRealJobBoardDiscovery: isRealJobBoard,
            sourceJobBoard: isRealJobBoard ? (
              job.sourcePlatform.includes('GREENHOUSE') ? 'Greenhouse' :
              job.sourcePlatform.includes('LEVER') ? 'Lever' :
              job.sourcePlatform.includes('INDEED') ? 'Indeed' : 'Unknown'
            ) : null
          });
        }
      }
    });
    
    // Calculate totals and averages
    insights.averageSkillsPerJob = jobs.length > 0 ? Math.round(totalSkills / jobs.length) : 0;
    insights.costBreakdown.totalEstimatedCost = 
      insights.costBreakdown.manualJobs.estimatedCost + 
      insights.costBreakdown.aiDiscoveryJobs.estimatedCost;
    
    // Calculate real job board average content quality
    if (insights.realJobBoardStats.totalRealJobBoardJobs > 0) {
      insights.realJobBoardStats.averageContentQuality = 'high'; // Real job boards typically have high quality
    }
    
    // Sort top skills by frequency
    insights.topSkillsRequired = Object.entries(insights.topSkillsRequired)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [skill, count]) => {
        obj[skill] = count;
        return obj;
      }, {});
    
    // Sort recent analyses by date
    insights.recentAnalyses = insights.recentAnalyses
      .sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt))
      .slice(0, 5);
    
    res.status(200).json({ 
      insights,
      usageStats: usageStats,
      enhancedRealJobBoardInfo: {
        description: 'ENHANCED 3-Phase Approach with REAL Job Board Integration: Career Analysis → Real Job Board Discovery → Premium Analysis',
        improvements: [
          'Phase 1: Enhanced career targeting with GPT-4 Turbo',
          'Phase 2: REAL job board discovery from Greenhouse, Lever, and Indeed',
          'Phase 3: Premium job analysis with GPT-4o (same quality for all jobs)',
          'Direct company posting verification',
          'Enhanced job content quality from ATS platforms'
        ],
        realJobBoardBenefits: [
          'Search actual company job boards (no recruiter spam)',
          'Extract comprehensive job details from ATS platforms',
          'Verify direct company postings with enhanced metadata',
          'Access to tech stack, team info, and hiring manager details',
          'Higher quality job content and requirements'
        ],
        costStructure: {
          phase1: 'Career Analysis: $0.05 (GPT-4 Turbo)',
          phase2: 'Real Job Board Discovery: $0.30-0.50 (Claude 3.5 Sonnet)',
          phase3: 'Premium Analysis: $0.01-0.02 (GPT-4o batch)',
          totalPerSearch: '$0.36-0.57',
          comparison: 'Same cost as previous but now searches REAL job boards'
        },
        targetJobBoards: {
          greenhouse: 'Tech startups and scale-ups with comprehensive postings',
          lever: 'Growth-stage companies with detailed role information',
          indeed: 'Established companies with verified direct postings'
        }
      }
    });
  } catch (error) {
    console.error('Error getting job analysis insights:', error);
    res.status(500).json({ 
      message: 'Failed to get job analysis insights', 
      error: error.message 
    });
  }
};

// AI Search Management Routes - WITH PLAN PERMISSIONS

// Get user AI searches
exports.getUserAiSearches = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // 🔒 FEATURE GATING: Check if user has access to AI searches
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiDiscoveryAllowed = currentSubscription.planLimits.aiJobDiscovery;
      
      if (!aiDiscoveryAllowed) {
        return res.status(403).json({ 
          message: 'AI job discovery not available on your current plan',
          currentPlan: currentSubscription.user.subscriptionTier,
          upgradeRequired: true,
          feature: 'aiJobDiscovery'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI search permissions:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI search permissions',
        error: permissionError.message 
      });
    }
    
    const searches = await jobSearchService.getUserAiSearches(userId);
    
    res.status(200).json({ searches });
  } catch (error) {
    console.error('Error fetching AI searches:', error);
    res.status(500).json({ 
      message: 'Failed to fetch AI job searches', 
      error: error.message 
    });
  }
};

// Pause AI search - WITH PLAN PERMISSIONS
exports.pauseAiSearch = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { searchId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // 🔒 FEATURE GATING: Check permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiDiscoveryAllowed = currentSubscription.planLimits.aiJobDiscovery;
      
      if (!aiDiscoveryAllowed) {
        return res.status(403).json({ 
          message: 'AI job discovery not available on your current plan',
          upgradeRequired: true
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI search permissions:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate permissions',
        error: permissionError.message 
      });
    }
    
    const result = await jobSearchService.pauseAiSearch(userId, searchId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error pausing AI search:', error);
    res.status(500).json({ 
      message: 'Failed to pause AI search', 
      error: error.message 
    });
  }
};

// Resume AI search - WITH PLAN PERMISSIONS
exports.resumeAiSearch = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { searchId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // 🔒 FEATURE GATING: Check permissions and usage limits
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiDiscoveryAllowed = currentSubscription.planLimits.aiJobDiscovery;
      
      if (!aiDiscoveryAllowed) {
        return res.status(403).json({ 
          message: 'AI job discovery not available on your current plan',
          upgradeRequired: true
        });
      }
      
      // For Casual plan, check usage limits
      if (currentSubscription.user.subscriptionTier === 'casual') {
        const discoveryPermission = await usageService.checkUsageLimit(userId, 'aiJobDiscovery', 1);
        
        if (!discoveryPermission.allowed) {
          return res.status(403).json({ 
            message: 'AI job discovery limit reached for Casual plan',
            error: discoveryPermission.reason,
            upgradeRequired: true
          });
        }
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI search permissions:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate permissions',
        error: permissionError.message 
      });
    }
    
    const result = await jobSearchService.resumeAiSearch(userId, searchId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error resuming AI search:', error);
    res.status(500).json({ 
      message: 'Failed to resume AI search', 
      error: error.message 
    });
  }
};

// Delete AI search - WITH PLAN PERMISSIONS AND USAGE DECREMENT
exports.deleteAiSearch = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    const { searchId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // 🔒 FEATURE GATING: Check permissions (basic check for access)
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiDiscoveryAllowed = currentSubscription.planLimits.aiJobDiscovery;
      
      if (!aiDiscoveryAllowed) {
        return res.status(403).json({ 
          message: 'AI job discovery not available on your current plan',
          upgradeRequired: true
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI search permissions:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate permissions',
        error: permissionError.message 
      });
    }
    
    console.log(`🗑️ Attempting to delete AI search ${searchId} for user ${userId}`);
    
    // 🔧 FIX: Use the safe delete method and decrement usage
    try {
      const result = await jobSearchService.deleteAiSearch(userId, searchId);
      
      // 🔧 NEW: Decrement AI job discovery usage count after successful deletion
      try {
        await subscriptionService.decrementAiJobDiscoveryUsage(userId);
        console.log('✅ Decremented AI job discovery usage after deletion');
      } catch (decrementError) {
        console.error('❌ Error decrementing usage (non-critical):', decrementError);
        // Don't fail the deletion if usage decrement fails
      }
      
      res.status(200).json(result);
    } catch (deleteError) {
      console.error('❌ Error deleting AI search:', deleteError);
      res.status(500).json({ 
        message: 'Failed to delete AI search', 
        error: deleteError.message 
      });
    }
  } catch (error) {
    console.error('Error deleting AI search:', error);
    res.status(500).json({ 
      message: 'Failed to delete AI search', 
      error: error.message 
    });
  }
};
