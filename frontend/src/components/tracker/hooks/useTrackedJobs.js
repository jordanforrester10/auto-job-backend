// frontend/src/components/tracker/hooks/useTrackedJobs.js - Data fetching hook for tracked jobs
// frontend/src/components/tracker/hooks/useTrackedJobs.js - Data fetching hook for tracked jobs (FIXED)
import { useState, useEffect, useCallback, useRef } from 'react';
import trackerService from '../../../utils/trackerService';

export const useTrackedJobs = (initialFilters = {}) => {
  const [trackedJobs, setTrackedJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({});
  const mountedRef = useRef(true);

  // Create initial filters state
  const [filters, setFilters] = useState(() => ({
    status: 'all',
    priority: 'all',
    archived: 'false',
    search: '',
    sortBy: 'lastActivity',
    sortOrder: 'desc',
    page: 1,
    limit: 20,
    includeArchived: 'false',
    ...initialFilters
  }));

  // Reset filters when initialFilters change (important for tab switching)
  // Use a stringified version to avoid infinite loops
  const initialFiltersString = JSON.stringify(initialFilters);
  useEffect(() => {
    console.log('🔄 Initial filters changed:', initialFilters);
    const newFilters = {
      status: 'all',
      priority: 'all',
      archived: 'false',
      search: '',
      sortBy: 'lastActivity',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
      includeArchived: 'false',
      ...initialFilters
    };
    console.log('🔧 Setting new filters:', newFilters);
    setFilters(newFilters);
  }, [initialFiltersString]); // Use stringified version

  // Fetch tracked jobs
  const fetchTrackedJobs = useCallback(async (force = false) => {
    try {
      if (!mountedRef.current) return;
      
      if (!force && !isLoading) {
        setIsLoading(true);
      }
      
      console.log('🔍 Fetching tracked jobs with filters:', filters);
      
      const response = await trackerService.getTrackedJobs(filters);
      
      if (!mountedRef.current) return;
      
      console.log('📊 Tracked jobs response:', response);
      
      // FIXED: Handle the correct response structure
      if (response) {
        const jobs = response.trackedJobs || response.data?.trackedJobs || response || [];
        const paginationData = response.pagination || response.data?.pagination || {};
        
        console.log('✅ Setting tracked jobs:', jobs);
        console.log('✅ Setting pagination:', paginationData);
        
        setTrackedJobs(Array.isArray(jobs) ? jobs : []);
        setPagination(paginationData);
        setError('');
      } else {
        console.log('⚠️ No response data, setting empty arrays');
        setTrackedJobs([]);
        setPagination({});
      }
      
    } catch (err) {
      console.error('❌ Error fetching tracked jobs:', err);
      if (mountedRef.current) {
        setError('Failed to load tracked jobs');
        setTrackedJobs([]);
        setPagination({});
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [filters, isLoading]);

  // Effect to fetch data when filters change
  useEffect(() => {
    console.log('🔄 Filters changed, fetching data:', filters);
    fetchTrackedJobs(true);
  }, [filters]); // Only depend on filters, not the fetchTrackedJobs function

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Computed values
  const jobsByStatus = trackedJobs.reduce((acc, job) => {
    const status = job.status || 'interested';
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(job);
    return acc;
  }, {});

  const statusCounts = {
    interested: jobsByStatus.interested?.length || 0,
    applied: jobsByStatus.applied?.length || 0,
    interviewing: jobsByStatus.interviewing?.length || 0,
    closed: jobsByStatus.closed?.length || 0,
    total: trackedJobs.length
  };

  const jobsNeedingFollowUp = trackedJobs.filter(job => 
    trackerService.needsFollowUp(job.lastActivity, 7)
  );

  const jobsWithUpcomingInterviews = trackedJobs.filter(job => {
    const upcomingInterviews = trackerService.getUpcomingInterviews(job);
    return upcomingInterviews.length > 0;
  });

  const recentlyAddedJobs = trackedJobs.filter(job => 
    trackerService.isRecentlyAdded(job.createdAt)
  );

  // Filter update functions
  const updateFilters = useCallback((newFilters) => {
    console.log('🔧 Updating filters with:', newFilters);
    setFilters(prev => {
      const updated = {
        ...prev,
        ...newFilters,
        page: 1 // Reset to first page when filters change
      };
      console.log('🔧 Updated filters result:', updated);
      return updated;
    });
  }, []);

  const updateStatus = useCallback((status) => {
    updateFilters({ status });
  }, [updateFilters]);

  const updatePriority = useCallback((priority) => {
    updateFilters({ priority });
  }, [updateFilters]);

  const updateSearch = useCallback((search) => {
    updateFilters({ search });
  }, [updateFilters]);

  const updateSort = useCallback((sortBy, sortOrder = 'desc') => {
    updateFilters({ sortBy, sortOrder });
  }, [updateFilters]);

  const updatePage = useCallback((page) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const toggleArchived = useCallback(() => {
    updateFilters({ 
      includeArchived: filters.includeArchived === 'true' ? 'false' : 'true' 
    });
  }, [filters.includeArchived, updateFilters]);

  const clearFilters = useCallback(() => {
    const baseFilters = {
      status: 'all',
      priority: 'all',
      archived: 'false',
      search: '',
      sortBy: 'lastActivity',
      sortOrder: 'desc',
      page: 1,
      limit: 20,
      includeArchived: initialFilters.includeArchived || 'false' // Preserve the initial includeArchived value
    };
    console.log('🧹 Clearing filters, setting to:', baseFilters);
    setFilters(baseFilters);
  }, [initialFilters.includeArchived]);

  // Refetch data
  const refetch = useCallback(() => {
    return fetchTrackedJobs(true);
  }, [fetchTrackedJobs]);

  return {
    // Data
    data: trackedJobs, // For compatibility with existing components
    trackedJobs,
    pagination,
    jobsByStatus,
    statusCounts,
    jobsNeedingFollowUp,
    jobsWithUpcomingInterviews,
    recentlyAddedJobs,

    // Loading states
    isLoading,
    isError: !!error,
    error,
    setError,

    // Filter state
    filters,

    // Filter actions
    updateFilters,
    updateStatus,
    updatePriority,
    updateSearch,
    updateSort,
    updatePage,
    toggleArchived,
    clearFilters,

    // Data actions
    refetch,
    fetchTrackedJobs: () => fetchTrackedJobs(true),

    // Computed helpers
    hasJobs: trackedJobs.length > 0,
    isEmpty: !isLoading && trackedJobs.length === 0,
    hasNextPage: pagination.hasNextPage,
    hasPrevPage: pagination.hasPrevPage,
    totalPages: pagination.totalPages || 1,
    currentPage: pagination.currentPage || 1,
    totalCount: pagination.totalCount || trackedJobs.length
  };
};

// Hook for single tracked job
export const useTrackedJob = (jobId) => {
  const [trackedJob, setTrackedJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const fetchTrackedJob = useCallback(async () => {
    if (!jobId) return;
    
    try {
      setIsLoading(true);
      setError('');
      
      const response = await trackerService.getTrackedJobById(jobId);
      
      if (!mountedRef.current) return;
      
      if (response && response.data) {
        setTrackedJob(response.data.trackedJob || response.data);
      } else {
        setTrackedJob(null);
      }
      
    } catch (err) {
      console.error('❌ Error fetching tracked job:', err);
      if (mountedRef.current) {
        setError('Failed to load tracked job');
        setTrackedJob(null);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [jobId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchTrackedJob();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchTrackedJob]);

  const refetch = useCallback(() => {
    return fetchTrackedJob();
  }, [fetchTrackedJob]);

  return {
    trackedJob,
    isLoading,
    error,
    refetch
  };
};

// Hook for tracker statistics
export const useTrackerStats = () => {
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const mountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await trackerService.getStats();
      
      if (!mountedRef.current) return;
      
      console.log('📊 Stats response:', response);
      
      // Handle the response structure correctly
      if (response && response.data) {
        setStats(response.data);
      } else if (response) {
        setStats(response);
      } else {
        setStats({});
      }
      
    } catch (err) {
      console.error('❌ Error fetching tracker stats:', err);
      if (mountedRef.current) {
        setError('Failed to load tracker statistics');
        setStats({});
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchStats();
    
    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats]);

  const refetch = useCallback(() => {
    return fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch
  };
};

export default useTrackedJobs;
