// controllers/resume.controller.js - UPDATED WITH FEATURE GATING
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, S3_BUCKET } = require('../config/s3');
const Resume = require('../models/mongodb/resume.model');
const resumeParserService = require('../services/resumeParser.service');
const resumeAnalysisService = require('../services/resumeAnalysis.service');
const subscriptionService = require('../services/subscription.service');
const usageService = require('../services/usage.service');
const mongoose = require('mongoose');
const path = require('path');
const uuid = require('uuid').v4;

// Helper function to generate S3 key for a resume file
const generateS3Key = (userId, originalFilename) => {
  const extension = path.extname(originalFilename);
  return `resumes/${userId}/${uuid()}${extension}`;
};

// Upload a new resume - WITH USAGE LIMITS
exports.uploadResume = async (req, res) => {
  try {
    // Check if S3 bucket is configured
    if (!S3_BUCKET) {
      return res.status(500).json({ 
        message: 'S3 bucket not configured. Please set AWS_BUCKET_NAME environment variable.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get userId from either req.user._id or req.userId (depending on how auth middleware works)
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }

    // 🔒 FEATURE GATING: Check upload limits before processing
    console.log('🔒 Checking resume upload limits for user:', userId);
    
    try {
      const uploadPermission = await usageService.checkUsageLimit(userId, 'resumeUploads', 1);
      
      if (!uploadPermission.allowed) {
        console.log('❌ Upload limit exceeded:', uploadPermission.reason);
        return res.status(403).json({ 
          message: 'Upload limit reached',
          error: uploadPermission.reason,
          current: uploadPermission.current,
          limit: uploadPermission.limit,
          plan: uploadPermission.plan,
          upgradeRequired: true,
          feature: 'resumeUploads'
        });
      }
      
      console.log('✅ Upload permission granted:', {
        current: uploadPermission.current,
        limit: uploadPermission.limit,
        remaining: uploadPermission.remaining
      });
      
    } catch (permissionError) {
      console.error('❌ Error checking upload permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate upload permission',
        error: permissionError.message 
      });
    }

    const originalFilename = req.file.originalname;
    
    // Determine file type - IMPORTANT: Use UPPERCASE to match the schema enum
    let fileType;
    if (req.file.mimetype === 'application/pdf' || originalFilename.toLowerCase().endsWith('.pdf')) {
      fileType = 'PDF'; // Uppercase to match schema enum
    } else if (
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      originalFilename.toLowerCase().endsWith('.docx')
    ) {
      fileType = 'DOCX'; // Uppercase to match schema enum
    } else if (
      req.file.mimetype === 'application/msword' || 
      originalFilename.toLowerCase().endsWith('.doc')
    ) {
      fileType = 'DOC'; // Uppercase to match schema enum
    } else {
      return res.status(400).json({ message: 'Only PDF, DOCX, and DOC files are supported' });
    }
    
    console.log('Determined file type:', fileType); // Log for debugging
    
    const s3Key = generateS3Key(userId, originalFilename);
    
    // Create resume record in MongoDB with initial processing status
    const resume = new Resume({
      userId,
      name: req.body.name || originalFilename,
      originalFilename,
      fileUrl: s3Key,
      fileType: fileType, // Using uppercase file type to match schema enum
      processingStatus: {
        status: 'uploading',
        progress: 10,
        message: 'Uploading file to storage...',
        updatedAt: new Date()
      },
      parsedData: {}, // Will be populated after analysis
      analysis: {}, // Will be populated after analysis
      versions: []
    });

    await resume.save();
    console.log('Resume record created in MongoDB');
    
    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    // Log the upload attempt for debugging
    console.log('Attempting S3 upload with params:', {
      Bucket: S3_BUCKET,
      Key: `${s3Key.substring(0, 20)}...`, // Don't log the full key for security
      ContentType: req.file.mimetype,
      FileSize: req.file.size
    });

    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log('S3 upload successful');
    
    // 🔒 FEATURE GATING: Track successful upload AFTER S3 upload succeeds
    try {
      await usageService.trackUsage(userId, 'resumeUploads', 1, {
        resumeId: resume._id.toString(),
        fileName: originalFilename,
        fileType: fileType,
        fileSize: req.file.size
      });
      console.log('✅ Upload usage tracked successfully');
    } catch (trackingError) {
      console.error('❌ Error tracking upload usage (non-critical):', trackingError);
      // Don't fail the upload if tracking fails
    }
    
    // Update processing status after successful upload
    resume.processingStatus = {
      status: 'parsing',
      progress: 25,
      message: 'Parsing resume content...',
      updatedAt: new Date()
    };
    await resume.save();

    // IMPORTANT: Initiate async parsing and analysis in the background
    // This way the user doesn't have to wait for the process to complete
    processResumeInBackground(resume._id, s3Key, fileType, userId).catch(err => {
      console.error('Background resume processing error:', err);
      // Update status to error if background processing fails
      updateResumeProcessingStatus(resume._id, 'error', 0, 'Error processing resume', err.message)
        .catch(updateErr => console.error('Error updating processing status:', updateErr));
    });

    // Return response with resume data and processing status
    res.status(201).json({
      message: 'Resume uploaded successfully and processing initiated',
      resume: {
        id: resume._id,
        name: resume.name,
        originalFilename: resume.originalFilename,
        fileType: resume.fileType,
        createdAt: resume.createdAt,
        processingStatus: resume.processingStatus
      }
    });
  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ message: 'Failed to upload resume', error: error.message });
  }
};

