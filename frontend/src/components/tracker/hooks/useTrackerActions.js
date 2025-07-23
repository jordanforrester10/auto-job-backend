// frontend/src/components/tracker/hooks/useTrackerActions.js - Actions hook for tracked jobs
import { useState, useCallback } from 'react';
import trackerService from '../../../utils/trackerService';

export const useTrackerActions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear error
  const clearError = useCallback(() => {
    setError('');
  }, []);

  // Track a new job
  const trackJob = useCallback(async (jobData) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('📝 Tracking new job:', jobData);
      
      const response = await trackerService.trackJob(jobData);
      
      console.log('✅ Job tracked successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: 'Job tracked successfully'
      };
      
    } catch (err) {
      console.error('❌ Error tracking job:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to track job';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update job status
  const updateJobStatus = useCallback(async (jobId, status, note = null) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`🔄 Updating job ${jobId} status to ${status}`);
      
      const response = await trackerService.updateJobStatus(jobId, status, note);
      
      console.log('✅ Job status updated successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: `Status updated to ${status}`
      };
      
    } catch (err) {
      console.error('❌ Error updating job status:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update job status';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add note to job
  const addJobNote = useCallback(async (jobId, note) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`📝 Adding note to job ${jobId}`);
      
      const response = await trackerService.addJobNote(jobId, note);
      
      console.log('✅ Note added successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: 'Note added successfully'
      };
      
    } catch (err) {
      console.error('❌ Error adding job note:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add note';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update tracked job (general update)
  const updateTrackedJob = useCallback(async (jobId, updates) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`🔄 Updating job ${jobId}:`, updates);
      
      const response = await trackerService.updateTrackedJob(jobId, updates);
      
      console.log('✅ Job updated successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: 'Job updated successfully'
      };
      
    } catch (err) {
      console.error('❌ Error updating job:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update job';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete tracked job
  const deleteTrackedJob = useCallback(async (jobId) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`🗑️ Deleting job ${jobId}`);
      
      const response = await trackerService.deleteTrackedJob(jobId);
      
      console.log('✅ Job deleted successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: 'Job removed from tracker'
      };
      
    } catch (err) {
      console.error('❌ Error deleting job:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete job';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Archive job
  const archiveJob = useCallback(async (jobId, reason = '') => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`📦 Archiving job ${jobId}`);
      
      const response = await trackerService.archiveTrackedJob(jobId, reason);
      
      console.log('✅ Job archived successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: 'Job archived successfully'
      };
      
    } catch (err) {
      console.error('❌ Error archiving job:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to archive job';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Restore archived job
  const restoreJob = useCallback(async (jobId) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`📤 Restoring job ${jobId}`);
      
      const response = await trackerService.restoreTrackedJob(jobId);
      
      console.log('✅ Job restored successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: 'Job restored successfully'
      };
      
    } catch (err) {
      console.error('❌ Error restoring job:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to restore job';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add interview to job
  const addInterview = useCallback(async (jobId, interviewData) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`📅 Adding interview to job ${jobId}:`, interviewData);
      
      const response = await trackerService.addInterview(jobId, interviewData);
      
      console.log('✅ Interview added successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: 'Interview scheduled successfully'
      };
      
    } catch (err) {
      console.error('❌ Error adding interview:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add interview';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bulk actions
  const archiveAllClosed = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log('📦 Archiving all closed jobs');
      
      const response = await trackerService.archiveAllClosed();
      
      console.log('✅ Closed jobs archived successfully:', response);
      
      return {
        success: true,
        data: response.data || response,
        message: `${response.data?.archivedCount || 0} closed jobs archived`
      };
      
    } catch (err) {
      console.error('❌ Error archiving closed jobs:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to archive closed jobs';
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage,
        message: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validation helpers
  const validateJobData = useCallback((jobData) => {
    const validation = trackerService.validateTrackingData(jobData);
    
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
    }
    
    return validation;
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Actions
    trackJob,
    updateJobStatus,
    addJobNote,
    updateTrackedJob,
    deleteTrackedJob,
    archiveJob,
    restoreJob,
    addInterview,
    archiveAllClosed,
    
    // Utilities
    clearError,
    validateJobData
  };
};

export default useTrackerActions;
