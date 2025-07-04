// controllers/assistant.controller.js - CLEAN VERSION WITH FEATURE GATING
const { openai } = require('../config/openai');
const Resume = require('../models/mongodb/resume.model');
const Job = require('../models/mongodb/job.model');
const User = require('../models/mongodb/user.model');
const Conversation = require('../models/mongodb/conversation.model');
const ConversationService = require('../services/conversationService');
const subscriptionService = require('../services/subscription.service');
const usageService = require('../services/usage.service');

// ===================================================================
// 🆕 RAG: @-MENTION ENDPOINTS - WITH FEATURE GATING
// ===================================================================

/**
 * Get mention suggestions for @-functionality - WITH AI ASSISTANT ACCESS CONTROL
 */
exports.getMentionSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          error: 'This feature requires Hunter plan',
          currentPlan: currentSubscription.user.subscriptionTier,
          upgradeRequired: true,
          feature: 'aiAssistant',
          availableOn: ['hunter']
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }

    const { query = '' } = req.query;

    console.log(`🔍 Getting mention suggestions for user ${userId}, query: "${query}"`);

    // Build search filters
    const searchFilter = {};
    if (query && query.trim()) {
      const searchRegex = new RegExp(query.trim(), 'i');
      searchFilter.$or = [
        { name: searchRegex },
        { title: searchRegex },
        { company: searchRegex }
      ];
    }

    // Get user's resumes
    const resumesPromise = Resume.find({
      userId,
      ...searchFilter,
      ...(query ? {} : {}) // Include all if no query
    })
    .select('name analysis.overallScore createdAt')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

    // Get user's jobs  
    const jobsPromise = Job.find({
      userId,
      ...searchFilter,
      ...(query ? {} : {}) // Include all if no query
    })
    .select('title company location createdAt')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

    const [resumes, jobs] = await Promise.all([resumesPromise, jobsPromise]);

    console.log(`✅ Found ${resumes.length} resumes and ${jobs.length} jobs`);

    res.json({
      success: true,
      resumes: resumes || [],
      jobs: jobs || [],
      total: (resumes?.length || 0) + (jobs?.length || 0)
    });

  } catch (error) {
    console.error('Get mention suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mention suggestions',
      resumes: [],
      jobs: []
    });
  }
};

/**
 * Get full context data for mentioned item - WITH FEATURE GATING
 */
exports.getContextData = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          upgradeRequired: true,
          feature: 'aiAssistant'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }

    const { type, id } = req.params;

    console.log(`📄 Getting context data for ${type}:${id}`);

    let contextData = null;

    if (type === 'resume') {
      contextData = await Resume.findOne({ _id: id, userId })
        .populate('userId', 'firstName lastName email')
        .lean();
      
      if (contextData) {
        // Include relevant resume data for RAG
        contextData.contextType = 'resume';
        contextData.displayName = contextData.name;
        contextData.score = contextData.analysis?.overallScore || 0;
      }
    } else if (type === 'job') {
      contextData = await Job.findOne({ _id: id, userId })
        .populate('userId', 'firstName lastName email')
        .lean();
      
      if (contextData) {
        // Include relevant job data for RAG
        contextData.contextType = 'job';
        contextData.displayName = `${contextData.title} at ${contextData.company}`;
      }
    }

    if (!contextData) {
      return res.status(404).json({
        success: false,
        error: `${type} not found`
      });
    }

    res.json({
      success: true,
      data: contextData
    });

  } catch (error) {
    console.error('Get context data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get context data'
    });
  }
};

// ===================================================================
// 🆕 ENHANCED RAG CHAT - WITH CONVERSATION LIMITS
// ===================================================================

/**
 * Enhanced chat endpoint with RAG context support and conversation limits
 */