// Helper function to update resume processing status
async function updateResumeProcessingStatus(resumeId, status, progress, message, error = '') {
  try {
    const resume = await Resume.findById(resumeId);
    if (!resume) {
      console.error(`Resume not found for ID: ${resumeId}`);
      return false;
    }
    
    resume.processingStatus = {
      status,
      progress,
      message,
      error,
      updatedAt: new Date()
    };
    
    await resume.save();
    console.log(`Updated processing status for resume ${resumeId}: ${status} (${progress}%)`);
    return true;
  } catch (err) {
    console.error('Error updating resume processing status:', err);
    return false;
  }
}

// Background processing function - UPDATED WITH USAGE TRACKING
async function processResumeInBackground(resumeId, fileUrl, fileType, userId) {
  try {
    console.log(`Starting background processing for resume: ${resumeId}`);
    
    // Get the resume from the database
    const resume = await Resume.findById(resumeId);
    
    if (!resume) {
      throw new Error('Resume not found');
    }
    
    // Step 1: Parse the resume using OpenAI
    console.log('Starting resume parsing...');
    // Update status to parsing (25-50%)
    await updateResumeProcessingStatus(resumeId, 'parsing', 30, 'Extracting content from resume...');
    
    const parsedData = await resumeParserService.parseResume(fileUrl, fileType);
    
    // CRITICAL FIX: Ensure parsedData is valid before saving
    if (!parsedData || typeof parsedData !== 'object') {
      throw new Error('Invalid parsed data received from parser service');
    }
    
    // Update the resume with parsed data
    resume.parsedData = parsedData;
    await resume.save();
    console.log('Resume parsing completed, data saved to database');
    
    // Update status to analyzing (50-90%)
    await updateResumeProcessingStatus(resumeId, 'analyzing', 50, 'Parsing complete. Starting AI analysis...');
    
    // Step 2: Analyze the resume using OpenAI - WITH USAGE TRACKING
    console.log('Starting resume analysis...');
    
    // 🔒 FEATURE GATING: Track resume analysis usage (tied to uploads)
    try {
      await usageService.trackUsage(userId, 'resumeAnalysis', 1, {
        resumeId: resumeId.toString(),
        analysisType: 'initial'
      });
      console.log('✅ Analysis usage tracked successfully');
    } catch (trackingError) {
      console.error('❌ Error tracking analysis usage (non-critical):', trackingError);
      // Continue with analysis even if tracking fails
    }
    
    const analysis = await resumeAnalysisService.analyzeResume(resumeId);
    
    // CRITICAL FIX: Validate analysis data before saving
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Invalid analysis data received from analysis service');
    }
    
    console.log('Analysis completed, data structure:', {
      overallScore: analysis.overallScore,
      atsCompatibility: analysis.atsCompatibility,
      hasProfileSummary: !!analysis.profileSummary,
      strengthsCount: analysis.strengths?.length || 0,
      weaknessesCount: analysis.weaknesses?.length || 0,
      improvementAreasCount: analysis.improvementAreas?.length || 0
    });
    
    // Update progress during analysis
    await updateResumeProcessingStatus(resumeId, 'analyzing', 75, 'AI analysis in progress...');
    
    // CRITICAL FIX: Ensure analysis data is properly assigned and saved
    resume.analysis = analysis;
    
    // Force save and verify
    const savedResume = await resume.save();
    console.log('Resume analysis saved to database:', {
      resumeId: savedResume._id,
      hasAnalysis: !!savedResume.analysis,
      overallScore: savedResume.analysis?.overallScore,
      atsCompatibility: savedResume.analysis?.atsCompatibility
    });
    
    // Double-check by re-fetching from database
    const verificationResume = await Resume.findById(resumeId);
    if (!verificationResume.analysis || !verificationResume.analysis.overallScore) {
      console.error('CRITICAL ERROR: Analysis data was not saved properly to database');
      throw new Error('Failed to save analysis data to database');
    }
    
    console.log('Database verification successful - analysis data persisted correctly');
    
    // Update status to completed (100%)
    await updateResumeProcessingStatus(resumeId, 'completed', 100, 'Resume processing completed successfully');
    console.log('Resume analyzed successfully');
    
    return true;
  } catch (error) {
    console.error('Error in background processing:', error);
    // Update status to error
    await updateResumeProcessingStatus(
      resumeId, 
      'error', 
      0, 
      'Error processing resume', 
      error.message || 'Unknown error'
    );
    throw error;
  }
}

