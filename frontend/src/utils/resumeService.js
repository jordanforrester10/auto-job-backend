// src/utils/resumeService.js - Updated with job suggestions functionality and extended timeout for AI operations
import api, { aiApi } from './axios'; // 🔧 ADDED: Import aiApi for long-running operations

const resumeService = {
  // Get all resumes for the user
  getUserResumes: async () => {
    try {
      const response = await api.get('/resumes');
      return response.data.resumes || [];
    } catch (error) {
      console.error('Error fetching resumes:', error);
      throw error;
    }
  },
  
  // Get a specific resume by ID
  getResumeById: async (resumeId) => {
    try {
      const response = await api.get(`/resumes/${resumeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching resume:', error);
      throw error;
    }
  },
  
  // Upload a new resume
  uploadResume: async (formData) => {
    try {
      const response = await api.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading resume:', error);
      throw error;
    }
  },
  
  // Check resume processing status
  checkResumeStatus: async (resumeId) => {
    try {
      const response = await api.get(`/resumes/status/${resumeId}`);
      return response.data.processingStatus;
    } catch (error) {
      console.error('Error checking resume status:', error);
      throw error;
    }
  },
  
  // Poll resume status until completion or timeout
  pollResumeStatus: async (resumeId, onProgress, timeout = 300000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = 2000; // Poll every 2 seconds
      
      const checkStatus = async () => {
        try {
          if (Date.now() - startTime > timeout) {
            clearInterval(pollInterval);
            reject(new Error('Resume processing timed out'));
            return;
          }
          
          const status = await resumeService.checkResumeStatus(resumeId);
          
          if (onProgress) onProgress(status);
          
          if (status.status === 'completed') {
            clearInterval(pollInterval);
            resolve(status);
          }
          
          if (status.status === 'error') {
            clearInterval(pollInterval);
            reject(new Error(status.error || 'Processing failed'));
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      };
      
      const pollInterval = setInterval(checkStatus, interval);
      checkStatus(); // Immediate first check
    });
  },
  
  // 🔧 UPDATED: Analyze a resume (long-running AI operation)
  analyzeResume: async (resumeId) => {
    try {
      console.log('🔧 Using AI API for resume analysis with 3-minute timeout');
      // Use aiApi for extended timeout since analysis involves AI processing
      const response = await aiApi.post(`/resumes/analyze/${resumeId}`);
      return response.data;
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  },
  
  // Add a new version to an existing resume
  addResumeVersion: async (resumeId, formData) => {
    try {
      const response = await api.post(`/resumes/versions/${resumeId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error adding resume version:', error);
      throw error;
    }
  },
  
  // 🔧 CRITICAL FIX: Create a tailored resume with extended timeout
  createTailoredResume: async (resumeId, jobId, options = {}) => {
    try {
      console.log('🔧 Using AI API for tailored resume creation with 3-minute timeout');
      // 🔧 FIXED: Use aiApi instead of regular api for extended timeout
      const response = await aiApi.post(`/resumes/tailor/${resumeId}/${jobId}`, options);
      return response.data;
    } catch (error) {
      console.error('Error creating tailored resume:', error);
      throw error;
    }
  },
  
  // Delete a resume
  deleteResume: async (resumeId) => {
    try {
      const response = await api.delete(`/resumes/${resumeId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw error;
    }
  },

  // 🔧 UPDATED: Get AI-generated job suggestions (long-running AI operation)
  getJobSuggestions: async (resumeId) => {
    try {
      console.log('🔍 Fetching AI job suggestions for resume:', resumeId);
      console.log('🔧 Using AI API for job suggestions with 3-minute timeout');
      // Use aiApi for AI-powered job suggestions
      const response = await aiApi.get(`/resumes/${resumeId}/job-suggestions`);
      return response.data.suggestions || response.data;
    } catch (error) {
      console.error('Error fetching job suggestions:', error);
      // Return smart fallback suggestions if API fails
      return [
        'Software Developer',
        'Frontend Engineer', 
        'Backend Developer',
        'Full Stack Engineer',
        'Data Analyst',
        'Project Manager'
      ];
    }
  }
};

export default resumeService;
