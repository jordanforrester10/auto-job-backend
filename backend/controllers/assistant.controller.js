// controllers/assistant.controller.js - COMPLETE WITH RESUME EDITING AND ANALYSIS REFRESH
const { openai } = require('../config/openai');
const Resume = require('../models/mongodb/resume.model');
const Job = require('../models/mongodb/job.model');
const User = require('../models/mongodb/user.model');
const Conversation = require('../models/mongodb/conversation.model');
const UserMemory = require('../models/mongodb/userMemory.model');
const MemoryService = require('../services/memoryService');
const ConversationService = require('../services/conversationService');

// ===================================================================
// CORE AI CHAT WITH MEMORY & CONVERSATIONS
// ===================================================================

/**
 * Enhanced chat endpoint with ACTUAL resume editing using your existing service
 */
exports.chat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      message, 
      context, 
      conversationHistory, 
      conversationId, 
      newConversation = false 
    } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`🤖 AI Chat request from user ${userId}: ${message.substring(0, 50)}...`);

    // ================================================================
    // 🔧 RESUME EDITING: Detect and handle resume editing requests
    // ================================================================
    const isResumeEditingRequest = detectResumeEditingIntent(message, context);
    
    if (isResumeEditingRequest && context?.currentResume?.id) {
      console.log(`🎯 Detected resume editing request for resume: ${context.currentResume.id}`);
      
      try {
        // Use your existing ResumeEditorService
        const ResumeEditorService = require('../services/resumeEditor.service');
        
        // Apply the actual resume changes using your existing service
        const editResult = await ResumeEditorService.applyResumeChanges(
          context.currentResume.id,
          userId,
          message  // Your service handles natural language parsing
        );

        console.log(`✅ Resume editing completed:`, {
          changesCount: editResult.changes?.length || 0,
          newFileUrl: editResult.newFileUrl ? 'Generated' : 'Not generated',
          summary: editResult.changesSummary
        });

        // 🔥 CRITICAL FIX: Re-analyze the resume for new scores (like Auto-Fix button does)
        console.log(`🔍 Re-analyzing resume for updated scores...`);
        const resumeAnalysisService = require('../services/resumeAnalysis.service');
        const newAnalysis = await resumeAnalysisService.analyzeResume(context.currentResume.id);
        
        // Update the resume with new analysis
        const updatedResume = await Resume.findById(context.currentResume.id);
        updatedResume.analysis = newAnalysis;
        await updatedResume.save();
        
        console.log(`✅ Resume re-analysis completed:`, {
          previousScore: context.currentResume.score || 'Unknown',
          newOverallScore: newAnalysis.overallScore,
          newATSScore: newAnalysis.atsCompatibility
        });

        // Generate success response with actual changes and NEW SCORES
        const successMessage = `✅ I've successfully updated your resume "${context.currentResume.name}"!

${editResult.changesSummary}

📊 **Updated Scores:**
- Overall Score: ${newAnalysis.overallScore}%
- ATS Compatibility: ${newAnalysis.atsCompatibility}%

${editResult.changes?.length > 0 ? 
  `\nChanges made:\n${editResult.changes.map(change => 
    `• ${change.action.charAt(0).toUpperCase() + change.action.slice(1)} ${change.section}: ${change.reason || 'Updated content'}`
  ).join('\n')}` : 
  'Your resume has been improved and optimized.'
}

The updated resume with new scores is ready to download.`;

        // Save the interaction to conversation
        let conversation = await getOrCreateConversation(conversationId, userId, newConversation, message, context);
        
        await ConversationService.addMessage(conversation._id, {
          type: 'user',
          content: message,
          metadata: { 
            context, 
            isResumeEdit: true,
            resumeId: context.currentResume.id
          }
        });

        await ConversationService.addMessage(conversation._id, {
          type: 'ai',
          content: successMessage,
          metadata: {
            isResumeEdit: true,
            resumeChanges: editResult.changes,
            newFileUrl: editResult.newFileUrl,
            changesSummary: editResult.changesSummary,
            // 🔥 CRITICAL: Include new analysis scores
            newAnalysis: {
              overallScore: newAnalysis.overallScore,
              atsCompatibility: newAnalysis.atsCompatibility
            },
            suggestions: [
              'Make more changes',
              'Optimize for ATS', 
              'View updated resume',
              'Download new version'
            ]
          }
        });

        // Extract memories from this resume editing session
        try {
          await MemoryService.extractMemoriesFromMessage(userId, 
            `Updated resume: ${editResult.changesSummary}. New scores: Overall ${newAnalysis.overallScore}%, ATS ${newAnalysis.atsCompatibility}%`, 
            {
              conversationId: conversation._id,
              resumeId: context.currentResume.id,
              category: 'resume_improvement',
              tags: ['resume_editing', 'ai_assistance', 'score_improvement']
            }
          );
        } catch (memoryError) {
          console.warn('Memory extraction failed:', memoryError);
        }

        // Return success response with resume editing confirmation AND NEW SCORES
        return res.json({
          success: true,
          message: successMessage,
          suggestions: [
            'Make more changes',
            'Optimize for ATS', 
            'View updated resume',
            'Download new version'
          ],
          actions: [],
          confidence: 0.95,
          conversationId: conversation._id,
          conversationTitle: conversation.title,
          // Resume editing specific fields
          resumeUpdated: true, // ← Critical flag to trigger UI refresh
          resumeChanges: editResult.changes,
          newFileUrl: editResult.newFileUrl,
          changesSummary: editResult.changesSummary,
          // 🔥 CRITICAL FIX: Include new analysis data for frontend refresh
          newAnalysis: {
            overallScore: newAnalysis.overallScore,
            atsCompatibility: newAnalysis.atsCompatibility,
            strengths: newAnalysis.strengths,
            weaknesses: newAnalysis.weaknesses,
            improvementAreas: newAnalysis.improvementAreas
          },
          usage: {
            tokens: 0 // Resume editing tokens counted separately
          }
        });

      } catch (resumeEditError) {
        console.error('Resume editing failed:', resumeEditError);
        
        // Fall back to regular AI response with error context
        const errorMessage = `I encountered an issue updating your resume: ${resumeEditError.message}. Let me provide some guidance instead.

Here's what I would suggest for your resume improvement:
- Focus on quantifying your achievements with specific numbers
- Use strong action verbs to start each bullet point
- Ensure your skills section includes relevant keywords
- Consider adding more details about your AI and Python experience

Would you like me to try a different approach to updating your resume?`;
        
        return res.json({
          success: true,
          message: errorMessage,
          suggestions: [
            'Try a simpler request',
            'Focus on one section',
            'Check resume format',
            'Contact support'
          ],
          resumeEditError: true,
          error: resumeEditError.message
        });
      }
    }

    // ================================================================
    // 🤖 REGULAR AI CHAT: Continue with normal AI conversation
    // ================================================================
    
    // Get or create conversation
    let conversation = await getOrCreateConversation(conversationId, userId, newConversation, message, context);

    // Build AI context with memory
    const user = await User.findById(userId);
    const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });
    const jobs = await Job.find({ userId }).sort({ createdAt: -1 });
    const memoryContext = await MemoryService.buildAIContext(userId, context);
    
    const systemPrompt = buildSystemPrompt(user, resumes, jobs, context, conversation, memoryContext);
    const messages = buildMessages(systemPrompt, conversation.messages.slice(-10), message);

    // Call OpenAI for regular chat
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1200,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiMessage = aiResponse.choices[0].message.content;
    const parsedResponse = parseResponse(aiMessage, context);

    // Save messages to conversation
    await ConversationService.addMessage(conversation._id, {
      type: 'user',
      content: message,
      metadata: { context }
    });

    await ConversationService.addMessage(conversation._id, {
      type: 'ai',
      content: parsedResponse.message,
      metadata: {
        suggestions: parsedResponse.suggestions,
        actions: parsedResponse.actions,
        confidence: parsedResponse.confidence,
        tokens: aiResponse.usage?.total_tokens || 0
      }
    });

    // Extract memories from conversation
    try {
      await MemoryService.extractMemoriesFromMessage(userId, message, {
        conversationId: conversation._id,
        page: context?.page,
        category: conversation.category
      });
    } catch (memoryError) {
      console.warn('Memory extraction failed:', memoryError);
    }

    console.log(`✅ AI response generated (${aiResponse.usage?.total_tokens || 0} tokens)`);

    res.json({
      success: true,
      message: parsedResponse.message,
      suggestions: parsedResponse.suggestions,
      actions: parsedResponse.actions,
      confidence: parsedResponse.confidence,
      conversationId: conversation._id,
      conversationTitle: conversation.title,
      usage: {
        tokens: aiResponse.usage?.total_tokens || 0
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      fallback_message: getFallbackResponse(req.body.message, req.body.context)
    });
  }
};