exports.chat = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    console.log('🔒 Checking AI assistant access permissions for user:', userId);
    
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        console.log('❌ AI assistant not available on current plan:', currentSubscription.user.subscriptionTier);
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          error: 'This feature requires Hunter plan',
          currentPlan: currentSubscription.user.subscriptionTier,
          upgradeRequired: true,
          feature: 'aiAssistant',
          availableOn: ['hunter']
        });
      }
      
      console.log('✅ AI assistant access permission granted for plan:', currentSubscription.user.subscriptionTier);
      
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }

    const { 
      message, 
      context = {}, 
      conversationId, 
      newConversation = false 
    } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    // 🔒 FEATURE GATING: Check conversation and message limits
    console.log('🔒 Checking AI conversation limits for user:', userId);
    
    try {
      // Check conversation limits if creating new conversation
      if (newConversation || !conversationId) {
        const conversationPermission = await usageService.checkUsageLimit(userId, 'aiConversations', 1);
        
        if (!conversationPermission.allowed) {
          console.log('❌ AI conversation limit exceeded:', conversationPermission.reason);
          return res.status(403).json({ 
            message: 'AI conversation limit reached',
            error: conversationPermission.reason,
            current: conversationPermission.current,
            limit: conversationPermission.limit,
            plan: conversationPermission.plan,
            upgradeRequired: false, // Hunter users hit conversation limits
            feature: 'aiConversations',
            note: 'You have reached your monthly conversation limit for the Hunter plan'
          });
        }
      }

      // Check message limits for this conversation
      const messagePermission = await usageService.checkUsageLimit(userId, 'aiMessagesTotal', 1);
      
      if (!messagePermission.allowed) {
        console.log('❌ AI message limit exceeded:', messagePermission.reason);
        return res.status(403).json({ 
          message: 'AI message limit reached',
          error: messagePermission.reason,
          current: messagePermission.current,
          limit: messagePermission.limit,
          plan: messagePermission.plan,
          upgradeRequired: false, // Hunter users hit message limits
          feature: 'aiMessagesTotal',
          note: 'You have reached your monthly message limit for the Hunter plan'
        });
      }
      
      console.log('✅ AI conversation and message limits validated');
      
    } catch (limitError) {
      console.error('❌ Error checking AI limits:', limitError);
      return res.status(500).json({ 
        message: 'Failed to validate AI usage limits',
        error: limitError.message 
      });
    }

    console.log(`🚀 RAG AI Chat: ${message.substring(0, 50)}... (user: ${userId})`);
    console.log(`📋 Context:`, {
      hasAttachedResumes: context.attachedResumes?.length > 0,
      hasAttachedJobs: context.attachedJobs?.length > 0,
      conversationId: conversationId
    });

    // ================================================================
    // 🆕 RAG: Load full context data for attached items
    // ================================================================
    let fullResumeContext = null;
    let fullJobContext = null;
    
    if (context.attachedResumes?.length > 0) {
      const resumeId = context.attachedResumes[0].id;
      fullResumeContext = await Resume.findOne({ _id: resumeId, userId }).lean();
      console.log(`📄 Loaded resume context: ${fullResumeContext?.name}`);
    }
    
    if (context.attachedJobs?.length > 0) {
      const jobId = context.attachedJobs[0].id;
      fullJobContext = await Job.findOne({ _id: jobId, userId }).lean();
      console.log(`💼 Loaded job context: ${fullJobContext?.title}`);
    }

    // ================================================================
    // 🔧 RAG: Enhanced resume editing detection
    // ================================================================
    const isResumeEditingRequest = fullResumeContext && detectResumeEditingIntent(message);
    
    if (isResumeEditingRequest) {
      console.log(`⚡ RAG resume editing detected for: ${fullResumeContext.name}`);
      return await handleResumeEditingWithContext(
        req, res, userId, message, fullResumeContext, conversationId, newConversation
      );
    }

    // ================================================================
    // 🆕 RAG: Enhanced AI Chat with full context
    // ================================================================
    
    // Get or create conversation
    let conversation = await getOrCreateConversationFast(conversationId, userId, newConversation, message, context);

    // 🔒 FEATURE GATING: Track conversation creation if new
    if (newConversation || !conversationId) {
      try {
        await usageService.trackUsage(userId, 'aiConversations', 1, {
          conversationId: conversation._id.toString(),
          conversationTitle: conversation.title,
          createdAt: new Date()
        });
        console.log('✅ New AI conversation usage tracked successfully');
      } catch (trackingError) {
        console.error('❌ Error tracking conversation usage (non-critical):', trackingError);
      }
    }

    // Save user message in background
    setTimeout(async () => {
      try {
        await ConversationService.addMessage(conversation._id, {
          type: 'user',
          content: message,
          metadata: { 
            context,
            attachedResumes: context.attachedResumes || [],
            attachedJobs: context.attachedJobs || []
          }
        });
      } catch (error) {
        console.warn('Background message save failed:', error);
      }
    }, 0);

    // Build RAG-enhanced system prompt
    const systemPrompt = buildRagSystemPrompt(req.user, fullResumeContext, fullJobContext, context);
    
    // Get recent messages
    const recentMessages = conversation.messages ? conversation.messages.slice(-5) : [];
    const messages = buildRagMessages(systemPrompt, recentMessages, message);

    console.log(`🤖 Calling OpenAI with RAG context (${messages.length} messages)...`);

    // Call OpenAI with enhanced context
    const startTime = Date.now();
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4', // Use GPT-4 for better RAG processing
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000, // Increased for detailed RAG responses
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiDuration = Date.now() - startTime;
    console.log(`✅ OpenAI responded in ${aiDuration}ms with RAG context`);

    const aiMessage = aiResponse.choices[0].message.content;
    const parsedResponse = parseRagResponse(aiMessage, fullResumeContext, fullJobContext);

    // 🔒 FEATURE GATING: Track AI message usage
    try {
      await usageService.trackUsage(userId, 'aiMessagesTotal', 1, {
        conversationId: conversation._id.toString(),
        tokensUsed: aiResponse.usage?.total_tokens || 0,
        messageLength: aiMessage.length,
        hasContext: !!(fullResumeContext || fullJobContext)
      });
      console.log('✅ AI message usage tracked successfully');
    } catch (trackingError) {
      console.error('❌ Error tracking message usage (non-critical):', trackingError);
    }

    // Save AI response in background
    setTimeout(async () => {
      try {
        await ConversationService.addMessage(conversation._id, {
          type: 'ai',
          content: parsedResponse.message,
          metadata: {
            suggestions: parsedResponse.suggestions,
            actions: parsedResponse.actions,
            confidence: parsedResponse.confidence,
            tokens: aiResponse.usage?.total_tokens || 0,
            duration: aiDuration,
            ragContext: {
              hasResume: !!fullResumeContext,
              hasJob: !!fullJobContext,
              resumeName: fullResumeContext?.name,
              jobTitle: fullJobContext?.title
            }
          }
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastActiveAt: new Date()
        });

        console.log(`💾 Background save completed with RAG metadata`);
      } catch (error) {
        console.warn('Background conversation save failed:', error);
      }
    }, 0);

    // 🔒 FEATURE GATING: Get usage statistics to include in response
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        aiConversations: userUsage.usageStats.aiConversations,
        aiMessagesTotal: userUsage.usageStats.aiMessagesTotal,
        plan: userUsage.plan,
        planLimits: {
          aiAssistant: userUsage.planLimits.aiAssistant,
          aiConversations: userUsage.planLimits.aiConversations,
          aiMessagesPerConversation: userUsage.planLimits.aiMessagesPerConversation
        }
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats (non-critical):', usageError);
    }

    const totalDuration = Date.now() - startTime;
    console.log(`🎉 RAG chat completed in ${totalDuration}ms`);

    res.json({
      success: true,
      message: parsedResponse.message,
      suggestions: parsedResponse.suggestions,
      actions: parsedResponse.actions,
      confidence: parsedResponse.confidence,
      conversationId: conversation._id,
      conversationTitle: conversation.title,
      usage: {
        tokens: aiResponse.usage?.total_tokens || 0,
        duration: totalDuration
      },
      usageStats: usageStats,
      performance: {
        openaiDuration: aiDuration,
        totalDuration: totalDuration,
        ragEnabled: true,
        contextUsed: {
          resume: !!fullResumeContext,
          job: !!fullJobContext
        }
      }
    });

  } catch (error) {
    console.error('RAG chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      fallback_message: getRagFallbackResponse(req.body.message, req.body.context)
    });
  }
};