// Create a tailored resume - WITH USAGE LIMITS
exports.createTailoredResume = async (req, res) => {
  try {
    const { resumeId, jobId } = req.params;
    const { name, notes } = req.body;
    
    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    // Validate input
    if (!resumeId || !jobId) {
      return res.status(400).json({ message: 'Resume ID and Job ID are required' });
    }
    
    // 🔒 FEATURE GATING: Check tailoring limits before processing
    console.log('🔒 Checking resume tailoring limits for user:', userId);
    
    try {
      const tailoringPermission = await usageService.checkUsageLimit(userId, 'resumeTailoring', 1);
      
      if (!tailoringPermission.allowed) {
        console.log('❌ Tailoring limit exceeded:', tailoringPermission.reason);
        return res.status(403).json({ 
          message: 'Resume tailoring limit reached',
          error: tailoringPermission.reason,
          current: tailoringPermission.current,
          limit: tailoringPermission.limit,
          plan: tailoringPermission.plan,
          upgradeRequired: true,
          feature: 'resumeTailoring'
        });
      }
      
      console.log('✅ Tailoring permission granted:', {
        current: tailoringPermission.current,
        limit: tailoringPermission.limit,
        remaining: tailoringPermission.remaining
      });
      
    } catch (permissionError) {
      console.error('❌ Error checking tailoring permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate tailoring permission',
        error: permissionError.message 
      });
    }
    
    console.log(`Creating tailored resume: resumeId=${resumeId}, jobId=${jobId}, userId=${userId}`);
    
    // Import the tailoring service
    const resumeTailoringService = require('../services/resumeTailoring.service');
    
    // Create the tailored resume with improved PDF generation and fresh analysis
    const result = await resumeTailoringService.createTailoredResume(resumeId, jobId, {
      name,
      notes
    });
    
    // 🔒 FEATURE GATING: Track successful tailoring usage
    try {
      await usageService.trackUsage(userId, 'resumeTailoring', 1, {
        originalResumeId: resumeId,
        tailoredResumeId: result.resume.id,
        jobId: jobId,
        tailoringType: 'ai_generated'
      });
      console.log('✅ Tailoring usage tracked successfully');
    } catch (trackingError) {
      console.error('❌ Error tracking tailoring usage (non-critical):', trackingError);
      // Don't fail the tailoring if tracking fails
    }
    
    console.log('Tailored resume created successfully:', {
      resumeId: result.resume.id,
      hasAnalysis: !!result.resume.analysis,
      overallScore: result.resume.analysis?.overallScore,
      downloadUrl: !!result.resume.downloadUrl
    });
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating tailored resume:', error);
    res.status(500).json({ 
      message: 'Failed to create tailored resume', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all resumes for a user - WITH USAGE STATS
exports.getUserResumes = async (req, res) => {
  try {
    // Check if S3 bucket is configured
    if (!S3_BUCKET) {
      return res.status(500).json({ 
        message: 'S3 bucket not configured. Please set AWS_BUCKET_NAME environment variable.' 
      });
    }

    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });
    
    // 🔒 FEATURE GATING: Get usage statistics to include in response
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        resumeUploads: userUsage.usageStats.resumeUploads,
        resumeTailoring: userUsage.usageStats.resumeTailoring,
        plan: userUsage.plan,
        planLimits: {
          resumeUploads: userUsage.planLimits.resumeUploads,
          resumeTailoring: userUsage.planLimits.resumeTailoring
        }
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats (non-critical):', usageError);
    }
    
    // Generate temporary signed URLs for each resume
    const resumesWithUrls = await Promise.all(resumes.map(async (resume) => {
      const getObjectParams = {
        Bucket: S3_BUCKET,
        Key: resume.fileUrl
      };
      
      const command = new GetObjectCommand(getObjectParams);
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
      
      return {
        _id: resume._id,
        name: resume.name,
        originalFilename: resume.originalFilename,
        fileType: resume.fileType,
        createdAt: resume.createdAt,
        updatedAt: resume.updatedAt,
        downloadUrl: signedUrl,
        analysis: resume.analysis,
        processingStatus: resume.processingStatus || {
          status: 'completed',
          progress: 100,
          message: 'Resume processing completed'
        },
        isTailored: resume.isTailored || false,
        tailoredForJob: resume.tailoredForJob || null,
        versions: resume.versions.map(v => ({
          id: v._id,
          versionNumber: v.versionNumber,
          createdAt: v.createdAt,
          changesDescription: v.changesDescription
        }))
      };
    }));
    
    res.status(200).json({ 
      resumes: resumesWithUrls,
      usageStats: usageStats
    });
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ message: 'Failed to fetch resumes', error: error.message });
  }
};