// [REST OF THE FILE REMAINS THE SAME - all other exports, helper functions, etc.]

// ===================================================================
// CONVERSATION MANAGEMENT
// ===================================================================

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const options = {
      category: req.query.category,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      search: req.query.search,
      pinned: req.query.pinned === 'true' ? true : req.query.pinned === 'false' ? false : undefined,
      starred: req.query.starred === 'true' ? true : req.query.starred === 'false' ? false : undefined,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'lastActiveAt'
    };

    const result = await ConversationService.getUserConversations(userId, options);
    res.json({ success: true, ...result });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const conversation = await ConversationService.getConversation(conversationId, userId);
    res.json({ success: true, conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(404).json({ success: false, error: 'Conversation not found' });
  }
};

exports.updateConversation = async (req, res) => {
  try {
    const userId = req.user._id;
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
    const { conversationId } = req.params;
    const { permanent = false } = req.query;
    
    await ConversationService.deleteConversation(conversationId, userId, permanent === 'true');
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
};

// ===================================================================
// MEMORY MANAGEMENT
// ===================================================================

exports.getMemories = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, category, search, minConfidence = 0.5, limit = 50 } = req.query;

    const userMemory = await UserMemory.findByUserId(userId);
    if (!userMemory) {
      return res.json({ success: true, memories: [], total: 0 });
    }

    let memories = userMemory.memories.filter(m => m.isActive);

    // Apply filters
    if (type) memories = memories.filter(m => m.type === type);
    if (category) memories = memories.filter(m => m.category === category);
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      memories = memories.filter(m => searchRegex.test(m.content) || m.tags.some(tag => searchRegex.test(tag)));
    }
    
    memories = memories.filter(m => m.confidence >= parseFloat(minConfidence));
    memories.sort((a, b) => b.confidence - a.confidence);

    res.json({
      success: true,
      memories: memories.slice(0, parseInt(limit)),
      total: memories.length,
      analytics: userMemory.analytics
    });

  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch memories' });
  }
};

