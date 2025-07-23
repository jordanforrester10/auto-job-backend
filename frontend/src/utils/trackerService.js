// frontend/src/utils/trackerService.js - Job Application Tracker Service (FIXED)
import api from './axios';

const trackerService = {
  // Get all tracked jobs with filtering and pagination
  getTrackedJobs: async (params = {}) => {
    try {
      const {
        status,
        priority,
        archived = 'false',
        search,
        sortBy = 'lastActivity',
        sortOrder = 'desc',
        page = 1,
        limit = 20,
        includeArchived = 'false'
      } = params;

      console.log('🔧 TrackerService.getTrackedJobs called with params:', params);
      console.log('🔧 Extracted includeArchived:', includeArchived);

      const queryParams = new URLSearchParams();
      if (status && status !== 'all') queryParams.append('status', status);
      if (priority && priority !== 'all') queryParams.append('priority', priority);
      if (archived) queryParams.append('archived', archived);
      if (search) queryParams.append('search', search);
      if (sortBy) queryParams.append('sortBy', sortBy);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);
      if (page) queryParams.append('page', page);
      if (limit) queryParams.append('limit', limit);
      if (includeArchived) queryParams.append('includeArchived', includeArchived);

      const queryString = queryParams.toString();
      console.log('🔧 Final query string:', queryString);
      console.log('🔧 Full API URL:', `/tracker/jobs?${queryString}`);

      const response = await api.get(`/tracker/jobs?${queryString}`);
      
      console.log('🔧 API response received:', response.data);
      
      // FIXED: Handle the correct response format from backend
      if (response.data && response.data.success && response.data.data) {
        // New format: { success: true, data: { trackedJobs: [...], pagination: {...} } }
        console.log('✅ Using success format, returning full data object');
        return response.data.data; // Return the entire data object with trackedJobs and pagination
      } else if (Array.isArray(response.data)) {
        // Direct array format (fallback)
        console.log('✅ Using direct array format');
        return {
          trackedJobs: response.data,
          pagination: { totalPages: 1, currentPage: 1, totalCount: response.data.length }
        };
      } else if (response.data && Array.isArray(response.data.trackedJobs)) {
        // Format: { trackedJobs: [...] } (fallback)
        console.log('✅ Using trackedJobs array format');
        return response.data;
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        return {
          trackedJobs: [],
          pagination: { totalPages: 1, currentPage: 1, totalCount: 0 }
        };
      }
    } catch (error) {
      console.error('❌ Error fetching tracked jobs:', error);
      // Return empty structure to prevent crashes
      return {
        trackedJobs: [],
        pagination: { totalPages: 1, currentPage: 1, totalCount: 0 }
      };
    }
  },

  // Track a new job - PRIMARY METHOD
  trackJob: async (jobData) => {
    try {
      const response = await api.post('/tracker/jobs', jobData);
      return response.data;
    } catch (error) {
      console.error('Error tracking job:', error);
      throw error;
    }
  },

  // Add job to tracker - ALIAS for compatibility with JobsPage
  addJobToTracker: async (jobData) => {
    try {
      console.log('🔧 TrackerService.addJobToTracker called with:', jobData);
      // Call the primary trackJob method
      return await trackerService.trackJob(jobData);
    } catch (error) {
      console.error('Error adding job to tracker:', error);
      throw error;
    }
  },

  // Get single tracked job by ID
  getTrackedJobById: async (id) => {
    try {
      const response = await api.get(`/tracker/jobs/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tracked job:', error);
      throw error;
    }
  },

  // Update job status
  updateJobStatus: async (id, status, note = null) => {
    try {
      const response = await api.put(`/tracker/jobs/${id}/status`, { status, note });
      return response.data;
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  },

  // Add note to tracked job
  addJobNote: async (id, note) => {
    try {
      const response = await api.put(`/tracker/jobs/${id}/notes`, { note });
      return response.data;
    } catch (error) {
      console.error('Error adding job note:', error);
      throw error;
    }
  },

  // Update tracked job (general update)
  updateTrackedJob: async (id, updates) => {
    try {
      const response = await api.put(`/tracker/jobs/${id}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating tracked job:', error);
      throw error;
    }
  },

  // Delete/Remove job tracking
  deleteTrackedJob: async (id) => {
    try {
      const response = await api.delete(`/tracker/jobs/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting tracked job:', error);
      throw error;
    }
  },

  // Add interview to tracked job
  addInterview: async (id, interviewData) => {
    try {
      const response = await api.post(`/tracker/jobs/${id}/interview`, interviewData);
      return response.data;
    } catch (error) {
      console.error('Error adding interview:', error);
      throw error;
    }
  },

  // Archive single job
  archiveTrackedJob: async (id, reason = '') => {
    try {
      const response = await api.post(`/tracker/${id}/archive`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error archiving job:', error);
      throw error;
    }
  },

  // Restore archived job
  restoreTrackedJob: async (id) => {
    try {
      const response = await api.post(`/tracker/${id}/restore`);
      return response.data;
    } catch (error) {
      console.error('Error restoring job:', error);
      throw error;
    }
  },

  // Get archived jobs
  getArchivedJobs: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          queryParams.append(key, params[key]);
        }
      });

      const response = await api.get(`/tracker/archived?${queryParams.toString()}`);
      
      // Handle different response formats
      if (response.data && response.data.success && response.data.data) {
        return response.data.data.trackedJobs || response.data.data || [];
      } else if (response.data && Array.isArray(response.data.trackedJobs)) {
        return response.data.trackedJobs;
      } else if (Array.isArray(response.data)) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('Error fetching archived jobs:', error);
      return [];
    }
  },

  // Archive all closed jobs
  archiveAllClosed: async () => {
    try {
      const response = await api.put('/tracker/archive-all-closed');
      return response.data;
    } catch (error) {
      console.error('Error archiving closed jobs:', error);
      throw error;
    }
  },

  // Get tracker statistics and dashboard data
  getStats: async () => {
    try {
      const response = await api.get('/tracker/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching tracker stats:', error);
      return {
        data: {
          overview: {
            totalTracked: 0,
            statusCounts: {
              interested: 0,
              applied: 0,
              interviewing: 0,
              closed: 0
            },
            metrics: {
              applicationRate: 0,
              interviewRate: 0,
              pendingFollowUps: 0,
              upcomingInterviews: 0
            }
          },
          jobsNeedingFollowUp: [],
          upcomingInterviews: [],
          recentActivity: []
        }
      };
    }
  },

  // UTILITY FUNCTIONS

  // Validate tracking data before submission
  validateTrackingData: (data) => {
    const errors = [];

    if (!data.jobId) {
      errors.push('Job ID is required');
    }

    if (data.status && !['interested', 'applied', 'interviewing', 'closed'].includes(data.status)) {
      errors.push('Invalid status value');
    }

    if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
      errors.push('Invalid priority value');
    }

    if (data.notes && data.notes.length > 2000) {
      errors.push('Notes cannot exceed 2000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Get status color and label
  getStatusInfo: (status) => {
    const statusMap = {
      interested: {
        label: 'Interested',
        color: 'info',
        bgColor: '#2196f3',
        textColor: '#ffffff'
      },
      applied: {
        label: 'Applied',
        color: 'warning',
        bgColor: '#ff9800',
        textColor: '#ffffff'
      },
      interviewing: {
        label: 'Interviewing',
        color: 'success',
        bgColor: '#4caf50',
        textColor: '#ffffff'
      },
      closed: {
        label: 'Closed',
        color: 'default',
        bgColor: '#9e9e9e',
        textColor: '#ffffff'
      }
    };
    return statusMap[status] || statusMap.interested;
  },

  // Get priority color and label
  getPriorityInfo: (priority) => {
    const priorityMap = {
      low: {
        label: 'Low',
        color: 'default',
        bgColor: '#9e9e9e'
      },
      medium: {
        label: 'Medium',
        color: 'primary',
        bgColor: '#2196f3'
      },
      high: {
        label: 'High',
        color: 'warning',
        bgColor: '#ff9800'
      },
      urgent: {
        label: 'Urgent',
        color: 'error',
        bgColor: '#f44336'
      }
    };
    return priorityMap[priority] || priorityMap.medium;
  },

  // Format time since last activity
  getTimeSinceActivity: (lastActivity) => {
    if (!lastActivity) return 'Never';
    
    const now = new Date();
    const activityDate = new Date(lastActivity);
    const diffMs = now - activityDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  },

  // Check if job needs follow-up (no activity in X days)
  needsFollowUp: (lastActivity, days = 7) => {
    if (!lastActivity) return true;
    
    const now = new Date();
    const activityDate = new Date(lastActivity);
    const diffMs = now - activityDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays >= days;
  },

  // Get upcoming interviews from a tracked job
  getUpcomingInterviews: (trackedJob) => {
    if (!trackedJob || !trackedJob.interviews) return [];
    
    const now = new Date();
    return trackedJob.interviews.filter(interview => {
      const interviewDate = new Date(interview.scheduledDate);
      return interviewDate > now && interview.outcome === 'pending';
    });
  },

  // Check if job was recently added (within 24 hours)
  isRecentlyAdded: (createdAt) => {
    if (!createdAt) return false;
    
    const now = new Date();
    const createdDate = new Date(createdAt);
    const diffMs = now - createdDate;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    return diffHours <= 24;
  },

  // Get job location display string
  getJobLocation: (job) => {
    if (!job) return 'Location not specified';
    
    // Handle different location formats
    if (job.location) {
      if (typeof job.location === 'string') {
        return job.location;
      } else if (job.location.city && job.location.state) {
        return `${job.location.city}, ${job.location.state}`;
      } else if (job.location.city) {
        return job.location.city;
      }
    }
    
    // Fallback checks
    if (job.city && job.state) {
      return `${job.city}, ${job.state}`;
    } else if (job.city) {
      return job.city;
    }
    
    return 'Remote';
  },

  // Get salary display string
  getSalaryDisplay: (job) => {
    if (!job) return null;
    
    // Check various salary field formats
    if (job.salary) {
      if (typeof job.salary === 'string') {
        return job.salary;
      } else if (job.salary.min && job.salary.max) {
        return `${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}`;
      } else if (job.salary.amount) {
        return `${job.salary.amount.toLocaleString()}`;
      }
    }
    
    // Check other common salary fields
    if (job.salaryMin && job.salaryMax) {
      return `${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`;
    } else if (job.salaryRange) {
      return job.salaryRange;
    }
    
    return null;
  },

  // Get job type display
  getJobTypeDisplay: (job) => {
    if (!job) return 'Full-time';
    
    return job.jobType || job.type || job.employmentType || 'Full-time';
  },

  // Get company logo or initials
  getCompanyDisplay: (job) => {
    if (!job) return { name: 'Unknown Company', initials: 'UC' };
    
    const companyName = job.company || job.companyName || 'Unknown Company';
    const initials = companyName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    return {
      name: companyName,
      initials: initials || 'UC',
      logo: job.companyLogo || job.logo
    };
  },

  // Format date for display
  formatDate: (date, format = 'short') => {
    if (!date) return 'Unknown';
    
    const dateObj = new Date(date);
    
    if (format === 'short') {
      return dateObj.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
    } else if (format === 'long') {
      return dateObj.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } else if (format === 'relative') {
      return trackerService.getTimeSinceActivity(date);
    }
    
    return dateObj.toLocaleDateString();
  },

  // Get match score display
  getMatchScoreDisplay: (job) => {
    if (!job) return null;
    
    const score = job.matchScore || job.match_score || job.score;
    
    if (typeof score === 'number') {
      return Math.round(score);
    } else if (typeof score === 'string') {
      const numScore = parseFloat(score);
      return isNaN(numScore) ? null : Math.round(numScore);
    }
    
    return null;
  },

  // Get job source/platform display
  getJobSource: (job) => {
    if (!job) return 'Manual';
    
    return job.sourcePlatform || job.source || job.platform || 'Manual';
  },

  // Get pending follow-ups for a tracked job
  getPendingFollowUps: (trackedJob) => {
    if (!trackedJob || !trackedJob.followUpReminders) return [];
    
    const now = new Date();
    return trackedJob.followUpReminders.filter(reminder => {
      const reminderDate = new Date(reminder.date);
      return reminderDate <= now && !reminder.completed;
    });
  },

  // Get overdue follow-ups count
  getOverdueFollowUpsCount: (trackedJob) => {
    const pendingFollowUps = trackerService.getPendingFollowUps(trackedJob);
    return pendingFollowUps.length;
  },

  // Check if tracked job has pending actions
  hasPendingActions: (trackedJob) => {
    if (!trackedJob) return false;
    
    // Check for pending follow-ups
    const pendingFollowUps = trackerService.getPendingFollowUps(trackedJob);
    if (pendingFollowUps.length > 0) return true;
    
    // Check for upcoming interviews
    const upcomingInterviews = trackerService.getUpcomingInterviews(trackedJob);
    if (upcomingInterviews.length > 0) return true;
    
    // Check if job needs follow-up based on last activity
    if (trackerService.needsFollowUp(trackedJob.lastActivity, 7)) return true;
    
    return false;
  },

  // Get action items for a tracked job
  getActionItems: (trackedJob) => {
    if (!trackedJob) return [];
    
    const actions = [];
    
    // Pending follow-ups
    const pendingFollowUps = trackerService.getPendingFollowUps(trackedJob);
    pendingFollowUps.forEach(followUp => {
      actions.push({
        type: 'followup',
        title: 'Follow-up reminder',
        description: followUp.message || 'Scheduled follow-up',
        dueDate: followUp.date,
        priority: 'medium'
      });
    });
    
    // Upcoming interviews
    const upcomingInterviews = trackerService.getUpcomingInterviews(trackedJob);
    upcomingInterviews.forEach(interview => {
      actions.push({
        type: 'interview',
        title: `${interview.type} Interview`,
        description: `Scheduled ${interview.type} interview`,
        dueDate: interview.scheduledDate,
        priority: 'high'
      });
    });
    
    // Needs follow-up based on inactivity
    if (trackerService.needsFollowUp(trackedJob.lastActivity, 7)) {
      actions.push({
        type: 'inactive',
        title: 'Follow-up needed',
        description: 'No activity for 7+ days',
        dueDate: null,
        priority: 'low'
      });
    }
    
    return actions.sort((a, b) => {
      // Sort by priority: high -> medium -> low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  },

  // Get status transition options
  getStatusTransitions: (currentStatus) => {
    const transitions = {
      interested: ['applied', 'closed'],
      applied: ['interviewing', 'closed'],
      interviewing: ['closed'],
      closed: [] // No transitions from closed
    };
    
    return transitions[currentStatus] || [];
  },

  // Validate status transition
  canTransitionTo: (currentStatus, newStatus) => {
    const allowedTransitions = trackerService.getStatusTransitions(currentStatus);
    return allowedTransitions.includes(newStatus);
  },

  // Get next suggested status
  getNextSuggestedStatus: (currentStatus) => {
    const suggestions = {
      interested: 'applied',
      applied: 'interviewing',
      interviewing: 'closed',
      closed: null
    };
    
    return suggestions[currentStatus];
  }
};

export default trackerService;
