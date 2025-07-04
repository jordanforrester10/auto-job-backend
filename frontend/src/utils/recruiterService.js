// frontend/src/utils/recruiterService.js - COMPLETE MERGED VERSION
import api from './axios';

class RecruiterService {
  // ===================================================================
  // RECRUITER SEARCH & DISCOVERY
  // ===================================================================

  /**
   * Search recruiters with advanced filtering - UPDATED WITH SHOW UNLOCKED ONLY
   */
  async searchRecruiters(filters = {}) {
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
        showUnlockedOnly = false, // NEW: Show unlocked only filter
        limit = 20,
        offset = 0,
        page = 1,
        sortBy = 'last_active_date',
        sortOrder = 'DESC',
        sort_by = '', // Support both formats
        sort_order = '' // Support both formats
      } = filters;

      console.log('🔍 Searching recruiters with filters (including unlock filter):', filters);

      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (company) params.append('company', company);
      if (industry) params.append('industry', industry);
      if (location) params.append('location', location);
      if (title) params.append('title', title);
      if (experienceMin || experience_min) params.append('experience_min', experienceMin || experience_min);
      if (experienceMax || experience_max) params.append('experience_max', experienceMax || experience_max);
      
      // NEW: Add show unlocked only parameter
      if (showUnlockedOnly) {
        params.append('show_unlocked_only', 'true');
        console.log('🔓 Including unlocked only filter in search');
      }
      
      params.append('limit', limit);
      
      // Handle both offset and page pagination
      if (offset > 0) {
        params.append('offset', offset);
      } else if (page > 1) {
        params.append('page', page);
        params.append('offset', (page - 1) * limit);
      }
      
      params.append('sort_by', sort_by || sortBy);
      params.append('sort_order', sort_order || sortOrder);

      const response = await api.get(`/recruiters/search?${params}`);
      
      const resultCount = response.data.recruiters?.length || 0;
      console.log(`✅ Found ${resultCount} recruiters ${showUnlockedOnly ? '(unlocked only)' : ''}`);
      
      // Log additional info for unlocked filter
      if (showUnlockedOnly) {
        console.log('🔓 Filtered results to show only unlocked recruiters');
      }
      
