// backend/controllers/extension.controller.js - Clean Backend Only
const User = require('../models/mongodb/user.model');
const Resume = require('../models/mongodb/resume.model');
const { openai } = require('../config/openai');
const asyncHandler = require('express-async-handler');

// Helper function to extract basic field from resume data
const extractBasicField = (resumeData, fieldType) => {
  if (!resumeData) return '';

  const data = resumeData;
  
  switch (fieldType) {
    case 'firstName':
    case 'first_name':
      return data.personalInfo?.firstName || data.contact?.firstName || '';
    
    case 'lastName':
    case 'last_name':
      return data.personalInfo?.lastName || data.contact?.lastName || '';
    
    case 'email':
      return data.personalInfo?.email || data.contact?.email || '';
    
    case 'phone':
    case 'phoneNumber':
      return data.personalInfo?.phone || data.contact?.phone || '';
    
    case 'linkedin':
      return data.personalInfo?.linkedin || data.contact?.linkedin || '';
    
    case 'github':
      return data.personalInfo?.github || data.contact?.github || '';
    
    case 'portfolio':
    case 'website':
      return data.personalInfo?.portfolio || data.contact?.website || '';
    
    case 'city':
      return data.personalInfo?.location?.city || '';
    
    case 'state':
      return data.personalInfo?.location?.state || '';
    
    case 'country':
      return data.personalInfo?.location?.country || '';
    
    case 'currentCompany':
      return data.experience?.[0]?.company || '';
    
    case 'currentTitle':
      return data.experience?.[0]?.title || '';
    
    case 'school':
    case 'university':
      return data.education?.[0]?.institution || '';
    
    case 'degree':
    case 'major':
      return data.education?.[0]?.degree || '';
    
    default:
      return '';
  }
};

