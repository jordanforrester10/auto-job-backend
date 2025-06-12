// src/components/jobs/hooks/useAiSearches.js
import { useState, useEffect } from 'react';
import jobService from '../../../utils/jobService';

export const useAiSearches = () => {
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchSearches = async () => {
    try {
      const data = await jobService.getAiSearches();
      // Filter out cancelled searches from the UI
      const activeSearches = data.filter(search => search.status !== 'cancelled');
      setSearches(activeSearches);
      setError('');
    } catch (err) {
      console.error('Error fetching AI searches:', err);
      setError('Failed to load AI searches');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseResume = async (searchId, currentStatus) => {
    setActionLoading(prev => ({ ...prev, [searchId]: true }));
    try {
      if (currentStatus === 'running') {
        await jobService.pauseAiSearch(searchId);
        return { success: true, message: 'Search paused successfully' };
      } else if (currentStatus === 'paused') {
        await jobService.resumeAiSearch(searchId);
        return { success: true, message: 'Search resumed successfully' };
      }
      await fetchSearches();
    } catch (err) {
      console.error('Error updating search:', err);
      setError('Failed to update search status');
      return { success: false, message: 'Failed to update search status' };
    } finally {
      setActionLoading(prev => ({ ...prev, [searchId]: false }));
    }
  };

  const handleDelete = async (searchId) => {
    setActionLoading(prev => ({ ...prev, [searchId]: true }));
    try {
      await jobService.deleteAiSearch(searchId);
      await fetchSearches();
      return { success: true, message: 'Search cancelled successfully' };
    } catch (err) {
      console.error('Error deleting search:', err);
      setError('Failed to delete search');
      return { success: false, message: 'Failed to cancel search' };
    } finally {
      setActionLoading(prev => ({ ...prev, [searchId]: false }));
    }
  };

  useEffect(() => {
    fetchSearches();
    // Refresh every 30 seconds to show updates
    const interval = setInterval(fetchSearches, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    searches,
    loading,
    error,
    actionLoading,
    setError,
    fetchSearches,
    handlePauseResume,
    handleDelete
  };
};