exports.updateMemory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { memoryData } = req.body;

    const memory = await MemoryService.addMemoryToUser(userId, {
      ...memoryData,
      source: { extractionMethod: 'user_added', timestamp: new Date() }
    });

    res.json({ success: true, memory, message: 'Memory updated successfully' });
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({ success: false, error: 'Failed to update memory' });
  }
};

exports.deleteMemory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { memoryId } = req.params;

    const userMemory = await UserMemory.findByUserId(userId);
    if (!userMemory) {
      return res.status(404).json({ success: false, error: 'User memory not found' });
    }

    const memory = userMemory.memories.find(m => m.id === memoryId);
    if (!memory) {
      return res.status(404).json({ success: false, error: 'Memory not found' });
    }

    memory.isActive = false;
    userMemory.updateProfile();
    await userMemory.save();

    res.json({ success: true, message: 'Memory deleted successfully' });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete memory' });
  }
};

/**
 * Get memory insights and analytics
 */
exports.getMemoryInsights = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('🧠 Getting memory insights for user:', userId);

    const userMemory = await UserMemory.findByUserId(userId);
    if (!userMemory) {
      console.log('📝 No user memory found, returning empty insights');
      return res.json({
        success: true,
        insights: [],
        analytics: {
          totalMemories: 0,
          averageConfidence: 0,
          memoriesByType: [],
          memoriesByCategory: []
        },
        profile: {}
      });
    }

    console.log('📊 Found user memory with', userMemory.memories?.length || 0, 'memories');

    // Generate fresh insights if needed
    if (!userMemory.analytics?.lastAnalyzedAt || 
        Date.now() - new Date(userMemory.analytics.lastAnalyzedAt).getTime() > 24 * 60 * 60 * 1000) {
      
      console.log('🔄 Generating fresh memory insights...');
      try {
        const insights = await generateMemoryInsights(userMemory);
        
        // Ensure analytics object exists
        if (!userMemory.analytics) {
          userMemory.analytics = {
            totalMemories: 0,
            memoriesByType: [],
            memoriesByCategory: [],
            averageConfidence: 0,
            insights: []
          };
        }
        
        userMemory.analytics.insights = insights;
        userMemory.analytics.lastAnalyzedAt = new Date();
        userMemory.updateProfile();
        
        await userMemory.save();
        console.log('✅ Generated and saved', insights.length, 'new insights');
      } catch (insightError) {
        console.error('⚠️ Error generating insights:', insightError);
      }
    }

    const response = {
      success: true,
      insights: userMemory.analytics?.insights || [],
      analytics: {
        totalMemories: userMemory.memories?.filter(m => m.isActive).length || 0,
        averageConfidence: userMemory.analytics?.averageConfidence || 0,
        memoriesByType: userMemory.analytics?.memoriesByType || [],
        memoriesByCategory: userMemory.analytics?.memoriesByCategory || [],
        lastAnalyzedAt: userMemory.analytics?.lastAnalyzedAt
      },
      profile: userMemory.profile || {}
    };

    console.log('📤 Sending memory insights:', {
      insightsCount: response.insights.length,
      totalMemories: response.analytics.totalMemories
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Get memory insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get memory insights',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

exports.performMemoryMaintenance = async (req, res) => {
  try {
    const userId = req.user._id;
    const result = await MemoryService.performMemoryMaintenance(userId);
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'User memory not found' });
    }

    res.json({ success: true, maintenance: result, message: 'Memory maintenance completed' });
  } catch (error) {
    console.error('Memory maintenance error:', error);
    res.status(500).json({ success: false, error: 'Failed to perform memory maintenance' });
  }
};

