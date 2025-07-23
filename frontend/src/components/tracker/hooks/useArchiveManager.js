// frontend/src/components/tracker/hooks/useArchiveManager.js - Archive operations and management hook
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import trackerService from '../../../utils/trackerService';

const useArchiveManager = () => {
  const queryClient = useQueryClient();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [recentArchives, setRecentArchives] = useState([]);

  // Constants
  const BULK_LIMIT = 25;
  const AUTO_CLEANUP_DAYS = 90;
  const UNDO_TIMEOUT = 30000; // 30 seconds

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Archive single job
  const archiveJob = useCallback(async (jobId, reason = '') => {
    try {
      setIsArchiving(true);
      setError(null);

      const archivedJob = await trackerService.archiveTrackedJob(jobId, reason);
      
      // Add to recent archives for undo functionality
      const archiveRecord = {
        id: jobId,
        job: archivedJob,
        timestamp: new Date(),
        reason
      };
      
      setRecentArchives(prev => [archiveRecord, ...prev.slice(0, 9)]); // Keep last 10

      // Update cache
      queryClient.setQueryData(['trackedJobs'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(job => job._id !== jobId);
      });

      // Invalidate related queries
      queryClient.invalidateQueries(['trackedJobs']);
      queryClient.invalidateQueries(['archivedJobs']);
      queryClient.invalidateQueries(['trackerStats']);

      // Set up auto-remove from recent archives
      setTimeout(() => {
        setRecentArchives(prev => prev.filter(item => item.id !== jobId));
      }, UNDO_TIMEOUT);

      return archivedJob;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to archive job';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsArchiving(false);
    }
  }, [queryClient]);

  // Archive multiple jobs
  const archiveJobs = useCallback(async (jobIds, reason = '') => {
    if (jobIds.length > BULK_LIMIT) {
      throw new Error(`Cannot archive more than ${BULK_LIMIT} jobs at once`);
    }

    try {
      setIsArchiving(true);
      setError(null);

      const results = await Promise.allSettled(
        jobIds.map(jobId => trackerService.archiveTrackedJob(jobId, reason))
      );

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      // Add successful archives to recent for undo
      const archiveRecords = successful.map((result, index) => ({
        id: jobIds[index],
        job: result.value,
        timestamp: new Date(),
        reason,
        isBulk: true
      }));

      setRecentArchives(prev => [...archiveRecords, ...prev].slice(0, 10));

      // Update cache
      queryClient.setQueryData(['trackedJobs'], (oldData) => {
        if (!oldData) return oldData;
        const successfulIds = successful.map((_, index) => jobIds[index]);
        return oldData.filter(job => !successfulIds.includes(job._id));
      });

      // Invalidate queries
      queryClient.invalidateQueries(['trackedJobs']);
      queryClient.invalidateQueries(['archivedJobs']);
      queryClient.invalidateQueries(['trackerStats']);

      if (failed.length > 0) {
        const failedReasons = failed.map(result => result.reason.message).join(', ');
        throw new Error(`${successful.length} jobs archived, ${failed.length} failed: ${failedReasons}`);
      }

      return { successful: successful.length, failed: failed.length };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsArchiving(false);
    }
  }, [queryClient]);

  // Archive all closed jobs
  const archiveAllClosed = useCallback(async (reason = 'Bulk archive of closed jobs') => {
    try {
      setIsArchiving(true);
      setError(null);

      // Get all closed jobs
      const trackedJobs = queryClient.getQueryData(['trackedJobs']) || [];
      const closedJobs = trackedJobs.filter(job => job.status === 'closed');

      if (closedJobs.length === 0) {
        throw new Error('No closed jobs to archive');
      }

      if (closedJobs.length > BULK_LIMIT) {
        throw new Error(`Too many closed jobs (${closedJobs.length}). Please archive in smaller batches.`);
      }

      const jobIds = closedJobs.map(job => job._id);
      return await archiveJobs(jobIds, reason);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsArchiving(false);
    }
  }, [queryClient, archiveJobs]);

  // Restore single job
  const restoreJob = useCallback(async (jobId) => {
    try {
      setIsRestoring(true);
      setError(null);

      const restoredJob = await trackerService.restoreTrackedJob(jobId);

      // Remove from recent archives if present
      setRecentArchives(prev => prev.filter(item => item.id !== jobId));

      // Update cache
      queryClient.setQueryData(['trackedJobs'], (oldData) => {
        if (!oldData) return [restoredJob];
        return [...oldData, restoredJob];
      });

      queryClient.setQueryData(['archivedJobs'], (oldData) => {
        if (!oldData) return oldData;
        return oldData.filter(job => job._id !== jobId);
      });

      // Invalidate queries
      queryClient.invalidateQueries(['trackedJobs']);
      queryClient.invalidateQueries(['archivedJobs']);
      queryClient.invalidateQueries(['trackerStats']);

      return restoredJob;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to restore job';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsRestoring(false);
    }
  }, [queryClient]);

  // Restore multiple jobs
  const restoreJobs = useCallback(async (jobIds) => {
    if (jobIds.length > BULK_LIMIT) {
      throw new Error(`Cannot restore more than ${BULK_LIMIT} jobs at once`);
    }

    try {
      setIsRestoring(true);
      setError(null);

      const results = await Promise.allSettled(
        jobIds.map(jobId => trackerService.restoreTrackedJob(jobId))
      );

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      // Update cache
      const restoredJobs = successful.map(result => result.value);
      
      queryClient.setQueryData(['trackedJobs'], (oldData) => {
        if (!oldData) return restoredJobs;
        return [...oldData, ...restoredJobs];
      });

      queryClient.setQueryData(['archivedJobs'], (oldData) => {
        if (!oldData) return oldData;
        const successfulIds = successful.map((_, index) => jobIds[index]);
        return oldData.filter(job => !successfulIds.includes(job._id));
      });

      // Invalidate queries
      queryClient.invalidateQueries(['trackedJobs']);
      queryClient.invalidateQueries(['archivedJobs']);
      queryClient.invalidateQueries(['trackerStats']);

      if (failed.length > 0) {
        const failedReasons = failed.map(result => result.reason.message).join(', ');
        throw new Error(`${successful.length} jobs restored, ${failed.length} failed: ${failedReasons}`);
      }

      return { successful: successful.length, failed: failed.length };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, [queryClient]);

  // Undo recent archive
  const undoArchive = useCallback(async (archiveId) => {
    const archiveRecord = recentArchives.find(item => item.id === archiveId);
    if (!archiveRecord) {
      throw new Error('Archive record not found or undo period expired');
    }

    try {
      await restoreJob(archiveId);
      setRecentArchives(prev => prev.filter(item => item.id !== archiveId));
      return archiveRecord.job;
    } catch (err) {
      throw new Error(`Failed to undo archive: ${err.message}`);
    }
  }, [recentArchives, restoreJob]);

  // Get archive statistics
  const getArchiveStats = useCallback(async () => {
    try {
      const stats = await trackerService.getArchiveStats();
      return {
        totalArchived: stats.totalArchived || 0,
        storageUsed: stats.storageUsed || 0,
        oldestArchive: stats.oldestArchive,
        newestArchive: stats.newestArchive,
        cleanupWarnings: stats.cleanupWarnings || [],
        byStatus: stats.byStatus || {},
        byMonth: stats.byMonth || {}
      };
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // Get jobs approaching cleanup
  const getCleanupWarnings = useCallback(async () => {
    try {
      const warnings = await trackerService.getCleanupWarnings();
      return warnings.map(warning => ({
        ...warning,
        daysUntilCleanup: Math.ceil(
          (new Date(warning.cleanupDate) - new Date()) / (1000 * 60 * 60 * 24)
        )
      }));
    } catch (err) {
      setError(err.message);
      return [];
    }
  }, []);

  // Extend cleanup date for jobs
  const extendCleanup = useCallback(async (jobIds, additionalDays = 90) => {
    try {
      const results = await trackerService.extendCleanupDate(jobIds, additionalDays);
      
      // Invalidate archive queries
      queryClient.invalidateQueries(['archivedJobs']);
      queryClient.invalidateQueries(['cleanupWarnings']);
      
      return results;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [queryClient]);

  // Export archived jobs to CSV
  const exportArchive = useCallback(async (filters = {}) => {
    try {
      const csvData = await trackerService.exportArchivedJobs(filters);
      
      // Create and trigger download
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `archived-jobs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Get storage usage breakdown
  const getStorageBreakdown = useCallback((archivedJobs) => {
    const breakdown = {
      totalJobs: archivedJobs.length,
      estimatedSize: archivedJobs.length * 0.1, // MB estimate
      byStatus: {},
      byAge: {
        recent: 0, // < 30 days
        medium: 0, // 30-90 days
        old: 0     // > 90 days
      }
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    archivedJobs.forEach(job => {
      // By status
      const status = job.status || 'unknown';
      breakdown.byStatus[status] = (breakdown.byStatus[status] || 0) + 1;

      // By age
      const archivedDate = new Date(job.archivedAt || job.updatedAt);
      if (archivedDate > thirtyDaysAgo) {
        breakdown.byAge.recent++;
      } else if (archivedDate > ninetyDaysAgo) {
        breakdown.byAge.medium++;
      } else {
        breakdown.byAge.old++;
      }
    });

    return breakdown;
  }, []);

  return {
    // State
    isArchiving,
    isRestoring,
    error,
    recentArchives,

    // Single job operations
    archiveJob,
    restoreJob,
    undoArchive,

    // Bulk operations
    archiveJobs,
    restoreJobs,
    archiveAllClosed,

    // Statistics and management
    getArchiveStats,
    getCleanupWarnings,
    extendCleanup,
    exportArchive,
    getStorageBreakdown,

    // Utilities
    clearError,

    // Constants
    BULK_LIMIT,
    AUTO_CLEANUP_DAYS,
    UNDO_TIMEOUT
  };
};

export default useArchiveManager;
