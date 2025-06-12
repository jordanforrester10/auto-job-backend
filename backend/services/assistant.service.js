// src/utils/assistantService.js - ENHANCED WITH MEMORY & CONVERSATIONS
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
      });

      return {
        message: response.data.message,
        suggestions: response.data.suggestions || [],
        actions: response.data.actions || [],
        confidence: response.data.confidence || 0.8,
        conversationId: response.data.conversationId,
        conversationTitle: response.data.conversationTitle,
        memoryInsights: response.data.memoryInsights || [],
        usage: response.data.usage || {}
      };

    } catch (error) {
      console.error('Enhanced AI Assistant Service Error:', error);
      
      // Enhanced fallback responses based on context
      const fallbackResponse = this.getContextualFallback(requestData.message, requestData.context);
      
      if (error.response?.status === 503) {
        throw new Error('AI service temporarily unavailable. Please try again in a moment.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before sending another message.');
      } else {
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
      throw error;
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
  // ENHANCED RESUME OPERATIONS
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
  applyResumeChanges: async (changes) => {
    try {
      const response = await api.post('/assistant/apply-resume-changes', {
        resumeId: changes.resumeId,
        changes: changes.modifications,
        changeType: changes.type || 'enhancement'
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
      });

      return response.data;

    } catch (error) {
      console.error('Error optimizing for ATS:', error);
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
      return this.getFallbackSuggestions(page, contextData);
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
      return this.getFallbackTips(category);
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
        memoriesStored: 0
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
      typeLabel: this.getMemoryTypeLabel(memory.type),
      categoryLabel: this.getCategoryLabel(memory.category)
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
    const lowercaseMessage = message.toLowerCase();

    // Resume-related queries
    if (lowercaseMessage.includes('resume') || lowercaseMessage.includes('cv')) {
      if (context?.page === 'resumes' && context?.currentResume) {
        return {
          message: `I can see you're working on "${context.currentResume.name}". While I can't access my full AI capabilities right now, I suggest focusing on: quantifying achievements with metrics, using action verbs, and ensuring ATS compatibility. I remember our previous discussions about your career goals and can provide personalized suggestions once I'm back online.`,
          suggestions: [
            'Help improve work experience section',
            'Suggest better action verbs',
            'Check ATS compatibility',
            'Add missing skills based on your profile'
          ]
        };
      }
      return {
        message: "I'd love to help improve your resume! I remember our previous conversations about your career goals and preferences. Common improvements include quantifying achievements, using strong action verbs, optimizing for ATS systems, and tailoring to specific jobs. Which resume would you like to work on?",
        suggestions: [
          'Analyze my best resume',
          'Create new resume',
          'Compare my resumes',
          'ATS optimization tips'
        ]
      };
    }

    // Job-related queries
    if (lowercaseMessage.includes('job') || lowercaseMessage.includes('application') || lowercaseMessage.includes('interview')) {
      if (context?.page === 'jobs' && context?.currentJob) {
        return {
          message: `Looking at "${context.currentJob.title}" at ${context.currentJob.company}. Based on what I remember about your background and preferences, I can help you understand how well your resume matches this position and suggest improvements to increase your chances.`,
          suggestions: [
            'Match my best resume to this job',
            'What skills am I missing?',
            'Help tailor my resume',
            'Write a personalized cover letter'
          ]
        };
      }
      return {
        message: "I can help you with job searching, application optimization, and interview preparation! I remember your career goals and can provide personalized advice. What specific aspect would you like assistance with?",
        suggestions: [
          'Find matching jobs for my profile',
          'Improve application materials',
          'Interview preparation tips',
          'Salary negotiation advice'
        ]
      };
    }

    // Career guidance queries
    if (lowercaseMessage.includes('career') || lowercaseMessage.includes('advice') || lowercaseMessage.includes('guidance')) {
      return {
        message: "I'm here to provide personalized career guidance! I remember our previous conversations about your goals and challenges. I can help with career planning, skill development, industry insights, and strategic job search approaches. What's your biggest career challenge right now?",
        suggestions: [
          'Plan my next career move',
          'Identify skill gaps for my goals',
          'Industry insights for my field',
          'Job search strategy review'
        ]
      };
    }

    // Memory-related queries
    if (lowercaseMessage.includes('remember') || lowercaseMessage.includes('memory') || lowercaseMessage.includes('previous')) {
      return {
        message: "I maintain a memory of our conversations to provide better assistance! I remember your preferences, goals, and career journey. While I'm currently in test mode, I can still access some of our conversation history and provide personalized advice.",
        suggestions: [
          'Show my conversation history',
          'What do you remember about me?',
          'Review my career progress',
          'Update my preferences'
        ]
      };
    }

    // Default fallback
    return {
      message: "I'm currently running in test mode while my full AI capabilities are being set up, but I can still access our conversation history and provide personalized career advice. I remember your goals and preferences from our previous discussions. What would you like to explore?",
      suggestions: [
        'Review my career progress',
        'Resume improvement tips',
        'Job search strategy',
        'Show conversation history'
      ],
      error: 'AI service temporarily in test mode'
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
        'Show my conversation history'
      ],
      resumes: [
        'Improve this resume with memory context',
        'Check ATS compatibility',
        'Compare with other resumes',
        'Add missing keywords for my goals'
      ],
      jobs: [
        'Match resume to this job',
        'Find similar positions for my profile',
        'Improve match score',
        'Create tailored resume version'
      ],
      'ai-searches': [
        'Optimize search criteria for my goals',
        'Review found opportunities',
        'Adjust search parameters',
        'Set up new automated searches'
      ]
    };

    return suggestions[page] || [
      'Help with resume using my profile',
      'Find job opportunities that match me',
      'Career guidance based on my goals',
      'Review my conversation history'
    ];
  },

  /**
   * Get fallback tips based on category
   */
  getFallbackTips: (category) => {
    const fallbackTips = {
      resume: [
        'Use action verbs to start each bullet point',
        'Quantify achievements with specific numbers',
        'Tailor keywords to match job descriptions',
        'Keep formatting clean and ATS-friendly',
        'Highlight achievements relevant to your career goals'
      ],
      job_search: [
        'Apply to jobs within 24-48 hours of posting',
        'Customize your resume for each application',
        'Research company culture before applying',
        'Follow up professionally after 1-2 weeks',
        'Leverage your network for referrals'
      ],
      career: [
        'Set SMART career goals every quarter',
        'Build your professional network consistently',
        'Stay updated with industry trends',
        'Invest in learning new skills regularly',
        'Seek feedback and mentorship opportunities'
      ],
      interview: [
        'Practice common interview questions',
        'Research the company and role thoroughly',
        'Prepare specific examples using STAR method',
        'Ask thoughtful questions about the role',
        'Follow up with a thank-you message'
      ],
      general: [
        'Keep your LinkedIn profile updated',
        'Track your job applications systematically',
        'Practice interviewing regularly',
        'Maintain a professional online presence',
        'Document your achievements for future reference'
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

    // Clean up common AI response artifacts
    let formatted = response
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*(.*?)\*/g, '$1')     // Remove markdown italic
      .replace(/\n\n+/g, '\n\n')      // Normalize line breaks
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
      const analytics = await this.getAnalytics('30d');
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
  }
};

export default assistantService;