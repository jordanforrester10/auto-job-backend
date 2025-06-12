// src/utils/assistantService.js - ENHANCED WITH RESUME EDITING CAPABILITIES AND TIMEOUT FIXES
import api from './axios';

const assistantService = {
  // ===================================================================
  // ENHANCED CHAT WITH CONVERSATION MANAGEMENT
  // ===================================================================

  /**
   * Send message to AI Assistant with enhanced context and conversation management
   */
  sendMessage: async (requestData) => {
    try {
      const {
        message,
        context = {},
        conversationId,
        newConversation = false,
        conversationHistory = []
      } = requestData;

      console.log('🚀 Sending message to AI:', { message: message.substring(0, 50) + '...', conversationId, newConversation });

      // 🔥 CRITICAL FIX: Detect resume editing requests and increase timeout
      const isResumeEditRequest = detectResumeEditRequest(message, context);
      const timeoutDuration = isResumeEditRequest ? 60000 : 30000; // 60s for resume edits, 30s for regular chat

      console.log(`⏱️ Using ${timeoutDuration/1000}s timeout for ${isResumeEditRequest ? 'resume editing' : 'regular chat'} request`);

      const response = await api.post('/assistant/chat', {
        message,
        context: {
          page: context.page || 'unknown',
          currentResume: context.currentResume || null,
          currentJob: context.currentJob || null,
          resumeCount: context.resumeCount || 0,
          jobCount: context.jobCount || 0,
          userProfile: context.userProfile || null
        },
        conversationId,
        newConversation,
        conversationHistory: conversationHistory.slice(-10) // Last 10 messages
      }, {
        timeout: timeoutDuration // 🔥 DYNAMIC TIMEOUT based on request type
      });

      console.log('✅ AI Response received:', response.data);

      return {
        message: response.data.message,
        suggestions: response.data.suggestions || [],
        actions: response.data.actions || [],
        confidence: response.data.confidence || 0.8,
        conversationId: response.data.conversationId,
        conversationTitle: response.data.conversationTitle,
        memoryInsights: response.data.memoryInsights || [],
        usage: response.data.usage || {},
        // 🔥 CRITICAL: Pass through resume update data
        resumeUpdated: response.data.resumeUpdated || false,
        newAnalysis: response.data.newAnalysis || null,
        resumeChanges: response.data.resumeChanges || null
      };

    } catch (error) {
      console.error('Enhanced AI Assistant Service Error:', error);
      
      // 🔥 ENHANCED: Better error handling for resume editing timeouts
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const isResumeEdit = detectResumeEditRequest(requestData.message, requestData.context);
        if (isResumeEdit) {
          throw new Error('Resume update is taking longer than usual. The changes may still be processing. Please refresh the page in a moment to see the updated scores.');
        } else {
          throw new Error('Request timed out. The AI is taking longer than usual to respond. Please try again.');
        }
      } else if (error.response?.status === 503) {
        throw new Error('AI service temporarily unavailable. Please try again in a moment.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before sending another message.');
      } else {
        // Fallback response
        const fallbackResponse = assistantService.getContextualFallback(requestData.message, requestData.context);
        throw new Error(fallbackResponse.error || 'AI service temporarily unavailable');
      }
    }
  },

  // ===================================================================
  // CONVERSATION MANAGEMENT
  // ===================================================================

  /**
   * Get user's conversations
   */
  getConversations: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.category) params.append('category', options.category);
      if (options.tags && options.tags.length > 0) params.append('tags', options.tags.join(','));
      if (options.search) params.append('search', options.search);
      if (options.pinned !== undefined) params.append('pinned', options.pinned);
      if (options.starred !== undefined) params.append('starred', options.starred);
      if (options.limit) params.append('limit', options.limit);
      if (options.offset) params.append('offset', options.offset);
      if (options.sortBy) params.append('sortBy', options.sortBy);

      const response = await api.get(`/assistant/conversations?${params}`);
      return response.data;

    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },

  /**
   * Get specific conversation
   */
  getConversation: async (conversationId) => {
    try {
      const response = await api.get(`/assistant/conversations/${conversationId}`);
      return response.data.conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  },

  /**
   * Create new conversation
   */
  createConversation: async (conversationData) => {
    try {
      const response = await api.post('/assistant/conversations', conversationData);
      return response.data.conversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },

  /**
   * Update conversation
   */
  updateConversation: async (conversationId, updates) => {
    try {
      const response = await api.put(`/assistant/conversations/${conversationId}`, updates);
      return response.data.conversation;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  },

  /**
   * Delete conversation
   */
  deleteConversation: async (conversationId, permanent = false) => {
    try {
      const params = permanent ? '?permanent=true' : '';
      const response = await api.delete(`/assistant/conversations/${conversationId}${params}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  /**
   * Generate conversation summary
   */
  generateSummary: async (conversationId) => {
    try {
      const response = await api.post(`/assistant/conversations/${conversationId}/summary`);
      return response.data.summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw error;
    }
  },

  /**
   * Get conversation insights
   */
  getConversationInsights: async (conversationId) => {
    try {
      const response = await api.get(`/assistant/conversations/${conversationId}/insights`);
      return response.data.insights;
    } catch (error) {
      console.error('Error getting insights:', error);
      throw error;
    }
  },

  /**
   * Export conversation
   */
  exportConversation: async (conversationId, format = 'json') => {
    try {
      const response = await api.get(`/assistant/conversations/${conversationId}/export?format=${format}`);
      return response.data.export;
    } catch (error) {
      console.error('Error exporting conversation:', error);
      throw error;
    }
  },

  /**
   * Bulk update conversations
   */
  bulkUpdateConversations: async (conversationIds, updates) => {
    try {
      const response = await api.post('/assistant/conversations/bulk-update', {
        conversationIds,
        updates
      });
      return response.data.result;
    } catch (error) {
      console.error('Error bulk updating conversations:', error);
      throw error;
    }
  },

  // ===================================================================
  // MEMORY MANAGEMENT
  // ===================================================================

  /**
   * Get user memories
   */
  getMemories: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.type) params.append('type', options.type);
      if (options.category) params.append('category', options.category);
      if (options.search) params.append('search', options.search);
      if (options.minConfidence) params.append('minConfidence', options.minConfidence);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/assistant/memories?${params}`);
      return response.data;

    } catch (error) {
      console.error('Error fetching memories:', error);
      throw error;
    }
  },

  /**
   * Add or update memory
   */
  updateMemory: async (memoryData) => {
    try {
      const response = await api.post('/assistant/memories', { memoryData });
      return response.data;
    } catch (error) {
      console.error('Error updating memory:', error);
      throw error;
    }
  },

  /**
   * Delete memory
   */
  deleteMemory: async (memoryId) => {
    try {
      const response = await api.delete(`/assistant/memories/${memoryId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting memory:', error);
      throw error;
    }
  },

  /**
   * Get memory insights
   */
  getMemoryInsights: async () => {
    try {
      const response = await api.get('/assistant/memory-insights');
      return response.data;
    } catch (error) {
      console.error('Error getting memory insights:', error);
      return {
        insights: [],
        analytics: {
          totalMemories: 0,
          averageConfidence: 0,
          memoriesByType: [],
          memoriesByCategory: []
        }
      };
    }
  },

  /**
   * Perform memory maintenance
   */
  performMemoryMaintenance: async () => {
    try {
      const response = await api.post('/assistant/memory-maintenance');
      return response.data.maintenance;
    } catch (error) {
      console.error('Error performing memory maintenance:', error);
      throw error;
    }
  },

  // ===================================================================
  // SEARCH & ANALYTICS
  // ===================================================================

  /**
   * Search across conversations and memories
   */
  search: async (query, options = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      
      if (options.searchType) params.append('searchType', options.searchType);
      if (options.limit) params.append('limit', options.limit);

      const response = await api.get(`/assistant/search?${params}`);
      return response.data.results;

    } catch (error) {
      console.error('Error searching:', error);
      return { conversations: [], memories: [] };
    }
  },

  /**
   * Get analytics
   */
  getAnalytics: async (timeframe = '30d') => {
    try {
      const response = await api.get(`/assistant/analytics?timeframe=${timeframe}`);
      return response.data.analytics;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  },

  // ===================================================================
  // ENHANCED RESUME OPERATIONS - FULL IMPLEMENTATION
  // ===================================================================

  /**
   * Analyze resume with memory context
   */
  analyzeResume: async (resumeId, analysisType = 'comprehensive') => {
    try {
      const response = await api.post('/assistant/analyze-resume', {
        resumeId,
        analysisType,
        includeImprovements: true,
        includeKeywords: true,
        useMemoryContext: true
      });

      return response.data;

    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  },

  /**
   * Apply resume changes suggested by AI
   */
  applyResumeChanges: async (resumeId, changes, changeType = 'ai_enhancement') => {
    try {
      const response = await api.post('/assistant/apply-resume-changes', {
        resumeId,
        changes,
        changeType
      }, {
        timeout: 60000 // Extended timeout for resume processing
      });

      return response.data;

    } catch (error) {
      console.error('Error applying resume changes:', error);
      throw error;
    }
  },

  /**
   * Optimize resume for ATS
   */
  optimizeForATS: async (resumeId, jobId = null) => {
    try {
      const response = await api.post('/assistant/optimize-ats', {
        resumeId,
        targetJobId: jobId,
        optimizationLevel: 'aggressive',
        useMemoryContext: true
      }, {
        timeout: 60000 // Extended timeout for ATS optimization
      });

      return response.data;

    } catch (error) {
      console.error('Error optimizing for ATS:', error);
      throw error;
    }
  },

  /**
   * Quick resume edit
   */
  quickEditResume: async (resumeId, editRequest) => {
    try {
      const response = await api.post('/assistant/resume/quick-edit', {
        resumeId,
        editRequest
      }, {
        timeout: 45000
      });

      return response.data;

    } catch (error) {
      console.error('Error with quick resume edit:', error);
      throw error;
    }
  },

  /**
   * Process resume update request from chat
   */
  processResumeUpdateFromChat: async (message, resumeId, conversationId) => {
    try {
      const response = await api.post('/assistant/chat', {
        message,
        context: {
          page: 'resumes',
          currentResume: { id: resumeId },
          intent: 'resume_update'
        },
        conversationId,
        resumeUpdateMode: true
      }, {
        timeout: 60000 // Extended timeout for resume updates
      });

      return response.data;

    } catch (error) {
      console.error('Error processing resume update from chat:', error);
      throw error;
    }
  },

  /**
   * Bulk update multiple resume sections
   */
  bulkUpdateResume: async (resumeId, updates) => {
    try {
      const response = await api.post('/assistant/resume/bulk-update', {
        resumeId,
        updates
      }, {
        timeout: 60000 // Extended timeout for bulk updates
      });

      return response.data;

    } catch (error) {
      console.error('Error with bulk resume update:', error);
      throw error;
    }
  },

  /**
   * Get resume improvement suggestions
   */
  getResumeImprovements: async (resumeId, focusArea = 'all') => {
    try {
      const response = await api.post('/assistant/resume/improvements', {
        resumeId,
        focusArea, // 'ats', 'content', 'keywords', 'formatting', 'all'
        useMemoryContext: true
      }, {
        timeout: 30000
      });

      return response.data;

    } catch (error) {
      console.error('Error getting resume improvements:', error);
      throw error;
    }
  },

  // ===================================================================
  // JOB MATCHING & CAREER GUIDANCE
  // ===================================================================

  /**
   * Get job matching insights with memory context
   */
  analyzeJobMatch: async (resumeId, jobId) => {
    try {
      const response = await api.post('/assistant/analyze-job-match', {
        resumeId,
        jobId,
        includeImprovements: true,
        includeTailoringAdvice: true,
        useMemoryContext: true
      });

      return response.data;

    } catch (error) {
      console.error('Error analyzing job match:', error);
      throw error;
    }
  },

  /**
   * Generate personalized cover letter
   */
  generateCoverLetter: async (resumeId, jobId, style = 'professional') => {
    try {
      const response = await api.post('/assistant/generate-cover-letter', {
        resumeId,
        jobId,
        style,
        customization: 'high',
        useMemoryContext: true
      });

      return response.data;

    } catch (error) {
      console.error('Error generating cover letter:', error);
      throw error;
    }
  },

  /**
   * Get career advice and guidance with memory context
   */
  getCareerAdvice: async (userProfile, specificQuestion = null) => {
    try {
      const response = await api.post('/assistant/career-advice', {
        userProfile,
        question: specificQuestion,
        includeJobSuggestions: true,
        includeSkillGaps: true,
        useMemoryContext: true
      });

      return response.data;

    } catch (error) {
      console.error('Error getting career advice:', error);
      throw error;
    }
  },

  /**
   * Get contextual suggestions for current page
   */
  getContextualSuggestions: async (page, contextData = {}) => {
    try {
      const response = await api.post('/assistant/contextual-suggestions', {
        page,
        contextData,
        maxSuggestions: 5,
        useMemoryContext: true
      });

      return response.data.suggestions || [];

    } catch (error) {
      console.error('Error getting contextual suggestions:', error);
      return assistantService.getFallbackSuggestions(page, contextData);
    }
  },

  /**
   * Get personalized tips based on user profile and memory
   */
  getPersonalizedTips: async (category = 'general') => {
    try {
      const response = await api.post('/assistant/personalized-tips', {
        category,
        includeActions: true,
        useMemoryContext: true
      });

      return response.data.tips || [];

    } catch (error) {
      console.error('Error getting personalized tips:', error);
      return assistantService.getFallbackTips(category);
    }
  },

  // ===================================================================
  // SYSTEM & HEALTH
  // ===================================================================

  /**
   * Get AI Assistant capabilities and status
   */
  getCapabilities: async () => {
    try {
      const response = await api.get('/assistant/capabilities');
      return response.data;
    } catch (error) {
      console.error('Error getting AI capabilities:', error);
      return {
        available: false,
        features: ['basic_chat', 'contextual_suggestions'],
        limitations: ['Full AI features unavailable in test mode'],
        memory_features: {
          available: false
        },
        resume_features: {
          available: false
        }
      };
    }
  },

  /**
   * Check AI Assistant health
   */
  checkHealth: async () => {
    try {
      const response = await api.get('/assistant/health');
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  },

  /**
   * Get user's AI usage statistics
   */
  getUsageStats: async () => {
    try {
      const response = await api.get('/assistant/usage-stats');
      return response.data;
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        messagesThisMonth: 0,
        resumeAnalyses: 0,
        jobMatches: 0,
        careerAdviceRequests: 0,
        conversationsCreated: 0,
        memoriesStored: 0,
        resumeEdits: 0,
        atsOptimizations: 0
      };
    }
  },

  /**
   * Track user interaction
   */
  trackInteraction: async (interactionType, data) => {
    try {
      await api.post('/assistant/track-interaction', {
        type: interactionType,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Non-critical, just log
      console.warn('Failed to track interaction:', error);
    }
  },

  /**
   * Reset AI conversation context
   */
  resetContext: async () => {
    try {
      await api.post('/assistant/reset-context');
      return { success: true };
    } catch (error) {
      console.error('Error resetting context:', error);
      return { success: false };
    }
  },

  // ===================================================================
  // CONVERSATION UTILITIES
  // ===================================================================

  /**
   * Auto-generate conversation title based on content
   */
  generateConversationTitle: async (messages, context = {}) => {
    try {
      if (!messages || messages.length === 0) return 'New Conversation';

      // Use the first user message to generate title
      const firstUserMessage = messages.find(m => m.type === 'user');
      if (!firstUserMessage) return 'New Conversation';

      // Simple client-side title generation for immediate feedback
      const content = firstUserMessage.content.toLowerCase();
      
      if (content.includes('resume')) return 'Resume Assistance';
      if (content.includes('job') || content.includes('application')) return 'Job Search Help';
      if (content.includes('interview')) return 'Interview Preparation';
      if (content.includes('career')) return 'Career Guidance';
      if (content.includes('skill')) return 'Skill Development';
      
      // Fallback based on context
      const contextTitles = {
        'resumes': 'Resume Help',
        'jobs': 'Job Search',
        'dashboard': 'Career Planning'
      };
      
      return contextTitles[context.page] || 'Career Assistance';

    } catch (error) {
      console.error('Error generating conversation title:', error);
      return 'New Conversation';
    }
  },

  /**
   * Format conversation for display
   */
  formatConversation: (conversation) => {
    if (!conversation) return null;

    return {
      ...conversation,
      formattedDate: new Date(conversation.createdAt).toLocaleDateString(),
      formattedTime: new Date(conversation.lastActiveAt).toLocaleTimeString(),
      preview: conversation.messages && conversation.messages.length > 0
        ? conversation.messages[conversation.messages.length - 1].content.substring(0, 100) + '...'
        : conversation.description || 'No messages yet',
      messageCount: conversation.messages ? conversation.messages.length : 0,
      isRecent: Date.now() - new Date(conversation.lastActiveAt).getTime() < 24 * 60 * 60 * 1000
    };
  },

  /**
   * Format memory for display
   */
  formatMemory: (memory) => {
    if (!memory) return null;

    return {
      ...memory,
      formattedDate: new Date(memory.createdAt).toLocaleDateString(),
      confidencePercentage: Math.round(memory.confidence * 100),
      isHighConfidence: memory.confidence >= 0.8,
      isRecentlyAccessed: memory.usage?.lastAccessedAt && 
        Date.now() - new Date(memory.usage.lastAccessedAt).getTime() < 7 * 24 * 60 * 60 * 1000,
      typeLabel: assistantService.getMemoryTypeLabel(memory.type),
      categoryLabel: assistantService.getCategoryLabel(memory.category)
    };
  },

  /**
   * Get human-readable memory type labels
   */
  getMemoryTypeLabel: (type) => {
    const labels = {
      'preference': 'Preference',
      'skill': 'Skill',
      'career_goal': 'Career Goal',
      'experience': 'Experience',
      'achievement': 'Achievement',
      'challenge': 'Challenge',
      'personality_trait': 'Personality',
      'communication_style': 'Communication Style',
      'work_style': 'Work Style',
      'industry_knowledge': 'Industry Knowledge',
      'tool_preference': 'Tool Preference',
      'feedback_pattern': 'Feedback Pattern'
    };
    return labels[type] || type;
  },

  /**
   * Get human-readable category labels
   */
  getCategoryLabel: (category) => {
    const labels = {
      'personal': 'Personal',
      'professional': 'Professional',
      'technical': 'Technical',
      'behavioral': 'Behavioral',
      'contextual': 'Contextual'
    };
    return labels[category] || category;
  },

  // ===================================================================
  // ENHANCED FALLBACK RESPONSES
  // ===================================================================

  /**
   * Enhanced fallback responses based on context
   */
  getContextualFallback: (message, context) => {
    const lowercaseMessage = message?.toLowerCase() || '';

    // Resume-related queries
    if (lowercaseMessage.includes('resume') || lowercaseMessage.includes('cv')) {
      if (context?.page === 'resumes' && context?.currentResume) {
        return {
          message: `I can see you're working on "${context.currentResume.name}". While I can't access my full AI capabilities right now, I can still help with resume improvements, ATS optimization, and real-time editing. What would you like me to update?`,
          suggestions: [
            'Improve work experience section',
            'Optimize for ATS',
            'Add missing skills',
            'Enhance summary section'
          ]
        };
      }
      return {
        message: "I'd love to help improve your resume! I can edit resumes in real-time, optimize for ATS systems, and provide personalized suggestions. Which resume would you like to work on?",
        suggestions: [
          'Analyze my best resume',
          'Edit resume content',
          'Optimize for ATS',
          'Add new skills'
        ]
      };
    }

    // Job-related queries
    if (lowercaseMessage.includes('job') || lowercaseMessage.includes('application') || lowercaseMessage.includes('interview')) {
      if (context?.page === 'jobs' && context?.currentJob) {
        return {
          message: `Looking at "${context.currentJob.title}" at ${context.currentJob.company}. I can help optimize your resume for this specific position and improve your match score.`,
          suggestions: [
            'Tailor resume to this job',
            'What skills am I missing?',
            'Optimize for ATS',
            'Generate cover letter'
          ]
        };
      }
      return {
        message: "I can help you with job applications, resume tailoring, and interview preparation! What specific aspect would you like assistance with?",
        suggestions: [
          'Find matching jobs',
          'Improve application materials',
          'Interview preparation',
          'Salary negotiation'
        ]
      };
    }

    // Career guidance queries
    if (lowercaseMessage.includes('career') || lowercaseMessage.includes('advice') || lowercaseMessage.includes('guidance')) {
      return {
        message: "I'm here to provide personalized career guidance! I can help with career planning, skill development, resume optimization, and strategic job search approaches. What's your biggest career challenge right now?",
        suggestions: [
          'Plan my next career move',
          'Identify skill gaps',
          'Industry insights',
          'Resume improvements'
        ]
      };
    }

    // Resume editing specific queries
    if (lowercaseMessage.includes('edit') || lowercaseMessage.includes('update') || lowercaseMessage.includes('change')) {
      return {
        message: "I can edit your resume in real-time! Just tell me what you'd like to change - whether it's updating your experience, adding new skills, or optimizing for specific jobs. I'll make the changes immediately.",
        suggestions: [
          'Update work experience',
          'Add new skills',
          'Improve summary',
          'Optimize formatting'
        ]
      };
    }

    // Default fallback
    return {
      message: "I'm here to help with your career and can edit resumes in real-time! I remember our previous conversations and can provide personalized advice. What would you like to explore?",
      suggestions: [
        'Edit my resume',
        'Career guidance',
        'Job search help',
        'Skill development'
      ],
      error: 'AI service temporarily experiencing connectivity issues'
    };
  },

  /**
   * Get fallback suggestions based on page context
   */
  getFallbackSuggestions: (page, contextData) => {
    const suggestions = {
      dashboard: [
        'Review my career progress',
        'What should I focus on today?',
        'Find new job opportunities',
        'Edit my resume'
      ],
      resumes: [
        'Edit this resume',
        'Optimize for ATS',
        'Add missing skills',
        'Improve work experience'
      ],
      jobs: [
        'Tailor resume to this job',
        'Find similar positions',
        'Improve match score',
        'Generate cover letter'
      ],
      'ai-searches': [
        'Optimize search criteria',
        'Review found opportunities',
        'Adjust parameters',
        'Set up new searches'
      ]
    };

    return suggestions[page] || [
      'Edit my resume',
      'Find job opportunities',
      'Career guidance',
      'Skill development'
    ];
  },

  /**
   * Get fallback tips based on category
   */
  getFallbackTips: (category) => {
    const fallbackTips = {
      resume: [
        'Use action verbs to start bullet points',
        'Quantify achievements with numbers',
        'Tailor keywords to job descriptions',
        'Keep formatting ATS-friendly',
        'Update regularly with new skills'
      ],
      job_search: [
        'Apply within 24-48 hours of posting',
        'Customize resume for each application',
        'Research company culture',
        'Follow up professionally',
        'Leverage your network'
      ],
      career: [
        'Set SMART career goals',
        'Build professional network',
        'Stay updated with trends',
        'Invest in skill development',
        'Seek feedback regularly'
      ],
      interview: [
        'Practice common questions',
        'Research company thoroughly',
        'Prepare STAR examples',
        'Ask thoughtful questions',
        'Send thank-you notes'
      ],
      general: [
        'Keep LinkedIn updated',
        'Track applications systematically',
        'Practice interviewing',
        'Maintain online presence',
        'Document achievements'
      ]
    };

    return fallbackTips[category] || fallbackTips.general;
  },

  // ===================================================================
  // VALIDATION & UTILITIES
  // ===================================================================

  /**
   * Validate message content before sending
   */
  validateMessage: (message) => {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Message must be a non-empty string' };
    }

    if (message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 3000) {
      return { valid: false, error: 'Message too long (max 3000 characters)' };
    }

    // Check for potential harmful content
    const harmfulPatterns = [
      /password/i,
      /credit card/i,
      /social security/i,
      /ssn/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(message)) {
        return { 
          valid: false, 
          error: 'Please avoid sharing sensitive personal information' 
        };
        }
   }

   return { valid: true };
 },


/**
 * Format AI response for display
 */
formatResponse: (response) => {
  if (!response || typeof response !== 'string') {
    return 'I encountered an issue processing that request. Please try again.';
  }

  // Clean up common AI response artifacts and convert markdown to HTML
  let formatted = response
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert **text** to <strong>text</strong>
    .replace(/\*(.*?)\*/g, '<em>$1</em>')           // Convert *text* to <em>text</em>
    .replace(/\n\n+/g, '\n\n')                      // Normalize line breaks
    .trim();

  // Ensure proper sentence structure
  if (formatted && !formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
    formatted += '.';
  }

  return formatted;
},

 /**
  * Check if AI service is available
  */
 isAvailable: async () => {
   try {
     const response = await api.get('/assistant/health');
     return response.data.status === 'healthy';
   } catch (error) {
     console.warn('AI Assistant service unavailable:', error.message);
     return false;
   }
 },

 /**
  * Get conversation statistics
  */
 getConversationStats: async () => {
   try {
     const analytics = await assistantService.getAnalytics('30d');
     return {
       totalConversations: analytics.totalConversations || 0,
       totalMessages: analytics.totalMessages || 0,
       avgEngagement: analytics.avgEngagement || 0,
       mostActiveCategory: analytics.categoryDistribution ? 
         Object.keys(analytics.categoryDistribution)[0] : 'general'
     };
   } catch (error) {
     console.error('Error getting conversation stats:', error);
     return {
       totalConversations: 0,
       totalMessages: 0,
       avgEngagement: 0,
       mostActiveCategory: 'general'
     };
   }
 },

 /**
  * Estimate tokens for message
  */
 estimateTokens: (text) => {
   // Rough estimation: ~4 characters per token
   return Math.ceil(text.length / 4);
 },

 /**
  * Calculate estimated cost
  */
 estimateCost: (tokens) => {
   // GPT-4 Turbo pricing estimate
   const inputCost = 0.01 / 1000;
   const outputCost = 0.03 / 1000;
   return ((tokens * 0.5 * inputCost) + (tokens * 0.5 * outputCost)).toFixed(4);
 },

 // ===================================================================
 // RESUME EDITING HELPER METHODS
 // ===================================================================

 /**
  * Detect if message is a resume edit request
  */
 isResumeEditRequest: (message, context) => {
   if (context?.page !== 'resumes' || !context?.currentResume) {
     return false;
   }

   const editKeywords = [
     'update', 'change', 'edit', 'modify', 'improve', 'enhance', 
     'add', 'remove', 'rewrite', 'fix', 'optimize', 'tailor'
   ];

   const messageWords = message.toLowerCase().split(' ');
   return editKeywords.some(keyword => 
     messageWords.some(word => word.includes(keyword))
   );
 },

 /**
  * Parse resume edit intent from natural language
  */
 parseResumeEditIntent: (message) => {
   const intent = {
     type: 'general',
     section: null,
     action: null,
     content: message
   };

   const messageLower = message.toLowerCase();

   // Detect section
   if (messageLower.includes('summary') || messageLower.includes('objective')) {
     intent.section = 'summary';
   } else if (messageLower.includes('experience') || messageLower.includes('work') || messageLower.includes('job')) {
     intent.section = 'experience';
   } else if (messageLower.includes('skill')) {
     intent.section = 'skills';
   } else if (messageLower.includes('education') || messageLower.includes('degree')) {
     intent.section = 'education';
   } else if (messageLower.includes('certification')) {
     intent.section = 'certifications';
   } else if (messageLower.includes('project')) {
     intent.section = 'projects';
   }

   // Detect action
   if (messageLower.includes('add') || messageLower.includes('include')) {
     intent.action = 'add';
   } else if (messageLower.includes('remove') || messageLower.includes('delete')) {
     intent.action = 'remove';
   } else if (messageLower.includes('update') || messageLower.includes('change')) {
     intent.action = 'update';
   } else if (messageLower.includes('rewrite') || messageLower.includes('improve')) {
     intent.action = 'enhance';
   } else if (messageLower.includes('optimize') || messageLower.includes('ats')) {
     intent.action = 'optimize';
     intent.type = 'ats_optimization';
   }

   return intent;
 },

 /**
  * Generate resume edit confirmation message
  */
 generateEditConfirmation: (changes, resumeName) => {
   if (!changes || changes.length === 0) {
     return `I've updated your resume "${resumeName}" as requested.`;
   }

   const changeDescriptions = changes.map(change => {
     const section = change.section || 'content';
     const action = change.action || 'updated';
     return `${action} ${section}`;
   });

   return `✅ I've successfully updated your resume "${resumeName}"! Changes made: ${changeDescriptions.join(', ')}.`;
 },

 // ===================================================================
 // RESUME REAL-TIME EDITING WORKFLOW
 // ===================================================================

 /**
  * Handle complete resume editing workflow from chat
  */
 handleResumeEditWorkflow: async (message, context, conversationId) => {
   try {
     const { currentResume } = context;
     
     if (!currentResume) {
       throw new Error('No resume context available');
     }

     console.log(`🔧 Starting resume edit workflow for: ${currentResume.name}`);

     // Step 1: Parse the edit intent
     const editIntent = assistantService.parseResumeEditIntent(message);
     
     // Step 2: Apply the changes
     const result = await assistantService.applyResumeChanges(
       currentResume.id,
       message,
       editIntent.type || 'ai_enhancement'
     );

     // Step 3: Generate confirmation
     const confirmation = assistantService.generateEditConfirmation(
       result.result?.changes,
       currentResume.name
     );

     // Step 4: Return structured response
     return {
       success: true,
       message: confirmation,
       suggestions: [
         'Make more changes',
         'Optimize for ATS',
         'View updated resume',
         'Download new version'
       ],
       resumeUpdated: true,
       updatedResume: result.result?.updatedResume,
       changes: result.result?.changes,
       newFileUrl: result.result?.newFileUrl
     };

   } catch (error) {
     console.error('Resume edit workflow error:', error);
     throw error;
   }
 },

 /**
  * Quick resume fixes with predefined templates
  */
 applyQuickResumeFix: async (resumeId, fixType) => {
   const quickFixes = {
     'action-verbs': 'Replace weak verbs with strong action verbs throughout the resume',
     'quantify': 'Add specific numbers and metrics to achievements where possible',
     'keywords': 'Add relevant industry keywords to improve ATS compatibility',
     'formatting': 'Optimize formatting for better ATS parsing and readability',
     'grammar': 'Fix any grammar, spelling, or punctuation errors',
     'consistency': 'Ensure consistent formatting, dates, and style throughout'
   };

   const instruction = quickFixes[fixType] || quickFixes['formatting'];
   
   return await assistantService.applyResumeChanges(
     resumeId,
     instruction,
     'quick_fix'
   );
 },

 // ===================================================================
 // ERROR HANDLING & RETRY LOGIC
 // ===================================================================

 /**
  * Retry failed requests with exponential backoff
  */
 retryWithBackoff: async (operation, maxRetries = 3) => {
   let lastError;
   
   for (let attempt = 1; attempt <= maxRetries; attempt++) {
     try {
       return await operation();
     } catch (error) {
       lastError = error;
       
       if (attempt === maxRetries) {
         break;
       }
       
       // Don't retry on client errors (4xx)
       if (error.response?.status >= 400 && error.response?.status < 500) {
         break;
       }
       
       // Exponential backoff: 1s, 2s, 4s
       const delay = Math.pow(2, attempt - 1) * 1000;
       console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
       await new Promise(resolve => setTimeout(resolve, delay));
     }
   }
   
   throw lastError;
 },

 /**
  * Handle network errors gracefully
  */
 handleNetworkError: (error, operation) => {
   if (error.code === 'ECONNABORTED') {
     return {
       success: false,
       error: 'Request timed out. Please try again.',
       canRetry: true
     };
   }
   
   if (error.code === 'ECONNREFUSED') {
     return {
       success: false,
       error: 'Unable to connect to AI service. Please check your connection.',
       canRetry: true
     };
   }
   
   if (error.response?.status === 429) {
     return {
       success: false,
       error: 'Rate limit exceeded. Please wait a moment before trying again.',
       canRetry: true,
       retryAfter: error.response.headers['retry-after'] || 60
     };
   }
   
   return {
     success: false,
     error: `Failed to ${operation}. Please try again.`,
     canRetry: false
   };
 },

 // ===================================================================
 // ADVANCED RESUME FEATURES
 // ===================================================================

 /**
  * Compare resume versions
  */
 compareResumeVersions: async (resumeId, version1, version2) => {
   try {
     const response = await api.post('/assistant/resume/compare-versions', {
       resumeId,
       version1,
       version2
     });

     return response.data;

   } catch (error) {
     console.error('Error comparing resume versions:', error);
     throw error;
   }
 },

 /**
  * Generate resume metrics and insights
  */
 getResumeMetrics: async (resumeId) => {
   try {
     const response = await api.get(`/assistant/resume/${resumeId}/metrics`);
     return response.data;

   } catch (error) {
     console.error('Error getting resume metrics:', error);
     throw error;
   }
 },

 /**
  * Export resume in different formats
  */
 exportResume: async (resumeId, format = 'pdf', options = {}) => {
   try {
     const response = await api.post(`/assistant/resume/${resumeId}/export`, {
       format,
       options
     });

     return response.data;

   } catch (error) {
     console.error('Error exporting resume:', error);
     throw error;
   }
 },

 /**
  * Schedule resume review reminders
  */
 scheduleResumeReview: async (resumeId, reminderSettings) => {
   try {
     const response = await api.post(`/assistant/resume/${resumeId}/schedule-review`, {
       reminderSettings
     });

     return response.data;

   } catch (error) {
     console.error('Error scheduling resume review:', error);
     throw error;
   }
 },

 // ===================================================================
 // CONTEXTUAL HELPERS
 // ===================================================================

 /**
  * Get page-specific AI capabilities
  */
 getPageCapabilities: (page) => {
   const capabilities = {
     dashboard: [
       'career_overview',
       'progress_tracking',
       'goal_setting',
       'quick_insights'
     ],
     resumes: [
       'real_time_editing',
       'ats_optimization',
       'content_enhancement',
       'version_management',
       'comparative_analysis'
     ],
     jobs: [
       'job_matching',
       'resume_tailoring',
       'application_optimization',
       'cover_letter_generation'
     ],
     recruiters: [
       'outreach_personalization',
       'relationship_tracking',
       'message_optimization'
     ],
     applications: [
       'status_tracking',
       'follow_up_reminders',
       'interview_preparation'
     ]
   };

   return capabilities[page] || ['basic_chat', 'contextual_suggestions'];
 },

 /**
  * Get contextual AI prompts based on current state
  */
 getContextualPrompts: (context) => {
   const prompts = [];

   if (context?.currentResume) {
     const score = context.currentResume.score || 0;
     if (score < 70) {
       prompts.push({
         type: 'improvement',
         message: 'I notice your resume score could be improved. Would you like me to help optimize it?',
         action: 'optimize_resume'
       });
     }

     if (score >= 80) {
       prompts.push({
         type: 'congratulations',
         message: 'Great resume score! Want me to help you find jobs that match your profile?',
         action: 'find_jobs'
       });
     }
   }

   if (context?.page === 'jobs' && context?.currentJob) {
     prompts.push({
       type: 'matching',
       message: `Want me to check how well your resume matches "${context.currentJob.title}"?`,
       action: 'analyze_match'
     });
   }

   return prompts;
 },

 /**
  * Handle contextual AI suggestions
  */
 processContextualAction: async (action, context) => {
   try {
     switch (action) {
       case 'optimize_resume':
         if (context?.currentResume?.id) {
           return await assistantService.optimizeForATS(context.currentResume.id);
         }
         break;

       case 'find_jobs':
         return await assistantService.getContextualSuggestions('jobs', context);

       case 'analyze_match':
         if (context?.currentResume?.id && context?.currentJob?.id) {
           return await assistantService.analyzeJobMatch(
             context.currentResume.id,
             context.currentJob.id
           );
         }
         break;

       default:
         return { success: false, error: 'Unknown action' };
     }
   } catch (error) {
     console.error('Error processing contextual action:', error);
     throw error;
   }
 }
};

// ===================================================================
// HELPER FUNCTIONS (Outside of object for proper scoping)
// ===================================================================

/**
* Detect if message is a resume edit request - FIXED FUNCTION
*/
function detectResumeEditRequest(message, context) {
 if (context?.page !== 'resumes' || !context?.currentResume?.id) {
   return false;
 }

 const messageLower = message.toLowerCase();
 const editingKeywords = [
   'update', 'change', 'edit', 'modify', 'improve', 'enhance', 
   'add', 'remove', 'rewrite', 'fix', 'optimize', 'tailor'
 ];

 const hasEditingKeyword = editingKeywords.some(keyword => messageLower.includes(keyword));
 const hasResumeReference = messageLower.includes('resume') || 
                            messageLower.includes('cv') ||
                            messageLower.includes('experience') ||
                            messageLower.includes('work');

 return hasEditingKeyword && hasResumeReference;
}

/**
* Format error messages for user display
*/
function formatErrorMessage(error, context) {
 if (error.message?.includes('timeout')) {
   if (context?.page === 'resumes') {
     return 'Resume processing is taking longer than expected. Your changes may still be applying in the background.';
   }
   return 'The request is taking longer than usual. Please try again.';
 }

 if (error.response?.status === 429) {
   return 'Too many requests. Please wait a moment before trying again.';
 }

 if (error.response?.status === 503) {
   return 'AI service is temporarily unavailable. Please try again in a few moments.';
 }

 return error.message || 'An unexpected error occurred. Please try again.';
}

/**
* Validate context data for AI requests
*/
function validateContext(context) {
 const validContext = {
   page: context?.page || 'unknown',
   currentResume: null,
   currentJob: null,
   resumeCount: 0,
   jobCount: 0,
   userProfile: null
 };

 if (context?.currentResume && context.currentResume.id) {
   validContext.currentResume = {
     id: context.currentResume.id,
     name: context.currentResume.name || 'Resume',
     score: context.currentResume.score || 0
   };
 }

 if (context?.currentJob && context.currentJob.id) {
   validContext.currentJob = {
     id: context.currentJob.id,
     title: context.currentJob.title || 'Job',
     company: context.currentJob.company || 'Company'
   };
 }

 validContext.resumeCount = Number(context?.resumeCount) || 0;
 validContext.jobCount = Number(context?.jobCount) || 0;

 if (context?.userProfile) {
   validContext.userProfile = {
     name: context.userProfile.name || 'User',
     email: context.userProfile.email || ''
   };
 }

 return validContext;
}

export default assistantService;