// src/components/resumes/hooks/useResumeData.js - ENHANCED WITH FORCE REFRESH
import { useState, useCallback } from 'react';
import axios from '../../../utils/axios';

/**
 * Custom hook for managing resume data, loading states, and API calls
 * @param {string} id - Resume ID
 * @returns {object} Resume data, loading states, and fetch function
 */
export const useResumeData = (id) => {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingStatus, setProcessingStatus] = useState('complete');

  const fetchResumeDetails = useCallback(async (isPolling = false, forceRefresh = false) => {
    try {
      if (!isPolling && !forceRefresh) setLoading(true);
      
      console.log(`🔄 Fetching resume details: ${id} (polling: ${isPolling}, force: ${forceRefresh})`);
      
      // 🔥 CRITICAL FIX: Add cache-busting parameter for force refresh
      const url = forceRefresh 
        ? `/resumes/${id}?_t=${Date.now()}` 
        : `/resumes/${id}`;
      
      const response = await axios.get(url);
      const resumeData = response.data.resume || response.data;
      
      console.log('📊 Resume data received:', {
        id: resumeData.id,
        name: resumeData.name,
        hasAnalysis: !!resumeData.analysis,
        overallScore: resumeData.analysis?.overallScore,
        atsCompatibility: resumeData.analysis?.atsCompatibility,
        analysisKeys: resumeData.analysis ? Object.keys(resumeData.analysis) : []
      });
      
      setResume(resumeData);
      
      // Check processing status
      if (resumeData.parsedData?.contactInfo?.name === 'Parsing Error') {
        setProcessingStatus('in-progress');
      } else {
        setProcessingStatus('complete');
      }
      
      setError('');
      
      console.log('✅ Resume data updated in state');
      
    } catch (error) {
      console.error('Error fetching resume details:', error);
      setError('Failed to load resume details. Please try again.');
    } finally {
      if (!isPolling && !forceRefresh) setLoading(false);
    }
  }, [id]);

  // 🔥 NEW: Force refresh function that bypasses cache
  const forceRefreshResume = useCallback(async () => {
    console.log('🔄 Force refreshing resume data...');
    setLoading(true);
    await fetchResumeDetails(false, true);
    setLoading(false);
  }, [fetchResumeDetails]);

  return { 
    resume, 
    loading, 
    error, 
    processingStatus, 
    fetchResumeDetails, 
    forceRefreshResume, // 🔥 NEW: Expose force refresh function
    setResume 
  };
};