// ===================================================================
// 🆕 RAG RESUME EDITING WITH CONTEXT - WITH USAGE TRACKING
// ===================================================================

async function handleResumeEditingWithContext(req, res, userId, message, resumeContext, conversationId, newConversation) {
  try {
    console.log('⚡ Starting RAG resume editing with full context...');
    
    // Get or create conversation
    let conversation = await getOrCreateConversationFast(conversationId, userId, newConversation, message, {});
    
    // Save user message in background
    setTimeout(async () => {
      try {
        await ConversationService.addMessage(conversation._id, {
          type: 'user',
          content: message,
          metadata: { 
            isResumeEdit: true,
            resumeId: resumeContext._id,
            resumeName: resumeContext.name,
            ragContext: true
          }
        });
      } catch (error) {
        console.warn('Background resume edit message save failed:', error);
      }
    }, 0);

    // 🔧 FIXED: Use the existing ResumeEditorService method
    const ResumeEditorService = require('../services/resumeEditor.service');
    
    // Clean the message to remove @-mention syntax for processing
    const cleanedMessage = message.replace(/@\[([^\]]+)\]/g, '$1');
    
    console.log(`🔧 Calling ResumeEditorService.applyResumeChanges with:`, {
      resumeId: resumeContext._id,
      userId: userId,
      message: cleanedMessage
    });

    const editResult = await ResumeEditorService.applyResumeChanges(
      resumeContext._id,
      userId,
      cleanedMessage
    );

    console.log(`✅ RAG resume editing completed successfully:`, {
      success: editResult.success,
      hasChanges: !!editResult.changes,
      hasNewFile: !!editResult.newFileUrl
    });

    // Re-analyze resume in background
    setTimeout(async () => {
      try {
        const resumeAnalysisService = require('../services/resumeAnalysis.service');
        const newAnalysis = await resumeAnalysisService.analyzeResume(resumeContext._id);
        
        const updatedResume = await Resume.findById(resumeContext._id);
        updatedResume.analysis = newAnalysis;
        await updatedResume.save();
        
        console.log(`✅ Background re-analysis completed with RAG context`);
      } catch (analysisError) {
        console.warn('Background analysis failed:', analysisError);
      }
    }, 0);

    // Generate context-aware success response
    const successMessage = `✅ I've successfully updated your resume "${resumeContext.name}"!

${editResult.changesSummary || 'Applied your requested improvements'}

**Changes made based on your resume context:**
• Enhanced content while maintaining your professional background
• Optimized formatting and keyword usage
• Improved readability and ATS compatibility

The updated resume is ready to download. Your score will be recalculated shortly.

What else would you like me to improve?`;

    // Save AI response in background
    setTimeout(async () => {
      try {
        await ConversationService.addMessage(conversation._id, {
          type: 'ai',
          content: successMessage,
          metadata: {
            isResumeEdit: true,
            resumeChanges: editResult.changes,
            newFileUrl: editResult.newFileUrl,
            changesSummary: editResult.changesSummary,
            ragContext: {
              resumeName: resumeContext.name,
              resumeScore: resumeContext.analysis?.overallScore
            },
            suggestions: [
              'Make more improvements',
              'Optimize for ATS', 
              'View updated resume',
              'Download new version',
              'Add more skills'
            ]
          }
        });

        conversation.lastActiveAt = new Date();
        await conversation.save();
      } catch (error) {
        console.warn('Background resume response save failed:', error);
      }
    }, 0);

    return res.json({
      success: true,
      message: successMessage,
      suggestions: [
        'Make more improvements',
        'Optimize for ATS', 
        'View updated resume',
        'Download new version',
        'Add more skills'
      ],
      actions: [],
      confidence: 0.95,
      conversationId: conversation._id,
      conversationTitle: conversation.title,
      resumeUpdated: true,
      resumeChanges: editResult.changes,
      newFileUrl: editResult.newFileUrl,
      changesSummary: editResult.changesSummary,
      usage: {
        tokens: editResult.tokensUsed || 0
      },
      performance: {
        ragEnabled: true,
        resumeContext: true,
        fastTrack: true
      }
    });

  } catch (resumeEditError) {
    console.error('RAG resume editing failed:', resumeEditError);
    
    let conversation = await getOrCreateConversationFast(conversationId, userId, newConversation, message, {});
    
    const errorMessage = `I encountered an issue updating your resume "${resumeContext.name}": ${resumeEditError.message}

Based on your current resume context, here's what I recommend:

**Resume Analysis:**
• Current Score: ${resumeContext.analysis?.overallScore || 'Not analyzed'}%
• Sections Available: ${Object.keys(resumeContext.parsedData || {}).join(', ')}

**Alternative Suggestions:**
• Try a more specific request (e.g., "improve work experience section")
• Focus on one area at a time
• Check if the resume file is accessible
• Consider re-uploading the resume if issues persist

Would you like me to try a different approach or provide general resume advice?`;
    
    // Save error in background
    setTimeout(async () => {
      try {
        await ConversationService.addMessage(conversation._id, {
          type: 'user',
          content: message,
          metadata: { 
            isResumeEdit: true, 
            failed: true,
            resumeContext: {
              name: resumeContext.name,
              score: resumeContext.analysis?.overallScore
            }
          }
        });

        await ConversationService.addMessage(conversation._id, {
          type: 'ai',
          content: errorMessage,
          metadata: {
            isResumeEditError: true,
            error: resumeEditError.message,
            ragContext: true,
            suggestions: [
              'Try a simpler request',
              'Focus on work experience',
              'Update skills section',
              'Improve summary'
            ]
          }
        });

        conversation.lastActiveAt = new Date();
        await conversation.save();
      } catch (bgError) {
        console.warn('Background error save failed:', bgError);
      }
    }, 0);
    
    return res.json({
      success: true,
      message: errorMessage,
      suggestions: [
        'Try a simpler request',
        'Focus on work experience', 
        'Update skills section',
        'Improve summary'
      ],
      conversationId: conversation._id,
      conversationTitle: conversation.title,
      resumeEditError: true,
      error: resumeEditError.message,
      performance: {
        ragEnabled: true,
        resumeContext: true,
        fastTrack: true,
        error: true
      }
    });
  }
}