// ===================================================================
// SEARCH & ANALYTICS
// ===================================================================

exports.search = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query, searchType = 'all', limit = 20 } = req.query;

    const results = {};

    if (searchType === 'conversations' || searchType === 'all') {
      results.conversations = await ConversationService.searchAllConversations(userId, query, { limit: parseInt(limit) });
    }

    if (searchType === 'memories' || searchType === 'all') {
      results.memories = await MemoryService.searchMemories(userId, query, { limit: parseInt(limit) });
    }

    res.json({
      success: true,
      query,
      results,
      totalResults: (results.conversations?.length || 0) + (results.memories?.length || 0)
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { timeframe = '30d' } = req.query;
    const analytics = await ConversationService.getConversationAnalytics(userId, timeframe);
    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get analytics' });
  }
};

// ===================================================================
// ENHANCED RESUME OPERATIONS - FULL IMPLEMENTATION
// ===================================================================

/**
 * Apply AI-suggested resume changes in real-time
 */
exports.applyResumeChanges = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeId, changes, changeType = 'ai_enhancement' } = req.body;

    console.log(`🤖 AJ: Applying resume changes for user ${userId}`);

    // Validate input
    if (!resumeId || !changes) {
      return res.status(400).json({
        success: false,
        error: 'Resume ID and changes are required'
      });
    }

    // Import the resume editor service
    const ResumeEditorService = require('../services/resumeEditor.service');

    // Apply changes using AI
    const result = await ResumeEditorService.applyResumeChanges(resumeId, userId, changes);

    // Track the interaction for memory system
    try {
      await MemoryService.extractMemoriesFromMessage(userId, 
        `Updated resume: ${result.changesSummary}`, 
        {
          resumeId: resumeId,
          changeType: changeType,
          category: 'resume_improvement'
        }
      );
    } catch (memoryError) {
      console.warn('Memory extraction failed:', memoryError);
    }

    res.json({
      success: true,
      message: 'Resume updated successfully by AJ',
      result: {
        updatedResume: {
          id: result.updatedResume._id,
          name: result.updatedResume.name,
          parsedData: result.updatedResume.parsedData,
          analysis: result.updatedResume.analysis,
          updatedAt: result.updatedResume.updatedAt,
          versions: result.updatedResume.versions
        },
        changes: result.changes,
        changesSummary: result.changesSummary,
        newFileUrl: result.newFileUrl
      }
    });

  } catch (error) {
    console.error('Apply resume changes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply resume changes',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Optimize resume for ATS systems
 */
exports.optimizeForATS = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeId, targetJobId } = req.body;

    console.log(`🤖 AJ: Optimizing resume ${resumeId} for ATS`);

    // Validate input
    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: 'Resume ID is required'
      });
    }

    // Get target job if provided
    let targetJob = null;
    if (targetJobId) {
      targetJob = await Job.findOne({ _id: targetJobId, userId });
    }

    // Import the resume editor service
    const ResumeEditorService = require('../services/resumeEditor.service');

    // Optimize for ATS
    const result = await ResumeEditorService.optimizeForATS(resumeId, userId, targetJob);

    // Track the interaction for memory system
    try {
      const improvementMessage = `Optimized resume for ATS. Score improved from ${result.previousScore} to ${result.newATSScore}`;
      await MemoryService.extractMemoriesFromMessage(userId, improvementMessage, {
        resumeId: resumeId,
        targetJobId: targetJobId,
        category: 'ats_optimization'
      });
    } catch (memoryError) {
      console.warn('Memory extraction failed:', memoryError);
    }

    res.json({
      success: true,
      message: 'Resume optimized for ATS by AJ',
      result: {
        optimizations: result.optimizations,
        atsScoreImprovement: {
          previous: result.previousScore,
          new: result.newATSScore,
          improvement: result.newATSScore - result.previousScore
        },
        updatedResume: {
          id: result.updatedResume._id,
          name: result.updatedResume.name,
          analysis: result.updatedResume.analysis,
          updatedAt: result.updatedResume.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('ATS optimization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize resume for ATS',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

/**
 * Enhanced resume analysis with AI recommendations
 */
exports.analyzeResume = async (req, res) => {
  try {
    const userId = req.user._id;
    const { resumeId, analysisType = 'comprehensive', includeImprovements = true } = req.body;

    console.log(`🤖 AJ: Analyzing resume ${resumeId}`);

    // Validate input
    if (!resumeId) {
      return res.status(400).json({
        success: false,
        error: 'Resume ID is required'
      });
    }

    // Get the resume
    const resume = await Resume.findOne({ _id: resumeId, userId });
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        error: 'Resume not found'
      });
    }

    // Perform comprehensive analysis
    const resumeAnalysisService = require('../services/resumeAnalysis.service');
    const analysis = await resumeAnalysisService.analyzeResume(resumeId);

    // Get memory context for personalized recommendations
    const memoryContext = await MemoryService.buildAIContext(userId, { page: 'resumes', resumeId });

    // Generate AI-powered improvement suggestions
    let improvements = [];
    if (includeImprovements) {
      improvements = await generatePersonalizedImprovements(resume.parsedData, analysis, memoryContext);
    }

    // Update resume with new analysis
    resume.analysis = analysis;
    await resume.save();

    res.json({
      success: true,
      analysis: analysis,
      improvements: improvements,
      recommendations: {
        priority: prioritizeImprovements(improvements),
        quickWins: improvements.filter(imp => imp.effort === 'low'),
        highImpact: improvements.filter(imp => imp.impact === 'high')
      },
      memoryInsights: memoryContext ? ['Used your career goals and preferences for personalized analysis'] : []
    });

  } catch (error) {
    console.error('Enhanced resume analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze resume',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
};

// ===================================================================
// SYSTEM ENDPOINTS
// ===================================================================

exports.healthCheck = async (req, res) => {
  try {
    const testResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 5
    });

    const memoryStats = await UserMemory.countDocuments();
    const conversationStats = await Conversation.countDocuments();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      openai_status: 'connected',
      memory_system: 'operational',
      database_stats: {
        total_memories: memoryStats,
        total_conversations: conversationStats
      },
      test_tokens: testResponse.usage?.total_tokens || 0
    });

  } catch (error) {
    console.error('AI health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      openai_status: 'disconnected'
    });
  }
};

