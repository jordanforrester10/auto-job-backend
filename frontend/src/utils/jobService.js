// src/utils/jobService.js - Updated with getTotalJobCount for onboarding flow
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

  // Enhanced: Find jobs with AI (now with better error handling and status)
  findJobsWithAi: async (resumeId) => {
    try {
      const response = await api.post(`/jobs/find-with-ai/${resumeId}`);
      return response.data;
    } catch (error) {
      console.error('Error finding jobs with AI:', error);
      throw error;
    }
  },

  // AI Job Search Management
  getAiSearches: async () => {
    try {
      const response = await api.get('/jobs/ai-searches');
      return response.data.searches;
    } catch (error) {
      console.error('Error fetching AI searches:', error);
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