// Get a specific resume by ID - WITH USAGE STATS
exports.getResumeById = async (req, res) => {
  try {
    // Check if S3 bucket is configured
    if (!S3_BUCKET) {
      return res.status(500).json({ 
        message: 'S3 bucket not configured. Please set AWS_BUCKET_NAME environment variable.' 
      });
    }

    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // 🔒 FEATURE GATING: Get usage statistics to include in response
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        resumeTailoring: userUsage.usageStats.resumeTailoring,
        plan: userUsage.plan,
        planLimits: {
          resumeTailoring: userUsage.planLimits.resumeTailoring
        }
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats (non-critical):', usageError);
    }
    
    // CRITICAL DEBUG: Log what we're retrieving
    console.log('Retrieved resume from database:', {
      resumeId: resume._id,
      hasAnalysis: !!resume.analysis,
      hasProcessingStatus: !!resume.processingStatus,
      overallScore: resume.analysis?.overallScore,
      atsCompatibility: resume.analysis?.atsCompatibility,
      analysisKeys: resume.analysis ? Object.keys(resume.analysis) : []
    });
    
    // Generate temporary signed URL for the resume
    const getObjectParams = {
      Bucket: S3_BUCKET,
      Key: resume.fileUrl
    };
    
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
    
    // Generate URLs for all versions if they exist
    const versionsWithUrls = await Promise.all((resume.versions || []).map(async (version) => {
      const versionParams = {
        Bucket: S3_BUCKET,
        Key: version.fileUrl
      };
      
      const versionCommand = new GetObjectCommand(versionParams);
      const versionUrl = await getSignedUrl(s3Client, versionCommand, { expiresIn: 3600 });
      
      return {
        id: version._id,
        versionNumber: version.versionNumber,
        createdAt: version.createdAt,
        changesDescription: version.changesDescription,
        downloadUrl: versionUrl,
        jobId: version.jobId
      };
    }));
    
    // CRITICAL FIX: Ensure analysis data is properly structured for the frontend
    const analysisData = resume.analysis || {};
    
    const resumeData = {
      id: resume._id,
      name: resume.name,
      originalFilename: resume.originalFilename,
      fileType: resume.fileType,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
      downloadUrl: signedUrl,
      parsedData: resume.parsedData || {},
      analysis: {
        overallScore: analysisData.overallScore || 0,
        atsCompatibility: analysisData.atsCompatibility || 0,
        profileSummary: analysisData.profileSummary || {
          currentRole: "Not specified",
          careerLevel: "Mid-level",
          industries: [],
          suggestedJobTitles: [],
          suggestedIndustries: []
        },
        strengths: analysisData.strengths || [],
        weaknesses: analysisData.weaknesses || [],
        keywordsSuggestions: analysisData.keywordsSuggestions || [],
        improvementAreas: analysisData.improvementAreas || []
      },
      processingStatus: resume.processingStatus || {
        status: 'completed',
        progress: 100,
        message: 'Resume processing completed'
      },
      isTailored: resume.isTailored || false,
      tailoredForJob: resume.tailoredForJob || null,
      versions: versionsWithUrls,
      usageStats: usageStats
    };
    
    // CRITICAL DEBUG: Log what we're sending to frontend
    console.log('Sending resume data to frontend:', {
      hasAnalysis: !!resumeData.analysis,
      overallScore: resumeData.analysis.overallScore,
      atsCompatibility: resumeData.analysis.atsCompatibility,
      strengthsCount: resumeData.analysis.strengths.length,
      weaknessesCount: resumeData.analysis.weaknesses.length
    });
    
    res.status(200).json({ resume: resumeData });
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ message: 'Failed to fetch resume', error: error.message });
  }
};