exports.getCapabilities = async (req, res) => {
  res.json({
    available: true,
    features: [
      'contextual_chat',
      'conversation_management',
      'persistent_memory',
      'user_profiling',
      'career_advice',
      'real_time_suggestions',
      'conversation_search',
      'memory_insights',
      'resume_editing',
      'ats_optimization'
    ],
    models: {
      primary: 'gpt-4-turbo-preview',
      fallback: 'gpt-3.5-turbo'
    },
    memory_features: {
      max_memories_per_user: 1000,
      memory_types: ['preference', 'skill', 'career_goal', 'experience', 'achievement', 'challenge'],
      auto_decay: true,
memory_search: true,
     conversation_context: true
   },
   resume_features: {
     real_time_editing: true,
     ats_optimization: true,
     ai_analysis: true,
     version_tracking: true
   },
   status: process.env.OPENAI_API_KEY ? 'fully_configured' : 'missing_api_key'
 });
};

exports.getUsageStats = async (req, res) => {
 try {
   const userId = req.user._id;
   const stats = {
     messagesThisMonth: 0,
     conversationsCreated: 0,
     memoriesStored: 0,
     tokensUsed: 0,
     resumeEdits: 0,
     atsOptimizations: 0
   };
   res.json({ success: true, stats, userId });
 } catch (error) {
   console.error('Usage stats error:', error);
   res.status(500).json({ success: false, error: 'Failed to get usage statistics' });
 }
};

exports.trackInteraction = async (req, res) => {
 try {
   const userId = req.user._id;
   const { type, data } = req.body;
   console.log(`🔍 User ${userId} - ${type}:`, data);
   res.json({ success: true, message: 'Interaction tracked successfully' });
 } catch (error) {
   console.error('Track interaction error:', error);
   res.status(500).json({ success: false, error: 'Failed to track interaction' });
 }
};

exports.resetContext = async (req, res) => {
 try {
   const userId = req.user._id;
   console.log(`Context reset for user: ${userId}`);
   res.json({ success: true, message: 'Context reset successfully' });
 } catch (error) {
   console.error('Reset context error:', error);
   res.status(500).json({ success: false, error: 'Failed to reset context' });
 }
};

// ===================================================================
// LEGACY PLACEHOLDER ENDPOINTS
// ===================================================================

exports.analyzeJobMatch = async (req, res) => {
 res.json({
   success: true,
   analysis: {
     matchScore: 78,
     strengths: ['Relevant experience'],
     gaps: ['Missing some technical skills']
   }
 });
};

exports.generateCoverLetter = async (req, res) => {
 res.json({
   success: true,
   coverLetter: {
     content: 'Sample cover letter content...',
     style: req.body.style || 'professional'
   }
 });
};

exports.getCareerAdvice = async (req, res) => {
 res.json({
   success: true,
   advice: {
     advice: 'Focus on developing your technical skills and building your network.',
     actionItems: ['Take online courses', 'Attend networking events']
   }
 });
};

