// controllers/resume.controller.js - UPDATED WITH JOB SUGGESTIONS ENDPOINT
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, S3_BUCKET } = require('../config/s3');
const Resume = require('../models/mongodb/resume.model');
const resumeParserService = require('../services/resumeParser.service');
const resumeAnalysisService = require('../services/resumeAnalysis.service');
const subscriptionService = require('../services/subscription.service');
const jobSearchService = require('../services/jobSearch.service'); // 🆕 ADD THIS LINE
const usageService = require('../services/usage.service');
const mongoose = require('mongoose');
const path = require('path');
const uuid = require('uuid').v4;

// Import models for Phase 3 implementation
const Job = require('../models/mongodb/job.model');
const AiJobSearch = require('../models/mongodb/aiJobSearch.model');

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

    // ✅ FEATURE GATING REMOVED: Resume uploads are now unlimited for all users
    console.log('✅ Resume upload initiated for user:', userId, '(unlimited uploads enabled)');

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
    
    // ✅ FEATURE GATING REMOVED: Resume upload tracking removed (uploads are unlimited)
    console.log('✅ Resume upload completed successfully (no usage tracking needed)');
    
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
    
    const rawParsedData = await resumeParserService.parseResume(fileUrl, fileType);
    
    // 🔧 NEW: Validate and sanitize parsed data before saving
    console.log('🔧 Validating parsed data before saving...');
    const parsedData = validateAndSanitizeParsedData(rawParsedData);
    
    // Update the resume with parsed data
    resume.parsedData = parsedData;
    
    // 🔧 CRITICAL: Use save with validation disabled temporarily for date fields
    try {
      await resume.save({ validateBeforeSave: true });
      console.log('Resume parsing completed, data saved to database');
    } catch (saveError) {
      console.error('Error saving parsed data:', saveError);
      
      // If there's still a validation error, try to fix it more aggressively
      if (saveError.name === 'ValidationError') {
        console.log('🔧 Attempting aggressive date field sanitization...');
        
        // More aggressive sanitization - convert problematic dates to strings
        const aggressivelySanitized = JSON.parse(JSON.stringify(parsedData));
        
        // Convert all date fields to strings to avoid validation issues
        const convertDatesToStrings = (obj, path = '') => {
          if (Array.isArray(obj)) {
            obj.forEach((item, index) => convertDatesToStrings(item, `${path}[${index}]`));
          } else if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
              if (key.includes('Date') || key.includes('date')) {
                if (obj[key] !== null && obj[key] !== undefined) {
                  // Convert all dates to strings
                  if (obj[key] instanceof Date) {
                    obj[key] = obj[key].toISOString().split('T')[0]; // YYYY-MM-DD format
                  } else if (typeof obj[key] !== 'string') {
                    obj[key] = String(obj[key]);
                  }
                  console.log(`🔧 Converted ${path}.${key} to string: ${obj[key]}`);
                }
              } else {
                convertDatesToStrings(obj[key], `${path}.${key}`);
              }
            });
          }
        };
        
        convertDatesToStrings(aggressivelySanitized);
        
        resume.parsedData = aggressivelySanitized;
        await resume.save();
        console.log('✅ Resume saved successfully after aggressive sanitization');
      } else {
        throw saveError;
      }
    }
    
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