// Optimize resume for ATS with real-time progress via SSE
exports.optimizeResumeForATS = async (req, res) => {
  try {
    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    // 🔒 FEATURE GATING: Check if user has permission for ATS optimization
    // This is considered a premium feature that uses resume analysis quota
    try {
      const optimizationPermission = await usageService.checkUsageLimit(userId, 'resumeAnalysis', 1);
      
      if (!optimizationPermission.allowed) {
        console.log('❌ ATS optimization limit exceeded:', optimizationPermission.reason);
        return res.status(403).json({ 
          message: 'ATS optimization limit reached',
          error: optimizationPermission.reason,
          current: optimizationPermission.current,
          limit: optimizationPermission.limit,
          plan: optimizationPermission.plan,
          upgradeRequired: true,
          feature: 'resumeAnalysis'
        });
      }
      
      console.log('✅ ATS optimization permission granted');
      
    } catch (permissionError) {
      console.error('❌ Error checking ATS optimization permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate ATS optimization permission',
        error: permissionError.message 
      });
    }
    
    console.log(`🤖 AJ: Starting ATS optimization for resume ${resumeId}`);
    
    // Import the resume editor service
    const ResumeEditorService = require('../services/resumeEditor.service');
    
    // Get optional target job from request body
    const targetJob = req.body.targetJob || null;
    
    // Store original resume data for before/after comparison
    const Resume = require('../models/mongodb/resume.model');
    const originalResume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!originalResume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Store original data for comparison
    const originalData = {
      parsedData: JSON.parse(JSON.stringify(originalResume.parsedData)),
      analysis: JSON.parse(JSON.stringify(originalResume.analysis || {}))
    };
    
    // Create progress callback function
    const progressCallback = (stage, percentage, message) => {
      console.log(`📊 Backend Progress: ${percentage}% - ${message}`);
      // In a real implementation, you might store this in Redis or broadcast via WebSocket
      // For now, we'll rely on the backend logs and frontend timing
    };
    
    // Call the ATS optimization service with progress callback
    const result = await ResumeEditorService.optimizeForATSWithProgress(
      resumeId, 
      userId, 
      targetJob,
      originalData,
      progressCallback
    );
    
    // 🔒 FEATURE GATING: Track ATS optimization usage
    try {
      await usageService.trackUsage(userId, 'resumeAnalysis', 1, {
        resumeId: resumeId,
        optimizationType: 'ats_optimization',
        targetJob: targetJob?.title || 'general',
        scoreImprovement: result.newATSScore - result.previousScore
      });
      console.log('✅ ATS optimization usage tracked successfully');
    } catch (trackingError) {
      console.error('❌ Error tracking ATS optimization usage (non-critical):', trackingError);
      // Don't fail the optimization if tracking fails
    }
    
    console.log(`✅ AJ: ATS optimization completed. New score: ${result.newATSScore}%`);
    
    res.status(200).json({
      success: true,
      message: 'Resume optimized for ATS successfully',
      data: {
        optimizations: result.optimizations,
        previousATSScore: result.previousScore,
        newATSScore: result.newATSScore,
        improvementGain: result.newATSScore - result.previousScore,
        updatedResume: {
          id: result.updatedResume._id,
          name: result.updatedResume.name,
          analysis: result.updatedResume.analysis,
          versions: result.updatedResume.versions
        },
        // Add before/after comparison data
        comparison: result.comparison,
        // Add timing information for frontend
        processingTime: result.processingTime,
        stages: result.stages
      }
    });
  } catch (error) {
    console.error('❌ ATS optimization error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to optimize resume for ATS', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 📡 SSE endpoint for real-time optimization progress - FIXED SINGLE VERSION
exports.getOptimizationProgress = async (req, res) => {
  try {
    console.log('📡 SSE optimization-progress endpoint hit:', req.params.id, 'Query:', req.query);
    
    const resumeId = req.params.id;
    let userId;
    
    // Handle authentication via token query parameter
    if (req.query.token) {
      try {
        const jwt = require('jsonwebtoken');
        const User = require('../models/mongodb/user.model');
        
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user || !user.active) {
          console.error('❌ Invalid user for SSE');
          return res.status(401).json({ error: 'Invalid user' });
        }
        
        userId = user._id;
        console.log('📡 SSE authenticated for resume:', resumeId, 'user:', userId);
        
      } catch (tokenError) {
        console.error('❌ SSE Token verification failed:', tokenError.message);
        return res.status(401).json({ error: 'Invalid token' });
      }
    } else {
      console.error('❌ SSE No token provided');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('📡 Setting up SSE headers for resume:', resumeId);
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection message
    const welcomeMessage = {
      type: 'connected',
      message: 'Progress stream connected successfully',
      resumeId: resumeId,
      timestamp: new Date().toISOString()
    };
    
    res.write(`data: ${JSON.stringify(welcomeMessage)}\n\n`);
    console.log('📡 Sent welcome message:', welcomeMessage);

    // Store client for progress updates
    const clientId = `${userId}_${resumeId}_${Date.now()}`;
    
    if (!global.progressClients) {
      global.progressClients = new Map();
    }
    
    global.progressClients.set(clientId, res);
    console.log(`📡 SSE client registered: ${clientId}. Total clients: ${global.progressClients.size}`);
    
    // Send a test progress message
    setTimeout(() => {
      try {
        const testMessage = {
          type: 'progress',
          percentage: 10,
          message: 'SSE connection established, ready for progress updates',
          resumeId: resumeId,
          timestamp: new Date().toISOString()
        };
        res.write(`data: ${JSON.stringify(testMessage)}\n\n`);
        console.log('📡 Sent test progress message');
      } catch (error) {
        console.error('❌ Error sending test message:', error);
      }
    }, 1000);
    
    // Cleanup on client disconnect
    req.on('close', () => {
      console.log(`📡 SSE client disconnected: ${clientId}`);
      global.progressClients.delete(clientId);
      console.log(`📡 Remaining SSE clients: ${global.progressClients.size}`);
    });
    
    req.on('error', (err) => {
      console.error('📡 SSE connection error:', err);
      global.progressClients.delete(clientId);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        if (global.progressClients.has(clientId)) {
          res.write(`data: ${JSON.stringify({ 
            type: 'heartbeat', 
            timestamp: new Date().toISOString() 
          })}\n\n`);
        } else {
          clearInterval(heartbeat);
        }
      } catch (error) {
        console.error('❌ SSE heartbeat failed:', error);
        clearInterval(heartbeat);
        global.progressClients.delete(clientId);
      }
    }, 30000);

    // Cleanup heartbeat on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
    });

  } catch (error) {
    console.error('❌ SSE Setup Error:', error);
    try {
      res.status(500).json({ error: 'Failed to setup progress stream', details: error.message });
    } catch (responseError) {
      console.error('❌ Error sending error response:', responseError);
    }
  }
};