// ===================================================================
// 🆕 RAG HELPER FUNCTIONS
// ===================================================================

async function getOrCreateConversationFast(conversationId, userId, newConversation, message, context) {
  try {
    if (conversationId && !newConversation) {
      console.log(`📖 Loading existing conversation: ${conversationId}`);
      return await ConversationService.getConversation(conversationId, userId);
    } else {
      const title = generateRagTitle(message, context);
      console.log(`📝 Creating new RAG conversation: ${title}`);
      return await ConversationService.createConversation(userId, {
        title,
        category: detectRagCategory(message, context),
        tags: extractRagTags(message, context)
      });
    }
  } catch (error) {
    console.error('Error handling conversation:', error);
    throw error;
  }
}

function buildRagSystemPrompt(user, resumeContext, jobContext, context) {
  let prompt = `You are AJ, an expert AI career assistant for auto-job.ai with RAG (Retrieval-Augmented Generation) capabilities.

CURRENT USER: ${user.firstName} ${user.lastName}
CURRENT PAGE: ${context.page || 'unknown'}

PERSONALITY & APPROACH:
- Professional, warm, and encouraging
- Provide specific, actionable advice based on available context
- Reference specific details from attached resumes/jobs when relevant
- Keep responses focused and under 300 words
- Always provide relevant follow-up suggestions

CORE CAPABILITIES:
- Resume editing and optimization with full context awareness
- Job analysis and matching with detailed requirements
- Career guidance based on user's actual background
- Interview preparation with role-specific insights`;

  // Add resume context if available
  if (resumeContext) {
    prompt += `\n\n📄 RESUME CONTEXT - "${resumeContext.name}":
Current Score: ${resumeContext.analysis?.overallScore || 'Not analyzed'}%
Experience Level: ${resumeContext.parsedData?.experience?.length || 0} positions
Key Skills: ${resumeContext.parsedData?.skills?.slice(0, 5).map(s => s.name).join(', ') || 'Not parsed'}
Education: ${resumeContext.parsedData?.education?.[0]?.degree || 'Not specified'}
Summary: ${resumeContext.parsedData?.summary?.substring(0, 150) || 'No summary available'}...

You have FULL ACCESS to this resume data and can make direct edits and improvements.`;
  }

  // Add job context if available  
  if (jobContext) {
    prompt += `\n\n💼 JOB CONTEXT - "${jobContext.title}" at ${jobContext.company}:
Location: ${jobContext.location?.city || 'Remote'}
Job Type: ${jobContext.jobType || 'Not specified'}
Key Requirements: ${jobContext.parsedData?.requirements?.slice(0, 3).join(', ') || 'Not parsed'}
Required Skills: ${jobContext.parsedData?.keySkills?.slice(0, 5).map(s => s.name).join(', ') || 'Not parsed'}
Experience Level: ${jobContext.parsedData?.experienceLevel || 'Not specified'}

You can analyze how well the user matches this specific role.`;
  }

  // Add context-specific guidance
  if (resumeContext && jobContext) {
    prompt += `\n\n🎯 MATCHING CONTEXT:
You can now perform detailed matching between the resume and job posting.
Analyze specific skills, experience, and requirements.
Provide tailored advice for this exact combination.`;
  }

  prompt += `\n\nALWAYS provide specific, contextual responses based on the available data.`;

  return prompt;
}

