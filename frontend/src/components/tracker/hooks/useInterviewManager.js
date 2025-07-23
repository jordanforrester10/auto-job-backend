// frontend/src/components/tracker/hooks/useInterviewManager.js - Interview management hook
import { useState, useCallback } from 'react';
import trackerService from '../../../utils/trackerService';

const useInterviewManager = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Add interview to tracked job
  const addInterview = useCallback(async (jobId, interviewData) => {
    try {
      setIsLoading(true);
      setError(null);

      const interview = await trackerService.addInterview(jobId, interviewData);

      return interview;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to add interview';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update existing interview
  const updateInterview = useCallback(async (jobId, interviewId, interviewData) => {
    try {
      setIsLoading(true);
      setError(null);

      const updatedInterview = await trackerService.updateInterview(jobId, interviewId, interviewData);

      return updatedInterview;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update interview';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Delete interview
  const deleteInterview = useCallback(async (jobId, interviewId) => {
    try {
      setIsLoading(true);
      setError(null);

      await trackerService.deleteInterview(jobId, interviewId);

      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete interview';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate interview data
  const validateInterviewData = useCallback((data) => {
    const errors = [];

    if (!data.type) {
      errors.push('Interview type is required');
    }

    if (!data.scheduledDate) {
      errors.push('Interview date is required');
    } else {
      const interviewDate = new Date(data.scheduledDate);
      if (isNaN(interviewDate.getTime())) {
        errors.push('Invalid interview date');
      }
    }

    if (data.preparationNotes && data.preparationNotes.length > 2000) {
      errors.push('Preparation notes cannot exceed 2000 characters');
    }

    if (data.feedback && data.feedback.length > 2000) {
      errors.push('Feedback cannot exceed 2000 characters');
    }

    if (data.interviewer) {
      if (data.interviewer.name && data.interviewer.name.length > 100) {
        errors.push('Interviewer name cannot exceed 100 characters');
      }
      if (data.interviewer.role && data.interviewer.role.length > 100) {
        errors.push('Interviewer role cannot exceed 100 characters');
      }
      if (data.interviewer.contact && data.interviewer.contact.length > 200) {
        errors.push('Interviewer contact cannot exceed 200 characters');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, []);

  // Get interview type display info
  const getInterviewTypeInfo = useCallback((type) => {
    const typeMap = {
      phone: { label: 'Phone Screen', color: '#2196f3', icon: '📞' },
      video: { label: 'Video Call', color: '#4caf50', icon: '📹' },
      onsite: { label: 'On-site', color: '#ff9800', icon: '🏢' },
      technical: { label: 'Technical', color: '#9c27b0', icon: '💻' },
      behavioral: { label: 'Behavioral', color: '#607d8b', icon: '🧠' },
      final: { label: 'Final Round', color: '#f44336', icon: '🎯' },
      other: { label: 'Other', color: '#795548', icon: '📋' }
    };
    return typeMap[type] || typeMap.other;
  }, []);

  // Get interview outcome display info
  const getInterviewOutcomeInfo = useCallback((outcome) => {
    const outcomeMap = {
      pending: { label: 'Pending', color: '#ff9800', icon: '⏳' },
      passed: { label: 'Passed', color: '#4caf50', icon: '✅' },
      failed: { label: 'Failed', color: '#f44336', icon: '❌' },
      cancelled: { label: 'Cancelled', color: '#9e9e9e', icon: '🚫' },
      rescheduled: { label: 'Rescheduled', color: '#2196f3', icon: '📅' }
    };
    return outcomeMap[outcome] || outcomeMap.pending;
  }, []);

  // Helper to get upcoming interviews from job data
  const getUpcomingInterviews = useCallback((trackedJobs = []) => {
    const now = new Date();
    const upcomingInterviews = [];

    trackedJobs.forEach(job => {
      if (job.interviews && job.interviews.length > 0) {
        job.interviews.forEach(interview => {
          const interviewDate = new Date(interview.scheduledDate);
          if (interviewDate > now && interview.outcome === 'pending') {
            upcomingInterviews.push({
              ...interview,
              jobId: job._id,
              jobTitle: job.jobDetails?.[0]?.title || 'Unknown Job',
              company: job.jobDetails?.[0]?.company || 'Unknown Company'
            });
          }
        });
      }
    });

    // Sort by date (earliest first)
    return upcomingInterviews.sort((a, b) => 
      new Date(a.scheduledDate) - new Date(b.scheduledDate)
    );
  }, []);

  // Helper to get past interviews from job data
  const getPastInterviews = useCallback((trackedJobs = []) => {
    const now = new Date();
    const pastInterviews = [];

    trackedJobs.forEach(job => {
      if (job.interviews && job.interviews.length > 0) {
        job.interviews.forEach(interview => {
          const interviewDate = new Date(interview.scheduledDate);
          if (interviewDate <= now || interview.outcome !== 'pending') {
            pastInterviews.push({
              ...interview,
              jobId: job._id,
              jobTitle: job.jobDetails?.[0]?.title || 'Unknown Job',
              company: job.jobDetails?.[0]?.company || 'Unknown Company'
            });
          }
        });
      }
    });

    // Sort by date (most recent first)
    return pastInterviews.sort((a, b) => 
      new Date(b.scheduledDate) - new Date(a.scheduledDate)
    );
  }, []);

  // Helper to get interview statistics from job data
  const getInterviewStats = useCallback((trackedJobs = []) => {
    const stats = {
      total: 0,
      upcoming: 0,
      completed: 0,
      passed: 0,
      failed: 0,
      cancelled: 0,
      byType: {},
      thisWeek: 0,
      thisMonth: 0
    };

    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    trackedJobs.forEach(job => {
      if (job.interviews && job.interviews.length > 0) {
        job.interviews.forEach(interview => {
          stats.total++;

          // Count by outcome
          if (interview.outcome === 'pending') {
            const interviewDate = new Date(interview.scheduledDate);
            if (interviewDate > now) {
              stats.upcoming++;
            } else {
              stats.completed++;
            }
          } else {
            stats.completed++;
            stats[interview.outcome] = (stats[interview.outcome] || 0) + 1;
          }

          // Count by type
          stats.byType[interview.type] = (stats.byType[interview.type] || 0) + 1;

          // Count by time period
          const interviewDate = new Date(interview.scheduledDate);
          if (interviewDate >= weekStart) {
            stats.thisWeek++;
          }
          if (interviewDate >= monthStart) {
            stats.thisMonth++;
          }
        });
      }
    });

    return stats;
  }, []);

  return {
    // State
    isLoading,
    error,

    // Actions
    addInterview,
    updateInterview,
    deleteInterview,
    clearError,

    // Data helpers (require job data to be passed in)
    getUpcomingInterviews,
    getPastInterviews,
    getInterviewStats,

    // Utilities
    validateInterviewData,
    getInterviewTypeInfo,
    getInterviewOutcomeInfo
  };
};

export default useInterviewManager;
