// src/components/jobs/hooks/useJobAnalysis.js
import { useState, useEffect, useCallback } from 'react';
import jobService from '../../../utils/jobService';

/**
 * Custom hook for managing job analysis status and polling
 * @param {string} jobId - The ID of the job to monitor
 * @param {Object} options - Configuration options
 * @returns {Object} Analysis status and control functions
 */
export const useJobAnalysis = (jobId, options = {}) => {
  const {
    autoStart = true,
    pollInterval = 2000,
    maxAttempts = 30,
    onComplete = null,
    onError = null,
    onProgress = null
  } = options;

  const [analysisStatus, setAnalysisStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  // Check if analysis is complete
  const isComplete = analysisStatus?.status === 'completed' || analysisStatus?.status === 'error';
  const canViewJob = analysisStatus?.canViewJob === true;

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    if (!jobId) return null;

    try {
      const response = await jobService.getJobAnalysisStatus(jobId);
      const status = response.analysisStatus;
      
      setAnalysisStatus(status);
      setError(null);
      
      // Call progress callback
      if (onProgress && typeof onProgress === 'function') {
        onProgress(status);
      }
      
      return status;
    } catch (err) {
      console.error('Error fetching job analysis status:', err);
      setError(err.message || 'Failed to fetch analysis status');
      
      if (onError && typeof onError === 'function') {
        onError(err);
      }
      
      return null;
    }
  }, [jobId, onProgress, onError]);

  // Start polling for status updates
  const startPolling = useCallback(async () => {
    if (!jobId || isPolling) return;

    setIsPolling(true);
    setAttempts(0);
    setError(null);

    let currentAttempts = 0;
    let pollTimeoutId;

    const poll = async () => {
      try {
        currentAttempts++;
        setAttempts(currentAttempts);

        const status = await fetchStatus();
        
        if (!status) {
          throw new Error('Failed to fetch status');
        }

        // Check if analysis is complete
        if (status.status === 'completed' || status.status === 'error') {
          setIsPolling(false);
          
          if (onComplete && typeof onComplete === 'function') {
            onComplete(status);
          }
          
          return;
        }

        // Check if we've reached max attempts
        if (currentAttempts >= maxAttempts) {
          setIsPolling(false);
          const timeoutError = new Error('Analysis polling timed out');
          setError(timeoutError.message);
          
          if (onError && typeof onError === 'function') {
            onError(timeoutError);
          }
          
          return;
        }

        // Schedule next poll
        pollTimeoutId = setTimeout(poll, pollInterval);
        
      } catch (err) {
        console.error('Error during polling:', err);
        setIsPolling(false);
        setError(err.message || 'Polling failed');
        
        if (onError && typeof onError === 'function') {
          onError(err);
        }
      }
    };

    // Start polling
    await poll();

    // Return cleanup function
    return () => {
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
      }
      setIsPolling(false);
    };
  }, [jobId, isPolling, fetchStatus, pollInterval, maxAttempts, onComplete, onError]);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Reset analysis status
  const reset = useCallback(() => {
    setAnalysisStatus(null);
    setError(null);
    setAttempts(0);
    setIsPolling(false);
  }, []);

  // Auto-start polling if job needs analysis
  useEffect(() => {
    if (!autoStart || !jobId) return;

    const initializeAnalysis = async () => {
      const status = await fetchStatus();
      
      // Start polling if analysis is in progress
      if (status && (status.status === 'pending' || status.status === 'analyzing')) {
        startPolling();
      }
    };

    initializeAnalysis();
  }, [jobId, autoStart, fetchStatus, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsPolling(false);
    };
  }, []);

  return {
    // Status data
    analysisStatus,
    isPolling,
    error,
    attempts,
    
    // Computed states
    isComplete,
    canViewJob,
    isPending: analysisStatus?.status === 'pending',
    isAnalyzing: analysisStatus?.status === 'analyzing',
    hasError: analysisStatus?.status === 'error',
    progress: analysisStatus?.progress || 0,
    message: analysisStatus?.message || '',
    skillsFound: analysisStatus?.skillsFound || 0,
    experienceLevel: analysisStatus?.experienceLevel,
    
    // Control functions
    startPolling,
    stopPolling,
    fetchStatus,
    reset
  };
};

/**
 * Hook for managing multiple job analysis statuses
 * @param {Array} jobIds - Array of job IDs to monitor
 * @param {Object} options - Configuration options
 * @returns {Object} Analysis statuses and control functions
 */
export const useMultipleJobAnalysis = (jobIds = [], options = {}) => {
  const [statuses, setStatuses] = useState({});
  const [pollingJobs, setPollingJobs] = useState(new Set());

  const updateJobStatus = useCallback((jobId, status) => {
    setStatuses(prev => ({
      ...prev,
      [jobId]: status
    }));
  }, []);

  const startPollingJob = useCallback(async (jobId) => {
    if (pollingJobs.has(jobId)) return;

    setPollingJobs(prev => new Set([...prev, jobId]));

    try {
      await jobService.pollJobAnalysisStatus(
        jobId,
        (status) => updateJobStatus(jobId, status),
        options.maxAttempts || 30
      );
    } catch (error) {
      console.error(`Polling failed for job ${jobId}:`, error);
      updateJobStatus(jobId, {
        status: 'error',
        message: 'Polling failed',
        progress: 0
      });
    } finally {
      setPollingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      });
    }
  }, [pollingJobs, updateJobStatus, options.maxAttempts]);

  // Initialize polling for jobs that need it
  useEffect(() => {
    jobIds.forEach(async (jobId) => {
      if (!statuses[jobId] && !pollingJobs.has(jobId)) {
        try {
          const response = await jobService.getJobAnalysisStatus(jobId);
          const status = response.analysisStatus;
          
          updateJobStatus(jobId, status);
          
          // Start polling if needed
          if (status.status === 'pending' || status.status === 'analyzing') {
            startPollingJob(jobId);
          }
        } catch (error) {
          console.error(`Error fetching status for job ${jobId}:`, error);
        }
      }
    });
  }, [jobIds, statuses, pollingJobs, updateJobStatus, startPollingJob]);

  const getJobStatus = useCallback((jobId) => {
    return statuses[jobId] || null;
  }, [statuses]);

  const isJobPolling = useCallback((jobId) => {
    return pollingJobs.has(jobId);
  }, [pollingJobs]);

  const getAnalyzingCount = useCallback(() => {
    return Object.values(statuses).filter(status => 
      status.status === 'pending' || status.status === 'analyzing'
    ).length;
  }, [statuses]);

  const getCompletedCount = useCallback(() => {
    return Object.values(statuses).filter(status => 
      status.status === 'completed'
    ).length;
  }, [statuses]);

  const getErrorCount = useCallback(() => {
    return Object.values(statuses).filter(status => 
      status.status === 'error'
    ).length;
  }, [statuses]);

  return {
    statuses,
    pollingJobs,
    getJobStatus,
    isJobPolling,
    getAnalyzingCount,
    getCompletedCount,
    getErrorCount,
    updateJobStatus,
    startPollingJob
  };
};

export default useJobAnalysis;