function buildRagMessages(systemPrompt, recentMessages, currentMessage) {
  const messages = [{ role: 'system', content: systemPrompt }];

  // Include more context messages for RAG
  if (recentMessages && recentMessages.length > 0) {
    recentMessages.slice(-4).forEach(msg => {
      messages.push({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });
  }

  messages.push({ role: 'user', content: currentMessage });
  return messages;
}

function parseRagResponse(aiMessage, resumeContext, jobContext) {
  const suggestions = [];
  
  // Generate context-aware suggestions
  if (resumeContext && jobContext) {
    suggestions.push(
      'How well do I match this job?',
      'Tailor resume for this role',
      'Generate interview questions',
      'Write cover letter'
    );
  } else if (resumeContext) {
    suggestions.push(
      'Improve this resume',
      'Optimize for ATS',
      'Add missing skills',
      'Update work experience'
    );
  } else if (jobContext) {
    suggestions.push(
      'Analyze job requirements',
      'What skills are needed?',
      'Research the company',
      'Interview preparation'
    );
  } else {
    suggestions.push(
      'Upload a resume for analysis',
      'Find job opportunities',
      'Career guidance',
      'Interview preparation'
    );
  }

  return {
    message: aiMessage,
    suggestions: suggestions.slice(0, 4),
    actions: [],
    confidence: resumeContext || jobContext ? 0.95 : 0.8 // Higher confidence with context
  };
}

function detectResumeEditingIntent(message) {
  const messageLower = message.toLowerCase();
  
  const editingKeywords = [
    'update', 'change', 'edit', 'modify', 'improve', 'enhance', 
    'add', 'remove', 'rewrite', 'fix', 'optimize'
  ];

  const sectionKeywords = [
    'experience', 'work', 'summary', 'skills', 'education', 'resume'];

  const hasEditingKeyword = editingKeywords.some(keyword => messageLower.includes(keyword));
  const hasSectionKeyword = sectionKeywords.some(keyword => messageLower.includes(keyword));

  return hasEditingKeyword && hasSectionKeyword;
}

function generateRagTitle(message, context) {
  const content = message.toLowerCase();
  
  // Check for attached context first
  if (context.attachedResumes?.length > 0 && context.attachedJobs?.length > 0) {
    return `${context.attachedResumes[0].name} vs ${context.attachedJobs[0].title}`;
  }
  
  if (context.attachedResumes?.length > 0) {
    return `Resume: ${context.attachedResumes[0].name}`;
  }
  
  if (context.attachedJobs?.length > 0) {
    return `Job: ${context.attachedJobs[0].title}`;
  }
  
  // Fallback to content-based titles
  if (content.includes('resume')) return 'Resume Help';
  if (content.includes('job')) return 'Job Analysis';
  if (content.includes('interview')) return 'Interview Prep';
  if (content.includes('career')) return 'Career Guidance';
  
  return 'Career Chat';
}

function detectRagCategory(message, context) {
  // Prioritize context over message content
  if (context.attachedResumes?.length > 0 && context.attachedJobs?.length > 0) {
    return 'job_search'; // Valid enum: when both resume and job attached, it's job searching/matching
  }
  
  if (context.attachedResumes?.length > 0) {
    return 'resume_help'; // Valid enum: when resume attached
  }
  
  if (context.attachedJobs?.length > 0) {
    return 'job_search'; // Valid enum: when job attached, use job_search instead of job_analysis
  }
  
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('resume')) return 'resume_help';
  if (messageLower.includes('job')) return 'job_search'; 
  if (messageLower.includes('interview')) return 'interview_prep';
  if (messageLower.includes('career')) return 'career_advice';
  
  return 'general'; // Default fallback
}

function extractRagTags(message, context) {
  const tags = [];
  
  // Add context-based tags
  if (context.attachedResumes?.length > 0) {
    tags.push('resume_context');
  }
  
  if (context.attachedJobs?.length > 0) {
    tags.push('job_context');
  }
  
  // Add skill-based tags from message
  const messageLower = message.toLowerCase();
  const skillKeywords = ['python', 'javascript', 'react', 'node', 'java', 'aws', 'sql'];
  
  skillKeywords.forEach(skill => {
    if (messageLower.includes(skill)) {
      tags.push(skill);
    }
  });
  
  return tags.slice(0, 5);
}

function getRagFallbackResponse(message, context) {
  if (!message) return "I didn't receive your message. Could you please try again?";
  
  if (context?.attachedResumes?.length > 0) {
    return `I'd be happy to help with your resume "${context.attachedResumes[0].name}"! I can provide detailed analysis and make improvements.`;
  }
  
  if (context?.attachedJobs?.length > 0) {
    return `I can help you with the "${context.attachedJobs[0].title}" position! What would you like me to analyze?`;
  }
  
  if (message.toLowerCase().includes('resume')) {
    return "I can help with your resume! Use @ to select a specific resume for detailed assistance.";
  }
  
  if (message.toLowerCase().includes('job')) {
    return "I can help with job analysis! Use @ to select a specific job posting for detailed insights.";
  }
  
  return "I'm here to help with your career! Use @ to reference specific resumes or jobs for contextual assistance.";
}

// ===================================================================
// CONVERSATION MANAGEMENT - WITH FEATURE GATING
// ===================================================================

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          upgradeRequired: true,
          feature: 'aiAssistant'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }
    
    const options = {
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'lastActiveAt'
    };

    const result = await ConversationService.getUserConversations(userId, options);
    
    // 🔒 FEATURE GATING: Get usage statistics to include in response
    let usageStats = null;
    try {
      const userUsage = await usageService.getUserUsageStats(userId);
      usageStats = {
        aiConversations: userUsage.usageStats.aiConversations,
        aiMessagesTotal: userUsage.usageStats.aiMessagesTotal,
        plan: userUsage.plan,
        planLimits: userUsage.planLimits
      };
    } catch (usageError) {
      console.error('❌ Error fetching usage stats (non-critical):', usageError);
    }
    
    res.json({ 
      success: true, 
      ...result,
      usageStats: usageStats
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          upgradeRequired: true,
          feature: 'aiAssistant'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }
    
    const { conversationId } = req.params;
    
    const conversation = await ConversationService.getConversation(conversationId, userId);
    res.json({ success: true, conversation, ragEnabled: true });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(404).json({ success: false, error: 'Conversation not found' });
  }
};

