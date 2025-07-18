// frontend/src/utils/h1bService.js
import api from './axios';

const h1bService = {
  // Get H1B company information by name
  getH1BCompanyInfo: async (companyName) => {
    try {
      const response = await api.get(`/recruiters/h1b-company/${encodeURIComponent(companyName)}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching H1B company info:', error);
      throw error;
    }
  },

  // Search H1B companies
  searchH1BCompanies: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.query) params.append('query', filters.query);
      if (filters.industry) params.append('industry', filters.industry);
      if (filters.state) params.append('state', filters.state);
      if (filters.employeeRange) params.append('employeeRange', filters.employeeRange);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const response = await api.get(`/recruiters/h1b-companies?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error searching H1B companies:', error);
      throw error;
    }
  },

  // Check if a company is an H1B sponsor
  isH1BSponsor: async (companyName) => {
    try {
      const response = await h1bService.getH1BCompanyInfo(companyName);
      return response.isH1BCompany || false;
    } catch (error) {
      console.error('Error checking H1B sponsor status:', error);
      return false;
    }
  }
};

export default h1bService;

// frontend/src/hooks/useH1BData.js
import { useState, useEffect, useCallback } from 'react';
import h1bService from '../utils/h1bService';

export const useH1BData = () => {
  const [h1bCompanies, setH1bCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  // Search H1B companies
  const searchH1BCompanies = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await h1bService.searchH1BCompanies({
        limit: 20,
        offset: 0,
        ...filters
      });

      if (response.success) {
        setH1bCompanies(response.companies || []);
        setPagination(response.pagination || {
          total: 0,
          limit: 20,
          offset: 0,
          hasMore: false
        });
      } else {
        setError(response.error || 'Failed to search H1B companies');
        setH1bCompanies([]);
      }
    } catch (err) {
      console.error('Error searching H1B companies:', err);
      setError('Failed to search H1B companies');
      setH1bCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more companies (pagination)
  const loadMoreCompanies = useCallback(async (filters = {}) => {
    if (!pagination.hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await h1bService.searchH1BCompanies({
        limit: 20,
        offset: pagination.offset + pagination.limit,
        ...filters
      });

      if (response.success) {
        setH1bCompanies(prev => [...prev, ...(response.companies || [])]);
        setPagination(response.pagination || pagination);
      } else {
        setError(response.error || 'Failed to load more companies');
      }
    } catch (err) {
      console.error('Error loading more H1B companies:', err);
      setError('Failed to load more companies');
    } finally {
      setLoading(false);
    }
  }, [pagination, loading]);

  // Check if a company is an H1B sponsor
  const checkH1BSponsor = useCallback(async (companyName) => {
    if (!companyName) return false;

    try {
      const response = await h1bService.getH1BCompanyInfo(companyName);
      return response.isH1BCompany || false;
    } catch (error) {
      console.error('Error checking H1B sponsor status:', error);
      return false;
    }
  }, []);

  // Get detailed H1B company information
  const getH1BCompanyDetails = useCallback(async (companyName) => {
    if (!companyName) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await h1bService.getH1BCompanyInfo(companyName);
      
      if (response.success) {
        return response.isH1BCompany ? response.companyDetails : null;
      } else {
        setError(response.error || 'Failed to get company details');
        return null;
      }
    } catch (err) {
      console.error('Error getting H1B company details:', err);
      setError('Failed to get company details');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset state
  const resetH1BData = useCallback(() => {
    setH1bCompanies([]);
    setError(null);
    setPagination({
      total: 0,
      limit: 20,
      offset: 0,
      hasMore: false
    });
  }, []);

  return {
    // State
    h1bCompanies,
    loading,
    error,
    pagination,

    // Actions
    searchH1BCompanies,
    loadMoreCompanies,
    checkH1BSponsor,
    getH1BCompanyDetails,
    resetH1BData
  };
};