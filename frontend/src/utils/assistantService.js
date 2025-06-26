// src/utils/assistantService.js - FIXED VERSION WITH WORKING DELETE
import api from './axios';

const assistantService = {
  // ===================================================================
  // 🆕 RAG: @-MENTION FUNCTIONALITY 
  // ===================================================================

  /**
   * Get mention suggestions for @-functionality (RAG)
   */
  getMentionSuggestions: async (query = '') => {
    try {
      console.log('🔍 Loading mention suggestions for:', query);
      
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      
      const response = await api.get(`/assistant/mention-suggestions?${params}`, {
        timeout: 10000
      });
      
      const results = response.data;
      
      console.log('✅ Mention suggestions loaded:', {
        resumes: results.resumes?.length || 0,
        jobs: results.jobs?.length || 0
      });
      
      return {
        resumes: results.resumes || [],
        jobs: results.jobs || []
      };

    } catch (error) {
      console.error('Failed to load mention suggestions:', error);
      return { resumes: [], jobs: [] };
    }
  },

  /**
   * Get full context data for mentioned item (RAG)
   */
  getContextData: async (type, id) => {
    try {
      console.log('📄 Loading context data for:', type, id);
      
      const response = await api.get(`/assistant/context-data/${type}/${id}`, {
        timeout: 15000
      });
      
      console.log('✅ Context data loaded for:', type);
      return response.data;

    } catch (error) {
      console.error('Failed to load context data:', error);
      throw error;
    }
  },

  // ===================================================================
  // ENHANCED CHAT WITH RAG CONTEXT
  // ===================================================================

  /**
   * Send message to AI Assistant with RAG context
   */
  sendMessage: async (requestData) => {
    try {
      const {
        message,
        context = {},
        conversationId,
        newConversation = false
      } = requestData;

      console.log('🚀 RAG AI Request:', { 
        message: message.substring(0, 30) + '...', 
        conversationId, 
        newConversation,
        hasAttachedResumes: context.attachedResumes?.length > 0,
        hasAttachedJobs: context.attachedJobs?.length > 0
      });

      // 🆕 Enhanced context with RAG data
      const ragContext = {
        page: context.page || 'unknown',
        conversationId: context.conversationId,
        // RAG: Include full attached resume/job data
        attachedResumes: context.attachedResumes || [],
        attachedJobs: context.attachedJobs || [],
        // Legacy context support
        currentResume: context.currentResume || null,
        currentJob: context.currentJob || null
      };

      const response = await api.post('/assistant/chat', {
        message,
        context: ragContext,
        conversationId,
        newConversation
      }, {
        timeout: 60000 // Extended timeout for RAG processing
      });

      console.log('✅ RAG AI Response received:', {
        duration: response.data.performance?.totalDuration || 'unknown',
        hasContextualSuggestions: response.data.suggestions?.length > 0
      });

      return {
        message: response.data.message,
        suggestions: response.data.suggestions || [],
        actions: response.data.actions || [],
        confidence: response.data.confidence || 0.8,
        conversationId: response.data.conversationId,
        conversationTitle: response.data.conversationTitle,
        usage: response.data.usage || {},
        performance: response.data.performance || {},
        // Resume update data
        resumeUpdated: response.data.resumeUpdated || false,
        newAnalysis: response.data.newAnalysis || null,
        resumeChanges: response.data.resumeChanges || null,
        // RAG metadata
        contextUsed: response.data.contextUsed || false,
        ragInsights: response.data.ragInsights || null
      };

    } catch (error) {
      console.error('🔥 RAG AI Service Error:', error);
      
      // Enhanced error handling for RAG requests
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        const hasContext = requestData.context?.attachedResumes?.length > 0 || 
                          requestData.context?.attachedJobs?.length > 0;
        
        if (hasContext) {
          throw new Error('Processing your request with the attached context is taking longer than expected. Please try a more specific question.');
        } else {
          throw new Error('AI response took longer than expected. Please try a shorter message.');
        }
      } else if (error.response?.status === 503) {
        throw new Error('AI service temporarily busy. Please try again in a moment.');
      } else if (error.response?.status === 429) {
        throw new Error('Too many requests. Please wait 30 seconds before trying again.');
      } else {
        const fallbackMessage = requestData.context?.attachedResumes?.length > 0 
          ? 'I can help with resume analysis, but I\'m experiencing connectivity issues. Please try again.'
          : requestData.context?.attachedJobs?.length > 0
          ? 'I can help with job analysis, but I\'m experiencing connectivity issues. Please try again.'
          : 'AI service temporarily unavailable. Please try again.';
        throw new Error(fallbackMessage);
      }
    }
  },

  // ===================================================================
  // CONVERSATION MANAGEMENT (unchanged)
  // ===================================================================

  getConversations: async (options = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (options.limit) params.append('limit', Math.min(options.limit, 20));
      if (options.offset) params.append('offset', options.offset);
      params.append('sortBy', 'lastActiveAt');

      const response = await api.get(`/assistant/conversations?${params}`, {
        timeout: 15000
      });
      
      return response.data;

    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Return cached data if available
      try {
        const cached = localStorage.getItem('conversations_cache');
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (Date.now() - parsedCache.timestamp < 5 * 60 * 1000) {
            console.log('📋 Using cached conversations due to error');
            return parsedCache.data;
          }
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError);
      }
      throw error;
    }
  },

  getConversation: async (conversationId) => {
    try {
      const response = await api.get(`/assistant/conversations/${conversationId}`, {
        timeout: 10000
      });
      
      // Cache the conversation for faster access
      try {
        const cacheKey = `conversation_${conversationId}`;
        localStorage.setItem(cacheKey, JSON.stringify({
          data: response.data.conversation,
          timestamp: Date.now()
        }));
      } catch (cacheError) {
        console.warn('Failed to cache conversation:', cacheError);
      }
      
      return response.data.conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      
      // Try cache fallback
      try {
        const cacheKey = `conversation_${conversationId}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsedCache = JSON.parse(cached);
          if (Date.now() - parsedCache.timestamp < 10 * 60 * 1000) {
            console.log('📋 Using cached conversation due to error');
            return parsedCache.data;
          }
        }
      } catch (cacheError) {
        console.warn('Cache retrieval failed:', cacheError);
      }
      
      throw error;
    }
  },

  updateConversation: async (conversationId, updates) => {
    try {
      const response = await api.put(`/assistant/conversations/${conversationId}`, updates, {
        timeout: 5000
      });
      
      // Clear cached conversation
      try {
        localStorage.removeItem(`conversation_${conversationId}`);
      } catch (e) {}
      
      return response.data.conversation;
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
  },

  /**
   * Delete a conversation - FIXED VERSION
   */
  deleteConversation: async (conversationId, permanent = false) => {
    console.log('🌐 assistantService.deleteConversation called:', {
      conversationId,
      permanent,
      baseURL: api.defaults.baseURL
    });

    try {
      // Validate input
      if (!conversationId) {
        throw new Error('Conversation ID is required for deletion');
      }

      // Make API call
      console.log('📡 Making DELETE request to:', `/assistant/conversations/${conversationId}`);
      
      const response = await api.delete(`/assistant/conversations/${conversationId}`, {
        params: { permanent: permanent.toString() },
        timeout: 10000 // 10 second timeout
      });

      console.log('✅ Delete conversation API response:', {
        status: response.status,
        data: response.data
      });

      // Handle the response
      if (response.data && response.data.success !== false) {
        // Clear cached conversation
        try {
          localStorage.removeItem(`conversation_${conversationId}`);
          // Also clear conversations cache to force refresh
          const cacheKeys = Object.keys(localStorage);
          cacheKeys.forEach(key => {
            if (key.includes('conversations_cache')) {
              localStorage.removeItem(key);
            }
          });
        } catch (e) {
          console.warn('Failed to clear cache:', e);
        }

        return {
          success: true,
          message: response.data.message || 'Conversation deleted successfully',
          data: response.data
        };
      } else {
        throw new Error(response.data?.error || 'Failed to delete conversation');
      }

    } catch (error) {
      console.error('❌ assistantService.deleteConversation error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        conversationId
      });

      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const errorMessage = error.response.data?.error || error.response.data?.message || 'Unknown server error';
        
        switch (status) {
          case 404:
            throw new Error('Conversation not found - it may have already been deleted');
          case 403:
            throw new Error('You do not have permission to delete this conversation');
          case 401:
            throw new Error('Authentication required - please log in again');
          case 500:
            throw new Error('Server error occurred while deleting conversation');
          default:
            throw new Error(`Server error (${status}): ${errorMessage}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out - please check your connection and try again');
      } else if (error.request) {
        throw new Error('Network error - please check your connection and try again');
      } else {
        throw new Error(`Request setup error: ${error.message}`);
      }
    }
  },

  // ===================================================================
  // 🆕 ENHANCED RESUME OPERATIONS WITH RAG
  // ===================================================================

  /**
   * Analyze resume with enhanced context
   */
  analyzeResume: async (resumeId, contextData = {}) => {
    try {
      const response = await api.post('/assistant/analyze-resume', {
        resumeId,
        context: contextData
      }, {
        timeout: 30000
      });

      return response.data;

    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  },

  /**
   * Apply resume changes with context
   */
  applyResumeChanges: async (resumeId, changes, contextData = {}) => {
    try {
      const response = await api.post('/assistant/apply-resume-changes', {
        resumeId,
        changes,
        context: contextData
      }, {
        timeout: 45000
      });

      return response.data;

    } catch (error) {
      console.error('Error applying resume changes:', error);
      throw error;
    }
  },

  /**
   * Optimize resume for ATS with job context
   */
  optimizeForATS: async (resumeId, targetJobData = null) => {
    try {
      const response = await api.post('/assistant/optimize-ats', {
        resumeId,
        targetJob: targetJobData
      }, {
        timeout: 45000
      });

      return response.data;

    } catch (error) {
      console.error('Error optimizing for ATS:', error);
      throw error;
    }
  },

  // ===================================================================
  // 🆕 JOB ANALYSIS WITH RAG
  // ===================================================================

  /**
   * Analyze job posting with resume context
   */
  analyzeJobMatch: async (jobId, resumeData = null) => {
    try {
      const response = await api.post('/assistant/analyze-job-match', {
        jobId,
        resume: resumeData
      }, {
        timeout: 30000
      });

      return response.data;

    } catch (error) {
      console.error('Error analyzing job match:', error);
      throw error;
    }
  },

  /**
   * Generate cover letter with full context
   */
  generateCoverLetter: async (resumeData, jobData, customizations = {}) => {
    try {
      const response = await api.post('/assistant/generate-cover-letter', {
        resume: resumeData,
        job: jobData,
        customizations
      }, {
        timeout: 30000
      });

      return response.data;

    } catch (error) {
      console.error('Error generating cover letter:', error);
      throw error;
    }
  },

  // ===================================================================
  // SEARCH & SYSTEM (updated)
  // ===================================================================

  /**
   * Search with enhanced filtering
   */
  search: async (query, options = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('query', query);
      if (options.limit) params.append('limit', Math.min(options.limit, 10));
      if (options.type) params.append('type', options.type);

      const response = await api.get(`/assistant/search?${params}`, {
        timeout: 10000
      });
      return response.data.results;

    } catch (error) {
      console.error('Error searching:', error);
      return { conversations: [], results: [] };
    }
  },

  /**
   * Check AI Assistant health
   */
  checkHealth: async () => {
    try {
      const response = await api.get('/assistant/health', {
        timeout: 5000
      });
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
   * Get AI capabilities (updated for RAG)
   */
  getCapabilities: async () => {
    try {
      const response = await api.get('/assistant/capabilities', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('Error getting AI capabilities:', error);
      return {
        available: false,
        features: ['basic_chat', 'rag_context'],
        limitations: ['Service unavailable'],
        performance: {
          optimized: false,
          ragEnabled: false
        }
      };
    }
  },

  // ===================================================================
  // UTILITY FUNCTIONS (enhanced)
  // ===================================================================

  /**
   * Validate message before sending (updated)
   */
  validateMessage: (message) => {
    if (!message || typeof message !== 'string') {
      return { valid: false, error: 'Message must be a non-empty string' };
    }

    if (message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 3000) { // Increased limit for RAG context
      return { valid: false, error: 'Message too long (max 3000 characters)' };
    }

    return { valid: true };
  },

  /**
   * Format AI response for display (enhanced)
   */
  formatResponse: (response) => {
    if (!response || typeof response !== 'string') {
      return 'I encountered an issue processing that request. Please try again.';
    }

    // Enhanced formatting for RAG responses
    let formatted = response
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .trim();

    return formatted;
  },

  /**
   * Check if AI service is available
   */
  isAvailable: async () => {
    try {
      const health = await assistantService.checkHealth();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  },

  /**
   * Get contextual suggestions based on attached items (RAG)
   */
  getContextualSuggestions: (attachedResumes = [], attachedJobs = []) => {
    const hasResume = attachedResumes.length > 0;
    const hasJob = attachedJobs.length > 0;

    if (hasResume && hasJob) {
      return [
        'How well do I match this job?',
        'Tailor my resume for this role',
        'Generate interview questions',
        'Write a cover letter',
        'What skills am I missing?'
      ];
    }
    
    if (hasResume) {
      return [
        'Improve this resume',
        'Optimize for ATS',
        'Add missing skills',
        'Enhance work experience',
        'Check keyword optimization'
      ];
    }
    
    if (hasJob) {
      return [
        'Analyze this job posting',
        'What skills are required?',
        'Research the company',
        'Interview preparation tips',
        'Salary expectations'
      ];
    }

    return [
      'Help improve my resume',
      'Find job opportunities', 
      'Career guidance',
      'Interview preparation'
    ];
  },

  /**
   * Get fallback suggestions for errors
   */
  getFallbackSuggestions: (attachedResumes = [], attachedJobs = []) => {
    return assistantService.getContextualSuggestions(attachedResumes, attachedJobs);
  },

  /**
   * Get contextual fallback message (enhanced for RAG)
   */
  getContextualFallback: (message, attachedResumes = [], attachedJobs = []) => {
    const messageLower = message?.toLowerCase() || '';
    const hasResume = attachedResumes.length > 0;
    const hasJob = attachedJobs.length > 0;

    if (hasResume && hasJob) {
      return {
        message: `I can help you analyze how well your resume "${attachedResumes[0].name}" matches the "${attachedJobs[0].title}" position. What would you like me to focus on?`,
        suggestions: assistantService.getContextualSuggestions(attachedResumes, attachedJobs)
      };
    }

    if (hasResume) {
      return {
        message: `I can help improve your resume "${attachedResumes[0].name}"! I can edit content, optimize for ATS, and provide suggestions. What would you like me to help with?`,
        suggestions: assistantService.getContextualSuggestions(attachedResumes, attachedJobs)
      };
    }

    if (hasJob) {
      return {
        message: `I can help you with the "${attachedJobs[0].title}" position at ${attachedJobs[0].company}. What specific analysis would you like?`,
        suggestions: assistantService.getContextualSuggestions(attachedResumes, attachedJobs)
      };
    }

    if (messageLower.includes('resume')) {
      return {
        message: "I can help improve your resume! Use @ to select a specific resume for detailed assistance.",
        suggestions: [
          'Type @ to select a resume',
          'Upload a new resume',
          'Resume optimization tips',
          'ATS best practices'
        ]
      };
    }

    if (messageLower.includes('job')) {
      return {
        message: "I can help with job applications and matching! Use @ to select a specific job for analysis.",
        suggestions: [
          'Type @ to select a job',
          'Job search strategies',
          'Interview preparation',
          'Application tips'
        ]
      };
    }

    return {
      message: "I'm here to help with your career! Use @ to reference specific resumes or jobs for contextual assistance.",
      suggestions: [
        'Type @ to add context',
        'Improve my resume',
        'Find job opportunities',
        'Career advice'
      ]
    };
  },

  /**
   * Clear cached data (enhanced for RAG)
   */
  clearCache: () => {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('conversation_') || 
            key.includes('conversations_cache') ||
            key.includes('ai_contexts_') ||
            key.includes('mention_cache_') ||
            key.includes('context_data_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('🧹 AI Assistant cache cleared (RAG mode)');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  },

  /**
   * Estimate tokens for message with context (enhanced)
   */
  estimateTokens: (text, contextData = {}) => {
    let baseTokens = Math.ceil(text.length / 4);
    
    // Add tokens for attached context
    if (contextData.attachedResumes?.length > 0) {
      baseTokens += 500; // Estimate for resume context
    }
    if (contextData.attachedJobs?.length > 0) {
      baseTokens += 300; // Estimate for job context
    }
    
    return baseTokens;
  }
};

export default assistantService;