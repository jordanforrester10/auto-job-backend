// src/utils/resumeService.js - Updated with job suggestions functionality
import api from './axios';

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
  
  // Analyze a resume
  analyzeResume: async (resumeId) => {
    try {
      const response = await api.post(`/resumes/analyze/${resumeId}`);
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
  
  // Create a tailored resume
  createTailoredResume: async (resumeId, jobId, options = {}) => {
    try {
      const response = await api.post(`/resumes/tailor/${resumeId}/${jobId}`, options);
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

  // NEW: Get AI-generated job suggestions based on resume analysis
  getJobSuggestions: async (resumeId) => {
    try {
      console.log('🔍 Fetching AI job suggestions for resume:', resumeId);
      const response = await api.get(`/resumes/${resumeId}/job-suggestions`);
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
