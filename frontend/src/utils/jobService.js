// src/utils/jobService.js - FIXED WITH PROPER LOCATION DATA FLOW
import api from './axios';

const jobService = {
  // Create a new job
  createJob: async (jobData) => {
    try {
      const response = await api.post('/jobs', jobData);
      return response.data;
    } catch (error) {
      console.error('Error creating job:', error);
      throw error;
    }
  },

  // Get all user jobs
  getUserJobs: async () => {
    try {
      const response = await api.get('/jobs');
      return response.data.jobs;
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      throw error;
    }
  },

  // Alias for backward compatibility
  getAllJobs: async () => {
    try {
      const response = await api.get('/jobs');
      return response.data.jobs;
    } catch (error) {
      console.error('Error fetching user jobs:', error);
      throw error;
    }
  },

  // NEW: Get total count of jobs for the current user (both manual and AI-discovered)
  getTotalJobCount: async () => {
    try {
      const jobs = await jobService.getAllJobs();
      return jobs ? jobs.length : 0;
    } catch (error) {
      console.error('Error getting total job count:', error);
      return 0;
    }
  },

  // Get job by ID
  getJobById: async (jobId) => {
    try {
      const response = await api.get(`/jobs/${jobId}`);
      return response.data.job;
    } catch (error) {
      console.error('Error fetching job:', error);
      throw error;
    }
  },

  // Get job analysis status
  getJobAnalysisStatus: async (jobId) => {
    try {
      const response = await api.get(`/jobs/analysis-status/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching job analysis status:', error);
      throw error;
    }
  },

  pollJobAnalysisStatus: async (jobId, onProgress = null, maxAttempts = 30) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`📊 Polling attempt ${attempts + 1} for job ${jobId}`);
        
        const statusData = await jobService.getJobAnalysisStatus(jobId);
        const { analysisStatus } = statusData;
        
        console.log(`📊 Status: ${analysisStatus.status} (${analysisStatus.progress}%) - ${analysisStatus.message}`);
        
        // Call progress callback if provided
        if (onProgress) {
          onProgress(analysisStatus);
        }
        
        // Check if analysis is complete
        if (analysisStatus.status === 'completed' || analysisStatus.status === 'error') {
          console.log(`✅ Polling completed for job ${jobId}: ${analysisStatus.status}`);
          return statusData;
        }
        
        // Wait before next poll (2 seconds)
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
        
      } catch (error) {
        console.error(`❌ Error polling job analysis status (attempt ${attempts + 1}):`, error);
        attempts++;
        
        // Wait a bit longer on error
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Timeout reached
    console.error(`⏰ Analysis status polling timed out for job ${jobId}`);
    throw new Error('Analysis status polling timed out');
  },

  // NEW: Check if job can be viewed (analysis complete)
  canJobBeViewed: async (jobId) => {
    try {
      const statusData = await jobService.getJobAnalysisStatus(jobId);
      return statusData.analysisStatus.canViewJob;
    } catch (error) {
      console.error('Error checking if job can be viewed:', error);
      return false;
    }
  },

  // Get resume match status for a specific job
  getResumeMatchStatus: async (jobId) => {
    try {
      const response = await api.get(`/jobs/${jobId}/resume-match-status`);
      return response.data;
    } catch (error) {
      console.error('Error fetching resume match status:', error);
      throw error;
    }
  },

  // Update job
  updateJob: async (jobId, jobData) => {
    try {
      const response = await api.put(`/jobs/${jobId}`, jobData);
      return response.data;
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  },

  // Delete job
  deleteJob: async (jobId) => {
    try {
      const response = await api.delete(`/jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
  },

  // Enhanced match resume with job (now returns detailed analysis)
  matchResumeWithJob: async (jobId, resumeId) => {
    try {
      const response = await api.post(`/jobs/match/${jobId}/${resumeId}`);
      return response.data;
    } catch (error) {
      console.error('Error matching resume with job:', error);
      throw error;
    }
  },

  // Get tailoring recommendations
  getTailoringRecommendations: async (jobId, resumeId) => {
    try {
      const response = await api.post(`/jobs/tailor/${jobId}/${resumeId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting tailoring recommendations:', error);
      throw error;
    }
  },

  // Re-analyze a job with updated AI algorithm
  reAnalyzeJob: async (jobId) => {
    try {
      const response = await api.post(`/jobs/re-analyze/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error re-analyzing job:', error);
      throw error;
    }
  },

  // Get job analysis insights and statistics
  getJobAnalysisInsights: async () => {
    try {
      const response = await api.get('/jobs/analysis-insights');
      return response.data;
    } catch (error) {
      console.error('Error fetching job analysis insights:', error);
      throw error;
    }
  },

  // Bulk match resume against multiple jobs
  bulkMatchResume: async (resumeId, jobIds) => {
    try {
      const response = await api.post(`/jobs/bulk-match/${resumeId}`, { jobIds });
      return response.data;
    } catch (error) {
      console.error('Error bulk matching resume:', error);
      throw error;
    }
  },

  // 🔧 FIXED: Find jobs with AI - now properly sends location data to backend
  findJobsWithAi: async (resumeId, searchCriteria = {}) => {
    try {
      console.log('🚀 Frontend: Starting weekly AI job search with full criteria:', {
        resumeId,
        searchCriteria
      });
      
      // 🔧 FIX: Ensure proper data structure is sent to backend
      const requestPayload = {
        resumeId,
        searchCriteria: {
          searchLocations: searchCriteria.searchLocations || [{ name: 'Remote', type: 'remote' }],
          includeRemote: searchCriteria.includeRemote !== false,
          experienceLevel: searchCriteria.experienceLevel || 'mid',
          jobTypes: searchCriteria.jobTypes || ['FULL_TIME'],
          salaryRange: searchCriteria.salaryRange || null,
          workEnvironment: searchCriteria.workEnvironment || 'any'
        }
      };
      
      console.log('📍 Frontend: Sending locations to backend:', requestPayload.searchCriteria.searchLocations);
      console.log('🏠 Frontend: Include remote:', requestPayload.searchCriteria.includeRemote);
      
      // 🔧 FIX: Send the data in the request body, not just searchCriteria
      const response = await api.post(`/jobs/find-with-ai/${resumeId}`, requestPayload.searchCriteria);
      
      console.log('✅ Frontend: Weekly AI job search response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Frontend: Error finding jobs with AI:', error);
      
      // Check if this is a subscription limit error
      if (error.response?.status === 403) {
        const errorData = error.response.data;
        if (errorData.upgradeRequired) {
          // This is a plan limitation error, re-throw with context
          const planError = new Error(errorData.message || errorData.error);
          planError.upgradeRequired = true;
          planError.currentPlan = errorData.currentPlan;
          planError.feature = errorData.feature;
          planError.availableOn = errorData.availableOn;
          throw planError;
        }
      }
      
      throw error;
    }
  },

  // 🆕 NEW: Check if user can create AI job search (slot-based)
  canCreateAiJobSearch: async () => {
    try {
      const response = await api.get('/jobs/ai-search/can-create');
      return response.data;
    } catch (error) {
      console.error('Error checking AI search creation capability:', error);
      return {
        allowed: false,
        reason: 'Unable to check permissions'
      };
    }
  },

  // 🆕 NEW: Get weekly job discovery statistics
  getWeeklyJobStats: async () => {
    try {
      const response = await api.get('/jobs/ai-search/weekly-stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching weekly job stats:', error);
      return {
        weeklyLimit: 0,
        weeklyUsed: 0,
        weeklyRemaining: 0,
        weeklyPercentage: 0
      };
    }
  },

  // AI Job Search Management - UPDATED with weekly model
  getAiSearches: async () => {
    try {
      const response = await api.get('/jobs/ai-searches');
      return response.data.searches;
    } catch (error) {
      console.error('Error fetching AI searches:', error);
      throw error;
    }
  },

  // 🔄 UPDATED: Get AI search details with weekly information
  getAiSearchById: async (searchId) => {
    try {
      const response = await api.get(`/jobs/ai-search/${searchId}`);
      return response.data.search;
    } catch (error) {
      console.error('Error fetching AI search details:', error);
      throw error;
    }
  },

  pauseAiSearch: async (searchId) => {
    try {
      const response = await api.post(`/jobs/ai-search/${searchId}/pause`);
      return response.data;
    } catch (error) {
      console.error('Error pausing AI search:', error);
      throw error;
    }
  },

  resumeAiSearch: async (searchId) => {
    try {
      const response = await api.post(`/jobs/ai-search/${searchId}/resume`);
      return response.data;
    } catch (error) {
      console.error('Error resuming AI search:', error);
      throw error;
    }
  },

  deleteAiSearch: async (searchId) => {
    try {
      const response = await api.delete(`/jobs/ai-search/${searchId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting AI search:', error);
      throw error;
    }
  },

  // 🆕 NEW: Get AI search performance summary
  getAiSearchPerformance: async (searchId) => {
    try {
      const response = await api.get(`/jobs/ai-search/${searchId}/performance`);
      return response.data;
    } catch (error) {
      console.error('Error fetching AI search performance:', error);
      throw error;
    }
  },

  // 🆕 NEW: Update AI search locations
  updateAiSearchLocations: async (searchId, locations) => {
    try {
      const response = await api.put(`/jobs/ai-search/${searchId}/locations`, {
        searchLocations: locations
      });
      return response.data;
    } catch (error) {
      console.error('Error updating AI search locations:', error);
      throw error;
    }
  },

  // 🆕 NEW: Get AI search reasoning logs
  getAiSearchLogs: async (searchId) => {
    try {
      const response = await api.get(`/jobs/ai-search/${searchId}/logs`);
      return response.data.logs;
    } catch (error) {
      console.error('Error fetching AI search logs:', error);
      throw error;
    }
  },

  // Get detailed match history for a job
  getMatchHistory: async (jobId) => {
    try {
      const response = await api.get(`/jobs/match-history/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching match history:', error);
      throw error;
    }
  },

  // Analyze job description text (for manual job entry)
  analyzeJobDescription: async (jobId) => {
    try {
      const response = await api.post(`/jobs/analyze/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error analyzing job description:', error);
      throw error;
    }
  },

  // Get job matching trends and analytics
  getMatchingTrends: async (timeframe = '30d') => {
    try {
      const response = await api.get(`/jobs/trends?timeframe=${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching matching trends:', error);
      throw error;
    }
  },

  // Re-match job with best available resume
  rematchJobWithBestResume: async (jobId) => {
    try {
      const response = await api.post(`/jobs/rematch-best/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Error re-matching job:', error);
      throw error;
    }
  },

  // 🆕 NEW: Get jobs filtered by location
  getJobsByLocation: async (location) => {
    try {
      const response = await api.get(`/jobs/by-location?location=${encodeURIComponent(location)}`);
      return response.data.jobs;
    } catch (error) {
      console.error('Error fetching jobs by location:', error);
      throw error;
    }
  },

  // 🆕 NEW: Get jobs with salary information
  getJobsWithSalary: async (minSalary = null, maxSalary = null) => {
    try {
      const params = new URLSearchParams();
      if (minSalary) params.append('minSalary', minSalary);
      if (maxSalary) params.append('maxSalary', maxSalary);
      
      const response = await api.get(`/jobs/with-salary?${params.toString()}`);
      return response.data.jobs;
    } catch (error) {
      console.error('Error fetching jobs with salary:', error);
      throw error;
    }
  },

  // 🆕 NEW: Get weekly job discovery analytics
  getWeeklyDiscoveryAnalytics: async () => {
    try {
      const response = await api.get('/jobs/weekly-analytics');
      return response.data;
    } catch (error) {
      console.error('Error fetching weekly discovery analytics:', error);
      throw error;
    }
  },

  // UTILITY: Check if job analysis is complete
  isJobAnalysisComplete: (job) => {
    return job && 
           job.analysisStatus && 
           job.analysisStatus.status === 'completed' &&
           job.parsedData && 
           Object.keys(job.parsedData).length > 0 && 
           !job.parsedData.analysisError;
  },

  // UTILITY: Check if job has match analysis
  hasMatchAnalysis: (job) => {
    return job && 
           job.matchAnalysis && 
           job.matchAnalysis.overallScore !== undefined;
  },

  // UTILITY: Get match quality description
  getMatchQualityDescription: (score) => {
    if (score >= 85) return { label: 'Excellent', color: 'success' };
    if (score >= 70) return { label: 'Good', color: 'info' };
    if (score >= 55) return { label: 'Fair', color: 'warning' };
    return { label: 'Needs Work', color: 'error' };
  },

  // UTILITY: Get analysis status description
  getAnalysisStatusDescription: (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Queued', color: 'info', icon: 'HourglassEmpty' };
      case 'analyzing':
        return { label: 'Analyzing', color: 'primary', icon: 'AutoAwesome' };
      case 'completed':
        return { label: 'Complete', color: 'success', icon: 'CheckCircle' };
      case 'error':
        return { label: 'Failed', color: 'error', icon: 'Error' };
      default:
        return { label: 'Unknown', color: 'default', icon: 'Help' };
    }
  },

  // UTILITY: Format skill importance level
  getSkillImportanceLabel: (importance) => {
    if (importance >= 9) return 'Critical';
    if (importance >= 7) return 'Very Important';
    if (importance >= 5) return 'Important';
    if (importance >= 3) return 'Nice to Have';
    return 'Optional';
  },

  // UTILITY: Extract skill name safely
  getSkillName: (skill) => {
    if (typeof skill === 'string') {
      return skill;
    }
    if (skill && typeof skill === 'object') {
      return skill.name || skill.skill || 'Unknown Skill';
    }
    return 'Unknown Skill';
  },

  // 🆕 NEW: Check if job is from weekly AI discovery
  isWeeklyAiDiscoveredJob: (job) => {
    return job && 
           job.sourcePlatform && 
           (job.sourcePlatform.includes('ACTIVE_JOBS_DB') || 
            job.aiSearchMetadata?.weeklyDiscovery === true ||
            job.analysisStatus?.weeklySearch === true);
  },

  // 🆕 NEW: Get job location information
  getJobLocationInfo: (job) => {
    if (!job) return null;
    
    // Check for enhanced location data first
    if (job.parsedData?.locationData) {
      return {
        original: job.parsedData.locationData.original,
        city: job.parsedData.locationData.parsed?.city,
        state: job.parsedData.locationData.parsed?.state,
        country: job.parsedData.locationData.parsed?.country || 'USA',
        isRemote: job.parsedData.locationData.isRemote,
        workArrangement: job.parsedData.locationData.workArrangement,
        confidence: job.parsedData.locationData.locationConfidence || 80
      };
    }
    
    // Fallback to basic location data
    if (job.location) {
      return {
        original: job.location.originalLocation || job.location.city,
        city: job.location.city,
        state: job.location.state,
        country: job.location.country || 'USA',
        isRemote: job.location.remote || false,
        workArrangement: job.parsedData?.workArrangement || 'unknown',
        confidence: 70
      };
    }
    
    return null;
  },

  // 🆕 NEW: Get job salary information
  getJobSalaryInfo: (job) => {
    if (!job) return null;
    
    // Check for enhanced salary data first
    if (job.parsedData?.salaryData) {
      return {
        min: job.parsedData.salaryData.min,
        max: job.parsedData.salaryData.max,
        currency: job.parsedData.salaryData.currency || 'USD',
        period: job.parsedData.salaryData.period || 'annually',
        source: job.parsedData.salaryData.source,
        confidence: job.parsedData.salaryData.confidence || 0,
        extractionMethod: job.parsedData.salaryData.extractionMethod,
        isEstimated: job.parsedData.salaryData.isEstimated || false
      };
    }
    
    // Fallback to basic salary data
    if (job.salary) {
      return {
        min: job.salary.min,
        max: job.salary.max,
        currency: job.salary.currency || 'USD',
        period: job.salary.period || 'annually',
        source: job.salary.source || 'unknown',
        confidence: job.salary.confidence || 50,
        extractionMethod: 'basic',
        isEstimated: false
      };
    }
    
    return null;
  },

  // 🆕 NEW: Format salary range for display
  formatSalaryRange: (salaryInfo) => {
    if (!salaryInfo || (!salaryInfo.min && !salaryInfo.max)) {
      return 'Salary not specified';
    }
    
    const currency = salaryInfo.currency === 'USD' ? '$' : salaryInfo.currency;
    const period = salaryInfo.period === 'annually' ? '/year' : 
                   salaryInfo.period === 'monthly' ? '/month' : 
                   salaryInfo.period === 'hourly' ? '/hour' : '';
    
    const formatNumber = (num) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K';
      }
      return num.toLocaleString();
    };
    
    if (salaryInfo.min && salaryInfo.max) {
      return `${currency}${formatNumber(salaryInfo.min)} - ${currency}${formatNumber(salaryInfo.max)}${period}`;
    } else if (salaryInfo.min) {
      return `${currency}${formatNumber(salaryInfo.min)}+${period}`;
    } else if (salaryInfo.max) {
      return `Up to ${currency}${formatNumber(salaryInfo.max)}${period}`;
    }
    
    return 'Salary not specified';
  },

  // NEW: Create job with status tracking
  createJobWithStatusTracking: async (jobData, onProgress = null) => {
    try {
      // Create the job
      const createResponse = await jobService.createJob(jobData);
      const jobId = createResponse.job.id;
      
      // Start polling for status if callback provided
      if (onProgress) {
        setTimeout(() => {
          jobService.pollJobAnalysisStatus(jobId, onProgress).catch(error => {
            console.error('Error polling job status:', error);
            onProgress({
              status: 'error',
              message: 'Status polling failed',
              progress: 0
            });
          });
        }, 1000);
      }
      
      return createResponse;
    } catch (error) {
      console.error('Error creating job with status tracking:', error);
      throw error;
    }
  }
};

export default jobService;