// Manually trigger resume analysis - WITH USAGE LIMITS
exports.analyzeResume = async (req, res) => {
  try {
    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    // 🔒 FEATURE GATING: Check analysis limits
    console.log('🔒 Checking resume analysis limits for user:', userId);
    
    try {
      const analysisPermission = await usageService.checkUsageLimit(userId, 'resumeAnalysis', 1);
      
      if (!analysisPermission.allowed) {
        console.log('❌ Analysis limit exceeded:', analysisPermission.reason);
        return res.status(403).json({ 
          message: 'Resume analysis limit reached',
          error: analysisPermission.reason,
          current: analysisPermission.current,
          limit: analysisPermission.limit,
          plan: analysisPermission.plan,
          upgradeRequired: true,
          feature: 'resumeAnalysis'
        });
      }
      
      console.log('✅ Analysis permission granted');
      
    } catch (permissionError) {
      console.error('❌ Error checking analysis permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate analysis permission',
        error: permissionError.message 
      });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // If resume hasn't been parsed yet, parse it first
    if (!resume.parsedData || Object.keys(resume.parsedData).length === 0) {
      try {
        const parsedData = await resumeParserService.parseResume(resume.fileUrl, resume.fileType);
        resume.parsedData = parsedData;
        await resume.save();
      } catch (parseError) {
        console.error('Error parsing resume:', parseError);
        return res.status(500).json({ 
          message: 'Failed to parse resume',
          error: parseError.message
        });
      }
    }
    
    // Analyze the resume using OpenAI
    try {
      const analysis = await resumeAnalysisService.analyzeResume(resumeId);
      
      // Update the resume with analysis data
      resume.analysis = analysis;
      await resume.save();
      
      // 🔒 FEATURE GATING: Track analysis usage
      try {
        await usageService.trackUsage(userId, 'resumeAnalysis', 1, {
          resumeId: resumeId,
          analysisType: 'manual_trigger',
          overallScore: analysis.overallScore,
          atsScore: analysis.atsCompatibility
        });
        console.log('✅ Manual analysis usage tracked successfully');
      } catch (trackingError) {
        console.error('❌ Error tracking analysis usage (non-critical):', trackingError);
        // Don't fail the analysis if tracking fails
      }
      
      res.status(200).json({ 
        message: 'Resume analyzed successfully',
        analysis
      });
    } catch (analysisError) {
      console.error('Error analyzing resume:', analysisError);
      res.status(500).json({ 
        message: 'Failed to analyze resume',
        error: analysisError.message
      });
    }
  } catch (error) {
    console.error('Error in analyze resume endpoint:', error);
    res.status(500).json({ message: 'Failed to process request', error: error.message });
  }
};