exports.getContextualSuggestions = async (req, res) => {
 const suggestions = getContextualSuggestions(req.body.page || 'general');
 res.json({ success: true, suggestions });
};

exports.getPersonalizedTips = async (req, res) => {
 const tips = getPersonalizedTips(req.body.category || 'general');
 res.json({ success: true, tips });
};

// Legacy placeholders
exports.applyResumeChanges_legacy = (req, res) => res.json({ success: true, message: 'Feature coming soon' });
exports.optimizeForATS_legacy = (req, res) => res.json({ success: true, message: 'Feature coming soon' });
exports.generateSummary = (req, res) => res.json({ success: true, message: 'Feature coming soon' });
exports.getConversationInsights = (req, res) => res.json({ success: true, message: 'Feature coming soon' });
exports.exportConversation = (req, res) => res.json({ success: true, message: 'Feature coming soon' });
exports.bulkUpdateConversations = (req, res) => res.json({ success: true, message: 'Feature coming soon' });

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function buildSystemPrompt(user, resumes, jobs, context, conversation, memoryContext) {
 const resumeCount = resumes.length;
 const jobCount = jobs.length;
 const currentPage = context?.page || 'unknown';

 let prompt = `You are AJ, an expert AI career assistant for auto-job.ai with advanced memory capabilities and resume editing powers.

CURRENT CONTEXT:
- User: ${user.firstName} ${user.lastName}
- Current Page: ${currentPage}
- Resumes: ${resumeCount}
- Jobs Tracked: ${jobCount}
- Conversation: "${conversation.title}" (${conversation.category})

${memoryContext}

RESUME EDITING CAPABILITIES:
- You can update any section of the user's resume in real-time
- You can optimize resumes for ATS systems
- You can enhance bullet points, summaries, and skills
- Always ask before making changes unless explicitly requested

PERSONALITY & APPROACH:
- Professional but warm and encouraging
- Personalize responses based on user's memory profile
- Provide specific, actionable advice
- Keep responses under 250 words unless complex analysis needed
- Always end with a relevant follow-up question or suggestion

Use this memory context to personalize your responses, but don't explicitly mention that you're using memory unless directly asked about it.`;

 // Add page-specific context
 if (currentPage === 'resumes' && context.currentResume) {
   prompt += `\n\nCURRENT RESUME: "${context.currentResume.name}" - You can edit this resume directly!`;
 }

 if (currentPage === 'jobs' && context.currentJob) {
   prompt += `\n\nCURRENT JOB: "${context.currentJob.title}" at ${context.currentJob.company}`;
 }

 return prompt;
}

function buildMessages(systemPrompt, recentMessages, currentMessage) {
 const messages = [{ role: 'system', content: systemPrompt }];

 if (recentMessages && recentMessages.length > 0) {
   recentMessages.forEach(msg => {
     messages.push({
       role: msg.type === 'user' ? 'user' : 'assistant',
       content: msg.content
     });
   });
 }

 messages.push({ role: 'user', content: currentMessage });
 return messages;
}

function parseResponse(aiMessage, context) {
 const suggestions = [];
 const actions = [];
 
 // Extract suggestions using pattern matching
 const suggestionRegex = /(?:^|\n)[-•*]\s*(.+)/gm;
 let match;
 while ((match = suggestionRegex.exec(aiMessage)) !== null) {
   if (match[1] && match[1].length < 60) {
     suggestions.push(match[1].trim());
   }
 }

 // Generate contextual suggestions if none found
 if (suggestions.length === 0) {
   suggestions.push(...getContextualSuggestions(context?.page || 'general'));
 }

 return {
   message: aiMessage,
   suggestions: suggestions.slice(0, 4),
   actions: actions,
   confidence: 0.85
 };
}

// ================================================================
// 🔧 HELPER FUNCTIONS FOR RESUME EDITING DETECTION
// ================================================================

/**
* Detect if the message is a resume editing request
*/
function detectResumeEditingIntent(message, context) {
 // Must be on resume page with current resume
 if (context?.page !== 'resumes' || !context?.currentResume?.id) {
   return false;
 }

 const messageLower = message.toLowerCase();
 
 // Resume editing keywords
 const editingKeywords = [
   'update', 'change', 'edit', 'modify', 'improve', 'enhance', 
   'add', 'remove', 'rewrite', 'fix', 'optimize', 'tailor',
   'highlight', 'emphasize', 'strengthen', 'quantify', 'make better'
 ];

 // Resume section keywords
 const sectionKeywords = [
   'experience', 'work', 'job', 'summary', 'skills', 'education',
   'achievements', 'bullets', 'bullet points', 'responsibilities',
   'thomson reuters', 'company', 'position', 'role'  // Specific to user's request
 ];

 // Check for editing intent
 const hasEditingKeyword = editingKeywords.some(keyword => 
   messageLower.includes(keyword)
 );

 const hasSectionKeyword = sectionKeywords.some(keyword => 
   messageLower.includes(keyword)
 );

 // Direct resume references
 const hasResumeReference = messageLower.includes('resume') || 
                          messageLower.includes('cv') ||
                          messageLower.includes('my experience') ||
                          messageLower.includes('my work');

 // Must have editing intent AND (section reference OR resume reference)
 const isEditingRequest = hasEditingKeyword && (hasSectionKeyword || hasResumeReference);
 
 console.log(`🔍 Resume edit detection:`, {
   message: message.substring(0, 30) + '...',
   hasEditingKeyword,
   hasSectionKeyword,
   hasResumeReference,
   isEditingRequest,
   contextPage: context?.page,
   hasResumeId: !!context?.currentResume?.id
 });

 return isEditingRequest;
}