// Helper function to enhance field with AI
const enhanceFieldWithAI = async ({ fieldName, fieldType, currentValue, question, jobDescription, resumeData }) => {
  try {
    if (!openai) {
      console.warn('OpenAI not configured, skipping AI enhancement');
      return currentValue;
    }

    const prompt = `You are a professional job application assistant. Help enhance this application field response.

Field: ${fieldName}
Type: ${fieldType}
${question ? `Question: ${question}` : ''}
Current Value: ${currentValue || 'Not provided'}

Job Description:
${jobDescription || 'Not provided'}

Resume Context:
${JSON.stringify(resumeData, null, 2)}

Instructions:
1. If this is a basic field (name, email, phone), return the exact value from the resume
2. If this is a complex field (cover letter, why interested, etc.), provide a tailored, professional response
3. Keep responses concise and relevant to the job
4. Use specific examples from the resume when appropriate
5. Maximum 150 words for any response

Enhanced Response:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content?.trim() || currentValue;
  } catch (error) {
    console.error('AI enhancement error:', error);
    return currentValue; // Fallback to original value
  }
};

// @desc    Check extension authentication
// @route   GET /api/extension/auth/check
// @access  Private
const checkExtensionAuth = asyncHandler(async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        usage: user.getUsageStats()
      }
    });
  } catch (error) {
    console.error('Extension auth check error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during authentication check'
    });
  }
});

// @desc    Get user resumes for extension
// @route   GET /api/extension/resumes
// @access  Private
const getExtensionResumes = asyncHandler(async (req, res) => {
  try {
    console.log('📄 Fetching resumes for user:', req.user.id);
    
    // Updated query to match your actual resume structure
    const resumes = await Resume.find({ 
      userId: req.user.id,
      $or: [
        { 'processingStatus.status': 'completed' },
        { status: 'completed' },
        { status: 'processed' },
        { status: 'active' },
        { status: { $exists: false } },
        { parsedData: { $exists: true, $ne: null } }
      ]
    }).select('name originalFilename fileType createdAt updatedAt parsedData processingStatus isTailored tailoredForJob').sort({ createdAt: -1 });

    console.log('📄 Found resumes:', resumes.length);
    
    const formattedResumes = resumes.map((resume, index) => {
      // Use the actual name field from the document
      let resumeName = resume.name || resume.originalFilename || `Resume ${index + 1}`;
      
      // Clean up the name (remove file extension if present)
      if (resumeName && resumeName.includes('.')) {
        resumeName = resumeName.substring(0, resumeName.lastIndexOf('.'));
      }
      
      // Add indicator if it's a tailored resume
      if (resume.isTailored && resume.tailoredForJob) {
        const jobTitle = resume.tailoredForJob.jobTitle;
        const company = resume.tailoredForJob.company;
        if (jobTitle && company) {
          resumeName = `${resumeName} (Tailored for ${company})`;
        } else if (jobTitle) {
          resumeName = `${resumeName} (Tailored)`;
        }
      }
      
      console.log(`📄 Resume ${index + 1}:`, {
        id: resume._id,
        name: resumeName,
        originalName: resume.name,
        isTailored: resume.isTailored,
        processingStatus: resume.processingStatus?.status
      });
      
      return {
        id: resume._id,
        name: resumeName,
        uploadDate: resume.updatedAt || resume.createdAt,
        data: resume.parsedData,
        isTailored: resume.isTailored,
        tailoredForJob: resume.tailoredForJob,
        processingStatus: resume.processingStatus?.status
      };
    });

    res.json({
      success: true,
      resumes: formattedResumes
    });
  } catch (error) {
    console.error('Get extension resumes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resumes'
    });
  }
});

// @desc    Process auto-fill request with AI enhancement
// @route   POST /api/extension/autofill
// @access  Private
const processAutoFill = asyncHandler(async (req, res) => {
  try {
    const { formFields, jobDescription, resumeId, atsPlatform } = req.body;

    // Check usage limits
    const canUse = req.user.canPerformAction('extensionAutoFills', 1);
    if (!canUse.allowed) {
      return res.status(400).json({
        success: false,
        error: canUse.reason,
        usage: {
          current: canUse.current,
          limit: canUse.limit
        }
      });
    }

    // Get resume data
    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user.id
    });

    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Process each form field
    const filledData = {};
    const enhancedFields = [];

    for (const [fieldName, fieldInfo] of Object.entries(formFields)) {
      try {
        let value = '';

        // First, try to get basic value from resume
        if (fieldInfo.type === 'text' || fieldInfo.type === 'email' || fieldInfo.type === 'tel') {
          value = extractBasicField(resume.parsedData, fieldInfo.fieldType || fieldName);
        }

        // If we have AI enhancement enabled and this is a complex field, enhance it
        if (fieldInfo.enhanceWithAI && (fieldInfo.type === 'textarea' || fieldInfo.isQuestion)) {
          const enhancedValue = await enhanceFieldWithAI({
            fieldName,
            fieldType: fieldInfo.fieldType,
            currentValue: value,
            question: fieldInfo.question,
            jobDescription,
            resumeData: resume.parsedData
          });
          
          if (enhancedValue && enhancedValue !== value) {
            value = enhancedValue;
            enhancedFields.push(fieldName);
          }
        }

        filledData[fieldName] = value;
      } catch (fieldError) {
        console.error(`Error processing field ${fieldName}:`, fieldError);
        // Continue with other fields even if one fails
        filledData[fieldName] = '';
      }
    }

    // Track usage
    await req.user.trackUsage('extensionAutoFills', 1);

    res.json({
      success: true,
      filledData,
      enhancedFields,
      atsPlatform,
      usage: {
        current: req.user.currentUsage.extensionAutoFills + 1,
        limit: req.user.getPlanLimits().extensionAutoFills
      }
    });

  } catch (error) {
    console.error('Auto-fill processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process auto-fill request'
    });
  }
});

// @desc    Enhance a specific field with AI
// @route   POST /api/extension/enhance-field
// @access  Private
const enhanceField = asyncHandler(async (req, res) => {
  try {
    const { fieldName, fieldType, currentValue, question, jobDescription, resumeId } = req.body;

    // Get resume data if resumeId provided
    let resumeData = null;
    if (resumeId) {
      const resume = await Resume.findOne({
        _id: resumeId,
        userId: req.user.id
      });
      
      if (resume) {
        resumeData = resume.parsedData;
      }
    }

    // Enhance the field
    const enhancedValue = await enhanceFieldWithAI({
      fieldName,
      fieldType,
      currentValue,
      question,
      jobDescription,
      resumeData
    });

    res.json({
      success: true,
      enhancedValue,
      originalValue: currentValue
    });

  } catch (error) {
    console.error('Field enhancement error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enhance field'
    });
  }
});

// @desc    Get extension usage stats
// @route   GET /api/extension/usage
// @access  Private
const getExtensionUsage = asyncHandler(async (req, res) => {
  try {
    const usage = req.user.getUsageStats();
    const limits = req.user.getPlanLimits();

    res.json({
      success: true,
      usage: {
        extensionAutoFills: usage.extensionAutoFills || {
          used: req.user.currentUsage?.extensionAutoFills || 0,
          limit: limits.extensionAutoFills,
          unlimited: limits.extensionAutoFills === -1,
          percentage: limits.extensionAutoFills > 0 ? 
            Math.round(((req.user.currentUsage?.extensionAutoFills || 0) / limits.extensionAutoFills) * 100) : 0
        }
      },
      plan: {
        tier: req.user.subscriptionTier,
        status: req.user.subscriptionStatus
      }
    });
  } catch (error) {
    console.error('Get extension usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage stats'
    });
  }
});

// @desc    Check if user can perform extension action
// @route   POST /api/extension/check-usage
// @access  Private
const checkExtensionUsage = asyncHandler(async (req, res) => {
  try {
    const { action } = req.body;

    const canPerform = req.user.canPerformAction(action, 1);
    
    res.json({
      success: true,
      usage: canPerform
    });
  } catch (error) {
    console.error('Check extension usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check usage'
    });
  }
});

module.exports = {
  checkExtensionAuth,
  getExtensionResumes,
  processAutoFill,
  enhanceField,
  getExtensionUsage,
  checkExtensionUsage
};