// NEW: Get AI-generated job suggestions based on resume analysis
exports.getJobSuggestions = async (req, res) => {
  try {
    const { id: resumeId } = req.params;
    const userId = req.user?._id || req.userId;

    console.log(`🔍 Generating job suggestions for resume ${resumeId}, user ${userId}`);

    // Get the resume with analysis
    const resume = await Resume.findOne({ 
      _id: resumeId, 
      userId: userId 
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: 'Resume not found'
      });
    }

    // Check if resume has been analyzed
    if (!resume.analysis || !resume.parsedData) {
      return res.status(400).json({
        success: false,
        message: 'Resume must be analyzed before generating job suggestions'
      });
    }

    // Extract key information from resume analysis
    const analysis = resume.analysis;
    const parsedData = resume.parsedData;
    
    // Prepare data for AI analysis
    const resumeContext = {
      skills: parsedData.skills || [],
      experience: parsedData.experience || [],
      education: parsedData.education || [],
      jobTitles: parsedData.jobTitles || [],
      industries: parsedData.industries || [],
      experienceLevel: analysis.experienceLevel || 'Mid-level',
      keySkills: parsedData.keySkills || [],
      techStack: parsedData.techStack || []
    };

    // Generate AI-powered job suggestions
    const jobSuggestions = await generateJobSuggestions(resumeContext);

    console.log(`✅ Generated ${jobSuggestions.length} job suggestions for resume ${resumeId}`);

    res.json({
      success: true,
      suggestions: jobSuggestions,
      metadata: {
        basedOn: {
          skills: resumeContext.skills.length,
          experience: resumeContext.experience.length,
          experienceLevel: resumeContext.experienceLevel
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error generating job suggestions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate job suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * AI service function to generate job suggestions
 */
const generateJobSuggestions = async (resumeContext) => {
  try {
    const { openai } = require('../config/openai');
    
    // Create a prompt for job suggestions based on resume context
    const prompt = `Based on the following resume profile, suggest 6-8 specific job titles that would be excellent matches. Focus on realistic, current job market positions.

Resume Profile:
- Experience Level: ${resumeContext.experienceLevel}
- Key Skills: ${resumeContext.keySkills.slice(0, 10).join(', ')}
- Tech Stack: ${resumeContext.techStack.slice(0, 8).join(', ')}
- Previous Job Titles: ${resumeContext.jobTitles.slice(0, 3).join(', ')}
- Industries: ${resumeContext.industries.slice(0, 2).join(', ')}

Requirements:
1. Suggest job titles that match the experience level
2. Consider the technical skills and tech stack
3. Include both current role types and potential growth opportunities
4. Focus on job titles that are actively hiring in 2024-2025
5. Return ONLY the job titles, one per line, no bullets or numbers
6. Keep titles concise and industry-standard

Example good suggestions for different levels:
- Junior: "Junior Software Developer", "Frontend Developer", "Associate Data Analyst"
- Mid: "Senior Software Engineer", "Full Stack Developer", "Technical Lead"
- Senior: "Principal Engineer", "Engineering Manager", "Solutions Architect"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert career counselor and recruiter with deep knowledge of the current job market. Provide specific, realistic job title suggestions."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    });

    const suggestions = completion.choices[0].message.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.match(/^\d+\./) && !line.startsWith('-'))
      .slice(0, 8); // Limit to 8 suggestions

    // If AI fails or returns too few suggestions, provide smart fallbacks
    if (suggestions.length < 3) {
      return getSmartFallbackSuggestions(resumeContext);
    }

    return suggestions;

  } catch (error) {
    console.error('❌ Error with AI job suggestions:', error);
    // Return smart fallback suggestions if AI fails
    return getSmartFallbackSuggestions(resumeContext);
  }
};

/**
 * Generate smart fallback suggestions based on resume context
 */
const getSmartFallbackSuggestions = (resumeContext) => {
  const { experienceLevel, keySkills, techStack, jobTitles } = resumeContext;
  
  // Determine if technical or non-technical role
  const techSkills = [...(keySkills || []), ...(techStack || [])];
  const isTechnical = techSkills.some(skill => 
    ['javascript', 'python', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes', 'java', 'c++', 'html', 'css'].includes(skill.toLowerCase())
  );
  
  // Determine seniority level
  const isEntry = experienceLevel?.toLowerCase().includes('entry') || experienceLevel?.toLowerCase().includes('junior');
  const isSenior = experienceLevel?.toLowerCase().includes('senior') || experienceLevel?.toLowerCase().includes('principal');
  
  let suggestions = [];
  
  if (isTechnical) {
    if (isEntry) {
      suggestions = [
        'Junior Software Developer',
        'Frontend Developer',
        'Backend Developer',
        'Web Developer',
        'Software Engineer I',
        'Associate Software Engineer'
      ];
    } else if (isSenior) {
      suggestions = [
        'Senior Software Engineer',
        'Principal Software Engineer',
        'Technical Lead',
        'Software Architect',
        'Engineering Manager',
        'Staff Software Engineer'
      ];
    } else {
      suggestions = [
        'Software Engineer',
        'Full Stack Developer',
        'Senior Software Developer',
        'Backend Engineer',
        'Frontend Engineer',
        'Software Developer'
      ];
    }
  } else {
    if (isEntry) {
      suggestions = [
        'Business Analyst',
        'Project Coordinator',
        'Marketing Associate',
        'Sales Representative',
        'Data Analyst',
        'Operations Associate'
      ];
    } else if (isSenior) {
      suggestions = [
        'Senior Business Analyst',
        'Project Manager',
        'Operations Manager',
        'Marketing Manager',
        'Sales Manager',
        'Director of Operations'
      ];
    } else {
      suggestions = [
        'Business Analyst',
        'Project Manager',
        'Operations Specialist',
        'Marketing Specialist',
        'Account Manager',
        'Business Operations'
      ];
    }
  }
  
  return suggestions.slice(0, 6);
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
    
    // ✅ FEATURE GATING REMOVED: Resume analysis is now unlimited for all users
    console.log('✅ Resume analysis initiated for user:', userId, '(unlimited analysis enabled)');
    
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

// NEW: Check onboarding status for flow control
exports.checkOnboardingStatus = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    console.log(`🔍 Checking onboarding status for resume ${resumeId}, user ${userId}`);
    
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    const onboardingStatus = resume.onboardingStatus || {};
    
    const status = {
      completed: onboardingStatus.completed || false,
      preferencesSet: onboardingStatus.preferencesSet || false,
      preferencesSetAt: onboardingStatus.preferencesSetAt || null,
      jobsGenerated: onboardingStatus.jobsGenerated || false,
      recruitersFound: onboardingStatus.recruitersFound || false,
      lockedFlow: onboardingStatus.lockedFlow || false,
      currentPreferences: onboardingStatus.currentPreferences || null
    };
    
    console.log(`📊 Onboarding status for resume ${resumeId}:`, status);
    
    res.status(200).json({
      success: true,
      status: status
    });
    
  } catch (error) {
    console.error('❌ Error checking onboarding status:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to check onboarding status', 
      error: error.message 
    });
  }
};

// NEW: Get personalized jobs for onboarding based on user preferences with CACHING and STATE TRACKING
exports.getPersonalizedOnboardingJobs = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    const { locations, jobTitles } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    if (!locations || !jobTitles || !Array.isArray(locations) || !Array.isArray(jobTitles)) {
      return res.status(400).json({ 
        message: 'Locations and jobTitles arrays are required' 
      });
    }
    
    console.log(`🎯 Getting personalized onboarding jobs for resume ${resumeId}:`, {
      locations: locations.map(loc => loc.name || loc),
      jobTitles: jobTitles
    });
    
    // Get the resume and verify it belongs to the user
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // 🆕 NEW: Check if onboarding flow is already locked
    if (resume.onboardingStatus?.lockedFlow) {
      console.log(`🔒 Onboarding flow is locked - preferences already set at ${resume.onboardingStatus.preferencesSetAt}`);
      
      // Return existing cached jobs if available
      const cachedJobs = resume.getCachedPersonalizedJobs(resume.onboardingStatus.currentPreferences);
      if (cachedJobs) {
        return res.status(200).json({
          success: true,
          jobs: cachedJobs.jobs.map(job => ({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            salary: job.salary,
            jobType: job.jobType,
            sourceUrl: job.sourceUrl,
            parsedData: job.parsedData,
            isPersonalizedJob: true
          })),
          metadata: {
            resumeId: resumeId,
            searchCriteria: resume.onboardingStatus.currentPreferences,
            jobsFound: cachedJobs.jobs.length,
            fromCache: true,
            lockedFlow: true,
            preferencesSetAt: resume.onboardingStatus.preferencesSetAt,
            message: 'Onboarding preferences already set - using existing results',
            generatedAt: cachedJobs.metadata.generatedAt || new Date().toISOString()
          }
        });
      }
    }
    
    // 🆕 NEW: Prepare current preferences for cache comparison
    const currentPreferences = {
      locations: locations,
      jobTitles: jobTitles,
      includeRemote: locations.some(loc => loc.type === 'remote' || (loc.name && loc.name.toLowerCase() === 'remote'))
    };
    
    // 🆕 NEW: Check for cached personalized jobs first
    console.log(`🔍 Checking for cached personalized jobs...`);
    const cachedJobs = resume.getCachedPersonalizedJobs(currentPreferences);
    
    if (cachedJobs) {
      console.log(`✅ Found valid cached personalized jobs - ${cachedJobs.jobs.length} jobs (${cachedJobs.metadata.cacheAge} minutes old)`);
      
      return res.status(200).json({
        success: true,
        jobs: cachedJobs.jobs.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          salary: job.salary,
          jobType: job.jobType,
          sourceUrl: job.sourceUrl,
          parsedData: job.parsedData,
          isPersonalizedJob: true
        })),
        metadata: {
          resumeId: resumeId,
          searchCriteria: currentPreferences,
          jobsFound: cachedJobs.jobs.length,
          fromCache: true,
          cacheAge: cachedJobs.metadata.cacheAge,
          generatedAt: cachedJobs.metadata.generatedAt || new Date().toISOString()
        }
      });
    }
    
    console.log(`🔄 No valid cache found - generating fresh personalized jobs with API calls`);
    
    // Use the existing job search service with personalized criteria
    try {
      // 🔧 NEW: Format search criteria properly for the updated searchJobsForOnboarding function
      const searchCriteria = {
        jobTitles: jobTitles,
        locations: locations.map(loc => ({
          name: loc.name || loc,
          type: loc.type || (loc.name && loc.name.toLowerCase() === 'remote' ? 'remote' : 'city')
        })),
        includeRemote: currentPreferences.includeRemote,
        experienceLevel: 'mid',
        jobTypes: ['FULL_TIME'],
        limit: 3
      };
      
      console.log('🔍 Searching with personalized criteria:', {
        jobTitles: searchCriteria.jobTitles,
        locations: searchCriteria.locations.map(loc => loc.name),
        includeRemote: searchCriteria.includeRemote
      });
      
      // 🔧 FIXED: Use the updated searchJobsForOnboarding function with personalized criteria
      const jobResults = await jobSearchService.searchJobsForOnboarding(resumeId, searchCriteria);
      
      const jobs = jobResults.jobs || [];
      
      console.log(`✅ Found ${jobs.length} personalized jobs for onboarding`);
      
      // 🆕 NEW: Find recruiters based on job companies
      console.log(`👥 Starting recruiter lookup for ${jobs.length} job companies...`);
      
      let recruiters = [];
      try {
        if (jobs.length > 0) {
          // Extract unique company names from jobs
          const companyNames = [...new Set(jobs.map(job => job.company).filter(Boolean))];
          console.log(`🏢 Looking up recruiters for companies: ${companyNames.join(', ')}`);
          
          // Import required services
          const db = require('../config/postgresql');
          
          // Find one recruiter per company
          const recruiterPromises = companyNames.slice(0, 3).map(async (companyName) => {
            try {
              const query = `
                SELECT r.id, r.first_name, r.last_name, r.title, r.email, r.linkedin_profile_url,
                       c.name as company_name, c.website as company_website, c.employee_count,
                       i.name as industry_name
                FROM recruiters r
                JOIN companies c ON r.current_company_id = c.id
                LEFT JOIN industries i ON c.industry_id = i.id
                WHERE r.is_active = true 
                  AND (
                    LOWER(c.name) LIKE $1 OR 
                    LOWER(c.name) LIKE $2 OR
                    LOWER(TRIM(REGEXP_REPLACE(c.name, '\\s+', ' ', 'g'))) = 
                    LOWER(TRIM(REGEXP_REPLACE($3, '\\s+', ' ', 'g')))
                  )
                  AND r.email IS NOT NULL
                  AND r.email != ''
                ORDER BY r.contact_accuracy_score DESC NULLS LAST
                LIMIT 1
              `;
              
              console.log(`🔍 Searching for flexible company match: "${companyName}"`);
              const searchTerm = `%${companyName.toLowerCase()}%`;
              const result = await db.query(query, [searchTerm, searchTerm, companyName]);
              
              if (result.rows.length > 0) {
                const recruiter = result.rows[0];
                console.log(`✅ Found recruiter for ${companyName}: ${recruiter.first_name} ${recruiter.last_name}`);
                return {
                  id: recruiter.id,
                  firstName: recruiter.first_name,
                  lastName: recruiter.last_name,
                  fullName: `${recruiter.first_name} ${recruiter.last_name}`,
                  title: recruiter.title,
                  email: recruiter.email,
                  linkedinUrl: recruiter.linkedin_profile_url,
                  company: {
                    name: recruiter.company_name,
                    website: recruiter.company_website,
                    employeeCount: recruiter.employee_count
                  },
                  industry: recruiter.industry_name,
                  isPersonalizedRecruiter: true
                };
              } else {
                console.log(`❌ No recruiter found for ${companyName}`);
              }
              return null;
            } catch (error) {
              console.error(`❌ Error finding recruiter for ${companyName}:`, error);
              return null;
            }
          });
          
          const recruiterResults = await Promise.all(recruiterPromises);
          recruiters = recruiterResults.filter(Boolean);
          
          console.log(`✅ Found ${recruiters.length} recruiters for personalized onboarding`);
        }
      } catch (recruiterError) {
        console.error('❌ Error in recruiter lookup:', recruiterError);
        // Continue with empty recruiters array - don't fail the entire request
        recruiters = [];
      }
      
      // 🆕 NEW: Cache the personalized jobs AND recruiters for future use
      if (jobs.length > 0) {
        console.log(`💾 Caching ${jobs.length} personalized jobs and ${recruiters.length} recruiters for future use`);
        try {
          await resume.cachePersonalizedJobs(jobs, currentPreferences, {
            searchCriteria: searchCriteria,
            apiCallsMade: 1,
            recruiters: recruiters // Include recruiters in cache
          });
          console.log(`✅ Personalized jobs and recruiters cached successfully`);
        } catch (cacheError) {
          console.error('❌ Error caching personalized jobs (non-critical):', cacheError);
          // Don't fail if caching fails
        }
      }
      
      // 🆕 NEW: Update onboarding status to lock the flow
      console.log(`🔒 Locking onboarding flow - preferences set for first time`);
      try {
        resume.onboardingStatus = {
          completed: false, // Will be set to true when user completes entire onboarding
          preferencesSet: true,
          preferencesSetAt: new Date(),
          jobsGenerated: jobs.length > 0,
          recruitersFound: recruiters.length > 0, // Updated based on actual recruiters found
          lockedFlow: true, // Prevent going back to preferences
          currentPreferences: currentPreferences
        };
        await resume.save();
        console.log(`✅ Onboarding status updated - flow locked, recruiters found: ${recruiters.length > 0}`);
      } catch (statusError) {
        console.error('❌ Error updating onboarding status (non-critical):', statusError);
        // Don't fail if status update fails
      }
      
      // 🆕 NEW: Phase 3 - Save onboarding jobs to main /jobs collection
      if (jobs.length > 0) {
        console.log(`💾 Phase 3: Saving ${jobs.length} onboarding jobs to main /jobs collection`);
        try {
          await saveOnboardingJobsToCollection(userId, resumeId, jobs, currentPreferences, resume.name);
          console.log(`✅ Phase 3 completed: Onboarding jobs saved to /jobs collection`);
        } catch (saveError) {
          console.error('❌ Error saving onboarding jobs to collection (non-critical):', saveError);
          // Don't fail the entire request if job saving fails
        }
      }
      
      res.status(200).json({
        success: true,
        jobs: jobs.map(job => ({
          id: job._id || job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          salary: job.salary,
          jobType: job.jobType,
          sourceUrl: job.sourceUrl,
          parsedData: job.parsedData,
          isPersonalizedJob: true
        })),
        recruiters: recruiters,
        metadata: {
          resumeId: resumeId,
          searchCriteria: searchCriteria,
          jobsFound: jobs.length,
          recruitersFound: recruiters.length,
          fromCache: false,
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (jobSearchError) {
      console.error('❌ Error in personalized job search:', jobSearchError);
      res.status(500).json({
        success: false,
        message: 'Failed to find personalized jobs',
        error: jobSearchError.message
      });
    }
    
  } catch (error) {
    console.error('❌ Error in personalized onboarding jobs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get personalized jobs', 
      error: error.message
    });
  }
};

// NEW: First-time user onboarding analysis - combines resume analysis + job search + recruiter lookup
// NEW: First-time user onboarding analysis with JOB CACHING
exports.firstResumeAnalysis = async (req, res) => {
  try {
    const userId = req.user?._id || req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User identification missing' });
    }
    
    const resumeId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(resumeId)) {
      return res.status(400).json({ message: 'Invalid resume ID' });
    }
    
    console.log(`🎯 Starting first-time user onboarding analysis for resume ${resumeId}, user ${userId}`);
    
    // Get the resume and verify it belongs to the user
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    // Ensure resume has been analyzed
    if (!resume.analysis || !resume.parsedData) {
      return res.status(400).json({ 
        message: 'Resume must be fully processed before onboarding analysis',
        processingStatus: resume.processingStatus
      });
    }
    
    console.log(`📊 Resume found and analyzed: ${resume.name}`);
    
    // Step 1: Get resume analysis (already available)
    const resumeAnalysis = {
      overallScore: resume.analysis.overallScore || 0,
      atsCompatibility: resume.analysis.atsCompatibility || 0,
      profileSummary: resume.analysis.profileSummary || {},
      strengths: resume.analysis.strengths || [],
      weaknesses: resume.analysis.weaknesses || [],
      keywordsSuggestions: resume.analysis.keywordsSuggestions || [],
      improvementAreas: resume.analysis.improvementAreas || []
    };
    
    console.log(`✅ Resume analysis ready - Overall Score: ${resumeAnalysis.overallScore}%`);
    
    // 🔧 NEW: Step 2 - Check for cached onboarding jobs first
    console.log(`🔍 Checking for cached onboarding jobs...`);
    
    let jobs = [];
    let recruiters = [];
    let fromCache = false;
    
    // Check if we have valid cached onboarding data
    const cachedData = resume.getCachedOnboardingData();
    
    if (cachedData) {
      console.log(`✅ Found valid cached onboarding data - ${cachedData.jobs.length} jobs, ${cachedData.recruiters.length} recruiters (${cachedData.metadata.cacheAge} hours old)`);
      jobs = cachedData.jobs;
      recruiters = cachedData.recruiters;
      fromCache = true;
    } else {
      console.log(`🔄 No valid cache found - skipping initial job search (will be done with user preferences)`);
      
      // 🔧 REMOVED: Wasteful initial job search - jobs will be found when user sets preferences
      console.log(`⚡ Skipping initial job search - will use personalized search with user preferences`);
      jobs = []; // Start with empty jobs - will be populated when user sets preferences
      
      // Step 3: Find recruiters based on job companies
      console.log(`👥 Starting recruiter lookup for ${jobs.length} companies...`);
      
      try {
        if (jobs.length > 0) {
          // Extract unique company names from jobs
          const companyNames = [...new Set(jobs.map(job => job.company).filter(Boolean))];
          console.log(`🏢 Looking up recruiters for companies: ${companyNames.join(', ')}`);
          
          // Import required services
          const db = require('../config/postgresql');
          
          // Find one recruiter per company
          const recruiterPromises = companyNames.slice(0, 3).map(async (companyName) => {
            try {
              const query = `
                SELECT r.id, r.first_name, r.last_name, r.title, r.email, r.linkedin_profile_url,
                       c.name as company_name, c.website as company_website, c.employee_count,
                       i.name as industry_name
                FROM recruiters r
                JOIN companies c ON r.current_company_id = c.id
                LEFT JOIN industries i ON c.industry_id = i.id
                WHERE r.is_active = true 
                  AND (
                    LOWER(c.name) LIKE $1 OR 
                    LOWER(c.name) LIKE $2 OR
                    LOWER(TRIM(REGEXP_REPLACE(c.name, '\\s+', ' ', 'g'))) = 
                    LOWER(TRIM(REGEXP_REPLACE($3, '\\s+', ' ', 'g')))
                  )
                  AND r.email IS NOT NULL
                  AND r.email != ''
                ORDER BY r.contact_accuracy_score DESC NULLS LAST
                LIMIT 1
              `;
              
              console.log(`🔍 Searching for flexible company match: "${companyName}"`);
              const searchTerm = `%${companyName.toLowerCase()}%`;
              const result = await db.query(query, [searchTerm, searchTerm, companyName]);
              
              if (result.rows.length > 0) {
                const recruiter = result.rows[0];
                return {
                  id: recruiter.id,
                  firstName: recruiter.first_name,
                  lastName: recruiter.last_name,
                  fullName: `${recruiter.first_name} ${recruiter.last_name}`,
                  title: recruiter.title,
                  email: recruiter.email,
                  linkedinUrl: recruiter.linkedin_profile_url,
                  company: {
                    name: recruiter.company_name,
                    website: recruiter.company_website,
                    employeeCount: recruiter.employee_count
                  },
                  industry: recruiter.industry_name,
                  isOnboardingRecruiter: true
                };
              }
              return null;
            } catch (error) {
              console.error(`❌ Error finding recruiter for ${companyName}:`, error);
              return null;
            }
          });
          
          const recruiterResults = await Promise.all(recruiterPromises);
          recruiters = recruiterResults.filter(Boolean);
          
          console.log(`✅ Found ${recruiters.length} recruiters for onboarding`);
        }
      } catch (recruiterError) {
        console.error('❌ Error in recruiter lookup:', recruiterError);
        // Continue with empty recruiters array - don't fail the entire onboarding
        recruiters = [];
      }
      
      // 🆕 NEW: Cache the generated data to prevent future API calls
      if (jobs.length > 0 || recruiters.length > 0) {
        console.log(`💾 Caching onboarding data - ${jobs.length} jobs, ${recruiters.length} recruiters`);
        try {
          await resume.cacheOnboardingData(jobs, recruiters, {
            searchCriteria: { jobTitle: 'Professional', location: 'United States' },
            apiCallsMade: 1
          });
          console.log(`✅ Onboarding data cached successfully`);
        } catch (cacheError) {
          console.error('❌ Error caching onboarding data (non-critical):', cacheError);
          // Don't fail if caching fails
        }
      }
    }
    
    // Step 4: Return combined data
    const response = {
      success: true,
      message: 'First-time user onboarding analysis completed',
      data: {
        resumeAnalysis,
        jobs: jobs.map(job => ({
          id: job._id || job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          salary: job.salary,
          jobType: job.jobType,
          sourceUrl: job.sourceUrl,
          parsedData: job.parsedData,
          isOnboardingJob: true
        })),
        recruiters,
        metadata: {
          resumeId: resumeId,
          userId: userId,
          generatedAt: new Date().toISOString(),
          jobsFound: jobs.length,
          recruitersFound: recruiters.length,
          isFirstTimeUser: true,
          fromCache: fromCache, // 🆕 NEW: Indicate if data came from cache
          cacheInfo: fromCache ? {
            cacheAge: Math.floor((Date.now() - new Date(resume.onboardingJobCache?.metadata?.generatedAt).getTime()) / (1000 * 60 * 60)),
            cacheVersion: resume.onboardingJobCache?.metadata?.cacheVersion || '1.0'
          } : null
        }
      }
    };
    
    console.log(`🎉 Onboarding analysis completed successfully:`, {
      resumeScore: resumeAnalysis.overallScore,
      jobsFound: jobs.length,
      recruitersFound: recruiters.length,
      fromCache: fromCache
    });
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ Error in first-time user onboarding analysis:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to complete onboarding analysis', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 🆕 NEW: Phase 3 Helper Function - Save onboarding jobs to main /jobs collection with REAL ANALYSIS
async function saveOnboardingJobsToCollection(userId, resumeId, jobs, preferences, resumeName) {
  try {
    console.log(`💾 Phase 3: Starting to save ${jobs.length} onboarding jobs to /jobs collection with REAL analysis`);
    
    // Import the job matching service for real Phase 3 analysis
    const jobMatchingService = require('../services/jobMatching.service');
    
    // Step 1: Create AI Job Search record for onboarding
    const aiJobSearch = new AiJobSearch({
      userId: new mongoose.Types.ObjectId(userId),
      resumeId: new mongoose.Types.ObjectId(resumeId),
      resumeName: resumeName || 'Onboarding Resume',
      searchCriteria: {
        jobTitles: preferences.jobTitles || [],
        searchLocations: preferences.locations?.map(loc => ({
          name: loc.name || loc,
          type: loc.type || 'city'
        })) || [],
        remoteWork: preferences.includeRemote || false,
        experienceLevel: 'mid',
        jobTypes: ['FULL_TIME']
      },
      status: 'completed',
      searchType: 'weekly_active_jobs',
      weeklyLimit: 50,
      jobsFoundThisWeek: jobs.length,
      totalJobsFound: jobs.length,
      lastSearchDate: new Date(),
      currentWeekStart: new Date(),
      searchApproach: '3-phase-intelligent-active-jobs-weekly',
      qualityLevel: 'active-jobs-weekly-enhanced',
      approachVersion: '5.0-weekly-active-jobs-location-salary'
    });
    
    // Save the AI Job Search record
    const savedAiJobSearch = await aiJobSearch.save();
    console.log(`✅ AI Job Search record created: ${savedAiJobSearch._id}`);
    
    // Step 2: Save individual jobs to Job collection with REAL Phase 3 analysis
    const savedJobs = [];
    let duplicatesSkipped = 0;
    
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      
      try {
        // Check for duplicates before saving
        const existingJob = await Job.findDuplicateJob(userId, job.title, job.company);
        
        if (existingJob) {
          console.log(`⚠️ Duplicate job skipped: ${job.title} at ${job.company}`);
          duplicatesSkipped++;
          continue;
        }
        
        // Create new job document WITHOUT fake matchAnalysis (will be added after REAL analysis)
        const newJob = new Job({
          userId: new mongoose.Types.ObjectId(userId),
          title: job.title,
          company: job.company,
          location: {
            city: job.location?.city || job.location?.parsed?.city,
            state: job.location?.state || job.location?.parsed?.state,
            country: job.location?.country || job.location?.parsed?.country || 'US',
            remote: job.location?.isRemote || job.location?.remote || false,
            fullAddress: job.location?.original || job.location?.fullAddress
          },
          description: job.description || '',
          sourceUrl: job.sourceUrl,
          sourcePlatform: 'ACTIVE_JOBS_DB_DIRECT', // Tag as onboarding discovery
          salary: {
            min: job.salary?.min,
            max: job.salary?.max,
            currency: job.salary?.currency || 'USD',
            isExplicit: !!(job.salary?.min || job.salary?.max)
          },
          jobType: job.jobType || 'FULL_TIME',
          applicationStatus: 'NOT_APPLIED',
          isAiGenerated: true,
          aiSearchId: savedAiJobSearch._id,
          
          // 🔧 REMOVED: Fake matchAnalysis - will be added after REAL Phase 3 analysis
          
          // 🔧 ENHANCED: Properly map job analysis data to frontend-expected structure
          parsedData: createEnhancedParsedDataForOnboarding(job),
          
          // Active Jobs DB specific data
          activeJobsDBData: {
            platform: 'Active Jobs DB (Onboarding)',
            originalUrl: job.sourceUrl,
            postedDate: new Date(),
            activeJobsDBId: job.id || job._id,
            category: 'Professional',
            job_type: job.jobType || 'FULL_TIME',
            experience_level: job.parsedData?.experienceLevel || 'mid',
            remote: job.location?.isRemote || false,
            discoveryMethod: 'onboarding_personalized_search',
            isDirectEmployer: true,
            qualityScore: 85,
            premiumFeatures: {
              directEmployerLink: true,
              hourlyUpdated: true,
              verifiedPosting: true,
              enhancedMetadata: true
            }
          },
          
          // Enhanced location data
          locationData: {
            original: job.location?.original || `${job.location?.city}, ${job.location?.state}`,
            parsed: {
              city: job.location?.city || job.location?.parsed?.city,
              state: job.location?.state || job.location?.parsed?.state,
              country: job.location?.country || 'US',
              isRemote: job.location?.isRemote || false
            },
            isRemote: job.location?.isRemote || false,
            workArrangement: job.location?.isRemote ? 'remote' : 'onsite'
          },
          
          // Enhanced salary data
          salaryData: {
            min: job.salary?.min,
            max: job.salary?.max,
            currency: job.salary?.currency || 'USD',
            period: 'yearly',
            source: 'active_jobs_db',
            extractionMethod: 'onboarding_analysis',
            confidence: job.salary?.confidence || 80,
            isEstimated: !job.salary?.min && !job.salary?.max
          },
          
          // Analysis metadata
          analysisMetadata: {
            analyzedAt: new Date(),
            algorithmVersion: '5.0',
            model: 'gpt-4o',
            analysisType: 'onboarding_enhanced',
            qualityLevel: 'high',
            sourceJobBoard: 'active_jobs_db',
            enhancedAnalysis: true,
            salaryExtracted: !!(job.salary?.min || job.salary?.max),
            locationEnhanced: true,
            weeklySearch: false,
            onboardingJob: true
          },
          
          // AI search metadata
          aiSearchMetadata: {
            searchScore: 85,
            discoveryMethod: 'onboarding_personalized_search',
            extractionSuccess: true,
            contentQuality: 'high',
            premiumAnalysis: true,
            activeJobsDBDiscovery: true,
            enhancedAnalysis: true,
            salaryExtracted: !!(job.salary?.min || job.salary?.max),
            locationEnhanced: true,
            originalPlatform: 'Active Jobs DB (Onboarding)',
            workArrangement: job.location?.isRemote ? 'remote' : 'onsite',
            experienceLevel: job.parsedData?.experienceLevel || 'mid',
            isDirectEmployer: true,
            searchLocation: preferences.locations?.map(loc => loc.name || loc).join(', ') || 'Multiple',
            matchReason: 'Personalized onboarding search based on user preferences',
            
            // Active Jobs DB specific metadata
            activeJobsDBMetadata: {
              discoveryMethod: 'onboarding_personalized_search',
              apiProvider: 'active_jobs_db',
              premiumDatabaseAccess: true,
              directEmployerLinks: true,
              qualityGuaranteed: true,
              enhancedSalaryExtraction: true,
              locationTargeting: true,
              premiumFeatures: {
                directEmployerAccess: true,
                enhancedJobMetadata: true,
                realTimeUpdates: true,
                qualityFiltering: true,
                atsIntegration: true
              }
            },
            
            // Enhanced metadata
            enhancedMetadata: {
              analysisModel: 'gpt-4o',
              analysisType: 'onboarding_enhanced',
              qualityLevel: 'high',
              enhancedAnalysis: true,
              salaryExtracted: !!(job.salary?.min || job.salary?.max),
              salarySource: 'active_jobs_db',
              salaryConfidence: job.salary?.confidence || 80,
              locationConfidence: 90,
              workArrangement: job.location?.isRemote ? 'remote' : 'onsite',
              isRemote: job.location?.isRemote || false,
              weeklySearch: false,
              onboardingJob: true
            }
          },
          
          // Analysis status
          analysisStatus: {
            status: 'completed',
            progress: 100,
            message: 'Onboarding job analysis completed',
            completedAt: new Date(),
            canViewJob: true,
            skillsFound: job.analysis?.technicalSkills?.length || 0,
            experienceLevel: job.parsedData?.experienceLevel || 'mid',
            modelUsed: 'gpt-4o',
            analysisType: 'onboarding_enhanced',
            isActiveJobsDBDiscovery: true,
            sourceJobBoard: 'active_jobs_db',
            isDirectEmployer: true,
            premiumDatabase: true,
            enhancedAnalysis: true,
            salaryExtracted: !!(job.salary?.min || job.salary?.max),
            locationEnhanced: true,
            weeklySearch: false
          },
          
          // User interactions
          userInteractions: {
            viewCount: 0,
            bookmarked: false,
            applied: false
          }
        });
        
        // Save the job FIRST (without matchAnalysis)
        const savedJob = await newJob.save();
        console.log(`✅ Job saved: ${savedJob.title} at ${savedJob.company} (ID: ${savedJob._id})`);
        
        // 🔧 NEW: Perform REAL Phase 3 analysis using job matching service
        console.log(`🔍 Starting REAL Phase 3 analysis for job: ${savedJob.title} at ${savedJob.company}`);
        try {
          const realMatchAnalysis = await jobMatchingService.matchResumeWithJob(resumeId, savedJob._id);
          
          // Update the job with REAL analysis results
          savedJob.matchAnalysis = realMatchAnalysis;
          await savedJob.save();
          
          console.log(`✅ REAL Phase 3 analysis completed for ${savedJob.title} - Score: ${realMatchAnalysis.overallScore}%`);
        } catch (analysisError) {
          console.error(`❌ Error in Phase 3 analysis for ${savedJob.title}:`, analysisError);
          // Continue without failing the entire process - job is still saved
        }
        
        savedJobs.push(savedJob);
        
        // Add job to AI Job Search record
        await savedAiJobSearch.addJobFound({
          jobId: savedJob._id,
          title: savedJob.title,
          company: savedJob.company,
          location: {
            original: savedJob.location?.fullAddress,
            parsed: {
              city: savedJob.location?.city,
              state: savedJob.location?.state,
              country: savedJob.location?.country,
              isRemote: savedJob.location?.remote
            }
          },
          salary: {
            min: savedJob.salary?.min,
            max: savedJob.salary?.max,
            currency: savedJob.salary?.currency
          },
          contentQuality: 'high',
          extractionSuccess: true,
          matchScore: 85,
          sourceUrl: savedJob.sourceUrl,
          sourcePlatform: savedJob.sourcePlatform,
          extractionMethod: 'onboarding_enhanced',
          premiumAnalysis: true,
          apiSource: 'active_jobs_db',
          activeJobsDBId: job.id || job._id,
          jobBoardOrigin: 'active_jobs_db',
          directCompanyPosting: true,
          salaryPredicted: false,
          jobType: savedJob.jobType,
          experienceLevel: savedJob.parsedData?.experienceLevel,
          workArrangement: savedJob.parsedData?.workArrangement,
          benefits: savedJob.parsedData?.benefits || [],
          requiredSkills: savedJob.parsedData?.keySkills || [],
          preferredSkills: savedJob.parsedData?.qualifications?.preferred || []
        });
        
      } catch (jobSaveError) {
        console.error(`❌ Error saving job ${job.title} at ${job.company}:`, jobSaveError);
        
        // If it's a duplicate error, skip and continue
        if (jobSaveError.code === 'DUPLICATE_JOB' || jobSaveError.code === 11000) {
          duplicatesSkipped++;
          continue;
        }
        
        // For other errors, log but don't fail the entire process
        console.error(`❌ Non-critical error saving job, continuing...`);
      }
    }
    
    console.log(`✅ Phase 3 completed successfully:`, {
      totalJobs: jobs.length,
      savedJobs: savedJobs.length,
      duplicatesSkipped: duplicatesSkipped,
      aiJobSearchId: savedAiJobSearch._id
    });
    
    return {
      aiJobSearchId: savedAiJobSearch._id,
      savedJobs: savedJobs,
      duplicatesSkipped: duplicatesSkipped,
      totalProcessed: jobs.length
    };
    
  } catch (error) {
    console.error('❌ Error in saveOnboardingJobsToCollection:', error);
    throw new Error(`Failed to save onboarding jobs to collection: ${error.message}`);
  }
}

// 🔧 NEW: Helper function to validate and sanitize parsed data before saving
function validateAndSanitizeParsedData(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') {
    throw new Error('Invalid parsed data received from parser service');
  }
  
  console.log('🔧 Validating and sanitizing parsed data...');
  
  // Deep clone to avoid modifying original
  const sanitizedData = JSON.parse(JSON.stringify(parsedData));
  
  // Helper function to sanitize date fields
  const sanitizeDateField = (dateValue, fieldName) => {
    if (!dateValue) return null;
    
    // If it's already a Date object, keep it
    if (dateValue instanceof Date) return dateValue;
    
    // If it's a string, check for special cases
    if (typeof dateValue === 'string') {
      const lowerDate = dateValue.toLowerCase().trim();
      
      // Handle current position indicators
      const currentIndicators = ['present', 'current', 'ongoing', 'now'];
      if (currentIndicators.includes(lowerDate)) {
        return dateValue; // Keep as string
      }
      
      // Handle never expires indicators
      const neverExpires = ['never', 'permanent', 'lifetime'];
      if (neverExpires.includes(lowerDate)) {
        return dateValue; // Keep as string
      }
      
      // Try to parse as date
      const parsedDate = new Date(dateValue);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
      
      // If parsing fails, keep as string (validation will be handled by schema)
      console.log(`⚠️ Date field "${fieldName}" could not be parsed: "${dateValue}", keeping as string`);
      return dateValue;
    }
    
    return dateValue;
  };
  
  // Sanitize experience dates
  if (Array.isArray(sanitizedData.experience)) {
    sanitizedData.experience = sanitizedData.experience.map((exp, index) => {
      if (exp.startDate) {
        exp.startDate = sanitizeDateField(exp.startDate, `experience[${index}].startDate`);
      }
      if (exp.endDate) {
        exp.endDate = sanitizeDateField(exp.endDate, `experience[${index}].endDate`);
      }
      return exp;
    });
  }
  
  // Sanitize education dates
  if (Array.isArray(sanitizedData.education)) {
    sanitizedData.education = sanitizedData.education.map((edu, index) => {
      if (edu.startDate) {
        edu.startDate = sanitizeDateField(edu.startDate, `education[${index}].startDate`);
      }
      if (edu.endDate) {
        edu.endDate = sanitizeDateField(edu.endDate, `education[${index}].endDate`);
      }
      return edu;
    });
  }
  
  // Sanitize certification dates
  if (Array.isArray(sanitizedData.certifications)) {
    sanitizedData.certifications = sanitizedData.certifications.map((cert, index) => {
      if (cert.dateObtained) {
        cert.dateObtained = sanitizeDateField(cert.dateObtained, `certifications[${index}].dateObtained`);
      }
      if (cert.validUntil) {
        cert.validUntil = sanitizeDateField(cert.validUntil, `certifications[${index}].validUntil`);
      }
      return cert;
    });
  }
  
  // Sanitize project dates
  if (Array.isArray(sanitizedData.projects)) {
    sanitizedData.projects = sanitizedData.projects.map((project, index) => {
      if (project.startDate) {
        project.startDate = sanitizeDateField(project.startDate, `projects[${index}].startDate`);
      }
      if (project.endDate) {
        project.endDate = sanitizeDateField(project.endDate, `projects[${index}].endDate`);
      }
      return project;
    });
  }
  
  console.log('✅ Parsed data validation and sanitization completed');
  return sanitizedData;
}

// 🔧 NEW: Helper function to create enhanced parsed data for onboarding jobs
function createEnhancedParsedDataForOnboarding(job) {
  try {
    console.log(`🔧 Creating enhanced parsed data for job: ${job.title} at ${job.company}`);
    
    // Extract data from job analysis if available
    const analysis = job.analysis || {};
    const existingParsedData = job.parsedData || {};
    
    // 🔧 ENHANCED: Map job analysis data to frontend-expected structure
    const enhancedParsedData = {
      // Core requirements - what the frontend expects for "Job Requirements" section
      requirements: analysis.requirements || existingParsedData.requirements || [
        'Relevant experience in the field',
        'Strong problem-solving and analytical skills',
        'Excellent communication and teamwork abilities',
        'Ability to work independently and manage multiple tasks',
        'Proficiency with relevant tools and technologies'
      ],
      
      // Responsibilities - what the frontend expects for "Key Responsibilities" section
      responsibilities: analysis.responsibilities || existingParsedData.responsibilities || [
        'Execute key initiatives and projects',
        'Collaborate with cross-functional teams',
        'Contribute to strategic planning and implementation',
        'Maintain high standards of quality and performance',
        'Support team goals and organizational objectives'
      ],
      
      // Qualifications - what the frontend expects for "Qualifications" section
      qualifications: {
        required: analysis.qualifications?.required || existingParsedData.qualifications?.required || [
          'Bachelor\'s degree or equivalent experience',
          'Relevant years of professional experience',
          'Strong analytical and problem-solving skills',
          'Excellent written and verbal communication'
        ],
        preferred: analysis.qualifications?.preferred || existingParsedData.qualifications?.preferred || [
          'Advanced degree in relevant field',
          'Industry certifications',
          'Experience with modern tools and technologies',
          'Leadership or mentoring experience'
        ]
      },
      
      // Technical Requirements - what the frontend expects for "Technical Requirements" section
      technicalRequirements: analysis.technicalRequirements || analysis.technicalSkills?.map(skill => 
        typeof skill === 'string' ? skill : skill.name
      ) || existingParsedData.technicalRequirements || [
        'Proficiency with relevant software and tools',
        'Understanding of industry best practices',
        'Experience with modern development methodologies',
        'Knowledge of current technology trends'
      ],
      
      // Tools & Technologies - what the frontend expects for "Tools & Technologies" section
      toolsAndTechnologies: analysis.toolsAndTechnologies || existingParsedData.toolsAndTechnologies || [
        'Microsoft Office Suite',
        'Project Management Tools',
        'Communication Platforms',
        'Industry-specific Software'
      ],
      
      // Additional fields for completeness
      benefits: analysis.benefits || existingParsedData.benefits || [
        'Competitive salary and benefits package',
        'Health and wellness programs',
        'Professional development opportunities',
        'Flexible work arrangements'
      ],
      
      keySkills: analysis.keySkills || existingParsedData.keySkills || [
        { name: 'Communication', importance: 8, category: 'soft', skillType: 'communication' },
        { name: 'Problem Solving', importance: 8, category: 'soft', skillType: 'analytical' },
        { name: 'Teamwork', importance: 7, category: 'soft', skillType: 'communication' },
        { name: 'Leadership', importance: 6, category: 'soft', skillType: 'management' }
      ],
      
      experienceLevel: analysis.experienceLevel || existingParsedData.experienceLevel || 'mid',
      
      yearsOfExperience: {
        minimum: analysis.yearsOfExperience?.minimum || existingParsedData.yearsOfExperience?.minimum || 2,
        preferred: analysis.yearsOfExperience?.preferred || existingParsedData.yearsOfExperience?.preferred || 5
      },
      
      educationRequirements: analysis.educationRequirements || existingParsedData.educationRequirements || [
        'Bachelor\'s degree in relevant field',
        'Equivalent professional experience considered'
      ],
      
      workArrangement: analysis.workArrangement || existingParsedData.workArrangement || (job.location?.isRemote ? 'remote' : 'onsite'),
      
      // Enhanced fields for better analysis
      industryContext: analysis.industryContext || existingParsedData.industryContext || 'technology',
      roleCategory: analysis.roleCategory || existingParsedData.roleCategory || 'general',
      technicalComplexity: analysis.technicalComplexity || existingParsedData.technicalComplexity || 'medium',
      leadershipRequired: analysis.leadershipRequired || existingParsedData.leadershipRequired || false,
      
      // Metadata
      extractedAt: new Date(),
      extractionMethod: 'onboarding_enhanced_mapping',
      enhancedAnalysis: true,
      dataSource: 'job_analysis_with_fallbacks'
    };
    
    console.log(`✅ Enhanced parsed data created for ${job.title}:`, {
      requirementsCount: enhancedParsedData.requirements.length,
      responsibilitiesCount: enhancedParsedData.responsibilities.length,
      requiredQualificationsCount: enhancedParsedData.qualifications.required.length,
      preferredQualificationsCount: enhancedParsedData.qualifications.preferred.length,
      technicalRequirementsCount: enhancedParsedData.technicalRequirements.length,
      toolsCount: enhancedParsedData.toolsAndTechnologies.length
    });
    
    return enhancedParsedData;
    
  } catch (error) {
    console.error(`❌ Error creating enhanced parsed data for ${job.title}:`, error);
    
    // Return fallback structure if enhancement fails
    return {
      requirements: ['Relevant experience and skills for the position'],
      responsibilities: ['Execute assigned tasks and responsibilities'],
      qualifications: {
        required: ['Bachelor\'s degree or equivalent experience'],
        preferred: ['Advanced degree or additional certifications']
      },
      technicalRequirements: ['Proficiency with relevant tools and technologies'],
      toolsAndTechnologies: ['Standard office software and industry tools'],
      benefits: ['Competitive compensation and benefits package'],
      keySkills: [
        { name: 'Communication', importance: 7, category: 'soft', skillType: 'communication' },
        { name: 'Problem Solving', importance: 7, category: 'soft', skillType: 'analytical' }
      ],
      experienceLevel: 'mid',
      yearsOfExperience: { minimum: 2, preferred: 5 },
      educationRequirements: ['Bachelor\'s degree in relevant field'],
      workArrangement: job.location?.isRemote ? 'remote' : 'onsite',
      extractedAt: new Date(),
      extractionMethod: 'fallback_structure',
      enhancedAnalysis: false,
      dataSource: 'fallback_defaults'
    };
  }
}