/**
* Get or create conversation with enhanced logging
*/
async function getOrCreateConversation(conversationId, userId, newConversation, message, context) {
 try {
   if (conversationId && !newConversation) {
     console.log(`📖 Loading existing conversation: ${conversationId}`);
     return await ConversationService.getConversation(conversationId, userId);
   } else {
     const title = generateSimpleTitle(message, context);
     console.log(`📝 Creating new conversation: ${title}`);
     return await ConversationService.createConversation(userId, {
       title,
       category: detectCategory(message, context),
       tags: extractTags(message, context)
     });
   }
 } catch (error) {
   console.error('Error handling conversation:', error);
   throw error;
 }
}

function getContextualSuggestions(page) {
 const suggestions = {
   dashboard: ['Review my career progress', 'What should I focus on next?', 'Find new job opportunities'],
   resumes: ['How can I improve this resume?', 'Update my work experience', 'Optimize for ATS', 'Add missing skills'],
   jobs: ['How well do I match this position?', 'What skills am I missing?', 'Help me tailor my application'],
   general: ['Help with resume', 'Find job opportunities', 'Career guidance']
 };
 return suggestions[page] || suggestions.general;
}

function getPersonalizedTips(category) {
 const tips = {
   resume: ['Use action verbs', 'Quantify achievements'],
   job_search: ['Apply within 48 hours', 'Customize each application'],
   career: ['Set SMART goals', 'Build your network'],
   general: ['Stay updated', 'Practice interviewing']
 };
 return tips[category] || tips.general;
}

function generateSimpleTitle(message, context) {
 const content = message.toLowerCase();
 if (content.includes('resume')) return 'Resume Assistance';
 if (content.includes('job') || content.includes('application')) return 'Job Search Help';
 if (content.includes('interview')) return 'Interview Preparation';
 if (content.includes('career')) return 'Career Guidance';
 if (content.includes('skill')) return 'Skill Development';
 
 const contextTitles = {
   'resumes': 'Resume Help',
   'jobs': 'Job Search',
   'dashboard': 'Career Planning'
 };
 
 return contextTitles[context?.page] || 'Career Assistance';
}

function detectCategory(message, context) {
 const messageLower = message.toLowerCase();
 
 if (messageLower.includes('resume') || messageLower.includes('cv')) return 'resume_help';
 if (messageLower.includes('job') || messageLower.includes('application')) return 'job_search';
 if (messageLower.includes('interview')) return 'interview_prep';
 if (messageLower.includes('skill') || messageLower.includes('learn')) return 'skill_development';
 if (messageLower.includes('career') || messageLower.includes('future')) return 'career_advice';

 if (context?.page === 'resumes') return 'resume_help';
 if (context?.page === 'jobs') return 'job_search';
 
 return 'general';
}

function extractTags(message, context) {
 const tags = [];
 const messageLower = message.toLowerCase();
 
 const techKeywords = ['python', 'javascript', 'react', 'node', 'sql', 'aws', 'docker'];
 const roleKeywords = ['developer', 'manager', 'designer', 'analyst', 'engineer'];
 
 techKeywords.forEach(tech => {
   if (messageLower.includes(tech)) tags.push(tech);
 });
 
 roleKeywords.forEach(role => {
   if (messageLower.includes(role)) tags.push(role);
 });
 
 if (context?.page) tags.push(context.page);
 
 return tags.slice(0, 5);
}

function getFallbackResponse(message, context) {
 if (!message) return "I didn't receive your message. Could you please try again?";
 
 if (message.toLowerCase().includes('resume')) {
   return "I'd be happy to help with your resume! I can provide personalized suggestions and even edit it in real-time.";
 }
 
 if (message.toLowerCase().includes('job')) {
   return "I can help you with job searching and applications! What specific area would you like assistance with?";
 }
 
 return "I'm here to help with your career journey. What would you like to explore?";
}

