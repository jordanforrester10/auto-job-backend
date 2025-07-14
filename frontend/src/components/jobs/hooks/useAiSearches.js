// src/components/jobs/hooks/useAiSearches.js - OPTIMIZED WITH REDUCED API CALLS
import { useState, useEffect, useRef } from 'react';
import jobService from '../../../utils/jobService';

export const useAiSearches = () => {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  // 🔧 NEW: Cache and throttling controls
  const lastFetchTime = useRef(0);
  const cacheData = useRef({ data: null, timestamp: 0 });
  const mountedRef = useRef(true);
  const pollingIntervalRef = useRef(null);

  // 🔧 NEW: Cache TTL (30 seconds)
  const CACHE_TTL = 30000;
  const MIN_FETCH_INTERVAL = 15000; // Minimum 15 seconds between fetches

  // 🔧 OPTIMIZED: Fetch searches with caching and throttling
  const fetchSearches = async (force = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;
    
    // 🔧 NEW: Use cache if recent and not forced
    if (!force && cacheData.current.data && (now - cacheData.current.timestamp) < CACHE_TTL) {
      console.log('📋 Using cached AI searches data');
      setSearches(cacheData.current.data);
      setLoading(false);
      return;
    }

    // 🔧 NEW: Throttle fetch requests
    if (!force && timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      console.log(`🔄 Throttling AI searches fetch (${Math.round(timeSinceLastFetch/1000)}s ago)`);
      if (cacheData.current.data) {
        setSearches(cacheData.current.data);
        setLoading(false);
      }
      return;
    }

    try {
      if (!mountedRef.current) return;
      
      console.log('🔍 Fetching AI searches...');
      lastFetchTime.current = now;
      
      // Try multiple API methods to get AI searches
      let data;
      try {
        data = await jobService.getAiSearches();
      } catch (firstError) {
        console.log('First API method failed, trying alternative...');
        try {
          const response = await jobService.getUserAiSearches();
          data = response.searches || response;
        } catch (secondError) {
          console.error('Both API methods failed:', { firstError, secondError });
          throw secondError;
        }
      }
      
      if (!mountedRef.current) return;
      
      console.log('📊 Raw AI searches data:', data);
      
      if (!Array.isArray(data)) {
        console.warn('⚠️ Data is not an array:', data);
        const emptyData = [];
        setSearches(emptyData);
        cacheData.current = { data: emptyData, timestamp: now };
        setError('');
        return;
      }
      
      // Filter out cancelled and invalid searches
      const activeSearches = data.filter(search => {
        const validStatuses = ['running', 'paused', 'completed'];
        const hasValidStatus = validStatuses.includes(search.status);
        const excludeStatuses = ['cancelled', 'failed'];
        const shouldExclude = excludeStatuses.includes(search.status);
        
        const isValidWeeklySearch = 
          search.searchType === 'weekly_active_jobs' &&
          search.searchApproach === '3-phase-intelligent-active-jobs-weekly' &&
          search.schedule?.frequency === 'weekly';
        
        // For completed searches, only show recent ones (within 7 days)
        let includeCompleted = true;
        if (search.status === 'completed') {
          const completedDate = new Date(search.updatedAt || search.lastUpdated);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          includeCompleted = completedDate > sevenDaysAgo;
        }
        
        const shouldInclude = hasValidStatus && !shouldExclude && isValidWeeklySearch && includeCompleted;
        
        return shouldInclude;
      });
      
      console.log(`✅ Filtered ${data.length} searches down to ${activeSearches.length} active searches`);
      
      // 🔧 NEW: Cache the results
      cacheData.current = { data: activeSearches, timestamp: now };
      setSearches(activeSearches);
      setError('');
      
    } catch (err) {
      console.error('❌ Error fetching AI searches:', err);
      setError('Failed to load AI searches');
      
      // Use cached data if available on error
      if (cacheData.current.data) {
        console.log('📋 Using stale cached data due to error');
        setSearches(cacheData.current.data);
      } else {
        setSearches([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  // 🔧 OPTIMIZED: Handle pause/resume with minimal API calls
  const handlePauseResume = async (searchId, currentStatus) => {
    setActionLoading(prev => ({ ...prev, [searchId]: true }));
    try {
      console.log(`🔄 ${currentStatus === 'running' ? 'Pausing' : 'Resuming'} search ${searchId}`);
      
      if (currentStatus === 'running') {
        await jobService.pauseAiSearch(searchId);
        console.log(`✅ Successfully paused search ${searchId}`);
      } else if (currentStatus === 'paused') {
        await jobService.resumeAiSearch(searchId);
        console.log(`✅ Successfully resumed search ${searchId}`);
      } else {
        return { success: false, message: 'Invalid search status' };
      }
      
      // 🔧 NEW: Clear cache and fetch fresh data
      cacheData.current = { data: null, timestamp: 0 };
      await fetchSearches(true);
      
      return { success: true, message: `Search ${currentStatus === 'running' ? 'paused' : 'resumed'} successfully` };
      
    } catch (err) {
      console.error(`❌ Error updating search ${searchId}:`, err);
      setError('Failed to update search status');
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to update search status' 
      };
    } finally {
      setActionLoading(prev => ({ ...prev, [searchId]: false }));
    }
  };

  // 🔧 OPTIMIZED: Handle delete with minimal API calls
  const handleDelete = async (searchId) => {
    setActionLoading(prev => ({ ...prev, [searchId]: true }));
    try {
      console.log(`🗑️ Deleting search ${searchId}`);
      
      await jobService.deleteAiSearch(searchId);
      console.log(`✅ Successfully deleted search ${searchId}`);
      
      // 🔧 NEW: Clear cache and fetch fresh data
      cacheData.current = { data: null, timestamp: 0 };
      await fetchSearches(true);
      
      return { success: true, message: 'Search cancelled successfully' };
      
    } catch (err) {
      console.error(`❌ Error deleting search ${searchId}:`, err);
      setError('Failed to delete search');
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to cancel search' 
      };
    } finally {
      setActionLoading(prev => ({ ...prev, [searchId]: false }));
    }
  };

  // 🔧 NEW: Smart polling - only poll if there are running searches
  const startSmartPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    const checkForRunningSearches = () => {
      if (!mountedRef.current) return;
      
      const runningSearches = searches.filter(s => s.status === 'running');
      
      if (runningSearches.length > 0) {
        console.log(`🔄 Smart polling: ${runningSearches.length} running searches, fetching updates...`);
        fetchSearches(); // Use cached version unless really stale
      } else {
        console.log('🔄 Smart polling: No running searches, skipping fetch');
      }
    };

    // 🔧 NEW: Reduced polling frequency - only every 60 seconds
    pollingIntervalRef.current = setInterval(checkForRunningSearches, 60000);
  };

  // 🔧 NEW: Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // 🔧 OPTIMIZED: Initial load and smart polling setup
  useEffect(() => {
    mountedRef.current = true;
    
    // Initial fetch
    fetchSearches(true);
    
    // Start smart polling
    startSmartPolling();
    
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, []); // Only run once on mount

  // 🔧 NEW: Update polling when searches change
  useEffect(() => {
    if (searches.length > 0) {
      startSmartPolling();
    } else {
      stopPolling();
    }
    
    return () => {
      // Cleanup on searches change
    };
  }, [searches.length]); // Only depend on length, not entire array

  // 🔧 NEW: Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      mountedRef.current = false;
    };
  }, []);

  return {
    searches,
    loading,
    error,
    actionLoading,
    setError,
    fetchSearches: () => fetchSearches(true), // Force fresh fetch when called manually
    handlePauseResume,
    handleDelete
  };
};