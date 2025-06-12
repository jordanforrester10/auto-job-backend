// frontend/src/utils/recruiterService.js - COMPLETE UPDATED VERSION
import api from './axios';

const recruiterService = {
  // ===================================================================
  // RECRUITER SEARCH & DISCOVERY
  // ===================================================================

  /**
   * Search recruiters with advanced filtering
   */
  searchRecruiters: async (filters = {}) => {
    try {
      const {
        query = '',
        company = '',
        industry = '',
        location = '',
        title = '',
        experienceMin = '',
        experienceMax = '',
        experience_min = '', // Support both formats
        experience_max = '', // Support both formats
        limit = 20,
        offset = 0,
        sortBy = 'last_active_date',
        sortOrder = 'DESC',
        sort_by = '', // Support both formats
        sort_order = '' // Support both formats
      } = filters;

      console.log('🔍 Searching recruiters with filters:', filters);

      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (company) params.append('company', company);
      if (industry) params.append('industry', industry);
      if (location) params.append('location', location);
      if (title) params.append('title', title);
      if (experienceMin || experience_min) params.append('experience_min', experienceMin || experience_min);
      if (experienceMax || experience_max) params.append('experience_max', experienceMax || experience_max);
      params.append('limit', limit);
      params.append('offset', offset);
      params.append('sort_by', sort_by || sortBy);
      params.append('sort_order', sort_order || sortOrder);

      const response = await api.get(`/recruiters/search?${params}`);
      
      console.log(`✅ Found ${response.data.recruiters.length} recruiters`);
      return response.data;

    } catch (error) {
      console.error('Search recruiters error:', error);
      throw error;
    }
  },

  /**
   * Get recruiter details by ID
   */
  getRecruiterDetails: async (recruiterId) => {
    try {
      console.log(`👤 Fetching details for recruiter ${recruiterId}`);
      const response = await api.get(`/recruiters/${recruiterId}`);
      
      console.log(`✅ Retrieved recruiter: ${response.data.recruiter.fullName}`);
      return response.data;

    } catch (error) {
      console.error('Get recruiter details error:', error);
      throw error;
    }
  },

  // Alias for compatibility with components
  getRecruiterById: async (recruiterId) => {
    return await recruiterService.getRecruiterDetails(recruiterId);
  },

  /**
   * Get filter options for search
   */
  getFilterOptions: async () => {
    try {
      console.log('📊 Fetching filter options');
      const response = await api.get('/recruiters/filters');
      
      console.log('✅ Retrieved filter options');
      return response.data;

    } catch (error) {
      console.error('Get filter options error:', error);
      throw error;
    }
  },

  // ===================================================================
  // OUTREACH MANAGEMENT
  // ===================================================================

  /**
   * Create outreach campaign
   */
  createOutreach: async (outreachData) => {
    try {
      const {
        recruiterId,
        jobId,
        messageContent,
        messageTemplate,
        sentVia = 'linkedin',
        customizations = []
      } = outreachData;

      console.log(`📧 Creating outreach for recruiter ${recruiterId}`);

      const response = await api.post('/recruiters/outreach', {
        recruiterId,
        jobId,
        messageContent,
        messageTemplate,
        sentVia,
        customizations
      });

      console.log(`✅ Created outreach campaign: ${response.data.outreach.id}`);
      return response.data;

    } catch (error) {
      console.error('Create outreach error:', error);
      throw error;
    }
  },

  /**
   * Update outreach campaign
   */
  updateOutreach: async (outreachId, updates) => {
    try {
      console.log(`📝 Updating outreach ${outreachId}`);
      const response = await api.put(`/recruiters/outreach/${outreachId}`, updates);
      
      console.log('✅ Outreach updated successfully');
      return response.data;

    } catch (error) {
      console.error('Update outreach error:', error);
      throw error;
    }
  },

  /**
   * Delete outreach campaign
   */
  deleteOutreach: async (outreachId) => {
    try {
      console.log(`🗑️ Deleting outreach ${outreachId}`);
      const response = await api.delete(`/recruiters/outreach/${outreachId}`);
      
      console.log('✅ Outreach deleted successfully');
      return response.data;

    } catch (error) {
      console.error('Delete outreach error:', error);
      throw error;
    }
  },

  /**
   * Send outreach message
   */
  sendOutreach: async (outreachId) => {
    try {
      console.log(`📤 Sending outreach ${outreachId}`);
      const response = await api.put(`/recruiters/outreach/${outreachId}/send`);
      
      console.log('✅ Outreach sent successfully');
      return response.data;

    } catch (error) {
      console.error('Send outreach error:', error);
      throw error;
    }
  },

  /**
   * Get user's outreach campaigns
   */
  getUserOutreach: async (filters = {}) => {
    try {
      const {
        status = '',
        limit = 20,
        offset = 0
      } = filters;

      console.log('📋 Fetching user outreach campaigns');

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', limit);
      params.append('offset', offset);

      const response = await api.get(`/recruiters/outreach?${params}`);
      
      console.log(`✅ Retrieved ${response.data.outreaches.length} outreach campaigns`);
      return response.data;

    } catch (error) {
      console.error('Get user outreach error:', error);
      throw error;
    }
  },

  // ===================================================================
  // AI-POWERED FEATURES
  // ===================================================================

  /**
   * Generate personalized message using AI
   */
  generatePersonalizedMessage: async (messageParams) => {
    try {
      const {
        recruiterId,
        resumeId,
        jobId,
        messageType = 'introduction',
        tone = 'professional',
        customRequirements = ''
      } = messageParams;

      console.log(`🤖 Generating personalized message for recruiter ${recruiterId}`);

      const response = await api.post('/recruiters/generate-message', {
        recruiterId,
        resumeId,
        jobId,
        messageType,
        tone,
        customRequirements
      });

      console.log(`✅ Generated ${response.data.message.length} character message`);
      return response.data;

    } catch (error) {
      console.error('Generate message error:', error);
      throw error;
    }
  },

  // ===================================================================
  // ANALYTICS & REPORTING
  // ===================================================================

  /**
   * Get outreach analytics
   */
  getAnalytics: async (timeframe = '30d') => {
    try {
      console.log(`📊 Fetching outreach analytics for ${timeframe}`);
      const response = await api.get(`/recruiters/analytics?timeframe=${timeframe}`);
      
      console.log('✅ Retrieved outreach analytics');
      
      // Ensure consistent response format
      if (response.data.analytics) {
        return response.data;
      } else {
        return { analytics: response.data };
      }

    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  },

  // ===================================================================
  // UTILITY FUNCTIONS
  // ===================================================================

  /**
   * Format recruiter data for display
   */
  formatRecruiterForDisplay: (recruiter) => {
    if (!recruiter) return null;

    return {
      ...recruiter,
      displayName: recruiter.fullName || `${recruiter.firstName} ${recruiter.lastName}`,
      companyDisplay: recruiter.company?.name || 'Unknown Company',
      locationDisplay: recruiter.location ? 
        `${recruiter.location.city || ''}${recruiter.location.state ? `, ${recruiter.location.state}` : ''}${recruiter.location.country ? `, ${recruiter.location.country}` : ''}`.replace(/^, /, '') :
        'Location not specified',
      experienceDisplay: recruiter.experienceYears ? 
        `${recruiter.experienceYears} year${recruiter.experienceYears !== 1 ? 's' : ''} experience` :
        'Experience not specified',
      lastActiveDisplay: recruiter.lastActiveDate ? 
        new Date(recruiter.lastActiveDate).toLocaleDateString() :
        'Last active not specified',
      hasContactInfo: !!(recruiter.email || recruiter.phone || recruiter.linkedinUrl),
      hasBeenContacted: recruiter.outreach?.hasContacted || false,
      outreachStatus: recruiter.outreach?.status || 'not_contacted'
    };
  },

  /**
   * Format outreach campaign for display
   */
  formatOutreachForDisplay: (outreach) => {
    if (!outreach) return null;

    return {
      ...outreach,
      recruiterDisplay: outreach.recruiter?.name || 'Unknown Recruiter',
      companyDisplay: outreach.recruiter?.company?.name || 'Unknown Company',
      statusDisplay: outreach.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      createdDisplay: new Date(outreach.createdAt).toLocaleDateString(),
      sentDisplay: outreach.sentAt ? new Date(outreach.sentAt).toLocaleDateString() : null,
      messagePreview: outreach.messageContent.length > 100 ? 
        outreach.messageContent.substring(0, 100) + '...' :
        outreach.messageContent,
      canSend: outreach.status === 'drafted',
      canEdit: outreach.status === 'drafted',
      hasReplies: outreach.repliesCount > 0,
      hasFollowUps: outreach.followUpsCount > 0
    };
  },

  /**
   * Validate outreach data before sending
   */
  validateOutreachData: (outreachData) => {
    const errors = [];

    if (!outreachData.recruiterId) {
      errors.push('Recruiter selection is required');
    }

    if (!outreachData.messageContent || outreachData.messageContent.trim().length < 10) {
      errors.push('Message content must be at least 10 characters');
    }

    if (outreachData.messageContent && outreachData.messageContent.length > 2000) {
      errors.push('Message content must be less than 2000 characters');
    }

    if (!['email', 'linkedin', 'phone', 'other'].includes(outreachData.sentVia)) {
      errors.push('Invalid communication method');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Get default message templates
   */
  getMessageTemplates: () => {
    return {
      introduction: {
        name: 'Introduction',
        description: 'Initial outreach to introduce yourself',
        defaultTone: 'professional',
        suggestedLength: '150-250 words'
      },
      follow_up: {
        name: 'Follow Up',
        description: 'Follow up on previous communication',
        defaultTone: 'friendly',
        suggestedLength: '100-200 words'
      },
      application: {
        name: 'Job Application',
        description: 'Express interest in a specific position',
        defaultTone: 'professional',
        suggestedLength: '200-300 words'
      },
      thank_you: {
        name: 'Thank You',
        description: 'Thank recruiter for their time or assistance',
        defaultTone: 'grateful',
        suggestedLength: '75-150 words'
      }
    };
  },

  /**
   * Get available tone options
   */
  getToneOptions: () => {
    return [
      { value: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
      { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
      { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
      { value: 'formal', label: 'Formal', description: 'Very structured and traditional' }
    ];
  },

  /**
   * Get experience level filters
   */
  getExperienceLevels: () => {
    return [
      { value: '0-2', label: '0-2 years', min: 0, max: 2 },
      { value: '3-5', label: '3-5 years', min: 3, max: 5 },
      { value: '6-10', label: '6-10 years', min: 6, max: 10 },
      { value: '11-15', label: '11-15 years', min: 11, max: 15 },
      { value: '16+', label: '16+ years', min: 16, max: 50 }
    ];
  },

  /**
   * Calculate outreach success metrics
   */
  calculateSuccessMetrics: (outreaches) => {
    if (!outreaches || outreaches.length === 0) {
      return {
        totalSent: 0,
        responseRate: 0,
        averageResponseTime: 0,
        topPerformingTemplate: null,
        engagementScore: 0
      };
    }

    const sent = outreaches.filter(o => ['sent', 'delivered', 'opened', 'replied'].includes(o.status));
    const replied = outreaches.filter(o => o.status === 'replied');
    
    const responseRate = sent.length > 0 ? (replied.length / sent.length) * 100 : 0;
    
    // Calculate template performance
    const templateStats = {};
    outreaches.forEach(outreach => {
      const template = outreach.messageTemplate || 'custom';
      if (!templateStats[template]) {
        templateStats[template] = { total: 0, replied: 0 };
      }
      templateStats[template].total++;
      if (outreach.status === 'replied') {
        templateStats[template].replied++;
      }
    });

    const topTemplate = Object.entries(templateStats)
      .map(([template, stats]) => ({
        template,
        responseRate: stats.total > 0 ? (stats.replied / stats.total) * 100 : 0,
        total: stats.total
      }))
      .sort((a, b) => b.responseRate - a.responseRate)[0];

    return {
      totalSent: sent.length,
      totalReplies: replied.length,
      responseRate: Math.round(responseRate * 100) / 100,
      topPerformingTemplate: topTemplate?.template || null,
      topPerformingRate: topTemplate?.responseRate || 0,
      engagementScore: Math.round(responseRate * 2) // Simple engagement calculation
    };
  },

  /**
   * Export outreach data for external use
   */
  exportOutreachData: async (format = 'csv', filters = {}) => {
    try {
      console.log(`📤 Exporting outreach data in ${format} format`);
      
      const outreachData = await recruiterService.getUserOutreach({
        ...filters,
        limit: 1000 // Get all data for export
      });

      if (format === 'csv') {
        return recruiterService.convertToCSV(outreachData.outreaches);
      } else if (format === 'json') {
        return JSON.stringify(outreachData.outreaches, null, 2);
      }

      throw new Error('Unsupported export format');

    } catch (error) {
      console.error('Export outreach data error:', error);
      throw error;
    }
  },

  /**
   * Convert outreach data to CSV format
   */
  convertToCSV: (outreaches) => {
    if (!outreaches || outreaches.length === 0) {
      return 'No data to export';
    }

    const headers = [
      'Recruiter Name',
      'Company',
      'Email',
      'Status',
      'Message Type',
      'Sent Via',
      'Created Date',
      'Sent Date',
      'Replies Count',
      'Message Preview'
    ];

    const rows = outreaches.map(outreach => [
      outreach.recruiter?.name || 'Unknown',
      outreach.recruiter?.company?.name || 'Unknown',
      outreach.recruiter?.email || '',
      outreach.status,
      outreach.messageTemplate || 'custom',
      outreach.sentVia,
      new Date(outreach.createdAt).toLocaleDateString(),
      outreach.sentAt ? new Date(outreach.sentAt).toLocaleDateString() : '',
      outreach.repliesCount || 0,
      outreach.messageContent.substring(0, 100) + '...'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  },

  /**
   * Get intelligent recommendations for message improvements
   */
  getMessageRecommendations: (messageContent, recruiterData, userContext = {}) => {
    const recommendations = [];
    const content = messageContent.toLowerCase();

    // Length recommendations
    if (messageContent.length < 50) {
      recommendations.push({
        type: 'length',
        severity: 'warning',
        message: 'Message is quite short. Consider adding more context about your background or interest.'
      });
    } else if (messageContent.length > 1500) {
      recommendations.push({
        type: 'length',
        severity: 'warning',
        message: 'Message is quite long. Consider shortening it for better readability.'
      });
    }

    // Personalization recommendations
    if (!content.includes(recruiterData.firstName?.toLowerCase()) && 
        !content.includes(recruiterData.company?.name?.toLowerCase())) {
      recommendations.push({
        type: 'personalization',
        severity: 'info',
        message: 'Consider mentioning the recruiter\'s name or company for better personalization.'
      });
    }

    // Call-to-action recommendations
    if (!content.includes('would love to') && 
        !content.includes('would like to') && 
        !content.includes('schedule') && 
        !content.includes('discuss')) {
      recommendations.push({
        type: 'call_to_action',
        severity: 'info',
        message: 'Consider adding a clear call-to-action like "Would love to schedule a brief call".'
      });
    }

    // Subject matter recommendations
    if (userContext.targetRole && !content.includes(userContext.targetRole.toLowerCase())) {
      recommendations.push({
        type: 'relevance',
        severity: 'info',
        message: `Consider mentioning your target role (${userContext.targetRole}) to show clear intent.`
      });
    }

    return recommendations;
  }
};

export default recruiterService;