/**
* Generate personalized resume improvements using AI and memory context
*/
async function generatePersonalizedImprovements(resumeData, analysis, memoryContext) {
 try {
   const prompt = `You are an expert career coach with access to the user's profile and career history. Generate personalized resume improvement suggestions.

RESUME DATA:
${JSON.stringify(resumeData, null, 2)}

CURRENT ANALYSIS:
${JSON.stringify(analysis, null, 2)}

USER MEMORY CONTEXT:
${memoryContext}

Generate personalized improvement suggestions in JSON format:
{
 "improvements": [
   {
     "type": "content|formatting|keywords|structure|ats",
     "section": "summary|experience|skills|education|etc",
     "title": "Brief improvement title",
     "description": "Detailed explanation of the improvement",
     "before": "current content (if applicable)",
     "after": "suggested improvement",
     "impact": "low|medium|high",
     "effort": "low|medium|high",
     "reason": "why this improvement helps based on user's profile",
     "keywords": ["relevant", "keywords"],
     "personalized": true
   }
 ]
}

Focus on:
1. Improvements aligned with user's career goals from memory
2. Skills gaps identified in their profile
3. Industry-specific optimizations
4. Personalized content based on their background
5. ATS optimizations for their target roles

IMPORTANT: Return ONLY the JSON object, no markdown or additional text.`;

   const response = await openai.chat.completions.create({
     model: 'gpt-4-turbo-preview',
     messages: [
       {
         role: 'system',
         content: 'You are an expert career coach. Generate personalized resume improvements based on user profile and memory context. Return only valid JSON.'
       },
       {
         role: 'user',
         content: prompt
       }
     ],
     temperature: 0.3,
     max_tokens: 2000
   });

   const responseContent = response.choices[0].message.content.trim();
   const cleanedResponse = responseContent.replace(/```json\n?|\n?```/g, '').trim();
   const improvements = JSON.parse(cleanedResponse);

   return improvements.improvements || [];

 } catch (error) {
   console.error('Error generating personalized improvements:', error);
   return [];
 }
}

/**
* Prioritize improvements based on impact and effort
*/
function prioritizeImprovements(improvements) {
 return improvements.sort((a, b) => {
   const impactScore = { high: 3, medium: 2, low: 1 };
   const effortScore = { low: 3, medium: 2, high: 1 };
   
   const aScore = impactScore[a.impact] + effortScore[a.effort];
   const bScore = impactScore[b.impact] + effortScore[b.effort];
   
   return bScore - aScore;
 });
}

/**
* Generate memory insights using AI
*/
async function generateMemoryInsights(userMemory) {
 try {
   const recentMemories = userMemory.memories
     .filter(m => m.isActive)
     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
     .slice(0, 20);

   if (recentMemories.length === 0) {
     console.log('📝 No memories to analyze, returning empty insights');
     return [];
   }

   const memoryText = recentMemories
     .map(m => `${m.type}: ${m.content}`)
     .join('\n');

   console.log('🧠 Generating insights from', recentMemories.length, 'memories');

   const systemPrompt = `Analyze these user memories and generate actionable insights about their career journey.

MEMORIES:
${memoryText}

Provide insights as JSON in this EXACT format:
{
 "insights": [
   {
     "type": "strength|opportunity|challenge|recommendation",
     "description": "Clear insight about the user",
     "confidence": 0.8,
     "actionable": true
   }
 ]
}

Maximum 5 insights. Focus on career development opportunities.`;

   const response = await openai.chat.completions.create({
     model: 'gpt-3.5-turbo',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: 'Generate insights' }
     ],
     temperature: 0.3,
     max_tokens: 600,
     response_format: { type: 'json_object' }
   });

   console.log('🤖 Raw AI response:', response.choices[0].message.content);

   let parsedResponse;
   try {
     parsedResponse = JSON.parse(response.choices[0].message.content);
   } catch (parseError) {
     console.error('❌ Failed to parse AI response JSON:', parseError);
     return [];
   }

   if (!parsedResponse || !parsedResponse.insights || !Array.isArray(parsedResponse.insights)) {
     console.warn('⚠️ AI response missing insights array:', parsedResponse);
     return [];
   }

   const validInsights = parsedResponse.insights
     .filter(insight => {
       return insight && 
              typeof insight.type === 'string' && 
              typeof insight.description === 'string' &&
              typeof insight.confidence === 'number' &&
              typeof insight.actionable === 'boolean';
     })
     .map(insight => ({
       type: insight.type,
       description: insight.description,
       confidence: Math.min(1, Math.max(0, insight.confidence)),
       actionable: insight.actionable,
       generatedAt: new Date()
     }));

   console.log('✅ Generated', validInsights.length, 'valid insights');
   return validInsights;

 } catch (error) {
   console.error('❌ Generate memory insights error:', error);
   return [];
 }
}