      return response.data;

    } catch (error) {
      console.error('Search recruiters error:', error);
      
      // Enhanced error logging for unlock filter
      if (filters.showUnlockedOnly) {
        console.error('❌ Search with unlock filter failed - check backend support');
      }
      
      throw error;
    }
  }

  /**
   * Get recruiter details by ID
   */
  async getRecruiterDetails(recruiterId) {
    try {
      console.log(`👤 Fetching details for recruiter ${recruiterId}`);
      const response = await api.get(`/recruiters/${recruiterId}`);
      
      // Debug logging to see the actual response structure
      console.log('🔍 Raw API response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Response data structure:', {
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'none',
        hasSuccess: !!response.data?.success,
        hasRecruiter: !!response.data?.recruiter,
        hasDataData: !!response.data?.data
      });
      
      // Try different possible response structures
      if (response.data?.data) {
        // Structure: { data: { recruiter: {...} } }
        console.log(`✅ Retrieved recruiter from data.data structure`);
        return response.data.data;
      } else if (response.data?.recruiter) {
        // Structure: { recruiter: {...} }
        console.log(`✅ Retrieved recruiter: ${response.data.recruiter.fullName}`);
        return response.data;
      } else if (response.data?.success) {
        // Structure: { success: true, ... }
        console.log(`✅ Retrieved recruiter from success structure`);
        return response.data;
      } else {
        // Fallback: return the whole data object
        console.log(`✅ Retrieved recruiter from fallback structure`);
        return response.data;
      }
    } catch (error) {
      console.error('Get recruiter details error:', error);
      throw error;
    }
  }

  // Alias for compatibility with components
  async getRecruiterById(recruiterId) {
    return await this.getRecruiterDetails(recruiterId);
  }

  /**
   * Get filter options for search
   */
  async getFilterOptions() {
    try {
      console.log('📊 Fetching filter options');
      const response = await api.get('/recruiters/filters');
      
      console.log('✅ Retrieved filter options');
      return response.data;

    } catch (error) {
      console.error('Get filter options error:', error);
      throw error;
    }
  }

  /**
   * Unlock recruiter details (for Casual plan users)
   */
  async unlockRecruiter(recruiterId) {
    try {
      console.log(`🔓 Unlocking recruiter ${recruiterId}`);
      const response = await api.post(`/recruiters/${recruiterId}/unlock`);
      return response.data;
    } catch (error) {
      console.error('Error unlocking recruiter:', error);
      throw error;
    }
  }

  /**
   * Get list of unlocked recruiters
   */
  async getUnlockedRecruiters(page = 1, limit = 20) {
    try {
      console.log(`📋 Getting unlocked recruiters (page ${page})`);
      const response = await api.get(`/recruiters/unlocked?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting unlocked recruiters:', error);
      throw error;
    }
  }

  // ===================================================================
  // OUTREACH MANAGEMENT
  // ===================================================================

  /**
   * Create outreach campaign
   */
  async createOutreach(outreachData) {
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

      console.log(`✅ Created outreach campaign: ${response.data.outreach?.id}`);
      return response.data;

    } catch (error) {
      console.error('Create outreach error:', error);
      throw error;
    }
  }

  /**
   * Update outreach campaign
   */
  async updateOutreach(outreachId, updates) {
    try {
      console.log(`📝 Updating outreach ${outreachId}`);
      const response = await api.put(`/recruiters/outreach/${outreachId}`, updates);
      
      console.log('✅ Outreach updated successfully');
      return response.data;

    } catch (error) {
      console.error('Update outreach error:', error);
      throw error;
    }
  }

  /**
   * Delete outreach campaign
   */
  async deleteOutreach(outreachId) {
    try {
      console.log(`🗑️ Deleting outreach ${outreachId}`);
      const response = await api.delete(`/recruiters/outreach/${outreachId}`);
      
      console.log('✅ Outreach deleted successfully');
      return response.data;

    } catch (error) {
      console.error('Delete outreach error:', error);
      throw error;
    }
  }

  /**
   * Send outreach message
   */
  async sendOutreach(outreachId) {
    try {
      console.log(`📤 Sending outreach ${outreachId}`);
      const response = await api.put(`/recruiters/outreach/${outreachId}/send`);
      
      console.log('✅ Outreach sent successfully');
      return response.data;

    } catch (error) {
      console.error('Send outreach error:', error);
      throw error;
    }
  }

  /**
   * Send outreach message to recruiter (alternative method)
   */
  async sendMessage(recruiterId, messageData) {
    try {
      console.log(`📧 Sending message to recruiter ${recruiterId}`);
      const response = await api.post(`/recruiters/${recruiterId}/outreach`, messageData);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get user's outreach campaigns
   */
  async getUserOutreach(filters = {}) {
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
      
      console.log(`✅ Retrieved ${response.data.outreaches?.length || 0} outreach campaigns`);
      return response.data;

    } catch (error) {
      console.error('Get user outreach error:', error);
      throw error;
    }
  }

  /**
   * Get outreach history
   */
  async getOutreachHistory(page = 1, limit = 20) {
    try {
      console.log(`📜 Getting outreach history (page ${page})`);
      const response = await api.get(`/recruiters/outreach/history?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting outreach history:', error);
      throw error;
    }
  }

  // ===================================================================
  // AI-POWERED FEATURES
  // ===================================================================

  /**
   * Generate personalized message using AI
   */
  async generatePersonalizedMessage(messageParams) {
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

      console.log(`✅ Generated ${response.data.message?.length || 0} character message`);
      return response.data;

    } catch (error) {
      console.error('Generate message error:', error);
      throw error;
    }
  }

  /**
   * Generate AI outreach message (alternative method)
   */
  async generateOutreachMessage(recruiterId, jobDescription = null, template = null) {
    try {
      console.log(`🤖 Generating outreach message for recruiter ${recruiterId}`);
      const response = await api.post(`/recruiters/${recruiterId}/generate-outreach`, {
        jobDescription,
        template
      });
      return response.data;
    } catch (error) {
      console.error('Error generating outreach message:', error);
      throw error;
    }
  }

  /**
   * Generate AI message (alias for generateOutreachMessage)
   */
  async generateMessage(recruiterId, options = {}) {
    return this.generateOutreachMessage(recruiterId, options.jobDescription, options.template);
  }

  // ===================================================================
  // TEMPLATES & OPTIONS
  // ===================================================================

  /**
   * Get outreach templates
   */
  async getOutreachTemplates() {
    try {
      const response = await api.get('/recruiters/outreach/templates');
      return response.data;
    } catch (error) {
      console.warn('⚠️ getOutreachTemplates: Backend endpoint not implemented yet, returning mock data');
      // Return mock data only for outreach templates since this endpoint might not exist yet
      return {
        success: true,
        templates: [
          {
            id: 1,
            name: 'Professional Introduction',
            content: 'Hi {{recruiterName}}, I hope this message finds you well. I am reaching out regarding opportunities in {{industry}}...'
          },
          {
            id: 2, 
            name: 'Follow Up',
            content: 'Hi {{recruiterName}}, I wanted to follow up on my previous message about potential opportunities...'
          }
        ]
      };
    }
  }

  /**
   * Get message templates (alias for getOutreachTemplates for backward compatibility)
   */
  async getMessageTemplates() {
    return this.getOutreachTemplates();
  }

  /**
   * Get tone options for messages
   */
  async getToneOptions() {
    try {
      // Since the backend endpoint doesn't exist yet, return mock data
      console.log('⚠️ getToneOptions: Backend endpoint not implemented, returning mock data');
      return {
        success: true,
        tones: [
          { id: 'professional', name: 'Professional', description: 'Formal and business-appropriate' },
          { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
          { id: 'casual', name: 'Casual', description: 'Relaxed and conversational' },
          { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic and passionate' }
        ]
      };
    } catch (error) {
      console.error('Error getting tone options:', error);
      return { success: true, tones: [] };
    }
  }

  /**
   * Get message types
   */
  async getMessageTypes() {
    try {
      console.log('⚠️ getMessageTypes: Backend endpoint not implemented, returning mock data');
      return {
        success: true,
        types: [
          { id: 'introduction', name: 'Introduction', description: 'First contact message' },
          { id: 'follow_up', name: 'Follow Up', description: 'Follow up on previous contact' },
          { id: 'application', name: 'Job Application', description: 'Applying for a specific role' },
          { id: 'networking', name: 'Networking', description: 'General networking message' }
        ]
      };
    } catch (error) {
      console.error('Error getting message types:', error);
      return { success: true, types: [] };
    }
  }

  /**
   * Get default message templates
   */
  getDefaultMessageTemplates() {
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
  }

  /**
   * Get available tone options
   */
  getDefaultToneOptions() {
    return [
      { value: 'professional', label: 'Professional', description: 'Formal and business-appropriate' },
      { value: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
      { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
      { value: 'formal', label: 'Formal', description: 'Very structured and traditional' }
    ];
  }

  // ===================================================================
  // INDUSTRY & LOCATION DATA
  // ===================================================================

  /**
   * Get industry options
   */
  async getIndustryOptions() {
    try {
      console.log('⚠️ getIndustryOptions: Backend endpoint not implemented, returning mock data');
      return {
        success: true,
        industries: [
          'Technology',
          'Healthcare',
          'Finance',
          'Manufacturing',
          'Retail',
          'Education',
          'Consulting',
          'Real Estate',
          'Transportation',
          'Other'
        ]
      };
    } catch (error) {
      console.error('Error getting industry options:', error);
      return { success: true, industries: [] };
    }
  }

  /**
   * Get recruiter companies
   */
  async getRecruiterCompanies(query = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (limit) params.append('limit', limit);

      const response = await api.get(`/recruiters/companies?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting recruiter companies:', error);
      throw error;
    }
  }

  /**
   * Get recruiter industries
   */
  async getRecruiterIndustries() {
    try {
      const response = await api.get('/recruiters/industries');
      return response.data;
    } catch (error) {
      console.error('Error getting recruiter industries:', error);
      throw error;
    }
  }

  /**
   * Get recruiter locations
   */
  async getRecruiterLocations(query = null, limit = 10) {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (limit) params.append('limit', limit);

      const response = await api.get(`/recruiters/locations?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error getting recruiter locations:', error);
      throw error;
    }
  }

  // ===================================================================
  // ANALYTICS & REPORTING
  // ===================================================================

  /**
   * Get outreach analytics
   */
  async getAnalytics(timeframe = '30d') {
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
  }

  /**
   * Get recruiter insights and analytics
   */
  async getRecruiterInsights(recruiterId) {
    try {
      const response = await api.get(`/recruiters/${recruiterId}/insights`);
      return response.data;
    } catch (error) {
      console.error('Error getting recruiter insights:', error);
      throw error;
    }
  }

  /**
   * Get similar recruiters
   */
  async getSimilarRecruiters(recruiterId, limit = 5) {
    try {
      const response = await api.get(`/recruiters/${recruiterId}/similar?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting similar recruiters:', error);
      throw error;
    }
  }

  /**
   * Get recruiter statistics for user
   */
  async getRecruiterStats() {
    try {
      const response = await api.get('/recruiters/stats');
      return response.data;
    } catch (error) {
      console.error('Error getting recruiter stats:', error);
      throw error;
    }
  }

  // ===================================================================
  // ACCESS CONTROL & FAVORITES
  // ===================================================================

  /**
   * Check if recruiter is unlocked
   */
  async checkRecruiterAccess(recruiterId) {
    try {
      const response = await api.get(`/recruiters/${recruiterId}/access`);
      return response.data;
    } catch (error) {
      console.error('Error checking recruiter access:', error);
      throw error;
    }
  }

  /**
   * Save recruiter to favorites
   */
  async addToFavorites(recruiterId) {
    try {
      const response = await api.post(`/recruiters/${recruiterId}/favorite`);
      return response.data;
    } catch (error) {
      console.error('Error adding recruiter to favorites:', error);
      throw error;
    }
  }

  /**
   * Remove recruiter from favorites
   */
  async removeFromFavorites(recruiterId) {
    try {
      const response = await api.delete(`/recruiters/${recruiterId}/favorite`);
      return response.data;
    } catch (error) {
      console.error('Error removing recruiter from favorites:', error);
      throw error;
    }
  }

  /**
   * Get favorite recruiters
   */
  async getFavoriteRecruiters(page = 1, limit = 20) {
    try {
      const response = await api.get(`/recruiters/favorites?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error getting favorite recruiters:', error);
      throw error;
    }
  }

  /**
   * Report recruiter (for quality control)
   */
  async reportRecruiter(recruiterId, reason, description = null) {
    try {
      const response = await api.post(`/recruiters/${recruiterId}/report`, {
        reason,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Error reporting recruiter:', error);
      throw error;
    }
  }

  // ===================================================================
  // DATA EXPORT & UTILITIES
  // ===================================================================

  /**
   * Export recruiters to CSV
   */
  async exportRecruiters(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add search filters to params
      if (filters.query) params.append('query', filters.query);
      if (filters.company) params.append('company', filters.company);
      if (filters.location) params.append('location', filters.location);
      if (filters.industry) params.append('industry', filters.industry);

      const response = await api.get(`/recruiters/export?${params.toString()}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recruiters_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting recruiters:', error);
      throw error;
    }
  }

  /**
   * Export outreach data for external use
   */
  async exportOutreachData(format = 'csv', filters = {}) {
    try {
      console.log(`📤 Exporting outreach data in ${format} format`);
      
      const outreachData = await this.getUserOutreach({
        ...filters,
        limit: 1000 // Get all data for export
      });

      if (format === 'csv') {
        return this.convertToCSV(outreachData.outreaches);
      } else if (format === 'json') {
        return JSON.stringify(outreachData.outreaches, null, 2);
      }

      throw new Error('Unsupported export format');

    } catch (error) {
      console.error('Export outreach data error:', error);
      throw error;
    }
  }

  /**
   * Convert outreach data to CSV format
   */
  convertToCSV(outreaches) {
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
  }

  // ===================================================================
  // FORMATTING & DISPLAY UTILITIES
  // ===================================================================

  /**
   * Format recruiter data for display
   */
  formatRecruiterForDisplay(recruiter) {
    if (!recruiter) return null;

    return {
      id: recruiter.id,
      fullName: recruiter.fullName || `${recruiter.firstName || ''} ${recruiter.lastName || ''}`.trim(),
      displayName: recruiter.fullName || `${recruiter.firstName} ${recruiter.lastName}`,
      title: recruiter.title || 'Recruiter',
      company: recruiter.company?.name || 'Company Not Specified',
      companyDisplay: recruiter.company?.name || 'Unknown Company',
      location: recruiter.location || 'Location Not Specified',
      locationDisplay: recruiter.location ? 
        `${recruiter.location.city || ''}${recruiter.location.state ? `, ${recruiter.location.state}` : ''}${recruiter.location.country ? `, ${recruiter.location.country}` : ''}`.replace(/^, /, '') :
        'Location not specified',
      industry: recruiter.industry?.name || recruiter.industry || 'Industry Not Specified',
      email: recruiter.email,
      phone: recruiter.phone,
      linkedinUrl: recruiter.linkedinUrl,
      specializations: recruiter.specializations || [],
      rating: recruiter.rating,
      isUnlocked: recruiter.isUnlocked || false,
      hasContacted: recruiter.outreach?.hasContacted || false,
      hasContactInfo: !!(recruiter.email || recruiter.phone || recruiter.linkedinUrl),
      hasBeenContacted: recruiter.outreach?.hasContacted || false,
      lastContactDate: recruiter.outreach?.lastContactDate,
      outreachStatus: recruiter.outreach?.status || 'not_contacted',
      companySize: recruiter.company?.size,
      companyWebsite: recruiter.company?.website,
      foundedYear: recruiter.company?.foundedYear,
      experienceDisplay: recruiter.experienceYears ? 
        `${recruiter.experienceYears} year${recruiter.experienceYears !== 1 ? 's' : ''} experience` :
        'Experience not specified',
      lastActiveDisplay: recruiter.lastActiveDate ? 
        new Date(recruiter.lastActiveDate).toLocaleDateString() :
        'Last active not specified'
    };
  }

  /**
   * Format outreach campaign for display
   */
  formatOutreachForDisplay(outreach) {
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
  }

  /**
   * Get recruiter display status
   */
  getRecruiterStatus(recruiter) {
    if (recruiter.isUnlocked) {
      return {
        status: 'unlocked',
        color: 'success',
        label: 'Unlocked'
      };
    }

    if (recruiter.hasContacted) {
      return {
        status: 'contacted',
        color: 'info',
        label: 'Contacted'
      };
    }

    return {
      status: 'locked',
      color: 'default',
      label: 'Locked'
    };
  }

  /**
   * Get experience level filters
   */
  getExperienceLevels() {
    return [
      { value: '0-2', label: '0-2 years', min: 0, max: 2 },
      { value: '3-5', label: '3-5 years', min: 3, max: 5 },
      { value: '6-10', label: '6-10 years', min: 6, max: 10 },
      { value: '11-15', label: '11-15 years', min: 11, max: 15 },
      { value: '16+', label: '16+ years', min: 16, max: 50 }
    ];
  }

  // ===================================================================
  // VALIDATION & ANALYSIS
  // ===================================================================

  /**
   * Validate outreach data before sending
   */
  validateOutreachData(outreachData) {
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
  }

  /**
   * Calculate outreach success metrics
   */
  calculateSuccessMetrics(outreaches) {
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
  }

  /**
   * Get intelligent recommendations for message improvements
   */
  getMessageRecommendations(messageContent, recruiterData, userContext = {}) {
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

  // ===================================================================
  // LEGACY COMPATIBILITY METHODS
  // ===================================================================

  /**
   * Legacy method for backward compatibility
   */
  async searchRecruiters_legacy(filters = {}) {
    // Map old filter format to new format
    const mappedFilters = {
      query: filters.query || filters.search || '',
      company: filters.company || '',
      industry: filters.industry || '',
      location: filters.location || '',
      title: filters.title || '',
      page: filters.page || 1,
      limit: filters.limit || 20
    };

    return this.searchRecruiters(mappedFilters);
  }

  /**
   * Helper method to handle API response variations
   */
  normalizeApiResponse(response) {
    // Handle different response structures from backend
    if (response.data) {
      return response.data;
    } else if (response.success !== undefined) {
      return response;
    } else {
      return { success: true, data: response };
    }
  }

  /**
   * Helper method to build query parameters consistently
   */
  buildQueryParams(filters) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });

    return params;
  }
}

// Create and export singleton instance
const recruiterService = new RecruiterService();
export default recruiterService;