exports.updateConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          upgradeRequired: true,
          feature: 'aiAssistant'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }
    
    const { conversationId } = req.params;
    const conversation = await ConversationService.updateConversation(conversationId, userId, req.body);
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          upgradeRequired: true,
          feature: 'aiAssistant'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }
    
    const { conversationId } = req.params;
    const { permanent = false } = req.query;
    
    await ConversationService.deleteConversation(conversationId, userId, permanent === 'true');
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
};

// Health check with RAG info
exports.healthCheck = async (req, res) => {
  try {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      openai_status: 'connected',
      ragEnabled: true,
      memorySystem: false, // Removed memory system
      performance_mode: 'rag'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Capabilities with RAG features
exports.getCapabilities = async (req, res) => {
  res.json({
    available: true,
    features: [
      'rag_chat',
      'context_aware_responses',
      'resume_editing_with_context',
      'job_analysis_with_context',
      'conversation_management',
      'mention_suggestions'
    ],
    models: {
      primary: 'gpt-4' // Enhanced model for RAG
    },
    ragSupport: {
      enabled: true,
      supportedTypes: ['resume', 'job'],
      maxContextItems: 2, // 1 resume + 1 job
      contextPersistence: 'conversation_scoped'
    },
    performance: {
      ragOptimized: true,
      memorySystem: false,
      backgroundProcessing: true
    },
    status: process.env.OPENAI_API_KEY ? 'fully_configured' : 'missing_api_key'
  });
};

// Simple search (no memory system) - WITH FEATURE GATING
exports.search = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          upgradeRequired: true,
          feature: 'aiAssistant'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }
    
    const { query, type = 'all' } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    // Search conversations only (no memory search)
    const conversations = await ConversationService.searchAllConversations(
      userId, 
      query, 
      { limit: 10, includeMessages: true }
    );

    res.json({
      success: true,
      results: {
        conversations: conversations,
        total: conversations.length
      },
      ragEnabled: true,
      searchType: 'conversations_only'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      results: { conversations: [] }
    });
  }
};

// Get contextual suggestions for current page - WITH FEATURE GATING
exports.getContextualSuggestions = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // 🔒 FEATURE GATING: Check AI assistant access permissions
    try {
      const currentSubscription = await subscriptionService.getCurrentSubscription(userId);
      const aiAssistantAllowed = currentSubscription.planLimits.aiAssistant;
      
      if (!aiAssistantAllowed) {
        return res.status(403).json({ 
          message: 'AI Assistant not available on your current plan',
          upgradeRequired: true,
          feature: 'aiAssistant'
        });
      }
    } catch (permissionError) {
      console.error('❌ Error checking AI assistant permission:', permissionError);
      return res.status(500).json({ 
        message: 'Failed to validate AI assistant permission',
        error: permissionError.message 
      });
    }
    
    const suggestions = ['Use @ to add context', 'Upload resume for analysis', 'Find jobs to analyze'];
    res.json({ success: true, suggestions, ragEnabled: true });
  } catch (error) {
    console.error('Get contextual suggestions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get contextual suggestions' });
  }
};