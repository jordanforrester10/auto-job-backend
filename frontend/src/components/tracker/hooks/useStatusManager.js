// frontend/src/components/tracker/hooks/useStatusManager.js - Status workflow management hook
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import trackerService from '../../../utils/trackerService';

const useStatusManager = () => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  // Status progression mapping
  const statusProgression = {
    interested: { order: 1, label: 'Interested', next: 'applied' },
    applied: { order: 2, label: 'Applied', next: 'interviewing' },
    interviewing: { order: 3, label: 'Interviewing', next: 'closed' },
    closed: { order: 4, label: 'Closed', next: null }
  };

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Validate status transition
  const validateStatusTransition = useCallback((fromStatus, toStatus) => {
    const fromOrder = statusProgression[fromStatus]?.order || 1;
    const toOrder = statusProgression[toStatus]?.order || 1;
    
    return {
      isValid: true, // All transitions are allowed with confirmation
      isBackward: toOrder < fromOrder,
      isForward: toOrder > fromOrder,
      skipSteps: Math.abs(toOrder - fromOrder) > 1
    };
  }, []);

  // Get next logical status
  const getNextStatus = useCallback((currentStatus) => {
    const current = statusProgression[currentStatus];
    return current?.next || null;
  }, []);

  // Get previous status
  const getPreviousStatus = useCallback((currentStatus) => {
    const currentOrder = statusProgression[currentStatus]?.order || 1;
    const previousOrder = currentOrder - 1;
    
    return Object.keys(statusProgression).find(
      status => statusProgression[status].order === previousOrder
    ) || null;
  }, []);

  // Get status suggestions based on current status
  const getStatusSuggestions = useCallback((currentStatus) => {
    const suggestions = [];
    const current = statusProgression[currentStatus];
    
    if (!current) return suggestions;

    // Add next status if available
    if (current.next) {
      const nextInfo = trackerService.getStatusInfo(current.next);
      suggestions.push({
        status: current.next,
        label: nextInfo.label,
        description: `Move to ${nextInfo.label}`,
        type: 'forward',
        priority: 'high'
      });
    }

    // Add skip-ahead options
    if (currentStatus === 'interested') {
      suggestions.push({
        status: 'interviewing',
        label: 'Skip to Interviewing',
        description: 'Skip application step if you have direct contact',
        type: 'skip',
        priority: 'medium'
      });
    }

    // Add backward options with warnings
    const previous = getPreviousStatus(currentStatus);
    if (previous) {
      const prevInfo = trackerService.getStatusInfo(previous);
      suggestions.push({
        status: previous,
        label: `Back to ${prevInfo.label}`,
        description: 'Move back to previous status',
        type: 'backward',
        priority: 'low',
        warning: true
      });
    }

    return suggestions;
  }, [getPreviousStatus]);

  // Update job status with validation and activity logging
  const updateJobStatus = useCallback(async (jobId, newStatus, note = '', additionalData = {}) => {
    try {
      setIsUpdating(true);
      setError(null);

      // Get current job data for validation
      const currentJob = queryClient.getQueryData(['trackedJobs'])?.find(job => job._id === jobId);
      const currentStatus = currentJob?.status || 'interested';

      // Validate transition
      const validation = validateStatusTransition(currentStatus, newStatus);
      
      // Prepare update data
      const updateData = {
        status: newStatus,
        note: note.trim() || undefined,
        ...additionalData
      };

      // Add automatic date tracking
      const now = new Date();
      switch (newStatus) {
        case 'applied':
          updateData.appliedDate = now;
          break;
        case 'interviewing':
          updateData.interviewingDate = now;
          break;
        case 'closed':
          updateData.closedDate = now;
          break;
      }

      // Add transition metadata
      updateData.statusTransition = {
        from: currentStatus,
        to: newStatus,
        isBackward: validation.isBackward,
        timestamp: now
      };

      // Call API
      const updatedJob = await trackerService.updateTrackedJob(jobId, updateData);

      // Update cache optimistically
      queryClient.setQueryData(['trackedJobs'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.map(job => 
          job._id === jobId ? { ...job, ...updatedJob } : job
        );
      });

      // Invalidate related queries
      queryClient.invalidateQueries(['trackedJobs']);
      queryClient.invalidateQueries(['trackerStats']);
      queryClient.invalidateQueries(['jobActivity', jobId]);

      return updatedJob;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update status';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  }, [queryClient, validateStatusTransition]);

  // Bulk status update
  const bulkUpdateStatus = useCallback(async (jobIds, newStatus, note = '') => {
    if (jobIds.length > 25) {
      throw new Error('Cannot update more than 25 jobs at once');
    }

    try {
      setIsUpdating(true);
      setError(null);

      const results = await Promise.allSettled(
        jobIds.map(jobId => updateJobStatus(jobId, newStatus, note))
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      if (failed > 0) {
        const failedReasons = results
          .filter(result => result.status === 'rejected')
          .map(result => result.reason.message)
          .join(', ');
        
        throw new Error(`${successful} jobs updated successfully, ${failed} failed: ${failedReasons}`);
      }

      return { successful, failed };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [updateJobStatus]);

  // Get status statistics
  const getStatusStats = useCallback((jobs) => {
    const stats = {
      interested: 0,
      applied: 0,
      interviewing: 0,
      closed: 0,
      total: jobs.length
    };

    jobs.forEach(job => {
      const status = job.status || 'interested';
      if (stats.hasOwnProperty(status)) {
        stats[status]++;
      }
    });

    // Calculate percentages
    stats.percentages = {};
    Object.keys(stats).forEach(key => {
      if (key !== 'total' && key !== 'percentages') {
        stats.percentages[key] = stats.total > 0 ? (stats[key] / stats.total) * 100 : 0;
      }
    });

    return stats;
  }, []);

  // Get jobs needing status updates
  const getJobsNeedingUpdates = useCallback((jobs) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    return {
      staleInterested: jobs.filter(job => 
        job.status === 'interested' && 
        new Date(job.updatedAt) < sevenDaysAgo
      ),
      staleApplied: jobs.filter(job => 
        job.status === 'applied' && 
        new Date(job.updatedAt) < fourteenDaysAgo
      ),
      longInterviewing: jobs.filter(job => 
        job.status === 'interviewing' && 
        new Date(job.updatedAt) < fourteenDaysAgo
      )
    };
  }, []);

  // Auto-suggest status updates
  const getAutoSuggestions = useCallback((job) => {
    const suggestions = [];
    const now = new Date();
    const jobDate = new Date(job.updatedAt);
    const daysSinceUpdate = Math.floor((now - jobDate) / (1000 * 60 * 60 * 24));

    switch (job.status) {
      case 'interested':
        if (daysSinceUpdate >= 7) {
          suggestions.push({
            type: 'action',
            message: 'Consider applying or moving to closed',
            actions: ['applied', 'closed']
          });
        }
        break;
      
      case 'applied':
        if (daysSinceUpdate >= 14) {
          suggestions.push({
            type: 'followup',
            message: 'Consider following up or updating status',
            actions: ['interviewing', 'closed']
          });
        }
        break;
      
      case 'interviewing':
        if (daysSinceUpdate >= 10) {
          suggestions.push({
            type: 'update',
            message: 'Update interview outcome',
            actions: ['closed']
          });
        }
        break;
    }

    return suggestions;
  }, []);

  return {
    // State
    isUpdating,
    error,
    
    // Actions
    updateJobStatus,
    bulkUpdateStatus,
    clearError,
    
    // Validation
    validateStatusTransition,
    
    // Utilities
    getNextStatus,
    getPreviousStatus,
    getStatusSuggestions,
    getStatusStats,
    getJobsNeedingUpdates,
    getAutoSuggestions,
    
    // Constants
    statusProgression
  };
};

export default useStatusManager;