// Add a new version to an existing resume
exports.addResumeVersion = async (req, res) => {
  try {
    // Check if S3 bucket is configured
    if (!S3_BUCKET) {
      return res.status(500).json({ 
        message: 'S3 bucket not configured. Please set AWS_BUCKET_NAME environment variable.' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    const originalFilename = req.file.originalname;
    
    // Determine file type - IMPORTANT: Use UPPERCASE to match the schema enum
    let fileType;
    if (req.file.mimetype === 'application/pdf' || originalFilename.toLowerCase().endsWith('.pdf')) {
      fileType = 'PDF'; // Uppercase to match schema enum
    } else if (
      req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      originalFilename.toLowerCase().endsWith('.docx')
    ) {
      fileType = 'DOCX'; // Uppercase to match schema enum
    } else if (
      req.file.mimetype === 'application/msword' || 
      originalFilename.toLowerCase().endsWith('.doc')
    ) {
      fileType = 'DOC'; // Uppercase to match schema enum
    } else {
      return res.status(400).json({ message: 'Only PDF, DOCX, and DOC files are supported' });
    }
    
    const s3Key = generateS3Key(userId, originalFilename);
    
    // Upload to S3
    const uploadParams = {
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    await s3Client.send(new PutObjectCommand(uploadParams));
    
    // Create new version
    const versionNumber = (resume.versions || []).length + 2; // +2 because original is version 1
    const newVersion = {
      versionNumber,
      createdAt: new Date(),
      fileUrl: s3Key,
      changesDescription: req.body.changesDescription || `Version ${versionNumber}`,
      jobId: req.body.jobId || null
    };
    
    // Add to versions array
    if (!resume.versions) {
      resume.versions = [];
    }
    resume.versions.push(newVersion);
    await resume.save();
    
    // Generate signed URL for the new version
    const getObjectParams = {
      Bucket: S3_BUCKET,
      Key: s3Key
    };
    
    const command = new GetObjectCommand(getObjectParams);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    res.status(200).json({
      message: 'Resume version added successfully',
      version: {
        id: newVersion._id,
        versionNumber: newVersion.versionNumber,
        createdAt: newVersion.createdAt,
        changesDescription: newVersion.changesDescription,
        downloadUrl: signedUrl,
        jobId: newVersion.jobId
      }
    });
  } catch (error) {
    console.error('Error adding resume version:', error);
    res.status(500).json({ message: 'Failed to add resume version', error: error.message });
  }
};

// Get resume processing status
exports.getResumeProcessingStatus = async (req, res) => {
  try {
    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId }, 'processingStatus');
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Return just the processing status
    const processingStatus = resume.processingStatus || {
      status: 'completed',
      progress: 100,
      message: 'Resume processing completed'
    };
    
    res.status(200).json({ processingStatus });
  } catch (error) {
    console.error('Error fetching resume processing status:', error);
    res.status(500).json({ message: 'Failed to fetch processing status', error: error.message });
  }
};

// Delete a resume
exports.deleteResume = async (req, res) => {
  try {
    // Get userId from either req.user._id or req.userId
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Delete resume document from MongoDB
    await Resume.deleteOne({ _id: resumeId, userId });
    
    res.status(200).json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ message: 'Failed to delete resume', error: error.message });
  }
};
